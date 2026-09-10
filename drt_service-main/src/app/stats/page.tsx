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

// 차트 색상 정의
const CHART_COLORS = {
  total: "#8884d8",
  card: "#82ca9d",
  cash: "#ffc658",
};

const PIE_COLORS = ["#82ca9d", "#ffc658"];

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
    <div
      className="h-full flex flex-col"
      style={{ height: "calc(100vh - 184px)" }}>
      {/* 페이지 제목 - 컴팩트하게 */}
      <div className="mb-2 flex-shrink-0">
        <h1 className="text-lg font-semibold">호출통계</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          노선별 호출 통계를 그리드와 차트로 확인할 수 있습니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <p>데이터를 불러오는 중...</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
          {/* 좌측: 그리드 (45% 너비) */}
          <div className="col-span-5 flex flex-col overflow-hidden border rounded-lg bg-white p-3">
            <h2 className="text-sm font-medium mb-2 flex-shrink-0">
              통계 데이터
            </h2>
            <div className="flex-1 min-h-0">
              <Grid
                rowData={allRows}
                columnDefs={columnDefs}
                gridRef={gridRef}
                height="100%"
                enableNumberColoring={true}
              />
            </div>
          </div>

          {/* 우측: 차트 영역 (55% 너비) */}
          <div className="col-span-7 flex flex-col overflow-hidden gap-3 min-h-0">
            {/* 상단: 두 개의 막대 차트 */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              {/* 노선별 전체 호출 막대 그래프 */}
              <div className="border rounded-lg p-3 bg-white flex flex-col overflow-hidden">
                <h3 className="text-xs font-semibold mb-2 flex-shrink-0">
                  전체 호출 건수
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        height={50}
                        fontSize={9}
                        interval={0}
                        tick={{ fill: "#666" }}
                      />
                      <YAxis fontSize={9} tick={{ fill: "#666" }} />
                      <Tooltip
                        contentStyle={{
                          fontSize: "11px",
                          padding: "6px 8px",
                          borderRadius: "4px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "9px", paddingTop: "8px" }}
                      />
                      <Bar
                        dataKey="전체호출"
                        fill={CHART_COLORS.total}
                        name="전체 호출"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 노선별 카드/현금 호출 비교 막대 그래프 */}
              <div className="border rounded-lg p-3 bg-white flex flex-col overflow-hidden">
                <h3 className="text-xs font-semibold mb-2 flex-shrink-0">
                  결제 수단별 호출
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        height={50}
                        fontSize={9}
                        interval={0}
                        tick={{ fill: "#666" }}
                      />
                      <YAxis fontSize={9} tick={{ fill: "#666" }} />
                      <Tooltip
                        contentStyle={{
                          fontSize: "11px",
                          padding: "6px 8px",
                          borderRadius: "4px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "9px", paddingTop: "8px" }}
                      />
                      <Bar
                        dataKey="카드호출"
                        fill={CHART_COLORS.card}
                        name="카드"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="현금호출"
                        fill={CHART_COLORS.cash}
                        name="현금"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 하단: 파이 차트 */}
            <div
              className="border rounded-lg p-3 bg-white flex flex-col overflow-hidden"
              style={{ height: "38%" }}>
              <h3 className="text-xs font-semibold mb-2 flex-shrink-0">
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
                          ? `${name}\n${(percent ? percent * 100 : 0).toFixed(
                            1
                          )}%`
                          : ""
                      }
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      fontSize={10}
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
                        fontSize: "11px",
                        padding: "6px 8px",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "10px" }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
