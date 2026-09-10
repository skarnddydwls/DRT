"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid from "@/components/Grid";
import { getStatsList } from "@/lib/api/stats";
import { statsColumnDefs } from "@/features/stats/columnDefs";
import type { StatsRow } from "@/types/stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// 차트 색상 정의 (현대적이고 직관적인 팔레트)
const CHART_COLORS = {
  total: "#3b82f6",
  card: "#10b981",
  cash: "#f59e0b",
};

const PIE_COLORS = ["#10b981", "#f59e0b"];

export default function StatsPage() {
  const gridRef = useRef(null);
  const [allRows, setAllRows] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(false);

  // API 호출로 데이터 가져오기
  const fetchStatsList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStatsList({});
      setAllRows(response.stats || []);
    } catch (error) {
      console.error("Failed to fetch stats list:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatsList();
  }, [fetchStatsList]);

  const columnDefs = useMemo(() => statsColumnDefs, []);

  // 차트 데이터 준비
  const chartData = useMemo(() => {
    return allRows.map((row) => ({
      name: row.route_nm || row.route_id,
      전체호출: row.total_calls || 0,
      카드호출: row.card_calls || 0,
      현금호출: row.cash_calls || 0,
    }));
  }, [allRows]);

  // 파이 차트 데이터 (전체 합계)
  const pieData = useMemo(() => {
    const totalCard = allRows.reduce(
      (sum, row) => sum + (row.card_calls || 0),
      0
    );
    const totalCash = allRows.reduce(
      (sum, row) => sum + (row.cash_calls || 0),
      0
    );
    return [
      { name: "카드 호출", value: totalCard },
      { name: "현금 호출", value: totalCash },
    ];
  }, [allRows]);

  return (
    <section>
      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">호출통계</h1>
        <p className="mt-1 text-sm text-gray-500">
          노선별 호출 통계를 그리드와 차트로 확인할 수 있습니다.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div
          className="relative"
          style={{ height: "calc(100vh - 310px)" }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-700">데이터를 불러오는 중...</p>
            </div>
          )}

          <div className="h-full grid grid-cols-12 gap-4 overflow-hidden min-h-0">
            {/* 좌측: 그리드 (5/12 너비) */}
            <div className="col-span-5 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/40 p-4 min-h-0">
              <div className="mb-3 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-bold text-gray-800">
                  통계 데이터
                </h2>
                <span className="text-xs text-gray-500">
                  총 {allRows.length}개 노선
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <Grid
                  rowData={allRows}
                  columnDefs={columnDefs}
                  gridRef={gridRef}
                  gridOptions={{
                    rowSelection: "single",
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

            {/* 우측: 차트 영역 (7/12 너비) */}
            <div className="col-span-7 flex flex-col overflow-hidden gap-4 min-h-0">
              {/* 상단: 두 개의 막대 차트 */}
              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                {/* 노선별 전체 호출 막대 그래프 */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 flex flex-col overflow-hidden">
                  <h3 className="text-xs font-bold text-gray-700 mb-2 flex-shrink-0">
                    노선별 전체 호출 건수
                  </h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="name"
                          angle={-25}
                          textAnchor="end"
                          height={45}
                          fontSize={11}
                          interval={0}
                          tick={{ fill: "#6b7280" }}
                        />
                        <YAxis fontSize={11} tick={{ fill: "#6b7280" }} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "12px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                        />
                        <Bar
                          dataKey="전체호출"
                          fill={CHART_COLORS.total}
                          name="전체 호출"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 노선별 카드/현금 호출 비교 막대 그래프 */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 flex flex-col overflow-hidden">
                  <h3 className="text-xs font-bold text-gray-700 mb-2 flex-shrink-0">
                    결제 수단별 호출 비교
                  </h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="name"
                          angle={-25}
                          textAnchor="end"
                          height={45}
                          fontSize={11}
                          interval={0}
                          tick={{ fill: "#6b7280" }}
                        />
                        <YAxis fontSize={11} tick={{ fill: "#6b7280" }} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "12px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                        />
                        <Bar
                          dataKey="카드호출"
                          fill={CHART_COLORS.card}
                          name="카드"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="현금호출"
                          fill={CHART_COLORS.cash}
                          name="현금"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 하단: 파이 차트 */}
              <div
                className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 flex flex-col overflow-hidden"
                style={{ height: "42%" }}>
                <h3 className="text-xs font-bold text-gray-700 mb-2 flex-shrink-0">
                  전체 결제 수단 비율
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) =>
                          value > 0
                            ? `${name}: ${(percent ? percent * 100 : 0).toFixed(1)}%`
                            : ""
                        }
                        outerRadius={65}
                        fill="#8884d8"
                        dataKey="value"
                        fontSize={11}
                        stroke="#fff"
                        strokeWidth={2}>
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: "12px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
