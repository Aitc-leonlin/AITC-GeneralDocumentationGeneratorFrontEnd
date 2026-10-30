"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AnchorIcon from "@mui/icons-material/Anchor";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import ConstructionIcon from "@mui/icons-material/Construction";
import DiamondIcon from "@mui/icons-material/Diamond";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EngineeringIcon from "@mui/icons-material/Engineering";
import FoundationIcon from "@mui/icons-material/Foundation";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MemoryIcon from "@mui/icons-material/Memory";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import TvIcon from "@mui/icons-material/Tv";
import {
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  INDUSTRY_OPTIONS,
  COMPANY_OPTIONS,
  getCompaniesByIndustry,
  getCompanyByLabel,
  getCompanyPromptValue,
} from "@/data/companyKnowledge";
import {
  DEFAULT_EXPERT_KNOWLEDGE_DATA_SOURCE,
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
  EXPERT_KNOWLEDGE_DATA_SOURCE_OPTIONS,
} from "@/data/expertKnowledgeOptions";
import { buildExpertKnowledgeSourceSchemaKey } from "@/lib/expertKnowledge";
import type { ExpertKnowledgeEntry } from "@/types/expertKnowledge";
import {
  createExpertKnowledgeEntry,
  fetchExpertKnowledgeEntry,
  updateExpertKnowledgeEntry,
} from "@/services/api/expertKnowledgeApi";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

const NO_COMPANY_VALUE = "__no_specific_company__";
const REQUIRED_FIELD_ERROR_CLASS =
  "border-orange-500 ring-1 ring-orange-300 focus-visible:ring-orange-400";

const INDUSTRY_ICON_PROPS = { sx: { fontSize: 18, color: "#0f172a" } } as const;

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

function getInitialCompanySelection(companyLabel?: string | null) {
  return companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE || !companyLabel
    ? NO_COMPANY_VALUE
    : companyLabel;
}

function resolveStoredCompanySelection(
  companyLabel?: string | null,
  companyPromptValue?: string | null,
) {
  if (companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE || !companyLabel) {
    return NO_COMPANY_VALUE;
  }

  if (COMPANY_OPTIONS.some((option) => option.label === companyLabel)) {
    return companyLabel;
  }

  const matchedCompany = COMPANY_OPTIONS.find(
    (option) =>
      option.promptValue === companyLabel ||
      option.promptValue === companyPromptValue,
  );
  if (matchedCompany) {
    return matchedCompany.label;
  }

  return "";
}

function debugCompanyOptions(options: { label: string; promptValue: string }[]) {
  return options.map((option) => ({
    label: option.label,
    promptValue: option.promptValue,
  }));
}

function RunningGenerateIndicator() {
  return (
    <span
      className="running-generate-indicator"
      aria-label="AI 產生中"
      role="status"
    >
      <span className="running-person">
        <span className="running-person__head" />
        <span className="running-person__body" />
        <span className="running-person__arm running-person__arm--front" />
        <span className="running-person__arm running-person__arm--back" />
        <span className="running-person__leg running-person__leg--front" />
        <span className="running-person__leg running-person__leg--back" />
      </span>
    </span>
  );
}

export function ExpertKnowledgeForm(props: { entryId?: string; readOnly?: boolean }) {
  const router = useRouter();
  const [selectedEntry, setSelectedEntry] = useState<ExpertKnowledgeEntry | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [dataSource, setDataSource] = useState<string>(
    DEFAULT_EXPERT_KNOWLEDGE_DATA_SOURCE,
  );
  const [industry, setIndustry] = useState("");
  const [companyLabel, setCompanyLabel] = useState("");
  const [anchorDescription, setAnchorDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isReady, setIsReady] = useState(!props.entryId);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSystemPromptGenerateModalOpen, setIsSystemPromptGenerateModalOpen] =
    useState(false);
  const [systemPromptGeneratePrompt, setSystemPromptGeneratePrompt] =
    useState("");
  const [isSystemPromptGenerating, setIsSystemPromptGenerating] =
    useState(false);
  const [hasAiGeneratedContent, setHasAiGeneratedContent] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const readOnly = props.readOnly ?? false;

  useEffect(() => {
    if (!props.entryId) {
      setIsReady(true);
      return;
    }

    let isMounted = true;

    async function loadEntry() {
      try {
        const loadedEntry = await fetchExpertKnowledgeEntry(props.entryId!);
        if (!isMounted) return;

        const resolvedCompanyLabel = resolveStoredCompanySelection(
          loadedEntry.companyLabel,
          loadedEntry.companyPromptValue,
        );

        console.log("[ExpertKnowledgeForm][edit-load]", {
          entryId: props.entryId,
          selectedEntry: loadedEntry,
          resolvedCompanyLabel,
        });

        setSelectedEntry(loadedEntry);
        setIndustry(loadedEntry.industry);
        setTitle(loadedEntry.title ?? "");
        setCompanyLabel(resolvedCompanyLabel);
        setDataSource(
          loadedEntry.dataSource ?? DEFAULT_EXPERT_KNOWLEDGE_DATA_SOURCE,
        );
        setAnchorDescription(loadedEntry.anchorDescription ?? "");
        setSystemPrompt(loadedEntry.systemPrompt);
        setGeneratePrompt("");
        setSystemPromptGeneratePrompt("");
        setIsReady(true);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error ? error.message : "找不到這筆專家指引",
        );
        router.replace("/expert-knowledge");
      }
    }

    loadEntry();

    return () => {
      isMounted = false;
    };
  }, [props.entryId, router]);

  const companyOptions = useMemo(
    () => getCompaniesByIndustry(industry),
    [industry],
  );
  const selectedCompanySummary =
    companyLabel === NO_COMPANY_VALUE
      ? "不指定特定公司"
      : companyLabel
        ? getCompanyPromptValue(companyLabel)
        : "尚未選擇公司";
  const selectedIndustryIcon =
    INDUSTRY_ICON_MAP[industry as keyof typeof INDUSTRY_ICON_MAP] ?? (
      <BusinessCenterIcon {...INDUSTRY_ICON_PROPS} />
    );
  useEffect(() => {
    if (companyLabel === NO_COMPANY_VALUE) {
      console.log("[ExpertKnowledgeForm][company-sync] keep no-specific-company", {
        industry,
        companyLabel,
        companyOptions: debugCompanyOptions(companyOptions),
      });
      return;
    }

    if (companyOptions.some((option) => option.label === companyLabel)) {
      console.log("[ExpertKnowledgeForm][company-sync] matched label", {
        industry,
        companyLabel,
        companyOptions: debugCompanyOptions(companyOptions),
      });
      return;
    }

    const matchedByPromptValue = companyOptions.find(
      (option) => option.promptValue === companyLabel,
    );
    if (matchedByPromptValue) {
      console.log("[ExpertKnowledgeForm][company-sync] matched promptValue", {
        industry,
        companyLabel,
        matchedByPromptValue,
        companyOptions: debugCompanyOptions(companyOptions),
      });
      setCompanyLabel(matchedByPromptValue.label);
      return;
    }

    if (companyLabel) {
      console.log("[ExpertKnowledgeForm][company-sync] reset companyLabel", {
        industry,
        companyLabel,
        companyOptions: debugCompanyOptions(companyOptions),
      });
      setCompanyLabel("");
    }
  }, [companyLabel, companyOptions, industry]);

  function handleIndustryChange(nextIndustry: string) {
    if (readOnly) return;
    setIndustry(nextIndustry);
    setCompanyLabel("");
  }

  async function handleSave() {
    if (readOnly || isSaving) return;

    const normalizedCompanyLabel =
      companyLabel === NO_COMPANY_VALUE
        ? EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE
        : companyLabel;
    const company = getCompanyByLabel(normalizedCompanyLabel);
    const trimmedTitle = title.trim();
    const trimmedAnchorDescription = anchorDescription.trim();
    const trimmedPrompt = systemPrompt.trim();
    const hasCompanySelection =
      companyLabel === NO_COMPANY_VALUE || Boolean(normalizedCompanyLabel);

    setShowValidationErrors(true);

    if (!trimmedTitle) {
      toast.error("請輸入專家指引標題");
      return;
    }

    if (!industry) {
      toast.error("請先選擇產業");
      return;
    }

    if (!hasCompanySelection) {
      toast.error("請先選擇公司");
      return;
    }

    if (
      normalizedCompanyLabel !== EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE &&
      normalizedCompanyLabel &&
      !company
    ) {
      toast.error("請先選擇公司");
      return;
    }

    if (!dataSource) {
      toast.error("請先選擇資料來源");
      return;
    }

    if (!trimmedAnchorDescription) {
      toast.error("請輸入錨定點");
      return;
    }

    if (!trimmedPrompt) {
      toast.error("請輸入專家指引");
      return;
    }

    const nextEntry = {
      title: trimmedTitle,
      dataSource,
      industry: company?.industry ?? industry,
      companyLabel: company?.label ?? EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
      companyPromptValue: company?.promptValue ?? "",
      sourceSchemaKey: buildExpertKnowledgeSourceSchemaKey(
        dataSource,
        company?.industry ?? industry,
        company?.label ?? EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
      ),
      anchorDescription: trimmedAnchorDescription,
      systemPrompt: trimmedPrompt,
    };

    try {
      setIsSaving(true);
      if (selectedEntry) {
        await updateExpertKnowledgeEntry(selectedEntry.id, nextEntry, {
          aiGenerated: hasAiGeneratedContent,
        });
      } else {
        await createExpertKnowledgeEntry(nextEntry, {
          aiGenerated: hasAiGeneratedContent,
        });
      }
      setShowValidationErrors(false);
      toast.success(selectedEntry ? "已更新專家指引" : "已新增專家指引");
      router.push("/expert-knowledge");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "儲存專家指引失敗",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeGenerateModal() {
    if (isGenerating) return;
    setIsGenerateModalOpen(false);
  }

  function closeSystemPromptGenerateModal() {
    if (isSystemPromptGenerating) return;
    setIsSystemPromptGenerateModalOpen(false);
  }

  async function handleGenerateSystemPrompt() {
    const trimmedPrompt = generatePrompt.trim();

    if (!trimmedPrompt) {
      toast.error("請先輸入要給 AI 的提示");
      return;
    }

    try {
      setIsGenerating(true);
      // 將使用者輸入的 prompt 送到後端，產生錨定點內容。
      const response = await fetchBackendApi(
        BACKEND_API_PATHS.expertKnowledgeGenerateAnchor,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: trimmedPrompt }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | { response?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.error || "AI 產生失敗");
      }

      if (!json?.response?.trim()) {
        throw new Error("AI 沒有回傳可用內容");
      }

      setAnchorDescription(json.response.trim());
      setHasAiGeneratedContent(true);
      toast.success("已產生錨定點內容");
      setIsGenerateModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 產生時發生錯誤",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateExpertSystemPrompt() {
    const trimmedPrompt = systemPromptGeneratePrompt.trim();

    if (!trimmedPrompt) {
      toast.error("請先輸入要給 AI 的提示");
      return;
    }

    try {
      setIsSystemPromptGenerating(true);
      // 將使用者輸入的 prompt 送到後端，產生專家指引內容。
      const response = await fetchBackendApi(
        BACKEND_API_PATHS.expertKnowledgeGenerateAnalysis,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: trimmedPrompt }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | { response?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(json?.error || "AI 產生失敗");
      }

      if (!json?.response?.trim()) {
        throw new Error("AI 沒有回傳可用內容");
      }

      setSystemPrompt(json.response.trim());
      setHasAiGeneratedContent(true);
      toast.success("已產生專家指引");
      setIsSystemPromptGenerateModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "AI 產生時發生錯誤",
      );
    } finally {
      setIsSystemPromptGenerating(false);
    }
  }

  if (!isReady) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold tracking-[0.2em] text-sky-700">
                EXPERT KNOWLEDGE BASE
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                {readOnly
                  ? "查看專家指引"
                  : selectedEntry
                    ? "編輯專家指引"
                    : "新增專家指引"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                依據現有公司清單與產業分類，設定該公司在聊天時要優先採用的分析角度與回答方式。
              </p>
            </div>

            <Button type="button" variant="outline" asChild>
              <Link href="/expert-knowledge">
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Link>
            </Button>
            <div className="pointer-events-none ml-auto hidden flex-1 justify-end text-[#57A6D4]/25 md:flex">
              <PsychologyAltIcon sx={{ fontSize: "clamp(112px, 14vw, 180px)" }} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-background p-6 shadow-sm">
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              overflow: "hidden",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              background:
                "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, #ffffff 100%)",
            }}
          >
            <Stack spacing={2.5} sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.75}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "#475569",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      lineHeight: 1.2,
                    }}
                  >
                    Current Selection
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "#2D689D", lineHeight: 1.2 }}
                  >
                    {title || "尚未輸入標題"}
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                useFlexGap
              >
                {[
                  { label: "產業", value: industry || "尚未選擇產業" },
                  { label: "公司", value: selectedCompanySummary },
                  {
                    label: "資料來源",
                    value: dataSource || "尚未選擇資料來源",
                  },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    elevation={0}
                    sx={{
                      flex: 1,
                      minHeight: 108,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "#e2e8f0",
                      backgroundColor: "#ffffff",
                      p: 2.25,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "#64748b",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </Typography>
                    {item.label === "產業" ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 1.5 }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#0f172a",
                            fontWeight: 600,
                            lineHeight: 1.7,
                            wordBreak: "break-word",
                          }}
                        >
                          {item.value}
                        </Typography>
                        {selectedIndustryIcon}
                      </Stack>
                    ) : (
                      <Typography
                        variant="body1"
                        sx={{
                          mt: 1.5,
                          color: "#0f172a",
                          fontWeight: 600,
                          lineHeight: 1.7,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.value}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <div className="mb-5 space-y-2">
            <label className="text-sm font-medium text-foreground">
              標題<span className="text-orange-600"> *</span>
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={readOnly}
              placeholder="例如：水泥產業的原物料成本專家指引(台泥)"
              className={`h-11 rounded-xl ${showValidationErrors && !title.trim() ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
            />
            <div className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
              <AnnouncementIcon sx={{ mt: "1px", fontSize: 16, color: "#64748b" }} />
              <span className="relative top-[-1px]">
                說明這項專業指引的主題，方便人類在系統中辨識用，此欄位不影響AI Agent進行判斷。
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                產業<span className="text-orange-600"> *</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl border border-input bg-background py-2 pl-3 pr-10 text-sm outline-none ${showValidationErrors && !industry ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
                  value={industry}
                  onChange={(event) => handleIndustryChange(event.target.value)}
                  disabled={readOnly}
                >
                  <option value="">請選擇產業</option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                公司<span className="text-orange-600"> *</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl border border-input bg-background py-2 pl-3 pr-10 text-sm outline-none ${showValidationErrors && companyLabel !== NO_COMPANY_VALUE && !companyLabel ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
                  value={companyLabel}
                  onChange={(event) => setCompanyLabel(event.target.value)}
                  disabled={readOnly}
                >
                  <option value="">請選擇公司</option>
                  <option value={NO_COMPANY_VALUE}>不指定特定公司</option>
                  {companyOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                資料來源<span className="text-orange-600"> *</span>
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl border border-input bg-background py-2 pl-3 pr-10 text-sm outline-none ${showValidationErrors && !dataSource ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
                  value={dataSource}
                  onChange={(event) => setDataSource(event.target.value)}
                  disabled={readOnly}
                >
                  {EXPERT_KNOWLEDGE_DATA_SOURCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-[13px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                錨定點<span className="text-orange-600"> *</span>
                <AnchorIcon sx={{ fontSize: 18, color: "#000000" }} />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateModalOpen(true)}
                className={readOnly ? "hidden" : undefined}
              >
                用AI產出範本
              </Button>
            </div>
            <Textarea
              value={anchorDescription}
              onChange={(event) => setAnchorDescription(event.target.value)}
              disabled={readOnly}
              placeholder="例如：當使用者詢問半導體產業授信風險、晶圓代工景氣循環、庫存調整與資本支出壓力時優先使用。"
              className={`min-h-[120px] resize-y rounded-2xl ${showValidationErrors && !anchorDescription.trim() ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
            />
            <div className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
              <AnnouncementIcon sx={{ mt: "1px", fontSize: 16, color: "#64748b" }} />
              <span className="relative top-[-1px]">
                說明這筆專業知識適合在什麼情境下使用，AI Agent會根據此錨定點自動判斷是否作為回答的判斷依據參考。
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                專家指引<span className="text-orange-600"> *</span>
                <DiamondIcon sx={{ fontSize: 18, color: "#000000" }} />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSystemPromptGenerateModalOpen(true)}
                className={readOnly ? "hidden" : undefined}
              >
                用AI產出範本
              </Button>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              disabled={readOnly}
              placeholder="例如：水泥產業現金流通常具景氣循環特性，若短期借款比重偏高，需確認是否存在季節性資金需求或債務結構失衡問題。若公司流動比率下降且短期借款持續增加，可能代表營運資金壓力上升，需進一步觀察未來現金流入狀況。。"
              className={`min-h-[320px] resize-y rounded-2xl ${showValidationErrors && !systemPrompt.trim() ? REQUIRED_FIELD_ERROR_CLASS : ""}`}
            />
            <div className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
              <AnnouncementIcon sx={{ mt: "1px", fontSize: 16, color: "#64748b" }} />
              <span className="relative top-[-1px]">
                當 AI Agent 判斷目前問題適合套用這筆知識時，會參考這段專家指引來整理分析重點，作為回答時的判斷依據。
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/expert-knowledge">取消</Link>
            </Button>
            {readOnly ? (
              <Button type="button" asChild>
                <Link href={`/expert-knowledge/${selectedEntry?.id}/edit`}>
                  編輯
                </Link>
              </Button>
            ) : (
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? "儲存中..."
                  : selectedEntry
                    ? "儲存變更"
                    : "建立專家指引"}
              </Button>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={isGenerateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeGenerateModal();
            return;
          }

          setIsGenerateModalOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 產生錨定點內容</DialogTitle>
            <DialogDescription>
              輸入你希望 AI 依據的提示內容，送出後會自動產生並填入上方的錨定點欄位。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Prompt
            </label>
            <Textarea
              value={generatePrompt}
              onChange={(event) => setGeneratePrompt(event.target.value)}
              placeholder="例如：請根據這筆專業知識內容，產出一段讓 AI Agent 判斷何時應引用此知識的錨定點描述。"
              className="min-h-[180px] resize-y rounded-2xl"
              disabled={isGenerating}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeGenerateModal}
              disabled={isGenerating}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleGenerateSystemPrompt}
              disabled={isGenerating}
            >
              {isGenerating ? "產生中..." : "送出"}
            </Button>
            {isGenerating ? <RunningGenerateIndicator /> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSystemPromptGenerateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSystemPromptGenerateModal();
            return;
          }

          setIsSystemPromptGenerateModalOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 產生專家指引</DialogTitle>
            <DialogDescription>
              輸入你希望 AI 依據的提示內容，送出後會自動產生並填入下方的專家指引欄位。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Prompt
            </label>
            <Textarea
              value={systemPromptGeneratePrompt}
              onChange={(event) =>
                setSystemPromptGeneratePrompt(event.target.value)
              }
              placeholder="例如：請根據企業授信審查情境，產出一段可直接作為回答規則的專家指引。"
              className="min-h-[180px] resize-y rounded-2xl"
              disabled={isSystemPromptGenerating}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeSystemPromptGenerateModal}
              disabled={isSystemPromptGenerating}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleGenerateExpertSystemPrompt}
              disabled={isSystemPromptGenerating}
            >
              {isSystemPromptGenerating ? "產生中..." : "送出"}
            </Button>
            {isSystemPromptGenerating ? <RunningGenerateIndicator /> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
