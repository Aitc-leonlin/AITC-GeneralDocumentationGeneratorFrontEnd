"use client";

import { useEffect, useMemo, useState } from "react";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import ConstructionIcon from "@mui/icons-material/Construction";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import DescriptionIcon from "@mui/icons-material/Description";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EngineeringIcon from "@mui/icons-material/Engineering";
import FoundationIcon from "@mui/icons-material/Foundation";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MemoryIcon from "@mui/icons-material/Memory";
import InventoryIcon from "@mui/icons-material/Inventory";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import TvIcon from "@mui/icons-material/Tv";
import { Box, Chip } from "@mui/material";
import {
  CalendarClock,
  Database,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridPaginationModel,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";
import { toast } from "sonner";

import {
  COMPANY_OPTIONS,
  INDUSTRY_OPTIONS,
  getCompaniesByIndustry,
  getCompanyByLabel,
  getCompanyPromptValue,
} from "@/data/companyKnowledge";
import {
  CHAT_SETTINGS_STORAGE_KEY,
  type StoredChatSettings,
} from "@/data/chatSettings";
import {
  DEFAULT_WAREHOUSE_DATA_CATEGORY,
  WAREHOUSE_DATA_ALL_COMPANY_VALUE,
  WAREHOUSE_DATA_CATEGORIES,
} from "@/data/warehouseDataOptions";
import type {
  WarehouseDataCategory,
  WarehouseDataEntry,
} from "@/types/warehouseData";
import {
  createWarehouseDataEntry,
  deleteWarehouseDataEntry,
  fetchWarehouseDataEntries,
  fetchWarehouseDataEntry,
  updateWarehouseDataEntry,
} from "@/services/api/warehouseDataApi";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

const REQUIRED_FIELD_ERROR_CLASS =
  "border-orange-500 ring-1 ring-orange-300 focus-visible:ring-orange-400";

const INDUSTRY_ICON_PROPS = { sx: { fontSize: 16, color: "#075985" } } as const;
const CATEGORY_STYLE_MAP: Record<
  WarehouseDataCategory,
  {
    backgroundColor: string;
    color: string;
    icon: JSX.Element;
  }
> = {
  負面消息: {
    backgroundColor: "#fee2e2",
    color: "#7f1d1d",
    icon: <ReportProblemIcon sx={{ fontSize: 16, color: "#7f1d1d" }} />,
  },
  新聞: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    icon: <InventoryIcon sx={{ fontSize: 16, color: "#92400e" }} />,
  },
  年報: {
    backgroundColor: "#dcfce7",
    color: "#14532d",
    icon: <DescriptionIcon sx={{ fontSize: 16, color: "#14532d" }} />,
  },
};

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

function renderCategoryLabel(category: WarehouseDataCategory) {
  const categoryStyle = CATEGORY_STYLE_MAP[category];

  return (
    <span className="flex items-center gap-1.5">
      {categoryStyle.icon}
      <span>{category}</span>
    </span>
  );
}

function renderCompanyLabel(companyLabel: string) {
  return companyLabel === WAREHOUSE_DATA_ALL_COMPANY_VALUE || !companyLabel
    ? "不指定特定公司"
    : companyLabel;
}

function readStoredCompany() {
  if (typeof window === "undefined") {
    return { selectedCompanyLabel: "", selectedCompanyPromptValue: "" };
  }

  try {
    const rawValue = window.localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return { selectedCompanyLabel: "", selectedCompanyPromptValue: "" };
    }

    const parsedValue = JSON.parse(rawValue) as StoredChatSettings;
    const selectedCompanyLabel = parsedValue.company ?? "";

    return {
      selectedCompanyLabel,
      selectedCompanyPromptValue: getCompanyPromptValue(selectedCompanyLabel),
    };
  } catch {
    return { selectedCompanyLabel: "", selectedCompanyPromptValue: "" };
  }
}

function formatDateTime(value: string | null | undefined) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) return "未設定";

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) return trimmedValue;

  return date.toLocaleString("zh-TW");
}

export function WarehouseDataManager() {
  const { hasPermission } = useMembershipPermissions();
  const [entries, setEntries] = useState<WarehouseDataEntry[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const [selectedCompanyLabel, setSelectedCompanyLabel] = useState("");
  const [selectedCompanyPromptValue, setSelectedCompanyPromptValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WarehouseDataEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<WarehouseDataEntry | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<WarehouseDataEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [category, setCategory] = useState<WarehouseDataCategory>(
    DEFAULT_WAREHOUSE_DATA_CATEGORY,
  );
  const [industry, setIndustry] = useState("");
  const [companyLabel, setCompanyLabel] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const companyOptions = useMemo(
    () => getCompaniesByIndustry(industry),
    [industry],
  );
  const canAdd = hasPermission(MODULE_PERMISSIONS.creditAiWarehouseDataAdd);
  const canEdit = hasPermission(MODULE_PERMISSIONS.creditAiWarehouseDataEdit);
  const canDelete = hasPermission(MODULE_PERMISSIONS.creditAiWarehouseDataDelete);
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));

  const columns: GridColDef<WarehouseDataEntry>[] = [
    {
      field: "title",
      headerName: "標題",
      minWidth: 220,
      flex: 1.2,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm font-semibold leading-6 text-slate-900">
          <div className="whitespace-normal break-words">
            {params.row.title || "未設定標題"}
          </div>
        </div>
      ),
    },
    {
      field: "category",
      headerName: "資料源類型",
      minWidth: 140,
      flex: 0.75,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => {
        const categoryStyle = CATEGORY_STYLE_MAP[params.row.category];

        return (
          <div className="flex h-full items-center">
            <Chip
              label={renderCategoryLabel(params.row.category)}
              size="small"
              sx={{
                fontWeight: 700,
                color: categoryStyle.color,
                backgroundColor: categoryStyle.backgroundColor,
                borderRadius: "999px",
              }}
            />
          </div>
        );
      },
    },
    {
      field: "industry",
      headerName: "產業",
      minWidth: 140,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
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
      flex: 0.95,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          <div className="whitespace-normal break-words">
            {renderCompanyLabel(params.row.companyLabel)}
          </div>
        </div>
      ),
    },
    {
      field: "source",
      headerName: "內容來源",
      minWidth: 160,
      flex: 0.85,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => (
        <div className="flex h-full items-center py-3 text-sm leading-6 text-slate-700">
          <div className="whitespace-normal break-words">
            {params.row.source || "未提供來源"}
          </div>
        </div>
      ),
    },
    {
      field: "recordUpdatedAt",
      headerName: "資料更新時間",
      minWidth: 170,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => (
        <div className="flex h-full items-center gap-2 py-3 text-sm leading-6 text-slate-700">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span>{formatDateTime(params.row.recordUpdatedAt)}</span>
        </div>
      ),
    },
    {
      field: "createdAt",
      headerName: "建立時間",
      minWidth: 170,
      flex: 0.8,
      renderCell: (
        params: GridRenderCellParams<WarehouseDataEntry, string>,
      ) => (
        <div className="flex h-full items-center gap-2 py-3 text-sm leading-6 text-slate-700">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <span>{formatDateTime(params.row.createdAt)}</span>
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 280,
      flex: 1,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<WarehouseDataEntry>) => (
        <div className="flex h-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openDetailModal(params.row)}
          >
            <Eye className="h-4 w-4" />
            查看內容
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openEditModal(params.row)}
            >
              <Pencil className="h-4 w-4" />
              編輯
            </Button>
          ) : null}
          {params.row.url ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={params.row.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                原文
              </a>
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`刪除 ${params.row.title}`}
              onClick={() => handleDelete(params.row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchKeyword]);

  async function loadEntries() {
    try {
      setIsLoadingEntries(true);
      const result = await fetchWarehouseDataEntries({
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        search: debouncedSearchKeyword,
        category: selectedCategory,
      });
      setEntries(result.entries);
      setRowCount(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取資料倉儲失敗");
    } finally {
      setIsLoadingEntries(false);
    }
  }

  function resetCreateForm(defaultCompanyLabel?: string) {
    const company = getCompanyByLabel(defaultCompanyLabel ?? "");

    setCategory(DEFAULT_WAREHOUSE_DATA_CATEGORY);
    setIndustry(company?.industry ?? "");
    setCompanyLabel(company?.label ?? "");
    setTitle("");
    setSource("");
    setUrl("");
    setSummary("");
    setShowValidationErrors(false);
  }

  function openCreateModal() {
    setEditingEntry(null);
    resetCreateForm(selectedCompanyLabel);
    setIsCreateModalOpen(true);
  }

  async function openDetailModal(entry: WarehouseDataEntry) {
    try {
      setDetailEntry(await fetchWarehouseDataEntry(entry.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取資料詳情失敗");
    }
  }

  function openEditModal(entry: WarehouseDataEntry) {
    setEditingEntry(entry);
    setDetailEntry(null);
    setCategory(entry.category);
    setIndustry(entry.industry);
    setCompanyLabel(
      entry.companyLabel || WAREHOUSE_DATA_ALL_COMPANY_VALUE,
    );
    setTitle(entry.title);
    setSource(entry.source);
    setUrl(entry.url);
    setSummary(entry.summary);
    setShowValidationErrors(false);
    setIsCreateModalOpen(true);
  }

  function handleFormModalOpenChange(open: boolean) {
    setIsCreateModalOpen(open);

    if (!open) {
      setEditingEntry(null);
      setShowValidationErrors(false);
    }
  }

  useEffect(() => {
    const storedCompany = readStoredCompany();
    setSelectedCompanyLabel(storedCompany.selectedCompanyLabel);
    setSelectedCompanyPromptValue(storedCompany.selectedCompanyPromptValue);
    resetCreateForm(storedCompany.selectedCompanyLabel);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentEntries() {
      try {
        setIsLoadingEntries(true);
        const result = await fetchWarehouseDataEntries({
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          search: debouncedSearchKeyword,
          category: selectedCategory,
        });
        if (!isMounted) return;
        setEntries(result.entries);
        setRowCount(result.total);
      } catch (error) {
        if (!isMounted) return;
        toast.error(error instanceof Error ? error.message : "讀取資料倉儲失敗");
      } finally {
        if (isMounted) setIsLoadingEntries(false);
      }
    }

    loadCurrentEntries();

    return () => {
      isMounted = false;
    };
  }, [
    debouncedSearchKeyword,
    paginationModel.page,
    paginationModel.pageSize,
    selectedCategory,
  ]);

  useEffect(() => {
    setSelectedEntryIds(new Set());
  }, [debouncedSearchKeyword, paginationModel.page, paginationModel.pageSize, selectedCategory]);

  useEffect(() => {
    if (!industry) {
      setCompanyLabel("");
      return;
    }

    if (companyLabel === WAREHOUSE_DATA_ALL_COMPANY_VALUE) {
      return;
    }

    if (companyOptions.some((option) => option.label === companyLabel)) {
      return;
    }

    const matchedCompany =
      COMPANY_OPTIONS.find((option) => option.label === selectedCompanyLabel) ?? null;
    if (matchedCompany && matchedCompany.industry === industry) {
      setCompanyLabel(matchedCompany.label);
      return;
    }

    setCompanyLabel(companyOptions[0]?.label ?? "");
  }, [companyLabel, companyOptions, industry, selectedCompanyLabel]);

  function handleDelete(entryId: string) {
    const targetEntry = entries.find((entry) => entry.id === entryId);
    if (!targetEntry) return;
    setPendingDeleteEntry(targetEntry);
  }

  async function confirmDeleteEntry() {
    if (!pendingDeleteEntry || isDeletingEntry) return;
    try {
      setIsDeletingEntry(true);
      await deleteWarehouseDataEntry(pendingDeleteEntry.id);
      toast.success("已刪除資料");
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
      await loadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除資料失敗");
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
        targets.map((entry) => deleteWarehouseDataEntry(entry.id)),
      );
      const failedCount = results.filter((result) => result.status === "rejected").length;
      const deletedCount = targets.length - failedCount;

      setIsBatchDeleteOpen(false);
      setSelectedEntryIds(new Set());
      if (deletedCount > 0) toast.success(`已刪除 ${deletedCount} 筆資料`);
      if (failedCount > 0) toast.error(`${failedCount} 筆資料刪除失敗，請重新確認`);

      if (deletedCount === entries.length && paginationModel.page > 0) {
        setPaginationModel((current) => ({ ...current, page: current.page - 1 }));
      } else {
        await loadEntries();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批次刪除資料失敗");
    } finally {
      setIsBatchDeleting(false);
    }
  }

  async function handleSaveEntry() {
    if (isSaving) return;

    const trimmedTitle = title.trim();
    const trimmedSource = source.trim();
    const trimmedSummary = summary.trim();
    const trimmedUrl = url.trim();
    const company = getCompanyByLabel(companyLabel);
    const isAllCompany = companyLabel === WAREHOUSE_DATA_ALL_COMPANY_VALUE;

    setShowValidationErrors(true);

    if (!category) {
      toast.error("請先選擇分類");
      return;
    }
    if (!industry) {
      toast.error("請先選擇產業");
      return;
    }
    if (!isAllCompany && !company) {
      toast.error("請先選擇公司");
      return;
    }
    if (!trimmedTitle) {
      toast.error("請輸入內容標題");
      return;
    }
    if (!trimmedSource) {
      toast.error("請輸入內容來源");
      return;
    }
    if (!trimmedSummary) {
      toast.error("請輸入內容摘要");
      return;
    }

    const nextEntry = {
      category,
      title: trimmedTitle,
      industry: company?.industry ?? industry,
      companyLabel: company?.label ?? WAREHOUSE_DATA_ALL_COMPANY_VALUE,
      companyPromptValue: company?.promptValue ?? "",
      summary: trimmedSummary,
      source: trimmedSource,
      url: trimmedUrl,
    };

    try {
      setIsSaving(true);
      if (editingEntry) {
        await updateWarehouseDataEntry(editingEntry.id, nextEntry);
      } else {
        await createWarehouseDataEntry(nextEntry);
      }
      setIsCreateModalOpen(false);
      setEditingEntry(null);
      resetCreateForm(selectedCompanyLabel);
      toast.success(editingEntry ? "已更新資料" : "已新增資料");
      await loadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存資料失敗");
    } finally {
      setIsSaving(false);
    }
  }

  const currentCompanySummary =
    selectedCompanyLabel || "尚未選擇公司，先顯示所有已建立的資料";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full flex-col gap-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-amber-700">
                DATA WAREHOUSE
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                資料倉儲設定
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                將外部參考內容集中管理，可依分類建立負面消息、新聞、年報等不同知識條目。
              </p>
            </div>
            <div className="pointer-events-none ml-auto hidden flex-1 justify-end text-[#57A6D4]/25 md:flex">
              <Database className="h-[clamp(112px,14vw,180px)] w-[clamp(112px,14vw,180px)]" />
            </div>

          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">已建立的資料</h2>
              <p className="text-sm text-muted-foreground">
                可依分類、標題、來源與公司名稱搜尋，並以表格方式管理目前本地儲存的資料倉儲內容。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none"
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  setPaginationModel((current) => ({ ...current, page: 0 }));
                }}
              >
                <option value="">全部分類</option>
                {WAREHOUSE_DATA_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div className="relative w-full min-w-[260px] sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="搜尋分類、標題、公司、來源或摘要"
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
                  onClick={openCreateModal}
                  className="bg-[#3BA9D8] text-white hover:bg-[#2f95c1]"
                >
                  <Plus className="h-4 w-4" />
                  新增資料
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
                loading={isLoadingEntries}
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
                  noRowsLabel: "目前沒有符合條件的資料",
                }}
                getRowHeight={() => 84}
              />
            </Box>
          </div>
        </section>

        <Dialog open={isCreateModalOpen} onOpenChange={handleFormModalOpenChange}>
          <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "編輯資料" : "新增資料"}</DialogTitle>
              <DialogDescription>
                可依分類建立不同型態的資料條目，例如負面消息、新聞、年報。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  內容標題<span className="text-orange-600"> *</span>
                </label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：2024 年報重點摘要、近期市場消息、重大負面事件"
                  className={cn(
                    showValidationErrors && !title.trim()
                      ? REQUIRED_FIELD_ERROR_CLASS
                      : null,
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    產業<span className="text-orange-600"> *</span>
                  </label>
                  <select
                    className={cn(
                      "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none",
                      showValidationErrors && !industry ? REQUIRED_FIELD_ERROR_CLASS : null,
                    )}
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  >
                    <option value="">請選擇產業</option>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    公司<span className="text-orange-600"> *</span>
                  </label>
                  <select
                    className={cn(
                      "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none",
                      showValidationErrors && !companyLabel
                        ? REQUIRED_FIELD_ERROR_CLASS
                        : null,
                    )}
                    value={companyLabel}
                    onChange={(event) => setCompanyLabel(event.target.value)}
                  >
                    <option value="">請選擇公司</option>
                    <option value={WAREHOUSE_DATA_ALL_COMPANY_VALUE}>
                      不指定特定公司
                    </option>
                    {companyOptions.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  資料源類型<span className="text-orange-600"> *</span>
                </label>
                <select
                  className={cn(
                    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none",
                    showValidationErrors && !category ? REQUIRED_FIELD_ERROR_CLASS : null,
                  )}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as WarehouseDataCategory)
                  }
                >
                  {WAREHOUSE_DATA_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  內容來源<span className="text-orange-600"> *</span>
                </label>
                <Input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="例如：判決書、經濟日報、公司年報"
                  className={cn(
                    showValidationErrors && !source.trim()
                      ? REQUIRED_FIELD_ERROR_CLASS
                      : null,
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  內容<span className="text-orange-600"> *</span>
                </label>
                <Textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder=""
                  className={cn(
                    "min-h-[160px] resize-y rounded-2xl",
                    showValidationErrors && !summary.trim()
                      ? REQUIRED_FIELD_ERROR_CLASS
                      : null,
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                取消
              </Button>
              <Button type="button" onClick={handleSaveEntry} disabled={isSaving}>
                {isSaving ? "儲存中..." : editingEntry ? "儲存變更" : "新增資料"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
          <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailEntry?.title || "內容詳情"}</DialogTitle>
              <DialogDescription>
                查看資料的完整內容與來源資訊。
              </DialogDescription>
            </DialogHeader>

            {detailEntry ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label={renderCategoryLabel(detailEntry.category)}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: CATEGORY_STYLE_MAP[detailEntry.category].color,
                      backgroundColor:
                        CATEGORY_STYLE_MAP[detailEntry.category].backgroundColor,
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={renderCompanyLabel(detailEntry.companyLabel)}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      color: "#7c2d12",
                      backgroundColor: "#ffedd5",
                      borderRadius: "999px",
                    }}
                  />
                  <Chip
                    label={detailEntry.source || "未提供來源"}
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
                        <span>資料更新時間 {formatDateTime(detailEntry.recordUpdatedAt)}</span>
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
                    label={
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>建立時間 {formatDateTime(detailEntry.createdAt)}</span>
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

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                  {detailEntry.summary || "未提供內容"}
                </div>

                {detailEntry.url ? (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" asChild>
                      <a href={detailEntry.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        查看原文
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={pendingDeleteEntry !== null}
          onOpenChange={(open) => {
            if (!open && !isDeletingEntry) setPendingDeleteEntry(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>確認刪除資料</DialogTitle></DialogHeader>
            {pendingDeleteEntry ? (
              <div className="grid gap-4">
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                  確定要刪除「{pendingDeleteEntry.title}」這筆資料嗎？此操作會採用軟刪除。
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  刪除後，這筆資料將不再顯示於資料倉儲清單，也不會再提供給後續查詢使用。
                </p>
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeletingEntry}
                    onClick={() => setPendingDeleteEntry(null)}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeletingEntry}
                    onClick={() => void confirmDeleteEntry()}
                  >
                    {isDeletingEntry ? "刪除中…" : "確認刪除"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={isBatchDeleteOpen}
          title="確認批次刪除資料"
          description={<>確定要刪除目前選取的 {selectedEntries.length} 筆資料嗎？此操作會採用軟刪除。</>}
          detail={
            <div className="grid gap-2">
              <div>即將刪除：</div>
              <ul className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
                {selectedEntries.map((entry) => (
                  <li key={entry.id} className="rounded bg-white px-3 py-2 [&+&]:mt-1">
                    {entry.title || "未設定標題"}
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
