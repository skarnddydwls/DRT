"""Offline behavioral tests; no database connection or position writes."""
import datetime as dt
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import contextlib
import io

spec = importlib.util.spec_from_file_location("dispatch_simulator", Path(__file__).parents[1] / "scripts/dispatch-simulator.py")
sim = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = sim
spec.loader.exec_module(sim)
BASE = dt.datetime(2026, 11, 5, 9)
A, B, C, D = (127.0, 34.0), (127.001, 34.001), (127.002, 34.0), (127.001, 34.0)


def stop(seq, point, minute, group="", route="R1", point_id=None):
    return dict(route_id=route, route_nm=route, point_id=point_id or f"S{seq}", dispatch_seq=seq,
                gps_x=point[0], gps_y=point[1], arrival=(BASE+dt.timedelta(minutes=minute)).isoformat(),
                ext_dispatch_div=group)


def network(stops):
    nodes = [dict(s, point_seq=s["dispatch_seq"], point_type="STN") for s in stops]
    for i, point in enumerate((A, D, C)):
        nodes.append(dict(route_id="BYPASS", point_id=f"N{i}", point_seq=i, gps_x=point[0], gps_y=point[1]))
    for i, point in enumerate((A, (127.001,33.998), C)):
        nodes.append(dict(route_id="BYPASS2", point_id=f"X{i}", point_seq=i, gps_x=point[0], gps_y=point[1]))
    return sim.Network(nodes)


class ScheduleTests(unittest.TestCase):
    def test_dispatch_validation_identifies_missing_stops_before_publication(self):
        stops = [stop(1, A, 0), stop(2, B, 5), stop(3, C, 10)]
        net = network([stops[0], stops[2]])
        journey = sim.Journey(stops, net, 25)
        with self.assertRaisesRegex(ValueError, r'Unmatched route-edit station IDs: S2'):
            net.validate_dispatch(journey)

    def test_same_name_station_with_different_id_is_reported_without_substitution(self):
        stops = [stop(1, A, 0), dict(stop(2, B, 5), stn_nm='서고지'), stop(3, C, 10)]
        net = network([stops[0], dict(stops[1], point_id='OTHER_DIRECTION'), stops[2]])
        with self.assertRaisesRegex(ValueError, r'same-name route stop: OTHER_DIRECTION'):
            net.validate_dispatch(sim.Journey(stops, net, 25))

    def test_dispatch_validation_reports_shifted_sequence_without_remapping_repeated_stops(self):
        stops = [stop(1, A, 0), stop(2, B, 5), stop(3, C, 10)]
        net = network(stops)
        changed = [dict(s, dispatch_seq=s['dispatch_seq'] + 10) for s in stops]
        with self.assertRaisesRegex(ValueError, r'S1: dispatch 11 / route 1'):
            net.validate_dispatch(sim.Journey(changed, net, 25))

    def setUp(self):
        self.stops = [stop(1,A,0), stop(2,B,5,"CD001"), stop(3,C,10)]
        self.net = network(self.stops)
        self.journey = sim.Journey(self.stops,self.net,25)

    def test_no_reservation_uses_known_bypass_and_preserves_arrival(self):
        active, segments, _ = self.journey.plan([],False)
        self.assertEqual([s["dispatch_seq"] for s in active],[1,3])
        self.assertEqual(segments[0].end,BASE+dt.timedelta(minutes=10))
        self.assertNotIn(B,segments[0].points)
        self.assertIn(D,segments[0].points)

    def test_force_on_includes_all_stops_without_booking(self):
        self.assertEqual(len(self.journey.plan([],True)[0]),3)

    def test_actual_boarding_alighting_and_through_bookings_activate_group(self):
        for first,last in [(1,2),(2,3),(1,3)]:
            booking=[dict(route_id="R1",start_seq=first,end_seq=last)]
            self.assertEqual(len(self.journey.plan(booking,False)[0]),3)

    def test_different_route_does_not_activate(self):
        booking=[dict(route_id="OTHER",start_seq=1,end_seq=3)]
        self.assertEqual(len(self.journey.plan(booking,False)[0]),2)

    def test_before_departure_booking_changes_are_applied(self):
        self.journey.plan([],False,BASE-dt.timedelta(minutes=2))
        active,_,_=self.journey.plan([dict(route_id="R1",start_seq=1,end_seq=3)],False,BASE-dt.timedelta(minutes=1))
        self.assertEqual(len(active),3)

    def test_committed_section_does_not_change_path_mid_move(self):
        _,before,_=self.journey.plan([],False,BASE+dt.timedelta(seconds=1))
        _,after,_=self.journey.plan([dict(route_id="R1",start_seq=1,end_seq=3)],False,BASE+dt.timedelta(minutes=1))
        self.assertEqual(before[0].points,after[0].points)
        self.assertEqual(len(after),1)

    def test_leading_trailing_and_entire_optional_routes(self):
        for groups,expected in [(["G","",""],[2,3]),(["","","G"],[1,2]),(["G","G","G"],[])]:
            stops=[dict(s,ext_dispatch_div=g) for s,g in zip(self.stops,groups)]
            journey=sim.Journey(stops,self.net,25)
            self.assertEqual([s["dispatch_seq"] for s in journey.plan([],False)[0]],expected)

    def test_group_decisions_are_separate(self):
        stops=[stop(1,A,0),stop(2,B,3,"A"),stop(3,D,6,"B"),stop(4,C,10)]
        journey=sim.Journey(stops,network(stops),25)
        active,_,decisions=journey.plan([dict(route_id="R1",start_seq=1,end_seq=2)],False)
        self.assertEqual([d[2] for d in decisions],[True,False])
        self.assertEqual([s["dispatch_seq"] for s in active],[1,2,4])

    def test_adjacent_groups_lock_at_previous_fixed_stop(self):
        stops=[stop(1,A,0),stop(2,B,3,"A"),stop(3,D,6,"B"),stop(4,C,10)]
        journey=sim.Journey(stops,network(stops),25)
        journey.plan([],False,BASE+dt.timedelta(seconds=1))
        self.assertEqual(len(journey.locked),2)

    def test_missing_bypass_fails_instead_of_drawing_a_chord(self):
        net=sim.Network([dict(s,point_seq=s["dispatch_seq"]) for s in self.stops])
        with self.assertRaisesRegex(ValueError,"No configured bypass"):
            sim.Journey(self.stops,net,25).plan([],False)

    def test_network_does_not_bridge_missing_coordinates(self):
        nodes=[dict(s,point_seq=s["dispatch_seq"]) for s in self.stops]
        nodes[1]["gps_y"]=None
        net=sim.Network(nodes)
        with self.assertRaisesRegex(ValueError,"No configured bypass"):
            net.shortest(A,C,set())

    def test_repeated_station_matches_sequence_not_just_id(self):
        stops=[stop(1,A,0,point_id="SAME"),stop(2,B,5),stop(3,C,10,point_id="SAME")]
        self.assertEqual(len(sim.Journey(stops,network(stops),25).plan([],True)[1]),2)

    def test_arrival_then_wait_and_heading(self):
        segment=sim.Segment(BASE,BASE+dt.timedelta(minutes=10),[A,D,C],25)
        point,heading,speed=segment.position(BASE+dt.timedelta(seconds=1))
        self.assertGreater(point[0],A[0])
        self.assertAlmostEqual(heading,90)
        self.assertGreater(speed,0)
        point,_,speed=segment.position(BASE+dt.timedelta(minutes=5))
        self.assertEqual(point,C)
        self.assertEqual(speed,0)

    def test_tight_schedule_still_hits_fixed_arrival(self):
        segment=sim.Segment(BASE,BASE+dt.timedelta(seconds=1),[A,C],25)
        self.assertEqual(segment.position(BASE+dt.timedelta(seconds=1))[0],C)

    def test_equal_times_different_positions_are_rejected(self):
        with self.assertRaises(ValueError):
            sim.Segment(BASE,BASE,[A,C],25).position(BASE)

    def test_duplicate_dispatch_across_devices_rejected(self):
        with self.assertRaisesRegex(ValueError,"Duplicate dispatch"):
            sim.build_journeys(self.stops+[self.stops[0]],self.net,25)

    def test_overlapping_routes_rejected(self):
        stops=self.stops+[stop(1,A,5,route="R2"),stop(2,C,20,route="R2")]
        with self.assertRaisesRegex(ValueError,"overlapping"):
            sim.build_journeys(stops,network(stops),25)

    def test_gps_order(self):
        self.assertEqual(sim.coordinate(dict(gps_x=127,gps_y=34)),(127,34))
        with self.assertRaises(ValueError):
            sim.coordinate(dict(gps_x=34,gps_y=127))

    def test_runner_uses_schedule_and_publishes_bounded_positions_in_both_modes(self):
        day=dt.datetime.now(sim.KST).date()
        stops=[dict(s,arrival=s["arrival"].replace("2026-11-05",day.isoformat())) for s in self.stops]
        nodes=[n for route in network(stops).routes.values() for n in route]
        class FakeDatabase:
            def __init__(self): self.writes=[]
            def nodes(self,day): return nodes
            def schedules(self,*args): return stops
            def bookings(self,*args): return []
            def guard(self,*args): pass
            def publish(self,*args): self.writes.append(args)
        for mode in ('actual','always'):
            db=FakeDatabase()
            args=['sim','--vehicle','TEST_SIMULATOR_ONLY','--start','09:00','--reserve',mode,'--ticks','2']
            with patch.object(sys,'argv',args),patch.object(sim,'Database',return_value=db), \
                 patch.object(sim.time,'monotonic',side_effect=[0,0,1]),patch.object(sim.time,'sleep'), \
                 contextlib.redirect_stdout(io.StringIO()):
                sim.main()
            self.assertEqual(len(db.writes),2)
            self.assertEqual(db.writes[0][1],'R1')
            self.assertEqual(db.writes[0][3],A)
            self.assertGreater(db.writes[1][3][0],A[0])
            self.assertFalse((Path(sim.tempfile.gettempdir())/'drt-monitoring-TEST_SIMULATOR_ONLY.state').exists())

    def test_runner_check_never_writes_position(self):
        class FakeDatabase:
            def nodes(db,day): return [n for rows in self.net.routes.values() for n in rows]
            def schedules(db,*args): return self.stops
            def bookings(db,*args): return []
            def publish(db,*args): raise AssertionError('Read-only mode wrote a position')
        with patch.object(sys,'argv',['sim','--check']),patch.object(sim,'Database',return_value=FakeDatabase()), \
             contextlib.redirect_stdout(io.StringIO()):
            sim.main()

    def fleet_fixture(self, mode='always', broken=None, interrupt=False, longer_second=False):
        day=dt.datetime.now(sim.KST).date()
        rows={}
        for vehicle,route in [('TEST_FLEET_A','R1'),('TEST_FLEET_B','R2')]:
            rows[vehicle]=[dict(s,route_id=route,route_nm=route,arrival=s['arrival'].replace('2026-11-05',day.isoformat())) for s in self.stops]
        if longer_second:
            rows['TEST_FLEET_B'][-1]['arrival']=(dt.datetime.combine(day,dt.time(9))+dt.timedelta(minutes=20)).isoformat()
        nodes=[n for r in network(rows['TEST_FLEET_A']+rows['TEST_FLEET_B']).routes.values() for n in r]
        class FakeDatabase:
            def __init__(db): db.writes=[]
            def nodes(db,day): return nodes
            def schedules(db,day,vehicle,route):
                if broken=='schedule' and vehicle=='TEST_FLEET_A': return []
                return rows[vehicle]
            def bookings(db,day,vehicle): return []
            def guard(db,vehicle):
                if broken=='guard' and vehicle=='TEST_FLEET_A': raise ValueError('Real driver active')
            def publish(db,*args):
                if interrupt: raise KeyboardInterrupt()
                if broken=='runtime' and args[0]=='TEST_FLEET_A': raise RuntimeError('Publication failed')
                db.writes.append(args)
        return FakeDatabase()

    def run_fleet(self, db, mode='always', clocks=None):
        args=['sim','--vehicle','TEST_FLEET_A,TEST_FLEET_B','--start','09:00','--reserve',mode,'--ticks','2']
        with patch.object(sys,'argv',args),patch.object(sim,'Database',return_value=db), \
             patch.object(sim.time,'monotonic',side_effect=clocks or [0,0,1]),patch.object(sim.time,'sleep'), \
             contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            sim.main()

    def assert_fleet_closed(self):
        for vehicle in ('TEST_FLEET_A','TEST_FLEET_B'):
            self.assertFalse((Path(sim.tempfile.gettempdir())/f'drt-monitoring-{vehicle}.state').exists())

    def test_fleet_both_vehicles_share_clock_in_both_reservation_modes(self):
        for mode in ('actual','always'):
            db=self.fleet_fixture(mode)
            self.run_fleet(db,mode)
            self.assertEqual([r[0] for r in db.writes],['TEST_FLEET_A','TEST_FLEET_B']*2)
            self.assertEqual(db.writes[0][3],db.writes[1][3])
            self.assertEqual(db.writes[2][3],db.writes[3][3])
            self.assertGreater(db.writes[2][3][0],db.writes[0][3][0])
            self.assert_fleet_closed()

    def test_fleet_failure_isolated_during_preflight_guard_and_publication(self):
        for broken in ('schedule','guard','runtime'):
            db=self.fleet_fixture(broken=broken)
            with self.assertRaisesRegex(ValueError,'Some vehicles did not complete'):
                self.run_fleet(db)
            self.assertEqual([r[0] for r in db.writes],['TEST_FLEET_B']*2)
            self.assert_fleet_closed()

    def test_fleet_one_finished_vehicle_does_not_stop_other(self):
        db=self.fleet_fixture(longer_second=True)
        self.run_fleet(db,clocks=[0,601,602])
        self.assertEqual([r[0] for r in db.writes],['TEST_FLEET_B']*2)
        self.assert_fleet_closed()

    def test_ctrl_c_cleans_up_all_vehicle_tokens(self):
        db=self.fleet_fixture(interrupt=True)
        with self.assertRaises(KeyboardInterrupt): self.run_fleet(db)
        self.assert_fleet_closed()

    def test_all_expands_both_buses_and_invalid_ids_fail(self):
        self.assertEqual(sim.vehicle_ids('ALL'),['VH00000001','VH00000002'])
        self.assertEqual(sim.vehicle_ids('A,B,A'),['A','B'])
        with self.assertRaises(ValueError): sim.vehicle_ids('A,,B')


if __name__ == "__main__":
    unittest.main()
