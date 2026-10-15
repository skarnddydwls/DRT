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
import { getDetailCodes, type DetailCodeRow } from "@/lib/api/common";

const vehicleCodeFields = ["CHASSIS_NO", "VEHICLE_TYPE", "VEHICLE_STATUS"] as const;
type VehicleCodeField = typeof vehicleCodeFields[number];
const vehicleCodeLabels: Record<VehicleCodeField, string> = {
  CHASSIS_NO: "운수사", VEHICLE_TYPE: "차량종류", VEHICLE_STATUS: "차량상태",
};
function optionValue(code: DetailCodeRow) {
  return code.value || code.detail_code.trim();
}

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
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState("");
  const [codes, setCodes] = useState<Record<VehicleCodeField, DetailCodeRow[]>>({
    CHASSIS_NO: [], VEHICLE_TYPE: [], VEHICLE_STATUS: [],
  });
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

  useEffect(() => {
    if (!open) return;
    let active = true;
    setCodesLoading(true);
    setCodesError("");
    Promise.all(vehicleCodeFields.map((field) => getDetailCodes(field)))
      .then((results) => {
        if (!active) return;
        const next = Object.fromEntries(vehicleCodeFields.map((field, index) => [
          field, results[index].codes.slice().sort((a, b) => a.detail_code.localeCompare(b.detail_code)),
        ])) as Record<VehicleCodeField, DetailCodeRow[]>;
        setCodes(next);
        if (vehicleCodeFields.some((field) => !next[field].length)) {
          setCodesError("운수사·차량종류·차량상태 공통코드를 등록해주세요.");
        }
        if (mode === "add") {
          setFormData((current) => ({ ...current,
            CHASSIS_NO: next.CHASSIS_NO[0] ? optionValue(next.CHASSIS_NO[0]) : "",
            VEHICLE_TYPE: next.VEHICLE_TYPE[0] ? optionValue(next.VEHICLE_TYPE[0]) : "",
            VEHICLE_STATUS: next.VEHICLE_STATUS[0] ? optionValue(next.VEHICLE_STATUS[0]) : "",
          }));
        }
      })
      .catch(() => { if (active) setCodesError("차량 공통코드를 불러오지 못했습니다. 팝업을 다시 열어주세요."); })
      .finally(() => { if (active) setCodesLoading(false); });
    return () => { active = false; };
  }, [open, mode]);

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
    if (codesLoading || codesError || vehicleCodeFields.some((field) => !formData[field])) return;
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

          {vehicleCodeFields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field.toLowerCase()}>{vehicleCodeLabels[field]}</Label>
              <select id={field.toLowerCase()} value={formData[field]}
                onChange={(event) => handleChange(field, event.target.value)}
                disabled={saving || codesLoading || Boolean(codesError)}
                className="h-9 w-full rounded-md border bg-white px-3 text-sm disabled:opacity-50">
                <option value="" disabled>{codesLoading ? "불러오는 중..." : "선택하세요"}</option>
                {mode === "edit" && formData[field] && !codes[field].some((code) => optionValue(code) === formData[field]) && (
                  <option value={formData[field]}>{formData[field]} (기존 값)</option>
                )}
                {codes[field].map((code) => <option key={code.detail_code} value={optionValue(code)}>{code.label || optionValue(code)}</option>)}
              </select>
            </div>
          ))}

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

        {codesError && <p role="alert" className="text-sm text-red-600">{codesError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={saving || codesLoading || Boolean(codesError) || vehicleCodeFields.some((field) => !formData[field])}>
            {saving ? "저장 중..." : "완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

