"use client";

import { useEffect, useState } from "react";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import { Box, Chip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  DollarSign,
  Eye,
  Search,
  ShieldCheck,
  Scale,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  fetchReportDashboard,
  fetchReportHistory,
} from "@/services/api/reportGeneratorApi";
import type {
  HistoricalReport,
  ReportDashboard,
  ReportDashboardMetric,
  ReportStatus,
} from "@/types/reportGenerator";

const REPORT_STATUS_STYLE: Record<
  ReportStatus,
  { color: string; backgroundColor: string }
> = {
  已完成: { color: "#28665F", backgroundColor: "#EFF7F5" },
  產生中: { color: "#B07D32", backgroundColor: "#FBF5EA" },
  失敗: { color: "#B85450", backgroundColor: "#FAEEEE" },
};

const metricIconMap = {
  barChart: BarChart3,
  trendingUp: TrendingUp,
  scale: Scale,
  shieldCheck: ShieldCheck,
  dollarSign: DollarSign,
} as const;

function getReportDisplayName(report: HistoricalReport) {
  return (report.fileName || report.title).replace(/\.docx$/i, "");
}

function formatAmount(value: number) {
  return `${value.toLocaleString("zh-TW")} 億元`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("zh-TW")}%`;
}

function DashboardMetricCard(props: { item: ReportDashboardMetric }) {
  const Icon = props.item.iconKey ? metricIconMap[props.item.iconKey] : BarChart3;
  const hasCalculationError =
    props.item.calculationStatus === "incomplete" || Boolean(props.item.calculationReason);

  return (
    <div
      className={`relative h-full rounded-lg border px-5 py-4 shadow-sm ${
        hasCalculationError
          ? "min-h-[160px] border-[#B85450]/30 bg-[#B85450]/10"
          : "border-[#D8E1E7] bg-white"
      }`}
    >
      <div className={`flex h-full flex-col ${hasCalculationError ? "min-h-[128px]" : ""}`}>
        <div className="flex min-h-10 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              hasCalculationError ? "bg-[#B85450]/15 text-[#B85450]" : "bg-[#EFF7F5] text-[#3F8F86]"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div
            className={`min-w-0 text-sm font-medium leading-5 ${
              hasCalculationError ? "text-[#B85450]" : "text-[#64748B]"
            }`}
          >
            {props.item.label}
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <div className="flex flex-1 flex-col justify-center">
            <div
              className={`text-2xl font-semibold leading-tight ${
                hasCalculationError ? "text-[#B85450]" : "text-[#1F2937]"
              }`}
            >
              {props.item.value}
            </div>
            {props.item.calculationReason ? (
              <div className="mt-2 text-xs font-semibold text-[#B85450]">計算異常</div>
            ) : null}
          </div>
          <div
            className={`pt-2 text-xs font-semibold ${
              hasCalculationError ? "text-[#B85450]" : "text-[#28665F]"
            }`}
          >
            {props.item.trend}
          </div>
        </div>

        {props.item.calculationReason ? (
          <div className="mt-3 flex min-h-7 items-center">
            <div className="group relative">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#B85450] text-white shadow-sm transition-colors hover:bg-[#9F4744] focus:outline-none focus:ring-2 focus:ring-[#B85450]/30"
                aria-label={`查看${props.item.label}錯誤訊息`}
                title="查看錯誤訊息"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-9 left-0 z-30 w-[min(280px,calc(100vw-3rem))] translate-y-1 rounded-2xl border-2 border-[#B85450]/40 bg-white px-4 py-3 text-sm leading-6 text-[#1F2937] opacity-0 shadow-[0_14px_35px_rgba(31,41,55,0.16)] transition duration-150 before:absolute before:-bottom-2 before:left-5 before:h-4 before:w-4 before:rotate-45 before:border-b-2 before:border-r-2 before:border-[#B85450]/40 before:bg-white group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
              >
                <div className="mb-1 text-xs font-semibold text-[#B85450]">指標計算異常</div>
                <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1">
                  {props.item.calculationReason}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// TODO: 歷史報告下載功能尚未完成，待後端串接雲端物件儲存後恢復。
// async function downloadHistoricalReport(report: HistoricalReport) {
//   const documentResult = await downloadReportHistoryDocument(report);
//   const downloadUrl = URL.createObjectURL(documentResult.blob);
//   const link = document.createElement("a");
//   link.href = downloadUrl;
//   link.download = documentResult.filename;
//   link.click();
//   URL.revokeObjectURL(downloadUrl);
// }

export default function ReportHistoryPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.reportGeneratorHistory}>
      <MembershipSessionGuard>
        <ReportHistoryContent />
      </MembershipSessionGuard>
    </MembershipRouteGuard>
  );
}

function ReportHistoryContent() {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const [reportHistory, setReportHistory] = useState<HistoricalReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [selectedDashboardReport, setSelectedDashboardReport] =
    useState<HistoricalReport | null>(null);
  const [selectedDashboard, setSelectedDashboard] =
    useState<ReportDashboard | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [isServerPaginated, setIsServerPaginated] = useState(true);

  async function openDashboard(report: HistoricalReport) {
    setSelectedDashboardReport(report);
    setSelectedDashboard(null);
    setDashboardError("");
    setIsDashboardLoading(true);

    try {
      setSelectedDashboard(await fetchReportDashboard(report.id));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Dashboard 載入失敗");
    } finally {
      setIsDashboardLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchKeyword]);

  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [selectedStatus]);

  useEffect(() => {
    let ignore = false;

    async function loadReportHistory() {
      try {
        setIsLoadingReports(true);
        setHistoryError("");
        const result = await fetchReportHistory({
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          keyword: debouncedSearchKeyword,
          status: selectedStatus,
        });

        if (!ignore) {
          setReportHistory(result.reports);
          setIsServerPaginated(typeof result.total === "number");
          setRowCount(
            typeof result.total === "number"
              ? result.total
              : result.reports.length,
          );
        }
      } catch (error) {
        if (!ignore) {
          setHistoryError(
            error instanceof Error ? error.message : "歷史報告載入失敗",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingReports(false);
        }
      }
    }

    loadReportHistory();

    return () => {
      ignore = true;
    };
  }, [
    debouncedSearchKeyword,
    paginationModel.page,
    paginationModel.pageSize,
    selectedStatus,
  ]);

  const columns: GridColDef<HistoricalReport>[] = [
    {
      field: "fileName",
      headerName: "報告名稱",
      minWidth: 240,
      flex: 1.2,
      renderCell: (params: GridRenderCellParams<HistoricalReport, string>) => (
        <div className="flex h-full items-center py-3 text-sm font-semibold leading-6 text-[#1F2937]">
          <div className="whitespace-normal break-words">
            {getReportDisplayName(params.row)}
          </div>
        </div>
      ),
    },
    {
      field: "company",
      headerName: "公司",
      minWidth: 170,
      flex: 0.9,
      renderCell: (params: GridRenderCellParams<HistoricalReport, string>) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-[#64748B]">
          <div className="whitespace-normal break-words">{params.row.company}</div>
        </div>
      ),
    },
    {
      field: "reportType",
      headerName: "報告類型",
      minWidth: 150,
      flex: 0.8,
      renderCell: (params: GridRenderCellParams<HistoricalReport, string>) => (
        <div className="flex h-full items-center">
          <Chip
            label={params.row.reportType}
            size="small"
            sx={{
              fontWeight: 700,
              color: "#28665F",
              backgroundColor: "#EFF7F5",
              borderRadius: "999px",
            }}
          />
        </div>
      ),
    },
    {
      field: "period",
      headerName: "期間",
      minWidth: 120,
      flex: 0.55,
      renderCell: (params: GridRenderCellParams<HistoricalReport, string>) => (
        <div className="flex h-full items-center text-sm text-[#64748B]">
          {params.row.year} {params.row.period}
        </div>
      ),
    },
    {
      field: "generatedAt",
      headerName: "產生時間",
      minWidth: 170,
      flex: 0.8,
      renderCell: (params: GridRenderCellParams<HistoricalReport, string>) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-[#64748B]">
          <CalendarClock className="mr-2 h-4 w-4 text-[#659B94]" />
          {params.row.generatedAt}
        </div>
      ),
    },
    {
      field: "status",
      headerName: "狀態",
      minWidth: 110,
      flex: 0.45,
      renderCell: (params: GridRenderCellParams<HistoricalReport, ReportStatus>) => {
        const style = REPORT_STATUS_STYLE[params.row.status];

        return (
          <div className="flex h-full items-center">
            <Chip
              label={params.row.status}
              size="small"
              sx={{
                fontWeight: 700,
                color: style.color,
                backgroundColor: style.backgroundColor,
                borderRadius: "999px",
              }}
            />
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "操作",
      width: 230,
      minWidth: 230,
      maxWidth: 230,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<HistoricalReport>) => {
        const disabled = params.row.status !== "已完成";

        return (
          <div className="flex h-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2.5"
              disabled={disabled}
              onClick={() => openDashboard(params.row)}
            >
              <Eye className="h-4 w-4 text-[#28665F]" />
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2.5 text-[#64748B]"
              disabled
              title="歷史報告下載功能尚未完成"
            >
              尚未完成
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <main className="h-full overflow-y-auto bg-[#F6F8FA]">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-[#D8E1E7] bg-gradient-to-br from-[#EFF7F5] via-white to-[#F6F8FA] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-[#28665F]">
                REPORT HISTORY
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1F2937]">
                歷史報告
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#64748B]">
                查看已產生完成的徵審報告；歷史報告下載功能尚未完成。
              </p>
            </div>
            <div className="pointer-events-none ml-auto hidden flex-1 justify-end text-[#659B94]/25 md:flex">
              <HistoryEduIcon sx={{ fontSize: "clamp(112px,14vw,180px)" }} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#D8E1E7] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">已產生的報告</h2>
              <p className="text-sm text-muted-foreground">
                可依狀態、公司、年度、報告名稱與產生人員搜尋歷史報告。
              </p>
              {isLoadingReports ? (
                <p className="mt-2 text-sm text-[#64748B]">載入歷史報告中...</p>
              ) : null}
              {historyError ? (
                <p className="mt-2 text-sm font-medium text-[#B85450]">{historyError}</p>
              ) : null}
              {dashboardError ? (
                <p className="mt-2 text-sm font-medium text-[#B85450]">{dashboardError}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="">全部狀態</option>
                <option value="已完成">已完成</option>
                <option value="產生中">產生中</option>
                <option value="失敗">失敗</option>
              </select>

              <div className="relative w-full min-w-[260px] sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#659B94]" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜尋公司、報告名稱、年度、類型或產生人員"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Box
              sx={{
                width: "100%",
                color: "#1F2937",
                "& .MuiDataGrid-root": {
                  borderColor: "#D8E1E7",
                },
                "& .MuiDataGrid-cell": {
                  alignItems: "stretch",
                  borderBottomColor: "#E5EAEF",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#F6F8FA",
                  color: "#64748B",
                  borderBottomColor: "#D8E1E7",
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTopColor: "#D8E1E7",
                },
              }}
            >
              <DataGrid
                autoHeight
                rows={reportHistory}
                columns={columns}
                loading={isLoadingReports}
                disableRowSelectionOnClick
                disableColumnFilter
                disableDensitySelector
                disableColumnSelector
                initialState={{
                  sorting: {
                    sortModel: [{ field: "generatedAt", sort: "desc" }],
                  },
                }}
                paginationMode={isServerPaginated ? "server" : "client"}
                paginationModel={paginationModel}
                onPaginationModelChange={(nextModel) => setPaginationModel((current) => ({ ...nextModel, page: nextModel.pageSize !== current.pageSize ? 0 : nextModel.page }))}
                rowCount={isServerPaginated ? rowCount : undefined}
                pageSizeOptions={[5, 10, 25, 50]}
                localeText={{
                  noRowsLabel: "目前沒有符合條件的歷史報告",
                }}
                getRowHeight={() => 84}
              />
            </Box>
          </div>
        </section>
      </div>

      <Dialog
        open={!!selectedDashboardReport}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDashboardReport(null);
            setSelectedDashboard(null);
            setDashboardError("");
          }
        }}
      >
        <DialogContent className="max-h-[92vh] w-[calc(100vw-48px)] max-w-7xl overflow-hidden rounded-xl border border-[#D8E1E7] bg-[#F6F8FA] p-0 shadow-2xl">
          <DialogHeader className="border-b border-[#D8E1E7] bg-white px-6 py-5 text-left shadow-sm">
            <DialogTitle className="text-2xl text-[#1F2937]">
              {selectedDashboardReport ? getReportDisplayName(selectedDashboardReport) : "Dashboard"}
            </DialogTitle>
            <DialogDescription className="text-[#64748B]">
              {selectedDashboardReport
                ? `${selectedDashboardReport.company}｜${selectedDashboardReport.year} ${selectedDashboardReport.period}`
                : "歷史報告 Dashboard"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[calc(92vh-96px)] w-full flex-col gap-5 overflow-y-auto px-6 py-6">
            {isDashboardLoading ? (
              <div className="rounded-lg border border-[#D8E1E7] bg-white px-5 py-10 text-center text-sm text-[#64748B]">
                Dashboard 載入中...
              </div>
            ) : null}

            {dashboardError ? (
              <div className="rounded-lg border border-[#B85450]/30 bg-[#B85450]/10 px-5 py-4 text-sm font-medium text-[#B85450]">
                {dashboardError}
              </div>
            ) : null}

            {selectedDashboard ? (
              <>
                <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#1F2937]">AI 分析摘要</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedDashboard.summaryItems.length ? selectedDashboard.summaryItems.map((item) => (
                      <div key={item} className="rounded-md border border-[#A9C8C3] bg-[#EFF7F5] px-4 py-3 text-sm leading-6 text-[#1F2937]">
                        {item}
                      </div>
                    )) : (
                      <div className="rounded-md border border-dashed border-[#D8E1E7] px-4 py-8 text-center text-sm text-[#64748B] md:col-span-2">
                        此報告沒有分析摘要。
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#1F2937]">
                    {selectedDashboard.metricsTitle || "關鍵財務指標"}
                  </h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {selectedDashboard.metrics.length ? selectedDashboard.metrics.map((item) => (
                      <DashboardMetricCard key={item.label} item={item} />
                    )) : (
                      <div className="rounded-md border border-dashed border-[#D8E1E7] px-4 py-8 text-center text-sm text-[#64748B] md:col-span-2 xl:col-span-6">
                        此報告沒有關鍵財務指標。
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-[#D8E1E7] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[#1F2937]">財務趨勢圖</h2>
                    <span className="text-xs font-medium text-[#64748B]">
                      近八季
                    </span>
                  </div>
                  <div className="mt-5 h-[420px] min-w-0 overflow-x-auto">
                    {selectedDashboard.financialTrends.length ? (
                      <div className="h-full min-w-[860px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={selectedDashboard.financialTrends}
                            margin={{ top: 8, right: 12, bottom: 24, left: 8 }}
                            barGap={4}
                            barCategoryGap="16%"
                          >
                            <CartesianGrid stroke="#E5EAEF" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="period"
                              interval={0}
                              axisLine={{ stroke: "#D8E1E7" }}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 12 }}
                            />
                            <YAxis
                              yAxisId="amount"
                              width={58}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 12 }}
                              tickFormatter={(value: number) => value.toLocaleString("zh-TW")}
                              label={{
                                value: "億元",
                                angle: -90,
                                position: "insideLeft",
                                fill: "#64748B",
                                fontSize: 12,
                              }}
                            />
                            <YAxis
                              yAxisId="margin"
                              orientation="right"
                              width={44}
                              domain={[0, 70]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748B", fontSize: 12 }}
                              tickFormatter={(value: number) => formatPercent(value)}
                              label={{
                                value: "百分比",
                                angle: 90,
                                position: "insideRight",
                                fill: "#64748B",
                                fontSize: 12,
                              }}
                            />
                            <Tooltip
                              cursor={{ fill: "#F6F8FA" }}
                              formatter={(value, name) => {
                                if (value === null || value === undefined) {
                                  return ["-", name];
                                }
                                const numericValue = Number(value);
                                return [
                                  name === "毛利率"
                                    ? formatPercent(numericValue)
                                    : formatAmount(numericValue),
                                  name,
                                ];
                              }}
                              contentStyle={{
                                borderColor: "#D8E1E7",
                                borderRadius: 8,
                                color: "#1F2937",
                                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                              }}
                            />
                            <Legend
                              verticalAlign="top"
                              align="center"
                              iconType="circle"
                              wrapperStyle={{ paddingBottom: 12, fontSize: 13 }}
                            />
                            <Bar yAxisId="amount" dataKey="revenue" name="營收" fill="#3F8F86" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="amount" dataKey="netIncome" name="淨利" fill="#91AAA6" radius={[4, 4, 0, 0]}>
                              {selectedDashboard.financialTrends.map((entry) => (
                                <Cell
                                  key={`net-income-${entry.period}`}
                                  fill={Number(entry.netIncome) < 0 ? "#B85450" : "#91AAA6"}
                                />
                              ))}
                            </Bar>
                            <Line
                              yAxisId="margin"
                              type="monotone"
                              dataKey="grossMargin"
                              name="毛利率"
                              stroke="#285C57"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#285C57", strokeWidth: 0 }}
                              activeDot={{ r: 6, fill: "#285C57", stroke: "#ffffff", strokeWidth: 2 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#D8E1E7] px-4 text-center text-sm text-[#64748B]">
                        此報告沒有財務趨勢資料。
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
        </main>
  );
}
