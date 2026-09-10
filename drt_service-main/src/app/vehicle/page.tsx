"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RowClickedEvent } from "ag-grid-community";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { VehicleFormModal } from "@/components/VehicleFormModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/Toast";
import {
  getVehicleList,
  insertVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/lib/api/vehicle";
import { vehicleColumnDefs } from "@/features/vehicle/columnDefs";
import { defaultFilters, vehicleFields } from "@/features/vehicle/fieldconfig";
import type {
  VehicleFilters,
  VehicleRow,
  VehicleFormData,
} from "@/types/vehicle";

export default function VehiclePage() {
  const gridRef = useRef(null);

  const [filters, setFilters] = useState<VehicleFilters>(defaultFilters);
  const [allRows, setAllRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<VehicleRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  // 토스트 메시지 표시
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type, isVisible: true });
    },
    []
  );

  // API 호출로 데이터 가져오기
  const fetchVehicleList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getVehicleList(filters);
      setAllRows(response.vehicles);
    } catch (error) {
      console.error("Failed to fetch vehicle list:", error);
      showToast("차량 목록을 불러오는데 실패했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchVehicleList();
  }, [fetchVehicleList]);

  // 필터링된 데이터 (필요시 클라이언트 사이드 추가 필터링)
  const rowData = useMemo(() => {
    return allRows.filter((r) => {
      const matchVehicle = filters.vehicleNo
        ? String(r["vehicle_no"]).includes(filters.vehicleNo)
        : true;
      return matchVehicle;
    });
  }, [allRows, filters]);

  const columnDefs = useMemo(() => vehicleColumnDefs, []);

  // 그리드 행 클릭 핸들러
  const handleRowClicked = (event: RowClickedEvent<VehicleRow>) => {
    setSelectedRow(event.data);
  };

  // 추가 핸들러
  const handleAdd = () => {
    setSelectedRow(null);
    setIsAddModalOpen(true);
  };

  // 수정 핸들러
  const handleEdit = () => {
    if (selectedRow) {
      setIsEditModalOpen(true);
    }
  };

  // 삭제 핸들러
  const handleDelete = () => {
    if (selectedRow) {
      setIsDeleteConfirmOpen(true);
    }
  };

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!selectedRow || !selectedRow.vehicle_id) {
      showToast("삭제할 차량을 선택해주세요.", "error");
      return;
    }

    try {
      await deleteVehicle(selectedRow.vehicle_id);
      showToast("차량이 삭제되었습니다.", "success");
      setSelectedRow(null);
      setIsDeleteConfirmOpen(false);
      await fetchVehicleList();
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      showToast("차량 삭제에 실패했습니다.", "error");
    }
  };

  // 추가/수정 폼 제출 핸들러
  const handleFormSubmit = async (data: VehicleFormData) => {
    try {
      if (isAddModalOpen) {
        await insertVehicle(data);
        showToast("차량이 추가되었습니다.", "success");
        setIsAddModalOpen(false);
      } else if (isEditModalOpen) {
        await updateVehicle(data);
        showToast("차량이 수정되었습니다.", "success");
        setIsEditModalOpen(false);
        setSelectedRow(null);
      }
      await fetchVehicleList();
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      showToast(
        isAddModalOpen
          ? "차량 추가에 실패했습니다."
          : "차량 수정에 실패했습니다.",
        "error"
      );
      throw error;
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4">
      {/* 페이지 제목 */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">차량관리</h1>
      </div>

      <FilterForm<VehicleFilters>
        fields={vehicleFields}
        defaultValues={defaultFilters}
        values={filters}
        onChange={setFilters}
        onSearch={(v) => setFilters(v)}
        className="mb-4"
      />

      {/* 액션 바: 추가/수정/삭제 (필터와 그리드 사이, 우측 정렬) */}
      <div className="flex justify-end gap-2 mb-3">
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleAdd}>
          추가
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleEdit}
          disabled={!selectedRow}>
          수정
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={!selectedRow}>
          삭제
        </button>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 560 }}>
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        <Grid
          rowData={rowData}
          columnDefs={columnDefs}
          gridRef={gridRef}
          gridOptions={{
            rowSelection: "single",
            suppressRowClickSelection: false,
            onRowClicked: handleRowClicked,
            getRowStyle: (params) => {
              if (
                selectedRow &&
                params.data?.vehicle_id === selectedRow.vehicle_id
              ) {
                return { backgroundColor: "#e3f2fd" };
              }
              return undefined;
            },
          }}
          height={"calc(100vh - 400px)"}
          enableNumberColoring={true}
        />
      )}

      {/* 추가 모달 */}
      <VehicleFormModal
        open={isAddModalOpen}
        mode="add"
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* 수정 모달 */}
      <VehicleFormModal
        open={isEditModalOpen}
        mode="edit"
        initialData={selectedRow}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => setIsDeleteConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>차량 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              선택한 차량을 삭제하시겠습니까?
              <br />
              <span className="font-semibold">
                차량ID: {selectedRow?.vehicle_id} / 차량번호:{" "}
                {selectedRow?.vehicle_no}
              </span>
            </p>
            <p className="mt-2 text-sm text-red-600">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 토스트 메시지 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </section>
  );
}
