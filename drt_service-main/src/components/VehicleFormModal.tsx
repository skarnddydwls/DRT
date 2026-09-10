"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VehicleFormData, VehicleRow } from "@/types/vehicle";

interface VehicleFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialData?: VehicleRow | null;
  onClose: () => void;
  onSubmit: (data: VehicleFormData) => Promise<void>;
}

/**
 * 그리드 데이터(snake_case)를 API 요청 데이터(대문자)로 변환
 */
function gridDataToFormData(row: VehicleRow): VehicleFormData {
  return {
    VEHICLE_ID: row.vehicle_id || "",
    VEHICLE_NO: row.vehicle_no || "",
    AREA: row.area || "",
    CHASSIS_NO: row.chassis_no || "",
    VEHICLE_TYPE: row.vehicle_type || "",
    VEHICLE_STATUS: row.vehicle_status || "",
    MAKER: row.maker || "",
    MODEL_NM: row.model_nm || "",
    RELEASE_YEAR: row.release_year || "",
    FUEL_TYPE: row.fuel_type || "",
    START_DT: row.start_dt ? formatDate(row.start_dt) : "",
    END_DT: row.end_dt ? formatDate(row.end_dt) : "",
    CAPACITY: row.capacity ? Number(row.capacity) : 0,
    REMARK: row.remark || "",
  };
}

/**
 * 날짜 형식 변환 (YYYY-MM-DD)
 */
function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function VehicleFormModal({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
}: VehicleFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData>({
    VEHICLE_ID: "",
    VEHICLE_NO: "",
    AREA: "",
    CHASSIS_NO: "",
    VEHICLE_TYPE: "",
    VEHICLE_STATUS: "",
    MAKER: "",
    MODEL_NM: "",
    RELEASE_YEAR: "",
    FUEL_TYPE: "",
    START_DT: "",
    END_DT: "",
    CAPACITY: 0,
    REMARK: "",
  });

  // 모달이 열릴 때 초기 데이터 설정
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setFormData(gridDataToFormData(initialData));
      } else {
        // 추가 모드: 빈 폼
        setFormData({
          VEHICLE_ID: "",
          VEHICLE_NO: "",
          AREA: "",
          CHASSIS_NO: "",
          VEHICLE_TYPE: "",
          VEHICLE_STATUS: "",
          MAKER: "",
          MODEL_NM: "",
          RELEASE_YEAR: "",
          FUEL_TYPE: "",
          START_DT: "",
          END_DT: "",
          CAPACITY: 0,
          REMARK: "",
        });
      }
    }
  }, [open, mode, initialData]);

  const handleChange = (
    field: keyof VehicleFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // 추가 모드에서는 VEHICLE_ID를 빈 문자열로 전송
      const submitData: VehicleFormData = {
        ...formData,
        VEHICLE_ID: mode === "add" ? "" : formData.VEHICLE_ID,
      };
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto sm:max-w-[1400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "차량 추가" : "차량 수정"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3">
          {/* 차량ID */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_id">차량ID</Label>
            <Input
              id="vehicle_id"
              type="text"
              value={formData.VEHICLE_ID || ""}
              onChange={(e) => handleChange("VEHICLE_ID", e.target.value)}
              disabled={true}
              className="bg-gray-100"
              maxLength={10}
            />
          </div>

          {/* 차량번호 */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_no">차량번호</Label>
            <Input
              id="vehicle_no"
              type="text"
              value={formData.VEHICLE_NO}
              onChange={(e) => handleChange("VEHICLE_NO", e.target.value)}
              maxLength={10}
            />
          </div>

          {/* 권역 */}
          <div className="space-y-2">
            <Label htmlFor="area">권역</Label>
            <Input
              id="area"
              type="text"
              value={formData.AREA}
              onChange={(e) => handleChange("AREA", e.target.value)}
              maxLength={10}
            />
          </div>

          {/* 운수사 */}
          <div className="space-y-2">
            <Label htmlFor="chassis_no">운수사</Label>
            <Input
              id="chassis_no"
              type="text"
              value={formData.CHASSIS_NO}
              onChange={(e) => handleChange("CHASSIS_NO", e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 차량종류 */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_type">차량종류</Label>
            <Input
              id="vehicle_type"
              type="text"
              value={formData.VEHICLE_TYPE}
              onChange={(e) => handleChange("VEHICLE_TYPE", e.target.value)}
              maxLength={5}
            />
          </div>

          {/* 차량상태 */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_status">차량상태</Label>
            <Input
              id="vehicle_status"
              type="text"
              value={formData.VEHICLE_STATUS}
              onChange={(e) => handleChange("VEHICLE_STATUS", e.target.value)}
              maxLength={10}
            />
          </div>

          {/* 제조사 */}
          <div className="space-y-2">
            <Label htmlFor="maker">제조사</Label>
            <Input
              id="maker"
              type="text"
              value={formData.MAKER}
              onChange={(e) => handleChange("MAKER", e.target.value)}
              maxLength={10}
            />
          </div>

          {/* 모델명 */}
          <div className="space-y-2">
            <Label htmlFor="model_nm">모델명</Label>
            <Input
              id="model_nm"
              type="text"
              value={formData.MODEL_NM}
              onChange={(e) => handleChange("MODEL_NM", e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 출고년도 */}
          <div className="space-y-2">
            <Label htmlFor="release_year">출고년도</Label>
            <Input
              id="release_year"
              type="text"
              value={formData.RELEASE_YEAR}
              onChange={(e) => handleChange("RELEASE_YEAR", e.target.value)}
              maxLength={4}
              placeholder="YYYY"
            />
          </div>

          {/* 연료형태 */}
          <div className="space-y-2">
            <Label htmlFor="fuel_type">연료형태</Label>
            <Input
              id="fuel_type"
              type="text"
              value={formData.FUEL_TYPE}
              onChange={(e) => handleChange("FUEL_TYPE", e.target.value)}
              maxLength={5}
            />
          </div>

          {/* 적용시작일 */}
          <div className="space-y-2">
            <Label htmlFor="start_dt">적용시작일</Label>
            <Input
              id="start_dt"
              type="date"
              value={formData.START_DT}
              onChange={(e) => handleChange("START_DT", e.target.value)}
            />
          </div>

          {/* 적용종료일 */}
          <div className="space-y-2">
            <Label htmlFor="end_dt">적용종료일</Label>
            <Input
              id="end_dt"
              type="date"
              value={formData.END_DT}
              onChange={(e) => handleChange("END_DT", e.target.value)}
            />
          </div>

          {/* 승차인원 */}
          <div className="space-y-2">
            <Label htmlFor="capacity">승차인원</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.CAPACITY}
              onChange={(e) =>
                handleChange("CAPACITY", parseInt(e.target.value) || 0)
              }
              min={0}
            />
          </div>

          {/* 비고 (전체 너비) */}
          <div className="space-y-2 col-span-2 md:col-span-3">
            <Label htmlFor="remark">비고</Label>
            <textarea
              id="remark"
              value={formData.REMARK}
              onChange={(e) => handleChange("REMARK", e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "저장 중..." : "완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

