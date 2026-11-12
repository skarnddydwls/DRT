"""Daily-dispatch simulator. Standard library only; PostgreSQL access via psql.

Only DRT_OPER_LOG is written. Dispatches, bookings and driver state stay intact.
"""
from __future__ import annotations

import argparse
import bisect
import datetime as dt
import heapq
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass

KST = dt.timezone(dt.timedelta(hours=9))
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BACKEND = Path(r"C:\eGovFrameDev_DRT-4.3.1-64bit\workspace-egov\drt")


def number(value):
    return float(value)


def coordinate(row):
    try:
        x, y = number(row["gps_x"]), number(row["gps_y"])
        if math.isfinite(x) and math.isfinite(y) and 120 <= x <= 135 and 30 <= y <= 40:
            return (x, y)
    except (ValueError, TypeError, KeyError):
        pass
    raise ValueError(f"Invalid Korea GPS coordinate: {row.get('point_id', '?')}")


def key(point):
    return tuple(round(v, 7) for v in point)


def distance(a, b):
    lat = math.radians((a[1] + b[1]) / 2)
    return math.hypot((b[0] - a[0]) * math.cos(lat), b[1] - a[1]) * 111195


def parse_time(value):
    return dt.datetime.fromisoformat(value).replace(tzinfo=None)


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


class Database:
    def __init__(self, backend, psql=None):
        config = backend / "src/main/resources/egovframework/spring/context-datasource.xml"
        props = {e.get("name"): e.get("value") for e in ET.parse(config).iter()
                 if e.tag.split("}")[-1] == "property"}
        match = re.fullmatch(r"jdbc:postgresql://([^:/]+):(\d+)/([^?]+)(?:\?.*)?", props.get("url", ""))
        if not match:
            raise ValueError("PostgreSQL datasource URL is unsupported.")
        candidates = [psql, shutil.which("psql")]
        candidates += [fr"C:\Program Files\PostgreSQL\{v}\bin\psql.exe" for v in (17, 16, 15, 14)]
        self.psql = next((str(p) for p in candidates if p and Path(p).is_file()), None)
        if not self.psql:
            raise ValueError("psql.exe not found. Install PostgreSQL client or use --psql.")
        self.command = [self.psql, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1",
                        "-h", match[1], "-p", match[2], "-d", match[3], "-U", props["username"]]
        self.env = dict(os.environ, PGPASSWORD=props["password"], PGCLIENTENCODING="UTF8",
                        PGCONNECT_TIMEOUT="8", PGOPTIONS="-c timezone=Asia/Seoul -c statement_timeout=15000")

    def run(self, sql):
        result = subprocess.run(self.command, input=sql, capture_output=True, encoding="utf-8",
                                env=self.env, timeout=25, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        if result.returncode:
            # Do not echo commands, connection settings or potentially sensitive booking rows.
            raise RuntimeError("Database query failed: " + result.stderr.strip()[:600])
        return result.stdout.strip()

    def rows(self, sql):
        return json.loads(self.run("SELECT COALESCE(json_agg(q),'[]'::json)::text FROM (" + sql + ") q;"))

    def schedules(self, day, vehicle, route):
        return self.rows(f"""
          SELECT d.route_id,r.route_nm,d.point_id,d.dispatch_seq,d.ext_dispatch_div,
                 to_char(d.algh_dtm,'YYYY-MM-DD HH24:MI:SS') AS arrival,
                 s.gps_x,s.gps_y,s.stn_nm
          FROM drt.drt_dispatch_day d JOIN drt.cmm_route_info r USING(route_id)
          LEFT JOIN drt.cmm_station_info s ON s.stn_id=d.point_id
          WHERE d.dispatch_dt={literal(day)}::date AND d.vehicle_id={literal(vehicle)}
            AND d.algh_dtm IS NOT NULL
            {('AND d.route_id=' + literal(route)) if route else ''}
          ORDER BY d.route_id,d.dispatch_seq
        """)

    def nodes(self, day):
        return self.rows(f"""
          SELECT n.route_id,n.point_id,n.point_seq,n.point_type,s.stn_nm,
                 COALESCE(s.gps_x,p.gps_x) AS gps_x,COALESCE(s.gps_y,p.gps_y) AS gps_y
          FROM drt.fn_route_nodes_for_date({literal(day)}::date) n
          LEFT JOIN drt.cmm_station_info s ON s.stn_id=n.point_id
          LEFT JOIN drt.cmm_node_info p ON p.node_id=n.point_id
          ORDER BY n.route_id,n.point_seq
        """)

    def bookings(self, day, vehicle):
        # Same WAIT / transfer-leg preference as the driver route presentation SQL.
        return self.rows(f"""
          SELECT l.route_id,l.start_seq,l.end_seq FROM drt.drt_vehicle_call_leg l
          JOIN drt.drt_vehicle_use_log u USING(call_dtm,device_id)
          WHERE l.dispatch_dt={literal(day)}::date AND l.vehicle_id={literal(vehicle)} AND u.rsv_status='WAIT'
          UNION ALL
          SELECT c.route_id,c.dispatch_seq,e.dispatch_seq
          FROM drt.drt_vehicle_call_log c JOIN drt.drt_vehicle_use_log u USING(call_dtm,device_id)
          JOIN drt.drt_dispatch_day e ON e.dispatch_dt=c.dispatch_dt AND e.route_id=c.route_id
            AND e.vehicle_id=c.vehicle_id AND e.point_id=c.end_point_id AND e.algh_dtm=c.schedule_algh_dtm
          WHERE c.dispatch_dt={literal(day)}::date AND c.vehicle_id={literal(vehicle)} AND u.rsv_status='WAIT'
            AND NOT EXISTS(SELECT 1 FROM drt.drt_vehicle_call_leg l WHERE l.call_dtm=c.call_dtm AND l.device_id=c.device_id)
        """)

    def guard(self, vehicle):
        rows = self.rows(f"""SELECT
          EXISTS(SELECT 1 FROM drt.driver_operation WHERE vehicle_id={literal(vehicle)} AND ended_at IS NULL) AS live,
          COALESCE((SELECT oper_yn FROM drt.cmm_vehicle_oper_status WHERE vehicle_id={literal(vehicle)}),'Y') AS oper""")
        if rows[0]["live"]:
            raise ValueError("This vehicle has an active driver operation. Stop it before simulating.")
        if rows[0]["oper"] != "Y":
            raise ValueError("Vehicle is marked not operating (oper_yn=N); monitoring will hide it. Select an operating test vehicle.")

    def publish(self, vehicle, route, day, point, heading, speed, rollback=False):
        # Recheck the live driver guard in the same statement on every publication.
        sql = f"""INSERT INTO drt.drt_oper_log
          (oper_dtm,vehicle_id,route_id,dispatch_dt,gps_x,gps_y,heading,speed)
          SELECT CURRENT_TIMESTAMP,{literal(vehicle)},{literal(route)},{literal(day)}::date,
            {point[0]:.7f},{point[1]:.7f},{heading:.2f},{speed:.3f}
          WHERE NOT EXISTS(SELECT 1 FROM drt.driver_operation WHERE vehicle_id={literal(vehicle)} AND ended_at IS NULL)
          RETURNING gps_x,gps_y"""
        if rollback:
            return self.run("BEGIN; " + sql + "; ROLLBACK;")
        if not self.run(sql + ";"):
            raise ValueError("A real driver operation has started; simulation stopped.")


class Network:
    """Road segments already represented in route-edit configurations, never invented chords."""
    def __init__(self, nodes):
        self.routes = {}
        self.edges = {}
        for node in nodes:
            self.routes.setdefault(node["route_id"], []).append(node)
        for route in self.routes.values():
            route.sort(key=lambda n: int(n["point_seq"]))
            for a, b in zip(route, route[1:]):
                try:
                    x, y = key(coordinate(a)), key(coordinate(b))
                except ValueError:
                    continue  # Never bridge over a missing coordinate.
                length = distance(x, y)
                self.edges.setdefault(x, {})[y] = length
                self.edges.setdefault(y, {})[x] = length

    def validate_dispatch(self, journey):
        nodes = self.routes.get(journey.route, [])
        sequences = {}
        for node in nodes:
            sequences.setdefault(node['point_id'], []).append(int(node['point_seq']))
        missing, shifted = [], []
        for stop in journey.stops:
            name = stop.get('stn_nm') or stop['point_id']
            actual = sequences.get(stop['point_id'], [])
            if not actual:
                same_name = [node for node in nodes if stop.get('stn_nm') and node.get('stn_nm') == stop['stn_nm']]
                registered = ', '.join(f"{node['point_id']} (seq {node['point_seq']})" for node in same_name)
                missing.append(f"{name} ({stop['point_id']})" + (f"; same-name route stop: {registered}" if registered else ''))
            elif int(stop['dispatch_seq']) not in actual:
                shifted.append(f"{name}: dispatch {stop['dispatch_seq']} / route {','.join(map(str, actual))}")
        if missing or shifted:
            details = []
            if missing:
                details.append('Unmatched route-edit station IDs: ' + '; '.join(missing))
            if shifted:
                details.append('Sequence mismatch: ' + '; '.join(shifted))
            raise ValueError(f"{journey.name} ({journey.route}): daily dispatch does not match today's route-edit data. "
                             + ' '.join(details) + '. Verify this round in route-edit and regenerate its daily dispatch.')

    def between(self, route, start, end, blocked):
        nodes = self.routes.get(route, [])
        indices = {(int(n["point_seq"]), n["point_id"]): i for i, n in enumerate(nodes)}
        a = indices.get((int(start["dispatch_seq"]), start["point_id"]))
        b = indices.get((int(end["dispatch_seq"]), end["point_id"]))
        if a is None or b is None or a >= b:
            raise ValueError(f"Route {route}: dispatch order does not match route-edit nodes.")
        original = [key(coordinate(n)) for n in nodes[a:b+1]]
        if not blocked:
            return original
        return self.shortest(original[0], original[-1], blocked)

    def shortest(self, start, end, blocked):
        blocked = set(blocked) - {start, end}
        queue, costs, previous = [(0.0, start)], {start: 0.0}, {}
        while queue:
            cost, point = heapq.heappop(queue)
            if cost > costs[point]:
                continue
            if point == end:
                path = [end]
                while path[-1] != start:
                    path.append(previous[path[-1]])
                return list(reversed(path))
            for nxt, length in self.edges.get(point, {}).items():
                total = cost + length
                if nxt not in blocked and total < costs.get(nxt, math.inf):
                    costs[nxt], previous[nxt] = total, point
                    heapq.heappush(queue, (total, nxt))
        raise ValueError("No configured bypass path for an unbooked reservation section. Add its connecting nodes in route-edit.")


@dataclass
class Segment:
    start: dt.datetime
    end: dt.datetime
    points: list
    cruise_kph: float

    def position(self, now):
        lengths = [0.0]
        for a, b in zip(self.points, self.points[1:]):
            lengths.append(lengths[-1] + distance(a, b))
        duration = (self.end - self.start).total_seconds()
        if duration <= 0 and lengths[-1] > 1:
            raise ValueError("Different stops cannot have the same or decreasing arrival time.")
        travel = min(max(duration, 0), lengths[-1] / (self.cruise_kph / 3.6))
        elapsed = max(0.0, (now - self.start).total_seconds())
        progress = min(elapsed / travel, 1.0) if travel > 0 else 1.0
        target = lengths[-1] * progress
        index = max(0, min(bisect.bisect_right(lengths, target) - 1, len(self.points) - 2))
        if len(self.points) == 1:
            return self.points[0], 0.0, 0.0
        a, b = self.points[index:index+2]
        part = lengths[index+1] - lengths[index]
        ratio = (target - lengths[index]) / part if part else 1.0
        point = tuple(a[i] + (b[i] - a[i]) * ratio for i in (0, 1))
        heading = math.degrees(math.atan2((b[0]-a[0])*math.cos(math.radians(a[1])), b[1]-a[1])) % 360
        speed = lengths[-1] / travel * 3.6 if elapsed < travel else 0.0
        return point, heading, speed


class Journey:
    def __init__(self, stops, network, cruise_kph):
        self.stops, self.network, self.cruise = stops, network, cruise_kph
        self.route = stops[0]["route_id"]
        self.name = stops[0].get("route_nm", self.route)
        self.start = parse_time(stops[0]["arrival"])
        self.end = parse_time(stops[-1]["arrival"])
        self.locked = {}
        self.committed_segments = {}
        for a, b in zip(stops, stops[1:]):
            if parse_time(a["arrival"]) > parse_time(b["arrival"]):
                raise ValueError(f"{self.name}: seq {a['dispatch_seq']} ({a['arrival']}) -> "
                                 f"seq {b['dispatch_seq']} ({b['arrival']}): arrival times decrease in dispatch order.")
        self.groups = []
        for i, stop in enumerate(stops):
            code = str(stop.get("ext_dispatch_div") or "").strip()
            if not code:
                continue
            if self.groups and self.groups[-1]["code"] == code and self.groups[-1]["last"] == i-1:
                self.groups[-1]["last"] = i
            else:
                self.groups.append(dict(code=code, first=i, last=i))

    def plan(self, bookings, force, now=None):
        inactive, decisions = set(), []
        for group in self.groups:
            first, last = group["first"], group["last"]
            identity = (group["code"], first)
            # A booking crossing any part of the group also requires that group.
            booked = any(b["route_id"] == self.route and int(b["start_seq"]) <= int(self.stops[last]["dispatch_seq"])
                         and int(b["end_seq"]) >= int(self.stops[first]["dispatch_seq"]) for b in bookings)
            decision = self.locked.get(identity, force or booked)
            before = first-1
            while before >= 0 and str(self.stops[before].get("ext_dispatch_div") or "").strip():
                before -= 1
            departure = parse_time(self.stops[max(0, before)]["arrival"])
            if now is not None and now >= departure:
                self.locked[identity] = decision
            decisions.append((group["code"], first, decision))
            if not decision:
                inactive.update(range(first, last+1))
        active = [s for i, s in enumerate(self.stops) if i not in inactive]
        blocked = {key(coordinate(self.stops[i])) for i in inactive}
        segments = []
        for a, b in zip(active, active[1:]):
            identity = (int(a["dispatch_seq"]), int(b["dispatch_seq"]))
            if identity in self.committed_segments:
                segments.append(self.committed_segments[identity])
                continue
            skipped = any(int(a["dispatch_seq"]) < int(self.stops[i]["dispatch_seq"]) < int(b["dispatch_seq"]) for i in inactive)
            points = self.network.between(self.route, a, b, blocked if skipped else set())
            segment = Segment(parse_time(a["arrival"]), parse_time(b["arrival"]), points, self.cruise)
            segment.position(segment.start)  # Validate equal-time, different-location errors before writing.
            if now is not None and now >= segment.start:
                self.committed_segments[identity] = segment
            segments.append(segment)
        return active, segments, decisions

    def position(self, now, bookings, force):
        active, segments, decisions = self.plan(bookings, force, now)
        if not active:
            return None, decisions
        if now < parse_time(active[0]["arrival"]):
            return (coordinate(active[0]), 0.0, 0.0), decisions
        for segment in segments:
            if now <= segment.end:
                return segment.position(now), decisions
        return (coordinate(active[-1]), 0.0, 0.0), decisions


def build_journeys(stops, network, cruise):
    grouped = {}
    seen = set()
    for stop in stops:
        identity = (stop["route_id"], int(stop["dispatch_seq"]), stop["point_id"])
        if identity in seen:
            raise ValueError("Duplicate dispatch stop across devices. Resolve duplicate daily dispatch before simulating.")
        seen.add(identity)
        coordinate(stop)
        grouped.setdefault(stop["route_id"], []).append(stop)
    journeys = [Journey(sorted(s, key=lambda row: int(row["dispatch_seq"])), network, cruise) for s in grouped.values()]
    journeys.sort(key=lambda j: (j.start, j.route))
    for a, b in zip(journeys, journeys[1:]):
        if a.end > b.start:
            raise ValueError(f"Vehicle has overlapping schedules: {a.name} / {b.name}")
    return journeys


class VehicleSession:
    """Independent vehicle state driven by the fleet's one shared simulation clock."""
    def __init__(self, vehicle, database, network, args, day):
        self.vehicle, self.db, self.network, self.args, self.day = vehicle, database, network, args, day
        self.journeys = build_journeys(database.schedules(day, vehicle, args.route), network, args.cruise_kph)
        if not self.journeys:
            raise ValueError("No daily dispatch assigned to this vehicle/date.")
        self.bookings = [] if args.reserve == "always" else database.bookings(day, vehicle)
        self.state = Path(tempfile.gettempdir()) / f"drt-monitoring-{vehicle}.state"
        self.token = f"daily|{uuid.uuid4()}"
        self.refreshed, self.ticks, self.last_decisions = -math.inf, 0, None
        self.deadheads = {}
        previous_active = previous_journey = None
        for journey in self.journeys:
            network.validate_dispatch(journey)
            active, _, _ = journey.plan(self.bookings, args.reserve == "always")
            print(f"[{vehicle}] {journey.name} ({journey.route}) {journey.start:%H:%M}~{journey.end:%H:%M}: "
                  f"{len(active)} stops, {len(journey.stops)-len(active)} skipped", flush=True)
            if active and previous_active is not None:
                path = network.shortest(key(coordinate(previous_active[-1])), key(coordinate(active[0])), set())
                Segment(previous_journey.end, journey.start, path, args.cruise_kph).position(previous_journey.end)
            if active:
                previous_active, previous_journey = active, journey

    def start(self):
        self.db.guard(self.vehicle)
        self.state.write_text(self.token, encoding="ascii")

    def owns_token(self):
        try:
            return self.state.read_text(encoding="ascii").strip() == self.token
        except FileNotFoundError:
            return False

    def close(self):
        if self.owns_token():
            self.state.unlink(missing_ok=True)

    def tick(self, now, clock):
        if not self.owns_token():
            print(f"[{self.vehicle}] A newer simulation took over; stopped.", flush=True)
            return False
        if now > self.journeys[-1].end:
            print(f"[{self.vehicle}] All daily journeys finished.", flush=True)
            return False
        if clock-self.refreshed >= 5:
            self.db.guard(self.vehicle)
            self.bookings = [] if self.args.reserve == "always" else self.db.bookings(self.day, self.vehicle)
            self.refreshed = clock
        journeys, force = self.journeys, self.args.reserve == "always"
        journey = next((j for j in reversed(journeys) if j.start <= now), journeys[0])
        position, decisions = journey.position(now, self.bookings, force)
        if position is None:
            for candidate in reversed(journeys[:journeys.index(journey)]):
                candidate_position, candidate_decisions = candidate.position(now, self.bookings, force)
                if candidate_position is not None:
                    journey, position, decisions = candidate, candidate_position, candidate_decisions
                    break
        index = journeys.index(journey)
        if now > journey.end and index+1 < len(journeys):
            following, next_active = None, []
            for candidate in journeys[index+1:]:
                candidate_active, _, _ = candidate.plan(self.bookings, force)
                if candidate_active:
                    following, next_active = candidate, candidate_active
                    break
            if position is not None and next_active:
                deadhead_key = (journey.route, following.route, next_active[0]["point_id"])
                if deadhead_key not in self.deadheads:
                    path = self.network.shortest(key(position[0]), key(coordinate(next_active[0])), set())
                    self.deadheads[deadhead_key] = Segment(journey.end, following.start, path, self.args.cruise_kph)
                position = self.deadheads[deadhead_key].position(now)
        decision_key = (journey.route, decisions)
        if decision_key != self.last_decisions:
            print(f"[{self.vehicle}] Route {journey.name}: " + ", ".join(f"{c}@{i+1}={'ON' if on else 'OFF'}" for c,i,on in decisions), flush=True)
            self.last_decisions = decision_key
        if position is not None and self.owns_token():
            self.db.publish(self.vehicle, journey.route, self.day, *position)
            self.ticks += 1
            point, _, speed = position
            print(f"[{now:%H:%M:%S}] {self.vehicle} / {journey.name} X={point[0]:.7f} Y={point[1]:.7f} {speed:.1f}km/h", flush=True)
        return not (self.args.ticks and self.ticks >= self.args.ticks)


def vehicle_ids(value):
    values = ["VH00000001", "VH00000002"] if value.upper() == "ALL" else value.split(",")
    values = list(dict.fromkeys(v.strip() for v in values))
    if not values or any(not re.fullmatch(r"[A-Za-z0-9_-]+", v) for v in values):
        raise ValueError("Invalid vehicle ID; use ALL or comma-separated vehicle IDs.")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vehicle", default="VH00000001", help="ALL = buses 1+2; or a vehicle ID/comma-separated IDs")
    parser.add_argument("--route", default="", help="Optional single route; otherwise all assigned daily routes")
    parser.add_argument("--date", default=dt.datetime.now(KST).date().isoformat())
    parser.add_argument("--reserve", choices=("actual", "always"), default="actual")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--start", help="Simulated start HH:MM; omitted = current Korea time")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--cruise-kph", type=float, default=25.0)
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument("--psql")
    parser.add_argument("--check", action="store_true", help="Read-only validation; no positions are written")
    parser.add_argument("--rollback-probe", action="store_true", help="Test one position INSERT inside ROLLBACK")
    parser.add_argument("--ticks", type=int, default=0, help="Stop each vehicle after N publications; zero = full schedule")
    args = parser.parse_args()
    day = dt.date.fromisoformat(args.date)
    vehicles = vehicle_ids(args.vehicle)
    if args.route and not re.fullmatch(r"[A-Za-z0-9_-]+", args.route):
        raise ValueError("Invalid vehicle or route ID")
    if not all(math.isfinite(v) and v > 0 for v in (args.speed, args.interval, args.cruise_kph)) or args.ticks < 0:
        raise ValueError("Speed, interval and cruise speed must be positive; ticks must be non-negative.")
    if not 0.25 <= args.interval <= 60:
        raise ValueError("Interval must be between 0.25 and 60 seconds.")
    if args.start:
        start_time = dt.time.fromisoformat(args.start)
        if start_time.tzinfo:
            raise ValueError("Start time must use local HH:MM without a timezone.")
        simulation_start = dt.datetime.combine(day, start_time)
    else:
        simulation_start = dt.datetime.combine(day, dt.datetime.now(KST).time().replace(tzinfo=None))
    database = Database(args.backend, args.psql)
    network = Network(database.nodes(day))
    print(f"Daily dispatch: {day} / {','.join(vehicles)} / reserve={args.reserve} / speed={args.speed:g}x", flush=True)
    sessions, failures = [], []
    for vehicle in vehicles:
        try:
            sessions.append(VehicleSession(vehicle, database, network, args, day))
        except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
            failures.append(vehicle)
            print(f"[{vehicle}] NOT STARTED: {error}", file=sys.stderr, flush=True)
    if args.check:
        if failures:
            raise ValueError("Read-only validation failed for: " + ", ".join(failures))
        print("Read-only checks passed. No logs, schedules, reservations or operation state changed.")
        return
    if args.rollback_probe:
        for session in sessions:
            j = next((j for j in session.journeys if j.end >= simulation_start), session.journeys[0])
            position, _ = j.position(simulation_start, session.bookings, args.reserve == "always")
            if position is None:
                raise ValueError(f"{session.vehicle}: selected journey is entirely unbooked; no position to probe.")
            print(database.publish(session.vehicle, j.route, day, *position, rollback=True))
        if failures:
            raise ValueError("Position probe failed for: " + ", ".join(failures))
        print("Position INSERT rolled back; no simulation row retained.")
        return
    if day != dt.datetime.now(KST).date():
        raise ValueError("Live publication requires today's Korea date; use --check for another date.")
    active = []
    try:
        for session in sessions:
            try:
                session.start()
                active.append(session)
            except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
                failures.append(session.vehicle)
                print(f"[{session.vehicle}] NOT STARTED: {error}", file=sys.stderr, flush=True)
        if not active:
            raise ValueError("No vehicles could start. Check the per-vehicle errors above.")
        monotonic_start = time.monotonic()
        print("Publishing real-time position logs. Ctrl+C stops all selected vehicles. Restart after editing daily dispatch.", flush=True)
        while active:
            clock = time.monotonic()
            now = simulation_start + dt.timedelta(seconds=(clock-monotonic_start)*args.speed)
            for session in list(active):
                try:
                    running = session.tick(now, clock)
                except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
                    failures.append(session.vehicle)
                    print(f"[{session.vehicle}] STOPPED: {error}", file=sys.stderr, flush=True)
                    running = False
                if not running:
                    session.close()
                    active.remove(session)
            if active:
                time.sleep(args.interval)
    finally:
        for session in sessions:
            session.close()
        print("Simulation stopped. Existing operation logs were retained.", flush=True)
    if failures:
        raise ValueError("Some vehicles did not complete: " + ", ".join(dict.fromkeys(failures)))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped by user.")
    except (ValueError, RuntimeError, OSError, ET.ParseError, subprocess.TimeoutExpired) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
