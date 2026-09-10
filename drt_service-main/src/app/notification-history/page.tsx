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
      const response = await fetch("/api/notifications/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: searchFilters,
        }),
      });
      if (!response.ok) {
        throw new Error(`조회 실패 (상태코드: ${response.status})`);
      }
      const data = (await response.json()) as {
        notifications?: Array<Record<string, unknown>>;
      };
      const mappedRows: NotificationRow[] = (data.notifications ?? []).map((item) => ({
        noti_dtm: String(item.noti_dtm ?? ""),
        noti_type: String(item.noti_type ?? ""),
        noti_target: String(item.noti_target ?? ""),
        noti_title: String(item.noti_title ?? ""),
        noti_content: String(item.noti_content ?? ""),
      }));

      setAllRows(mappedRows);
    }
    catch (error) {
      console.error("Error fetching notification data:", error);
    }
    finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (newFilters: NotificationFilters) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };


  return (
    <section className="rounded-xl border bg-white p-4">
      {/* 페이지 제목 */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">알림전송 이력</h1>
      </div>

      <FilterForm<NotificationFilters>
        fields={notificationFields}
        defaultValues={defaultNotificationFields}
        values={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        className="mb-4"
      />

      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: 560 }}
        >
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        <Grid
          rowData={allRows}
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
          height={"calc(100vh - 400px)"}
          enableNumberColoring={true}
        />
      )}
    </section>
  );
}