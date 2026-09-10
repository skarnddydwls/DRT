"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getVehicleList } from "@/lib/api/vehicle";
import { formatTimestamp } from "@/lib/utils";
import type { DispatchTimeUpdatePayload } from "@/lib/api/dispatch";
import type { VehicleRow } from "@/types/vehicle";
import type { DispatchGridRow } from "@/types/dispatch";

interface DispatchTimeEditModalProps {
  open: boolean;
  onClose: () => void;
  selectedRow: DispatchGridRow | null;
  onSave: (params: DispatchTimeUpdatePayload) => Promise<void>;
}

export function DispatchTimeEditModal({
  open,
  onClose,
  selectedRow,
  onSave,
}: DispatchTimeEditModalProps) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  // 차량 목록 로드
  useEffect(() => {
    if (open) {
      const fetchVehicles = async () => {
        setLoading(true);
        try {
          const response = await getVehicleList();
          setVehicles(response.vehicles);
        } catch (error) {
          console.error("Failed to fetch vehicles:", error);
        } finally {
          setLoading(false);
        }
      };
      void fetchVehicles();
    }
  }, [open]);

  // 선택된 행의 첫 번째 algh_dtm 및 차량 정보로 초기값 설정
  useEffect(() => {
    if (selectedRow && selectedRow.stops.length > 0) {
      const firstAlghDtm = selectedRow.stops[0].algh_dtm;
      if (firstAlghDtm) {
        const date = new Date(firstAlghDtm);
        setSelectedHour(date.getHours());
        setSelectedMinute(date.getMinutes());
      } else {
        setSelectedHour(0);
        setSelectedMinute(0);
      }
      setSelectedVehicleId(selectedRow.vehicle_id ?? "");
    } else {
      setSelectedHour(0);
      setSelectedMinute(0);
      setSelectedVehicleId("");
    }
  }, [selectedRow]);

  const handleSave = async () => {
    if (
      !selectedRow ||
      !selectedVehicleId ||
      !selectedRow.vehicle_id ||
      !selectedRow.dispatch_dt
    ) {
      return;
    }

    const dispatchDateStr = formatTimestamp(
      selectedRow.dispatch_dt,
      "YYYY-MM-DD"
    );
    const alghDtmStr = `${dispatchDateStr} ${String(selectedHour).padStart(
      2,
      "0"
    )}:${String(selectedMinute).padStart(2, "0")}:00`;

    setSaving(true);
    try {
      await onSave({
        route_id: selectedRow.route_id,
        dispatch_dt: dispatchDateStr,
        algh_dtm: alghDtmStr,
        old_vehicle_id: selectedRow.vehicle_id,
        new_vehicle_id: selectedVehicleId,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save dispatch time:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const hours = Array.from({ length: 25 }, (_, i) => i); // 0-24
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>배차시간 편집</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 노선명 (읽기 전용) */}
          <div>
            <label className="text-sm font-medium mb-2 block">노선명</label>
            <input
              type="text"
              value={selectedRow?.route_nm ?? ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>

          {/* 차량 선택 (필수) */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              차량선택 <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
              disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="차량을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => {
                  const value =
                    vehicle.vehicle_id ?? vehicle.id ?? vehicle.vehicleId ?? "";
                  if (!value) {
                    return null;
                  }
                  const label =
                    vehicle.vehicle_no ??
                    vehicle.vehicleNo ??
                    vehicle.vehicle_name ??
                    value;
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 노선시작시간 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              노선시작시간
            </label>
            <div className="flex gap-2">
              <Select
                value={String(selectedHour)}
                onValueChange={(value) => setSelectedHour(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {String(hour).padStart(2, "0")} 시
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedMinute)}
                onValueChange={(value) => setSelectedMinute(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={String(minute)}>
                      {String(minute).padStart(2, "0")} 분
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!selectedVehicleId || saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
