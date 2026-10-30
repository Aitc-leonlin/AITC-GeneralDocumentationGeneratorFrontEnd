"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import ConstructionIcon from "@mui/icons-material/Construction";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EngineeringIcon from "@mui/icons-material/Engineering";
import FoundationIcon from "@mui/icons-material/Foundation";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MemoryIcon from "@mui/icons-material/Memory";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import TvIcon from "@mui/icons-material/Tv";
import { Box, Chip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridPaginationModel,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";
import { CalendarClock, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
} from "@/data/expertKnowledgeOptions";
import type { ExpertKnowledgeEntry } from "@/types/expertKnowledge";
import {
  deleteExpertKnowledgeEntry,
  fetchExpertKnowledgeEntries,
} from "@/services/api/expertKnowledgeApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

const INDUSTRY_ICON_PROPS = { sx: { fontSize: 16, color: "#075985" } } as const;
const TITLE_INDUSTRY_ICON_PROPS = { sx: { fontSize: 18, color: "#0f172a" } } as const;

const INDUSTRY_ICON_MAP = {
  水泥建材: <FoundationIcon {...INDUSTRY_ICON_PROPS} />,
  半導體: <MemoryIcon {...INDUSTRY_ICON_PROPS} />,
  生技醫療: <HealthAndSafetyIcon {...INDUSTRY_ICON_PROPS} />,
  光電: <TvIcon {...INDUSTRY_ICON_PROPS} />,
  汽車工業: <DirectionsCarIcon {...INDUSTRY_ICON_PROPS} />,
  其他電子: <ElectricalServicesIcon {...INDUSTRY_ICON_PROPS} />,
  金融保險: <ApartmentIcon {...INDUSTRY_ICON_PROPS} />,
  建設營造: <ConstructionIcon {...INDUSTRY_ICON_PROPS} />,
  紡織纖維: <CheckroomIcon {...INDUSTRY_ICON_PROPS} />,
  通信網路: <SettingsInputAntennaIcon {...INDUSTRY_ICON_PROPS} />,
  貿易百貨: <LocalMallIcon {...INDUSTRY_ICON_PROPS} />,
  電子通路: <StorefrontIcon {...INDUSTRY_ICON_PROPS} />,
  電子零組件: <PrecisionManufacturingIcon {...INDUSTRY_ICON_PROPS} />,
  電線電纜: <ElectricalServicesIcon {...INDUSTRY_ICON_PROPS} />,
  機電設備: <EngineeringIcon {...INDUSTRY_ICON_PROPS} />,
  觀光旅遊: <TravelExploreIcon {...INDUSTRY_ICON_PROPS} />,
} as const;

const TITLE_INDUSTRY_ICON_MAP = {
  水泥建材: <FoundationIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  半導體: <MemoryIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  生技醫療: <HealthAndSafetyIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  光電: <TvIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  汽車工業: <DirectionsCarIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  其他電子: <ElectricalServicesIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  金融保險: <ApartmentIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  建設營造: <ConstructionIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  紡織纖維: <CheckroomIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  通信網路: <SettingsInputAntennaIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  貿易百貨: <LocalMallIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  電子通路: <StorefrontIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  電子零組件: <PrecisionManufacturingIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  電線電纜: <ElectricalServicesIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  機電設備: <EngineeringIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
  觀光旅遊: <TravelExploreIcon {...TITLE_INDUSTRY_ICON_PROPS} />,
} as const;

function renderCompanyLabel(entry: ExpertKnowledgeEntry) {
  return entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE ||
    !entry.companyLabel
    ? "不指定特定公司"
    : entry.companyLabel;
}

function formatDateTime(value: string | null | undefined, fallback: string) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) return fallback;

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) return trimmedValue;

  return date.toLocaleString("zh-TW");
}

export default function ExpertKnowledgePage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.creditAiExpertKnowledge}>
      <ExpertKnowledgeContent />
    </MembershipRouteGuard>
  );
}

function ExpertKnowledgeContent() {
  const { hasPermission } = useMembershipPermissions();
  const [entries, setEntries] = useState<ExpertKnowledgeEntry[]>([]);
  const [detailEntry, setDetailEntry] = useState<ExpertKnowledgeEntry | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<ExpertKnowledgeEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const canAdd = hasPermission(MODULE_PERMISSIONS.creditAiExpertKnowledgeAdd);
  const canEdit = hasPermission(MODULE_PERMISSIONS.creditAiExpertKnowledgeEdit);
  const canDelete = hasPermission(MODULE_PERMISSIONS.creditAiExpertKnowledgeDelete);
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchKeyword]);

  useEffect(() => {
    let isMounted = true;

    async function loadEntries() {
      try {
        setIsLoading(true);
        const result = await fetchExpertKnowledgeEntries({
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          search: debouncedSearchKeyword,
        });

        if (!isMounted) return;
        setEntries(result.entries);
        setRowCount(result.total);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error ? error.message : "讀取專家知識庫失敗",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchKeyword, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [debouncedSearchKeyword, paginationModel.page, paginationModel.pageSize]);

  async function confirmDeleteEntry() {
    if (!pendingDeleteEntry || isDeletingEntry) return;
    try {
      setIsDeletingEntry(true);
      await deleteExpertKnowledgeEntry(pendingDeleteEntry.id);
      toast.success("已刪除專家指引");
      setSelectedEntryIds((current) => {
        const next = new Set(current);
        next.delete(pendingDeleteEntry.id);
        return next;
      });
      setPendingDeleteEntry(null);
      if (entries.length === 1 && paginationModel.page > 0) {
        setPaginationModel((current) => ({
          ...current,
          page: current.page - 1,
        }));
        return;
      }
      const result = await fetchExpertKnowledgeEntries({
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        search: debouncedSearchKeyword,
      });
      setEntries(result.entries);
      setRowCount(result.total);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "刪除專家指引失敗",
      );
    } finally {
      setIsDeletingEntry(false);
    }
  }

  async function confirmBatchDelete() {
    if (selectedEntries.length === 0 || isBatchDeleting) return;
    const targets = [...selectedEntries];
    try {
      setIsBatchDeleting(true);
      const results = await Promise.allSettled(
        targets.map((entry) => deleteExpertKnowledgeEntry(entry.id)),
      );
      const failedCount = results.filter((result) => result.status === "rejected").length;
      const deletedCount = targets.length - failedCount;

      setIsBatchDeleteOpen(false);
      setSelectedEntryIds(new Set());
      if (deletedCount > 0) toast.success(`已刪除 ${deletedCount} 筆專家指引`);
      if (failedCount > 0) toast.error(`${failedCount} 筆專家指引刪除失敗，請重新確認`);

      if (deletedCount === entries.length && paginationModel.page > 0) {
        setPaginationModel((current) => ({ ...current, page: current.page - 1 }));
      } else {
        const result = await fetchExpertKnowledgeEntries({
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          search: debouncedSearchKeyword,
        });
        setEntries(result.entries);
        setRowCount(result.total);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批次刪除專家指引失敗");
    } finally {
      setIsBatchDeleting(false);
    }
  }

  const columns: GridColDef<ExpertKnowledgeEntry>[] = [
    {
      field: "title",
      headerName: "標題",
      minWidth: 240,
      flex: 1.2,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm font-semibold leading-6 text-slate-900">
          <div className="whitespace-normal break-words">
            {params.row.title || "未命名專家指引"}
          </div>
        </div>
      ),
    },
    {
      field: "industry",
      headerName: "產業",
      minWidth: 140,
      flex: 0.7,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center">
          <Chip
            label={
              <span className="flex items-center gap-1.5">
                <span>{params.row.industry || "未分類產業"}</span>
                {INDUSTRY_ICON_MAP[
                  params.row.industry as keyof typeof INDUSTRY_ICON_MAP
                ] ?? <BusinessCenterIcon {...INDUSTRY_ICON_PROPS} />}
              </span>
            }
            size="small"
            sx={{
              fontWeight: 700,
              color: "#075985",
              backgroundColor: "#e0f2fe",
              borderRadius: "999px",
            }}
          />
        </div>
      ),
    },
    {
      field: "companyLabel",
      headerName: "公司",
      minWidth: 180,
      flex: 0.9,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          <div className="whitespace-normal break-words">
            {renderCompanyLabel(params.row)}
          </div>
        </div>
      ),
    },
    {
      field: "dataSource",
      headerName: "資料來源",
      minWidth: 140,
      flex: 0.7,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          {params.row.dataSource || "財務報表"}
        </div>
      ),
    },
    {
      field: "updatedAt",
      headerName: "更新時間",
      minWidth: 180,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center gap-2 py-3 text-sm leading-6 text-slate-700">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span>{formatDateTime(params.row.updatedAt, "-")}</span>
        </div>
      ),
    },
    {
      field: "createdAt",
      headerName: "建立時間",
      minWidth: 180,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<ExpertKnowledgeEntry, string>,
      ) => (
        <div className="flex h-full items-center gap-2 py-3 text-sm leading-6 text-slate-700">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span>{formatDateTime(params.row.createdAt, "-")}</span>
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 260,
      flex: 1,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<ExpertKnowledgeEntry>) => (
        <div className="flex h-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetailEntry(params.row)}
          >
            <Eye className="h-4 w-4" />
            查看
          </Button>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`/expert-knowledge/${params.row.id}/edit`}>
                <Pencil className="h-4 w-4" />
                編輯
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`刪除 ${params.row.title}`}
              onClick={() => setPendingDeleteEntry(params.row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-sky-700">
                EXPERT KNOWLEDGE BASE
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                專家知識庫
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                管理 AI 授信助理在特定產業、公司與資料來源下優先採用的分析角度與回答方式。
              </p>
            </div>
            <div className="pointer-events-none ml-auto hidden flex-1 justify-end text-[#57A6D4]/25 md:flex">
              <PsychologyAltIcon sx={{ fontSize: "clamp(112px, 14vw, 180px)" }} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">已建立的專家指引</h2>
              <p className="text-sm text-muted-foreground">
                可依標題、產業、公司、資料來源與指引內容搜尋。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full min-w-[260px] sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜尋標題、產業、公司或指引內容"
                  className="pl-10"
                />
              </div>

              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={selectedEntries.length === 0}
                  onClick={() => setIsBatchDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  批次刪除（{selectedEntries.length}）
                </Button>
              ) : null}

              {canAdd ? (
                <Button
                  type="button"
                  asChild
                  className="bg-[#3BA9D8] text-white hover:bg-[#2f95c1]"
                >
                  <Link href="/expert-knowledge/new">
                    <Plus className="h-4 w-4" />
                    新增專家指引
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <Box
              sx={{
                width: "100%",
                "& .MuiDataGrid-cell": {
                  alignItems: "stretch",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f8fafc",
                },
              }}
            >
              <DataGrid
                autoHeight
                rows={entries}
                columns={columns}
                loading={isLoading}
                checkboxSelection={canDelete}
                disableRowSelectionOnClick
                rowSelectionModel={{ type: "include", ids: selectedEntryIds }}
                onRowSelectionModelChange={(model) => setSelectedEntryIds(resolveSelectedRowIds(model, entries.map((entry) => entry.id)))}
                disableColumnFilter
                disableDensitySelector
                disableColumnSelector
                initialState={{
                  sorting: {
                    sortModel: [{ field: "createdAt", sort: "desc" }],
                  },
                }}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={(nextModel) => setPaginationModel((current) => ({ ...nextModel, page: nextModel.pageSize !== current.pageSize ? 0 : nextModel.page }))}
                rowCount={rowCount}
                pageSizeOptions={[5, 10, 25, 50]}
                localeText={{
                  noRowsLabel: "目前沒有符合條件的專家指引",
                }}
                getRowHeight={() => 84}
              />
            </Box>
          </div>
        </section>

        <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
          <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <span className="flex items-center gap-2">
                  <span>{detailEntry?.title || "專家指引詳情"}</span>
                  {detailEntry
                    ? TITLE_INDUSTRY_ICON_MAP[
                        detailEntry.industry as keyof typeof TITLE_INDUSTRY_ICON_MAP
                      ] ?? <BusinessCenterIcon {...TITLE_INDUSTRY_ICON_PROPS} />
                    : null}
                </span>
              </DialogTitle>
              <DialogDescription>
                查看專家知識的適用情境、資料範圍與完整指引內容。
              </DialogDescription>
            </DialogHeader>

            {detailEntry ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label={
                      <span className="flex items-center gap-1.5">
                        <span>{detailEntry.industry || "未分類產業"}</span>
                        {INDUSTRY_ICON_MAP[
                          detailEntry.industry as keyof typeof INDUSTRY_ICON_MAP
                        ] ?? <BusinessCenterIcon {...INDUSTRY_ICON_PROPS} />}
                      </span>
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#075985",
                      backgroundColor: "#e0f2fe",
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={renderCompanyLabel(detailEntry)}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#7c2d12",
                      backgroundColor: "#ffedd5",
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={detailEntry.dataSource || "財務報表"}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#475569",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>
                          更新時間 {formatDateTime(detailEntry.updatedAt, "未提供")}
                        </span>
                      </span>
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>
                          建立時間 {formatDateTime(detailEntry.createdAt, "未提供")}
                        </span>
                      </span>
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#334155",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "999px",
                    }}
                  />
                </div>

                <div className="grid gap-3">
                  <section className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                    <h3 className="text-sm font-bold text-sky-900">錨定點</h3>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {detailEntry.anchorDescription || "未提供錨定點"}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-900">專家指引</h3>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {detailEntry.systemPrompt || "未提供專家指引"}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={pendingDeleteEntry !== null}
          title="確認刪除專家指引"
          description={pendingDeleteEntry ? <>確定要刪除「{pendingDeleteEntry.title || "未命名專家指引"}」嗎？此操作會採用軟刪除。</> : null}
          detail="刪除後，此指引將不再顯示於專家知識庫，也不會再提供給 AI 回答使用。"
          isDeleting={isDeletingEntry}
          onCancel={() => setPendingDeleteEntry(null)}
          onConfirm={() => void confirmDeleteEntry()}
        />

        <DeleteConfirmationDialog
          open={isBatchDeleteOpen}
          title="確認批次刪除專家指引"
          description={<>確定要刪除目前選取的 {selectedEntries.length} 筆專家指引嗎？此操作會採用軟刪除。</>}
          detail={
            <div className="grid gap-2">
              <div>即將刪除：</div>
              <ul className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
                {selectedEntries.map((entry) => (
                  <li key={entry.id} className="rounded bg-white px-3 py-2 [&+&]:mt-1">
                    {entry.title || "未命名專家指引"}
                  </li>
                ))}
              </ul>
            </div>
          }
          isDeleting={isBatchDeleting}
          confirmLabel={`確認刪除 ${selectedEntries.length} 筆`}
          onCancel={() => setIsBatchDeleteOpen(false)}
          onConfirm={() => void confirmBatchDelete()}
        />
      </div>
      </div>
  );
}

function resolveSelectedRowIds(model: GridRowSelectionModel, rowIds: string[]) {
  const modelIds = new Set(Array.from(model.ids).map(String));
  if (model.type === "exclude") {
    return new Set(rowIds.filter((rowId) => !modelIds.has(rowId)));
  }
  return modelIds;
}
