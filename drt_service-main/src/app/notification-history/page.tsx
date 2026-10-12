"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Grid from "@/components/Grid";
import { FilterForm } from "@/components/ui/FilterForm";
import { notificationColumnDefs } from "@/features/notifications/constants/columnDefs";
import {
  defaultNotificationFields,
  notificationFields,
} from "@/features/notifications/constants/fieldconfig";
import type {
  NotificationFilters,
  NotificationRow,
} from "@/types/notification";
import { getNotificationHistoryList } from "@/lib/api/notification";

export default function NotificationHistoryPage() {
  const gridRef = useRef(null);

  const [filters, setFilters] =
    useState<NotificationFilters>(defaultNotificationFields);
  const [allRows, setAllRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);


  const columnDefs = useMemo(() => notificationColumnDefs, []);

  const fetchData = useCallback(async (searchFilters: NotificationFilters) => {
    setLoading(true);

    try {
      const rows = await getNotificationHistoryList(searchFilters);
      setAllRows(rows);
    }
    catch (error) {
      console.error("Error fetching notification data:", error);
    }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(defaultNotificationFields);
  }, [fetchData]);

  const handleSearch = (newFilters: NotificationFilters) => {
    setFilters(newFilters);
  };

  const rowData = useMemo(() => {
    return allRows.filter((row) => {
      const matchDate = filters.notificationDate
        ? String(row.noti_dtm ?? "").startsWith(filters.notificationDate)
        : true;
      return matchDate;
    });
  }, [allRows, filters]);

  return (
    <section>
      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">알림전송 이력</h1>
        <p className="mt-1 text-sm text-gray-500">알림전송 이력을 조회합니다.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <FilterForm<NotificationFilters>
          fields={notificationFields}
          defaultValues={defaultNotificationFields}
          values={filters}
          onSearch={handleSearch}
          className="mb-4"
        />

        <div className="relative" style={{ height: "calc(100vh - 400px)" }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}
          <Grid
            rowData={rowData}
            columnDefs={columnDefs}
            gridRef={gridRef}
            gridOptions={{
              onGridReady: (params: any) => {
                params.api?.sizeColumnsToFit();
              },
              onGridSizeChanged: (params: any) => {
                params.api?.sizeColumnsToFit();
              },
            }}
            height="100%"
            enableNumberColoring={true}
          />
        </div>
      </div>
    </section>
  );
}
