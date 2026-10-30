"use client";

import type { Message } from "ai";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import {
  ChevronDown,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Globe2,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Settings,
  Square,
} from "lucide-react";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import {
  Checkbox as MuiCheckbox,
  FormControlLabel,
} from "@mui/material";

import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import type {
  ExternalReferenceData,
  UsedExpertKnowledge,
} from "@/components/ChatMessageBubble";
import {
  CHAT_SETTINGS_BY_THREAD_STORAGE_KEY,
  CHAT_SETTINGS_STORAGE_KEY,
  type StoredChatSettings,
  type StoredChatSettingsByThread,
} from "@/data/chatSettings";
import { IntermediateStep } from "./IntermediateStep";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { UploadDocumentsForm } from "./UploadDocumentsForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/utils/cn";
import {
  COMPANY_OPTIONS,
  getCompanyByLabel,
  getCompanyPromptValue,
} from "@/data/companyKnowledge";
import { fetchAppliedExpertKnowledgeEntries } from "@/services/api/expertKnowledgeApi";
import { fetchAppliedWarehouseDataEntries } from "@/services/api/warehouseDataApi";
import {
  type ChatConversation,
  fetchChatConversations,
  saveChatConversation,
} from "@/services/api/chatConversationApi";
import {
  deleteChatDocument,
  uploadChatDocument,
} from "@/services/api/chatDocumentApi";
import type {
  ChatDocument,
  ChatDocumentUpload,
  StagedChatDocument,
} from "@/types/chatDocument";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import {
  readChatGraphTraces,
  saveChatGraphTrace,
  type ChatGraphTraces,
} from "@/lib/chatGraphTrace";

const HISTORY_PANEL_STORAGE_KEY = "aitc-chatbot-history-panel-open-v1";
const SETTINGS_PANEL_STORAGE_KEY = "aitc-chatbot-settings-panel-open-v2";
const FAKE_UPLOAD_PROGRESS_INTERVAL_MS = 250;
const FAKE_UPLOAD_PROGRESS_STEP = 3;
const CHAT_INPUT_MAX_HEIGHT_PX = 160;

type ChatSettings = {
  company: string;
  period: string;
  periodYear: string;
  periodQuarter: string;
  statementType: string;
  useExpertKnowledge: boolean;
  useWarehouseData: boolean;
  useExternalData: boolean;
};

type ChatSession = ChatConversation;

type PendingSubmission = {
  requestMessages: Message[];
  displayMessages: Message[];
  clearInputOnConfirm: boolean;
  externalDataQueryText: string;
  workflowThreadId: string;
  documentsForMessages: Record<string, ChatDocument[]>;
  graphNodes: string[];
};

type PendingDocumentUpload = {
  chatId: string;
  message: Message;
  documents: ChatDocumentUpload[];
};

function getPeriodPromptValue(settings: ChatSettings) {
  if (!settings.period) return "";

  if (settings.period === "年度") {
    if (!settings.periodYear) return "";
    return `${settings.periodYear}年度`;
  }

  if (settings.period === "季度") {
    if (!settings.periodYear || !settings.periodQuarter) return "";
    return `${settings.periodYear}年${settings.periodQuarter}`;
  }

  return settings.period;
}

function getBackendPeriodLabel(settings: ChatSettings) {
  if (!settings.period) return "";

  if (settings.period === "年度") {
    return settings.periodYear ? `${settings.periodYear}年度` : "年度";
  }

  if (settings.period === "季度") {
    if (settings.periodYear && settings.periodQuarter) {
      return `${settings.periodYear}年${settings.periodQuarter}`;
    }
    return "季度";
  }

  return settings.period;
}

function formatQuestionWithContext(question: string, settings: ChatSettings) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return "";

  const company = getCompanyPromptValue(settings.company);
  const period = getPeriodPromptValue(settings);
  if (!company && !period) return trimmedQuestion;

  const contextLine =
    company && period
      ? `根據${company}在${period}期間的資訊`
      : company
        ? `根據${company}的資訊`
        : `根據${period}期間的資訊`;

  return `${contextLine}\n${trimmedQuestion}`;
}

function getSelectedConditionSummary(settings: ChatSettings) {
  const company = getCompanyPromptValue(settings.company);
  const period = getPeriodPromptValue(settings);

  if (!company && !period) {
    return "目前未套用公司與期間條件";
  }

  if (company && period) {
    return `目前條件：${company} / ${period}`;
  }

  return company ? `目前公司條件：${company}` : `目前期間條件：${period}`;
}

function ReferenceSettingLabel(props: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{props.text}</span>
      <span className="inline-flex text-muted-foreground">{props.icon}</span>
    </span>
  );
}

function ReferenceSettingCheckbox(props: {
  checked: boolean;
  icon: ReactNode;
  onCheckedChange: (checked: boolean) => void;
  text: string;
}) {
  return (
    <FormControlLabel
      control={
        <MuiCheckbox
          checked={props.checked === true}
          onChange={(_, checked) => props.onCheckedChange(checked)}
          size="small"
        />
      }
      label={<ReferenceSettingLabel text={props.text} icon={props.icon} />}
      sx={{
        m: 0,
        minHeight: 36,
        "& .MuiFormControlLabel-label": {
          alignItems: "center",
          display: "flex",
          fontSize: 14,
        },
      }}
    />
  );
}

function createEmptySettings(): ChatSettings {
  return {
    company: "",
    period: "",
    periodYear: "",
    periodQuarter: "",
    statementType: "",
    useExpertKnowledge: false,
    useWarehouseData: false,
    useExternalData: false,
  };
}

function toStoredBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function normalizeStoredChatSettings(value: unknown): ChatSettings {
  const emptySettings = createEmptySettings();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySettings;
  }

  const storedSettings = value as StoredChatSettings & {
    useNegativeNews?: boolean;
  };
  return {
    company:
      typeof storedSettings.company === "string"
        ? storedSettings.company
        : emptySettings.company,
    period:
      typeof storedSettings.period === "string"
        ? storedSettings.period
        : emptySettings.period,
    periodYear:
      typeof storedSettings.periodYear === "string"
        ? storedSettings.periodYear
        : emptySettings.periodYear,
    periodQuarter:
      typeof storedSettings.periodQuarter === "string"
        ? storedSettings.periodQuarter
        : emptySettings.periodQuarter,
    statementType:
      typeof storedSettings.statementType === "string"
        ? storedSettings.statementType
        : emptySettings.statementType,
    useExpertKnowledge: toStoredBoolean(
      storedSettings.useExpertKnowledge,
      emptySettings.useExpertKnowledge,
    ),
    useWarehouseData:
      typeof storedSettings.useWarehouseData === "undefined"
        ? toStoredBoolean(
            storedSettings.useNegativeNews,
            emptySettings.useWarehouseData,
          )
        : toStoredBoolean(
            storedSettings.useWarehouseData,
            emptySettings.useWarehouseData,
          ),
    useExternalData: toStoredBoolean(
      storedSettings.useExternalData,
      emptySettings.useExternalData,
    ),
  };
}

function readStoredChatSettingsByThread(): StoredChatSettingsByThread {
  try {
    const storedValue = window.localStorage.getItem(
      CHAT_SETTINGS_BY_THREAD_STORAGE_KEY,
    );
    if (!storedValue) return {};

    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
      ? (parsedValue as StoredChatSettingsByThread)
      : {};
  } catch {
    return {};
  }
}

function loadChatSettingsForThread(threadId: string): ChatSettings {
  if (!threadId) return createEmptySettings();
  const storedSettings = readStoredChatSettingsByThread()[threadId];
  return storedSettings
    ? normalizeStoredChatSettings(storedSettings)
    : createEmptySettings();
}

function saveChatSettingsForThread(threadId: string, settings: ChatSettings) {
  if (!threadId) return;
  try {
    const settingsByThread = readStoredChatSettingsByThread();
    window.localStorage.setItem(
      CHAT_SETTINGS_BY_THREAD_STORAGE_KEY,
      JSON.stringify({
        ...settingsByThread,
        [threadId]: settings,
      }),
    );
    // Keep the active thread as a compatibility snapshot for non-chat pages.
    window.localStorage.setItem(
      CHAT_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Keep the in-memory settings usable when browser storage is unavailable.
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseBase64JsonHeader<T>(value: string): T {
  const binaryString = atob(value);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const decoded = new TextDecoder("utf-8").decode(bytes);
  return JSON.parse(decoded) as T;
}

function getArrayField(value: any, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    if (Array.isArray(value?.[fieldName])) {
      return value[fieldName];
    }
  }

  return [];
}

function buildExternalReferenceData(
  queryText: string,
  decision: "adopted" | "rejected",
  response = "",
): ExternalReferenceData[] {
  if (decision !== "adopted") return [];

  const trimmedQueryText = queryText.trim();
  const trimmedResponse = response.trim();
  if (!trimmedQueryText && !trimmedResponse) return [];

  return [
    {
      source: "AI Agent 外部資料查詢",
      response: trimmedResponse || `${decision}: ${trimmedQueryText}`,
    },
  ];
}

function normalizeExternalReferenceData(entries: any[]): ExternalReferenceData[] {
  return entries
    .map((entry) => ({
      source: typeof entry?.source === "string" ? entry.source : "",
      response: typeof entry?.response === "string" ? entry.response : "",
    }))
    .filter((entry) => entry.source || entry.response);
}

function buildSessionTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage?.content) return "新對話";
  const contentLines = firstUserMessage.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const preferredTitle =
    contentLines.length > 1 &&
    contentLines[0].startsWith("根據") &&
    contentLines[0].includes("期間的資訊")
      ? contentLines[1]
      : firstUserMessage.content;
  return preferredTitle.slice(0, 24);
}

function createEmptyReferenceMaps() {
  return {
    dataSourcesForMessages: {} as Record<string, any[]>,
    expertKnowledgeForMessages: {} as Record<string, UsedExpertKnowledge[]>,
    externalDataForMessages: {} as Record<string, ExternalReferenceData[]>,
    documentsForMessages: {} as Record<string, ChatDocument[]>,
  };
}

function getSessionReferenceMaps(session: ChatSession | null | undefined) {
  return {
    dataSourcesForMessages: session?.dataSourcesForMessages ?? {},
    expertKnowledgeForMessages: session?.expertKnowledgeForMessages ?? {},
    externalDataForMessages: session?.externalDataForMessages ?? {},
    documentsForMessages: session?.documentsForMessages ?? {},
  };
}

function createEmptySession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "新對話",
    createdAt: now,
    updatedAt: now,
    messages: [],
    ...createEmptyReferenceMaps(),
  };
}

function upsertSession(
  sessions: ChatSession[],
  sessionId: string,
  messages: Message[],
  referenceMaps?: ReturnType<typeof createEmptyReferenceMaps>,
) {
  const now = new Date().toISOString();
  const existingSession = sessions.find((session) => session.id === sessionId);
  const nextReferenceMaps =
    referenceMaps ?? getSessionReferenceMaps(existingSession);

  if (!existingSession) {
    return [
      {
        id: sessionId,
        title: buildSessionTitle(messages),
        createdAt: now,
        updatedAt: now,
        messages,
        ...nextReferenceMaps,
      },
      ...sessions,
    ];
  }

  return sessions
    .map((session) =>
      session.id === sessionId
        ? {
            ...session,
            title: buildSessionTitle(messages),
            updatedAt: now,
            messages,
            ...nextReferenceMaps,
          }
        : session,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function formatConversationForCopy(messages: Message[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map(
      (message) =>
        `${message.role === "user" ? "使用者" : "AI助理"}: ${message.content}`,
    )
    .join("\n\n");
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("複製失敗");
  }
}

function ChatMessages(props: {
  messages: Message[];
  emptyStateComponent: ReactNode;
  presetQuestions?: string[];
  dataSourcesForMessages: Record<string, any[]>;
  expertKnowledgeForMessages: Record<string, UsedExpertKnowledge[]>;
  externalDataForMessages: Record<string, ExternalReferenceData[]>;
  documentsForMessages: Record<string, ChatDocument[]>;
  graphNodesForMessages: Record<string, string[]>;
  pendingDocumentUpload?: PendingDocumentUpload | null;
  aiEmoji?: string;
  className?: string;
  onCopyMessage: (message: Message) => void;
  onSelectPresetQuestion: (question: string) => void;
}) {
  return (
    <div className={cn("flex flex-col mx-auto pb-12 w-full", props.className)}>
      {props.messages.length === 0 && !props.pendingDocumentUpload ? (
        <div className="flex flex-col items-center gap-6">
          {props.emptyStateComponent}

          {props.presetQuestions?.length ? (
            <div className="flex w-full max-w-[900px] flex-col items-center gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                常用問題模板
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {props.presetQuestions.map((question) => (
                  <Button
                    key={question}
                    type="button"
                    variant="outline"
                    className="h-auto max-w-[280px] whitespace-normal rounded-full px-5 py-3 text-left"
                    onClick={() => props.onSelectPresetQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {props.messages.map((message, index) => {
        if (message.role === "system") {
          return <IntermediateStep key={message.id} message={message} />;
        }

        return (
          <ChatMessageBubble
            key={message.id}
            message={message}
            aiEmoji={props.aiEmoji}
            dataSources={props.dataSourcesForMessages[message.id] ?? []}
            appliedExpertKnowledge={
              props.expertKnowledgeForMessages[message.id] ?? []
            }
            appliedExternalData={props.externalDataForMessages[message.id] ?? []}
            documents={props.documentsForMessages[message.id] ?? []}
            graphNodes={props.graphNodesForMessages[message.id] ?? []}
            onCopy={props.onCopyMessage}
          />
        );
      })}

      {props.pendingDocumentUpload ? (
        <ChatMessageBubble
          key={`pending-upload-${props.pendingDocumentUpload.message.id}`}
          message={props.pendingDocumentUpload.message}
          aiEmoji={props.aiEmoji}
          dataSources={[]}
          appliedExpertKnowledge={[]}
          appliedExternalData={[]}
          documentUploads={props.pendingDocumentUpload.documents}
        />
      ) : null}
    </div>
  );
}

export function ChatInput(props: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop?: () => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const disabled =
    props.disabled || (props.loading ? false : props.value.trim().length === 0);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, CHAT_INPUT_MAX_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > CHAT_INPUT_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [props.value]);

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();

        if (props.loading) {
          props.onStop?.();
        } else {
          props.onSubmit(e);
        }
      }}
      className={cn("mx-auto flex w-full flex-col", props.className)}
    >
      <div className="border border-input bg-secondary rounded-lg flex flex-col gap-2 w-full mx-auto">
        <Textarea
          ref={textareaRef}
          id="chat-message-input"
          rows={1}
          value={props.value}
          placeholder={props.placeholder}
          onChange={props.onChange}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={props.disabled}
          className="min-h-14 max-h-[160px] resize-none overflow-hidden border-none bg-transparent p-4 shadow-none focus-visible:ring-0"
        />

        <div className="flex justify-between ml-4 mr-2 mb-2">
          <div className="flex gap-3">{props.children}</div>

          <div className="flex gap-2 self-end">
            {props.actions}
            <Button
              id="chat-message-submit-button"
              type="submit"
              className="self-end"
              variant={props.loading ? "destructive" : "default"}
              disabled={disabled}
            >
              {props.disabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  上傳文件中
                </>
              ) : props.loading ? (
                <>
                  <Square className="h-4 w-4 fill-current" />
                  停止生成
                </>
              ) : (
                <span>送出</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>回到底部</span>
    </Button>
  );
}

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();

  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={cn("grid grid-rows-[1fr,auto]", props.className)}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

export function ChatLayout(props: { content: ReactNode; footer: ReactNode }) {
  return (
    <StickToBottom>
      <StickyToBottomContent
        className="absolute inset-0"
        contentClassName="py-2 px-2"
        content={props.content}
        footer={
          <div className="sticky bottom-8 px-2">
            <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4" />
            {props.footer}
          </div>
        }
      />
    </StickToBottom>
  );
}

function ConversationHistory(props: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  className?: string;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className={cn("flex h-full flex-col bg-muted/30", props.className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <div>
          <div className="text-sm font-semibold">對話歷史紀錄</div>
          <div className="text-xs text-muted-foreground">可切換過去案件或問答</div>
        </div>
        {props.onToggleCollapse ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
            收合
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={props.onCreate}>
            <MessageSquarePlus className="h-4 w-4" />
            新對話
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {props.sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            目前尚無歷史紀錄
          </div>
        ) : null}

        <div className="space-y-2">
          {props.sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => props.onSelect(session.id)}
              className={cn(
                "mx-auto w-full max-w-[262px] overflow-hidden rounded-lg border px-3 py-3 text-left transition-colors",
                session.id === props.activeSessionId
                  ? "border-primary bg-background"
                  : "border-transparent bg-background/60 hover:border-border",
              )}
            >
              <div className="line-clamp-2 break-words text-sm font-medium leading-5">
                {session.title}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(session.updatedAt).toLocaleString("zh-TW")}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function YearPickerField(props: {
  value: string;
  onChange: (year: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const maxYear = new Date().getFullYear() + 3;
  const minYear = 1980;
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) =>
    String(maxYear - index),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-background px-3 py-2 text-sm font-normal"
        >
          <span>{props.value} 年</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="mb-3 text-sm font-medium">選擇年度</div>
        <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto pr-1">
          {yearOptions.map((year) => (
            <Button
              key={year}
              type="button"
              variant={props.value === year ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => {
                props.onChange(year);
                setOpen(false);
              }}
            >
              {year}
            </Button>
          ))}
        </div>
        <div className="pt-3 text-center text-xs text-muted-foreground">
          可選擇 {minYear} 年至 {maxYear} 年
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SettingsPanel(props: {
  value: ChatSettings;
  onChange: (nextValue: ChatSettings) => void;
  className?: string;
  onToggleCollapse?: () => void;
}) {
  const quarterOptions = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className={cn("flex h-full flex-col bg-muted/30", props.className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <div>
          <div className="text-sm font-semibold">查詢設定</div>
          <div className="text-xs text-muted-foreground">公司、期間可擇一設定</div>
        </div>
        {props.onToggleCollapse ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.onToggleCollapse}
          >
            收合
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">公司選擇器</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            value={props.value.company}
            onChange={(event) =>
              props.onChange({ ...props.value, company: event.target.value })
            }
          >
            <option value="">空</option>
            {COMPANY_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">期間選擇器</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            value={props.value.period}
            onChange={(event) => {
              const nextPeriod = event.target.value;
              props.onChange({
                ...props.value,
                period: nextPeriod,
                periodYear: nextPeriod === "年度" || nextPeriod === "季度" ? "2025" : "",
                periodQuarter: nextPeriod === "季度" ? "Q1" : "",
              });
            }}
          >
            <option value="">空</option>
            <option value="年度">年度</option>
            <option value="季度">季度</option>
            <option value="近三年">近三年</option>
            <option value="近五年">近五年</option>
          </select>

          {props.value.period === "年度" ? (
            <YearPickerField
              value={props.value.periodYear}
              onChange={(year) => props.onChange({ ...props.value, periodYear: year })}
            />
          ) : null}

          {props.value.period === "季度" ? (
            <div className="grid grid-cols-2 gap-2">
              <YearPickerField
                value={props.value.periodYear}
                onChange={(year) =>
                  props.onChange({
                    ...props.value,
                    periodYear: year,
                  })
                }
              />

              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                value={props.value.periodQuarter}
                onChange={(event) =>
                  props.onChange({
                    ...props.value,
                    periodQuarter: event.target.value,
                  })
                }
              >
                {quarterOptions.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">參考設定</label>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="flex flex-col gap-1">
              <ReferenceSettingCheckbox
                checked={props.value.useExpertKnowledge}
                onCheckedChange={(checked) =>
                  props.onChange({
                    ...props.value,
                    useExpertKnowledge: checked,
                  })
                }
                text="是否參考專家指引"
                icon={<PsychologyAltIcon sx={{ fontSize: 18 }} />}
              />

              <ReferenceSettingCheckbox
                checked={props.value.useWarehouseData}
                onCheckedChange={(checked) =>
                  props.onChange({
                    ...props.value,
                    useWarehouseData: checked,
                  })
                }
                text="是否參考資料倉儲"
                icon={<Database className="h-[18px] w-[18px]" />}
              />

              <ReferenceSettingCheckbox
                checked={props.value.useExternalData}
                onCheckedChange={(checked) =>
                  props.onChange({
                    ...props.value,
                    useExternalData: checked,
                  })
                }
                text="是否參考外部資料"
                icon={<Globe2 className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="font-semibold">查詢設定說明</div>
          <div className="mt-1">
            公司與期間可擇一設定，也可同時設定。送出對話時，系統會將已選條件組成查詢前言，並在下一行接續原始問題。
          </div>
          <div className="mt-1">
             <br />並可同時控制是否讓AI在回答時引用專家指引、資料倉儲或外部資料。
          </div>
          <div className="mt-2 rounded-md bg-white/70 px-2 py-2 text-xs leading-6 dark:bg-black/20">
            範例：
            <br />
            選擇「臺灣水泥股份有限公司」與「2024年度」後，
            <br />
            問題「獲利能力與負債結構是否有風險？」
            <br />
            會送出成
            <br />
            「根據臺灣水泥股份有限公司(1101.TW)在2024年度期間的資訊
            <br />
            獲利能力與負債結構是否有風險？」
          </div>
        </div>

        {/* <div className="space-y-2">
          <label className="text-sm font-medium">財報類型選擇</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            value={props.value.statementType}
            onChange={(event) =>
              props.onChange({
                ...props.value,
                statementType: event.target.value,
              })
            }
          >
            <option value="個體財報">個體財報</option>
            <option value="合併財報">合併財報</option>
            <option value="年報">年報</option>
            <option value="季報">季報</option>
          </select>
        </div> */}

      </div>
    </div>
  );
}

export function ChatWindow(props: {
  endpoint: string;
  emptyStateComponent: ReactNode;
  presetQuestions?: string[];
  placeholder?: string;
  emoji?: string;
  showIngestForm?: boolean;
  showIntermediateStepsToggle?: boolean;
}) {
  const [showIntermediateSteps, setShowIntermediateSteps] = useState(
    !!props.showIntermediateStepsToggle,
  );
  const [intermediateStepsLoading, setIntermediateStepsLoading] =
    useState(false);
  const [dataSourcesForMessages, setDataSourcesForMessages] = useState<
    Record<string, any[]>
  >({});
  const [expertKnowledgeForMessages, setExpertKnowledgeForMessages] = useState<
    Record<string, UsedExpertKnowledge[]>
  >({});
  const [externalDataForMessages, setExternalDataForMessages] = useState<
    Record<string, ExternalReferenceData[]>
  >({});
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [graphNodesBySession, setGraphNodesBySession] = useState<ChatGraphTraces>({});
  const sessionsRef = useRef<ChatSession[]>([]);
  const [draftSession, setDraftSession] = useState<ChatSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [pendingDocumentUpload, setPendingDocumentUpload] =
    useState<PendingDocumentUpload | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [stagedDocumentsByChat, setStagedDocumentsByChat] = useState<
    Record<string, StagedChatDocument[]>
  >({});
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const [settings, setSettings] = useState<ChatSettings>(createEmptySettings());
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(
    null,
  );
  const [isExternalDataConfirmOpen, setIsExternalDataConfirmOpen] = useState(false);
  const [externalDataQueryDraft, setExternalDataQueryDraft] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const documentUploadInProgressRef = useRef(false);
  const documentUploadProgressTimerRef = useRef<number | null>(null);
  const externalDataConfirmTimerRef = useRef<number | null>(null);
  const conversationSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    setGraphNodesBySession(readChatGraphTraces());
    let ignore = false;
    // Remove the legacy browser copy. Conversation history is DB-only now.
    window.localStorage.removeItem("aitc-chatbot-sessions-v1");
    fetchChatConversations()
      .then((storedSessions) => {
        if (ignore) return;
        if (storedSessions.length === 0) {
          const initialDraftSession = createEmptySession();
          sessionsRef.current = [];
          setSessions([]);
          setDraftSession(initialDraftSession);
          setActiveSessionId(initialDraftSession.id);
          setSettings(loadChatSettingsForThread(initialDraftSession.id));
          return;
        }

        const sortedSessions = [...storedSessions].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
        sessionsRef.current = sortedSessions;
        setSessions(sortedSessions);
        setDraftSession(null);
        setActiveSessionId(sortedSessions[0].id);
        setSettings(loadChatSettingsForThread(sortedSessions[0].id));
        const restoredReferenceMaps = getSessionReferenceMaps(sortedSessions[0]);
        setDataSourcesForMessages(restoredReferenceMaps.dataSourcesForMessages);
        setExpertKnowledgeForMessages(
          restoredReferenceMaps.expertKnowledgeForMessages,
        );
        setExternalDataForMessages(restoredReferenceMaps.externalDataForMessages);
      })
      .catch((error) => {
        if (ignore) return;
        const initialDraftSession = createEmptySession();
        sessionsRef.current = [];
        setSessions([]);
        setDraftSession(initialDraftSession);
        setActiveSessionId(initialDraftSession.id);
        setSettings(loadChatSettingsForThread(initialDraftSession.id));
        toast.error(
          error instanceof Error ? error.message : "讀取對話歷史失敗",
        );
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const storedPanelState = window.localStorage.getItem(
      HISTORY_PANEL_STORAGE_KEY,
    );
    if (storedPanelState === null) return;

    setIsHistoryPanelOpen(storedPanelState === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      HISTORY_PANEL_STORAGE_KEY,
      String(isHistoryPanelOpen),
    );
  }, [isHistoryPanelOpen]);

  useEffect(() => {
    const storedPanelState = window.localStorage.getItem(
      SETTINGS_PANEL_STORAGE_KEY,
    );
    if (storedPanelState === null) return;

    setIsSettingsPanelOpen(storedPanelState === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SETTINGS_PANEL_STORAGE_KEY,
      String(isSettingsPanelOpen),
    );
  }, [isSettingsPanelOpen]);

  useEffect(() => {
    if (!activeSessionId) return;
    saveChatSettingsForThread(activeSessionId, settings);
  }, [activeSessionId, settings]);

  useEffect(() => {
    return () => {
      if (externalDataConfirmTimerRef.current !== null) {
        window.clearTimeout(externalDataConfirmTimerRef.current);
      }
      if (documentUploadProgressTimerRef.current !== null) {
        window.clearInterval(documentUploadProgressTimerRef.current);
      }
    };
  }, []);

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.id === activeSessionId) ??
      (draftSession?.id === activeSessionId ? draftSession : null),
    [activeSessionId, draftSession, sessions],
  );

  const activeMessages = activeSession?.messages ?? [];
  const activeStagedDocuments = activeSessionId
    ? stagedDocumentsByChat[activeSessionId] ?? []
    : [];
  const selectedConditionSummary = getSelectedConditionSummary(settings);
  const selectedCompany = getCompanyByLabel(settings.company);
  const openSidePanelsCount = Number(isHistoryPanelOpen) + Number(isSettingsPanelOpen);
  const contentMaxWidthClass =
    openSidePanelsCount === 2
      ? "max-w-[768px]"
      : openSidePanelsCount === 1
        ? "max-w-[960px]"
        : "max-w-[1100px]";

  function queueConversationSave(session: ChatSession) {
    conversationSaveQueueRef.current = conversationSaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveChatConversation(session))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "儲存對話歷史失敗",
        );
      });
  }

  const ensureActiveConversationExists = useCallback(async () => {
    if (!activeSessionId || !activeSession) {
      throw new Error("目前沒有可使用的對話");
    }
    if (sessionsRef.current.some((session) => session.id === activeSessionId)) return;

    const savedSession = await saveChatConversation(activeSession);
    const nextSessions = [
      savedSession,
      ...sessionsRef.current.filter((session) => session.id !== activeSessionId),
    ];
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    setDraftSession(null);
  }, [activeSession, activeSessionId]);

  function confirmStagedDocuments(documents: StagedChatDocument[]) {
    if (!activeSessionId) return;
    setStagedDocumentsByChat((current) => {
      const next = { ...current };
      if (documents.length) {
        next[activeSessionId] = documents;
      } else {
        delete next[activeSessionId];
      }
      return next;
    });
    setIsUploadDialogOpen(false);
    if (documents.length) {
      toast.success(`已加入 ${documents.length} 份待上傳文件`, {
        description: "送出 Chat 對話時才會實際上傳至後端。",
      });
    }
  }

  async function uploadStagedDocuments(
    chatId: string,
  ): Promise<ChatDocument[] | null> {
    const stagedDocuments = stagedDocumentsByChat[chatId] ?? [];
    if (!stagedDocuments.length) return [];
    if (documentUploadInProgressRef.current) return null;

    documentUploadInProgressRef.current = true;
    setIsUploadingDocuments(true);
    const uploadedDocuments: ChatDocument[] = [];

    const updateDocumentUpload = (
      localId: string,
      updates: Partial<ChatDocumentUpload>,
    ) => {
      setPendingDocumentUpload((current) =>
        current && current.chatId === chatId
          ? {
              ...current,
              documents: current.documents.map((document) =>
                document.localId === localId
                  ? { ...document, ...updates }
                  : document,
              ),
            }
          : current,
      );
    };

    const stopFakeProgress = () => {
      if (documentUploadProgressTimerRef.current !== null) {
        window.clearInterval(documentUploadProgressTimerRef.current);
        documentUploadProgressTimerRef.current = null;
      }
    };

    const startFakeProgress = (localId: string) => {
      stopFakeProgress();
      let progress = 0;
      updateDocumentUpload(localId, { progress, status: "uploading" });
      documentUploadProgressTimerRef.current = window.setInterval(() => {
        progress = Math.min(95, progress + FAKE_UPLOAD_PROGRESS_STEP);
        updateDocumentUpload(localId, { progress });
        if (progress === 95) stopFakeProgress();
      }, FAKE_UPLOAD_PROGRESS_INTERVAL_MS);
    };

    try {
      await ensureActiveConversationExists();
      for (const document of stagedDocuments) {
        startFakeProgress(document.localId);
        try {
          const uploadedDocument = await uploadChatDocument(chatId, document.file);
          stopFakeProgress();
          uploadedDocuments.push(uploadedDocument);
          updateDocumentUpload(document.localId, {
            progress: 100,
            status: "completed",
          });
        } catch (error) {
          stopFakeProgress();
          updateDocumentUpload(document.localId, { status: "failed" });
          await Promise.allSettled(
            uploadedDocuments.map((uploadedDocument) =>
              deleteChatDocument(uploadedDocument.documentId),
            ),
          );
          toast.error(`${document.file.name} 上傳失敗，本次對話尚未送出`, {
            description:
              error instanceof Error ? error.message : "請確認檔案後再次送出。",
          });
          return null;
        }
      }

      setStagedDocumentsByChat((current) => {
        const next = { ...current };
        delete next[chatId];
        return next;
      });
      toast.success(`${stagedDocuments.length} 份文件已上傳`);
      return uploadedDocuments;
    } catch (error) {
      setPendingDocumentUpload((current) =>
        current && current.chatId === chatId
          ? {
              ...current,
              documents: current.documents.map((document) => ({
                ...document,
                status: "failed",
              })),
            }
          : current,
      );
      toast.error("文件上傳失敗，本次對話尚未送出", {
        description: error instanceof Error ? error.message : "請稍後再試。",
      });
      return null;
    } finally {
      stopFakeProgress();
      documentUploadInProgressRef.current = false;
      setIsUploadingDocuments(false);
    }
  }

  function replaceActiveSession(
    messages: Message[],
    referenceMaps?: ReturnType<typeof createEmptyReferenceMaps>,
    persistToDatabase = false,
  ) {
    if (!activeSessionId) return;

    const isSavedSession = sessions.some((session) => session.id === activeSessionId);

    if (!isSavedSession && messages.length === 0) {
      setDraftSession((currentDraftSession) =>
        currentDraftSession && currentDraftSession.id === activeSessionId
          ? {
              ...currentDraftSession,
              messages,
              ...(referenceMaps ?? getSessionReferenceMaps(currentDraftSession)),
            }
          : currentDraftSession,
      );
      return;
    }

    const nextSessions = upsertSession(
      sessionsRef.current,
      activeSessionId,
      messages,
      referenceMaps,
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    if (persistToDatabase) {
      const sessionToSave = nextSessions.find(
        (session) => session.id === activeSessionId,
      );
      if (sessionToSave) queueConversationSave(sessionToSave);
    }

    if (!isSavedSession) {
      setDraftSession(null);
    }
  }

  function createSession() {
    if (activeMessages.length === 0) {
      setInput("");
      setDataSourcesForMessages({});
      setExpertKnowledgeForMessages({});
      setExternalDataForMessages({});
      return;
    }

    const nextDraftSession = createEmptySession();
    setDraftSession(nextDraftSession);
    setActiveSessionId(nextDraftSession.id);
    setSettings(loadChatSettingsForThread(nextDraftSession.id));
    setInput("");
    setDataSourcesForMessages({});
    setExpertKnowledgeForMessages({});
    setExternalDataForMessages({});
  }

  function selectSession(sessionId: string) {
    const targetSession =
      sessions.find((session) => session.id === sessionId) ??
      (draftSession?.id === sessionId ? draftSession : null);
    const restoredReferenceMaps = getSessionReferenceMaps(targetSession);
    setActiveSessionId(sessionId);
    setSettings(loadChatSettingsForThread(sessionId));
    setInput("");
    setDataSourcesForMessages(restoredReferenceMaps.dataSourcesForMessages);
    setExpertKnowledgeForMessages(restoredReferenceMaps.expertKnowledgeForMessages);
    setExternalDataForMessages(restoredReferenceMaps.externalDataForMessages);
  }

  function stopGenerating() {
    if (externalDataConfirmTimerRef.current !== null) {
      window.clearTimeout(externalDataConfirmTimerRef.current);
      externalDataConfirmTimerRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setPendingSubmission(null);
    setIsExternalDataConfirmOpen(false);
    setExternalDataQueryDraft("");
    setIsLoading(false);
    setIntermediateStepsLoading(false);
  }

  async function confirmPendingSubmission() {
    if (!pendingSubmission) return;

    if (externalDataConfirmTimerRef.current !== null) {
      window.clearTimeout(externalDataConfirmTimerRef.current);
      externalDataConfirmTimerRef.current = null;
    }

    if (pendingSubmission.clearInputOnConfirm) {
      setInput("");
    }

    const nextRequestMessages = pendingSubmission.requestMessages;
    const pendingDisplayMessages = pendingSubmission.displayMessages;
    const pendingExternalDataQueryText = externalDataQueryDraft.trim();
    setIsExternalDataConfirmOpen(false);
    setExternalDataQueryDraft("");
    setPendingSubmission(null);
    await streamAssistantReply(nextRequestMessages, {
      displayMessages: pendingDisplayMessages,
      targetEndpoint: BACKEND_API_PATHS.chatWithExternal,
      externalDataQueryText:
        pendingExternalDataQueryText || pendingSubmission.externalDataQueryText,
      externalDataDecision: "adopted",
      workflowThreadId: pendingSubmission.workflowThreadId,
      documentsForMessages: pendingSubmission.documentsForMessages,
      previousGraphNodes: pendingSubmission.graphNodes,
    });
  }

  async function rejectPendingSubmission() {
    if (!pendingSubmission) return;

    if (externalDataConfirmTimerRef.current !== null) {
      window.clearTimeout(externalDataConfirmTimerRef.current);
      externalDataConfirmTimerRef.current = null;
    }

    const nextRequestMessages = pendingSubmission.requestMessages;
    const pendingDisplayMessages = pendingSubmission.displayMessages;
    const pendingExternalDataQueryText = externalDataQueryDraft.trim();
    setIsExternalDataConfirmOpen(false);
    setExternalDataQueryDraft("");
    setPendingSubmission(null);
    await streamAssistantReply(nextRequestMessages, {
      displayMessages: pendingDisplayMessages,
      targetEndpoint: BACKEND_API_PATHS.chatWithExternal,
      externalDataQueryText:
        pendingExternalDataQueryText || pendingSubmission.externalDataQueryText,
      externalDataDecision: "rejected",
      workflowThreadId: pendingSubmission.workflowThreadId,
      documentsForMessages: pendingSubmission.documentsForMessages,
      previousGraphNodes: pendingSubmission.graphNodes,
    });
  }

  async function submitQuestion(
    question: string,
    options?: { clearInputOnConfirm?: boolean },
  ) {
    if (
      isLoading ||
      documentUploadInProgressRef.current ||
      isUploadingDocuments ||
      intermediateStepsLoading ||
      !activeSessionId
    ) {
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    const outboundQuestion = formatQuestionWithContext(trimmedQuestion, settings);
    if (!outboundQuestion) return;

    const userMessageId = createId();
    const stagedDocuments = stagedDocumentsByChat[activeSessionId] ?? [];
    if (stagedDocuments.length) {
      setPendingDocumentUpload({
        chatId: activeSessionId,
        message: {
          id: userMessageId,
          content: outboundQuestion,
          role: "user",
        },
        documents: stagedDocuments.map((document) => ({
          localId: document.localId,
          fileName: document.file.name,
          fileType: document.fileType,
          fileSize: document.file.size,
          progress: 0,
          status: "queued",
        })),
      });
    }
    const uploadedDocuments = await uploadStagedDocuments(activeSessionId);
    if (uploadedDocuments === null) return;
    setPendingDocumentUpload(null);

    const nextMessages = activeMessages.concat({
      id: userMessageId,
      content: outboundQuestion,
      role: "user",
    });
    const documentsForMessages = {
      ...(activeSession?.documentsForMessages ?? {}),
      ...(uploadedDocuments.length
        ? { [userMessageId]: uploadedDocuments }
        : {}),
    };

    if (options?.clearInputOnConfirm) {
      setInput("");
    }

    await streamAssistantReply(nextMessages, {
      clearInputOnConfirm: options?.clearInputOnConfirm ?? false,
      documentsForMessages,
    });
  }

  async function streamAssistantReply(
    requestMessages: Message[],
    options?: {
      displayMessages?: Message[];
      targetEndpoint?: string;
      externalDataQueryText?: string;
      externalDataDecision?: "adopted" | "rejected";
      workflowThreadId?: string;
      clearInputOnConfirm?: boolean;
      documentsForMessages?: Record<string, ChatDocument[]>;
      previousGraphNodes?: string[];
    },
  ) {
    if (!activeSessionId) return;

    const pendingAssistantMessage = options?.displayMessages?.at(-1);
    const assistantMessageId =
      pendingAssistantMessage?.role === "assistant"
        ? pendingAssistantMessage.id
        : createId();
    const displayMessages =
      options?.displayMessages ??
      requestMessages.concat({
        id: assistantMessageId,
        role: "assistant",
        content: "",
      });

    const documentsForMessages =
      options?.documentsForMessages ?? activeSession?.documentsForMessages ?? {};
    const emptyReferenceMaps = {
      ...createEmptyReferenceMaps(),
      documentsForMessages,
    };
    // Save the submitted user message immediately, then keep the temporary
    // assistant placeholder only in React state while the response streams.
    replaceActiveSession(requestMessages, emptyReferenceMaps, true);
    replaceActiveSession(displayMessages, emptyReferenceMaps);
    setIsLoading(true);
    setIntermediateStepsLoading(true);
    setDataSourcesForMessages(emptyReferenceMaps.dataSourcesForMessages);
    setExpertKnowledgeForMessages(emptyReferenceMaps.expertKnowledgeForMessages);
    setExternalDataForMessages(emptyReferenceMaps.externalDataForMessages);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const selectedCompanyForExpertKnowledge = getCompanyByLabel(settings.company);
    let appliedExpertKnowledgeEntries: Awaited<
      ReturnType<typeof fetchAppliedExpertKnowledgeEntries>
    > = [];

    if (settings.useExpertKnowledge) {
      try {
        appliedExpertKnowledgeEntries = await fetchAppliedExpertKnowledgeEntries({
          companyLabel: settings.company,
          companyPromptValue: selectedCompanyForExpertKnowledge?.promptValue ?? "",
          industry: selectedCompanyForExpertKnowledge?.industry ?? "",
          dataSource: "財務報表",
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "讀取專家知識庫失敗",
        );
      }
    }
    let appliedWarehouseDataEntries: Awaited<
      ReturnType<typeof fetchAppliedWarehouseDataEntries>
    > = [];

    if (settings.useWarehouseData) {
      try {
        appliedWarehouseDataEntries = await fetchAppliedWarehouseDataEntries({
          companyLabel: settings.company,
          companyPromptValue: selectedCompanyForExpertKnowledge?.promptValue ?? "",
          industry: selectedCompanyForExpertKnowledge?.industry ?? "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "讀取資料倉儲失敗");
      }
    }
    const appliedExpertKnowledgePayload = appliedExpertKnowledgeEntries
      .map((entry) => ({
        anchorDescription: entry.anchorDescription?.trim?.() ?? "",
        companyLabel: entry.companyLabel?.trim?.() ?? "",
        dataSource: entry.dataSource?.trim?.() ?? "",
        industry: entry.industry?.trim?.() ?? "",
        systemPrompt: entry.systemPrompt?.trim?.() ?? "",
        title: entry.title?.trim?.() ?? "",
        createdAt: entry.createdAt?.trim?.() ?? "",
        updatedAt: entry.updatedAt?.trim?.() ?? "",
      }))
      .filter(
        (entry) =>
          entry.anchorDescription ||
          entry.companyLabel ||
          entry.dataSource ||
          entry.industry ||
          entry.systemPrompt ||
          entry.title ||
          entry.createdAt ||
          entry.updatedAt,
      );
    const appliedWarehouseDataPayload = appliedWarehouseDataEntries
      .map((entry) => ({
        category: entry.category?.trim?.() ?? "",
        companyLabel: entry.companyLabel?.trim?.() ?? "",
        companyPromptValue: entry.companyPromptValue?.trim?.() ?? "",
        industry: entry.industry?.trim?.() ?? "",
        source: entry.source?.trim?.() ?? "",
        summary: entry.summary?.trim?.() ?? "",
        title: entry.title?.trim?.() ?? "",
        recordUpdatedAt: entry.recordUpdatedAt?.trim?.() ?? "",
        createdAt: entry.createdAt?.trim?.() ?? "",
        updatedAt: entry.updatedAt ?? "",
        url: entry.url?.trim?.() ?? "",
      }))
      .filter(
        (entry) =>
          entry.category ||
          entry.companyLabel ||
          entry.companyPromptValue ||
          entry.industry ||
          entry.source ||
          entry.summary ||
          entry.title ||
          entry.recordUpdatedAt ||
          entry.createdAt ||
          entry.url,
      );

    console.log("[ChatWindow][appliedExpertKnowledge] entries", appliedExpertKnowledgeEntries);
    console.log(
      "[ChatWindow][appliedExpertKnowledge] payload",
      appliedExpertKnowledgePayload,
    );
    console.log("[ChatWindow][appliedWarehouseData] entries", appliedWarehouseDataEntries);
    console.log(
      "[ChatWindow][appliedWarehouseData] payload",
      appliedWarehouseDataPayload,
    );

    try {
      const targetEndpoint = options?.targetEndpoint ?? props.endpoint;
      const appliedExternalDataPayload =
        targetEndpoint === BACKEND_API_PATHS.chatWithExternal
          ? buildExternalReferenceData(
              options?.externalDataQueryText ?? "",
              options?.externalDataDecision ?? "adopted",
            )
          : [];
      const requestPayload = {
        appliedExpertKnowledge: appliedExpertKnowledgePayload,
        appliedWarehouseData: appliedWarehouseDataPayload,
        company: settings.company ?? "",
        conversationId: activeSessionId,
        workflowThreadId: options?.workflowThreadId ?? assistantMessageId,
        ...(targetEndpoint === BACKEND_API_PATHS.chatWithExternal
          ? {
              appliedExternalData: appliedExternalDataPayload,
              externalDataDecision: options?.externalDataDecision ?? "adopted",
              externalDataQueryText: options?.externalDataQueryText ?? "",
            }
          : {}),
        messages: requestMessages.map((message) => ({
          content: message.content?.toString() ?? "",
          role: message.role,
        })),
        period: getBackendPeriodLabel(settings),
        question:
          requestMessages[requestMessages.length - 1]?.content?.toString() ?? "",
        referenceSettings: {
          useExpertKnowledge: settings.useExpertKnowledge,
          useExternalData: settings.useExternalData,
          useWarehouseData: settings.useWarehouseData,
        },
        settings: {
          company: settings.company ?? "",
          period: settings.period ?? "",
          periodQuarter: settings.periodQuarter ?? "",
          periodYear: settings.periodYear ?? "",
          statementType: settings.statementType ?? "",
        },
        show_intermediate_steps: showIntermediateSteps,
      };

      // 將完整聊天內容送到後端聊天服務，並把串流回應即時顯示在前端。
      const response = await fetchBackendApi(
        targetEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/plain",
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "聊天服務回傳失敗");
      }

      const dataSourcesHeader =
        response.headers.get("x-data-sources") ??
        response.headers.get("x-sources");
      let responseReferenceMaps = {
        ...createEmptyReferenceMaps(),
        documentsForMessages,
      };
      if (dataSourcesHeader) {
        const parsedDataSources = parseBase64JsonHeader<any[]>(dataSourcesHeader);
        responseReferenceMaps = {
          ...responseReferenceMaps,
          dataSourcesForMessages: {
            [assistantMessageId]: parsedDataSources,
          },
        };
        setDataSourcesForMessages({
          [assistantMessageId]: parsedDataSources,
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        const externalDataQueryText =
          typeof json?.externalDataQueryText === "string"
            ? json.externalDataQueryText.trim()
            : "";
        const workflowThreadId =
          typeof json?.workflowThreadId === "string" && json.workflowThreadId.trim()
            ? json.workflowThreadId.trim()
            : options?.workflowThreadId ?? assistantMessageId;
        const currentGraphNodes = Array.isArray(json?.graphNodes)
          ? json.graphNodes.filter((node: unknown): node is string => typeof node === "string")
          : [];
        const previousGraphNodes = options?.previousGraphNodes ?? [];
        const graphNodes =
          previousGraphNodes.at(-1) === currentGraphNodes[0]
            ? [...previousGraphNodes, ...currentGraphNodes.slice(1)]
            : [...previousGraphNodes, ...currentGraphNodes];
        const assistantContent =
          typeof json?.answer === "string"
            ? json.answer
            : typeof json?.message === "string"
              ? json.message
              : JSON.stringify(json);
        const dataSources = getArrayField(json, [
          "data_sources",
          "dataSources",
          "sources",
          "sourceDocuments",
          "source_documents",
        ]);
        const responseExternalData = normalizeExternalReferenceData(
          getArrayField(json, [
            "appliedExternalData",
            "usedExternalData",
            "externalData",
            "external_data",
          ]),
        );
        const fallbackExternalData =
          options?.externalDataDecision === "adopted" &&
          options.externalDataQueryText
            ? buildExternalReferenceData(
                options.externalDataQueryText,
                options.externalDataDecision,
                typeof json?.externalDataSummary === "string"
                  ? json.externalDataSummary
                  : "",
              )
            : [];
        const usedExpertKnowledge = Array.isArray(json?.usedExpertKnowledge)
          ? json.usedExpertKnowledge
              .map((entry: any) => ({
                title: typeof entry?.title === "string" ? entry.title : "",
                anchorDescription:
                  typeof entry?.anchorDescription === "string"
                    ? entry.anchorDescription
                    : typeof entry?.description === "string"
                      ? entry.description
                      : "",
                systemPrompt:
                  typeof entry?.systemPrompt === "string" ? entry.systemPrompt : "",
                createdAt:
                  typeof entry?.createdAt === "string" ? entry.createdAt : "",
                updatedAt:
                  typeof entry?.updatedAt === "string" ? entry.updatedAt : "",
              }))
              .filter(
                (entry: UsedExpertKnowledge) =>
                  entry.title ||
                  entry.anchorDescription ||
                  entry.systemPrompt ||
                  entry.createdAt ||
                  entry.updatedAt,
              )
          : [];

        const nextDataSourcesForMessages =
          !dataSourcesHeader && dataSources.length > 0
            ? { [assistantMessageId]: dataSources }
            : responseReferenceMaps.dataSourcesForMessages;
        const nextExpertKnowledgeForMessages = {
          [assistantMessageId]: usedExpertKnowledge,
        };
        const nextExternalDataForMessages = {
          [assistantMessageId]:
            responseExternalData.length > 0
              ? responseExternalData
              : fallbackExternalData,
        };
        responseReferenceMaps = {
          dataSourcesForMessages: nextDataSourcesForMessages,
          expertKnowledgeForMessages: nextExpertKnowledgeForMessages,
          externalDataForMessages: nextExternalDataForMessages,
          documentsForMessages,
        };

        if (!dataSourcesHeader && dataSources.length > 0) {
          setDataSourcesForMessages(nextDataSourcesForMessages);
        }
        setExpertKnowledgeForMessages(nextExpertKnowledgeForMessages);
        setExternalDataForMessages(nextExternalDataForMessages);

        if (
          settings.useExternalData &&
          !options?.externalDataDecision &&
          json?.pendingHumanReview !== false &&
          externalDataQueryText
        ) {
          setPendingSubmission({
            requestMessages,
            displayMessages,
            clearInputOnConfirm: options?.clearInputOnConfirm ?? false,
            externalDataQueryText,
            workflowThreadId,
            documentsForMessages,
            graphNodes,
          });
          setExternalDataQueryDraft(externalDataQueryText);
          setIsExternalDataConfirmOpen(true);
          return;
        }

        const finalMessages = requestMessages.concat({
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
        });
        if (graphNodes.length > 0) {
          setGraphNodesBySession(
            saveChatGraphTrace(activeSessionId, assistantMessageId, graphNodes),
          );
        }
        replaceActiveSession(finalMessages, responseReferenceMaps, true);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("找不到回應串流");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });
        const nextMessages = requestMessages.concat({
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
        });
        replaceActiveSession(nextMessages, responseReferenceMaps);
      }

      const finalMessages = requestMessages.concat({
        id: assistantMessageId,
        role: "assistant",
        content: assistantContent,
      });
      replaceActiveSession(finalMessages, responseReferenceMaps, true);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        toast.message("已停止生成");
      } else {
        const fallbackMessages =
          displayMessages[displayMessages.length - 1]?.content?.length === 0
            ? displayMessages.slice(0, -1)
            : displayMessages;
        replaceActiveSession(fallbackMessages, undefined, true);
        toast.error("Error while processing your request", {
          description: error?.message ?? "未知錯誤",
        });
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setIntermediateStepsLoading(false);
    }
  }

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitQuestion(input, { clearInputOnConfirm: true });
  }

  async function sendPresetQuestion(question: string) {
    await submitQuestion(question);
  }

  function handleCopyMessage(message: Message) {
    copyText(message.content, "已複製回答");
  }

  function handleCopyConversation() {
    copyText(formatConversationForCopy(activeMessages), "已複製整段對話");
  }

  function clearCompanyConditions() {
    setSettings(createEmptySettings());
  }

  return (
    <>
      <div className="flex h-full bg-background">
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-border bg-muted/20 transition-[width] duration-300 lg:flex",
          isHistoryPanelOpen ? "w-[300px]" : "w-0 border-r-0",
        )}
      >
        <div className="flex min-w-0 flex-1">
          <ConversationHistory
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={selectSession}
            onCreate={createSession}
            className="flex-1"
            onToggleCollapse={() => setIsHistoryPanelOpen(false)}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-3">
          <div
            className={cn(
              "flex items-center justify-between gap-3 transition-[max-width] duration-300"
            )}
          >
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "hidden lg:inline-flex",
                  isHistoryPanelOpen
                    ? "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-500"
                    : null,
                )}
                onClick={() => setIsHistoryPanelOpen((current) => !current)}
                aria-label={isHistoryPanelOpen ? "收合歷史對話" : "展開歷史對話"}
                title={isHistoryPanelOpen ? "收合歷史對話" : "展開歷史對話"}
              >
                <HistoryEduIcon sx={{ fontSize: 20 }} />
                歷史對話
              </Button>

              <div>
                <div className="mt-2 mr-[10px] inline-flex rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900 shadow-sm dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
                  {selectedConditionSummary}
                </div>
                {selectedCompany?.industry ? (
                  <div className="mt-2 inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                    已套用專業分析產業：{selectedCompany.industry}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="lg:hidden">
                    <HistoryEduIcon sx={{ fontSize: 16 }} />
                    歷史紀錄
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 sm:max-w-md">
                  <DialogHeader className="px-6 pt-6">
                    <DialogTitle>對話歷史紀錄</DialogTitle>
                    <DialogDescription>切換過去的案件與問答內容</DialogDescription>
                  </DialogHeader>
                  <div className="h-[60vh]">
                    <ConversationHistory
                      sessions={sessions}
                      activeSessionId={activeSessionId}
                      onSelect={selectSession}
                      onCreate={createSession}
                      className="border-r border-border"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCompanyConditions}
                >
                  <CleaningServicesIcon sx={{ fontSize: 16 }} />
                  清除公司條件
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyConversation}
                >
                  <Copy className="h-4 w-4" />
                  複製完整對話
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={createSession}>
                  <MessageSquarePlus className="h-4 w-4" />
                  新對話
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "hidden lg:inline-flex",
                    isSettingsPanelOpen
                      ? "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-500"
                      : null,
                  )}
                  onClick={() => setIsSettingsPanelOpen((current) => !current)}
                >
                  <Settings className="h-4 w-4" />
                  查詢設定
                </Button>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="lg:hidden">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 sm:max-w-md">
                  <DialogHeader className="px-6 pt-6">
                    <DialogTitle>查詢設定</DialogTitle>
                    <DialogDescription>公司、期間可擇一設定</DialogDescription>
                  </DialogHeader>
                  <div className="h-[60vh]">
                    <SettingsPanel
                      value={settings}
                      onChange={setSettings}
                      className="h-full"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <main className="relative flex-1">
          <ChatLayout
            content={
              <ChatMessages
                aiEmoji={props.emoji}
                messages={activeMessages}
                emptyStateComponent={props.emptyStateComponent}
                presetQuestions={props.presetQuestions}
                dataSourcesForMessages={dataSourcesForMessages}
                expertKnowledgeForMessages={expertKnowledgeForMessages}
                externalDataForMessages={externalDataForMessages}
                documentsForMessages={
                  activeSession?.documentsForMessages ?? {}
                }
                graphNodesForMessages={
                  activeSessionId ? graphNodesBySession[activeSessionId] ?? {} : {}
                }
                pendingDocumentUpload={
                  pendingDocumentUpload?.chatId === activeSessionId
                    ? pendingDocumentUpload
                    : null
                }
                className={contentMaxWidthClass}
                onCopyMessage={handleCopyMessage}
                onSelectPresetQuestion={sendPresetQuestion}
              />
            }
            footer={
              <ChatInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onSubmit={sendMessage}
                onStop={stopGenerating}
                loading={isLoading || intermediateStepsLoading}
                disabled={isUploadingDocuments}
                placeholder={props.placeholder}
                className={contentMaxWidthClass}
              >
                {props.showIntermediateStepsToggle && (
                  <FormControlLabel
                    control={
                      <MuiCheckbox
                        checked={showIntermediateSteps}
                        onChange={(_, checked) => {
                          setShowIntermediateSteps(checked);
                        }}
                        size="small"
                      />
                    }
                    label="Show intermediate steps"
                    sx={{
                      m: 0,
                      "& .MuiFormControlLabel-label": {
                        fontSize: 14,
                      },
                    }}
                  />
                )}

                {props.showIngestForm && activeSessionId && (
                  <Dialog
                    open={isUploadDialogOpen}
                    onOpenChange={setIsUploadDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={isUploadingDocuments}>
                        <Paperclip className="h-4 w-4" />
                        <span>
                          上傳文件
                          {activeStagedDocuments.length
                            ? ` (${activeStagedDocuments.length})`
                            : ""}
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="min-w-0 overflow-hidden sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>上傳對話文件</DialogTitle>
                        <DialogDescription>
                          選擇文件並按下確定後會先保留在瀏覽器；送出 Chat
                          對話時才會實際上傳至後端。
                        </DialogDescription>
                      </DialogHeader>
                      <UploadDocumentsForm
                        stagedDocuments={activeStagedDocuments}
                        onCancel={() => setIsUploadDialogOpen(false)}
                        onConfirm={confirmStagedDocuments}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </ChatInput>
            }
          />
        </main>
      </div>

        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden border-l border-border bg-muted/20 transition-[width] duration-300 lg:flex",
            isSettingsPanelOpen ? "w-[320px]" : "w-0 border-l-0",
          )}
        >
          <div className="flex min-w-0 flex-1">
            <SettingsPanel
              value={settings}
              onChange={setSettings}
              className="flex-1"
              onToggleCollapse={() => setIsSettingsPanelOpen(false)}
            />
          </div>
        </aside>
      </div>

      <Dialog
        open={isExternalDataConfirmOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsExternalDataConfirmOpen(true);
          }
        }}
      >
        <DialogContent
          className="max-w-md rounded-2xl sm:max-w-md"
          hideCloseButton
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>確認外部資料查詢內容</DialogTitle>
            <DialogDescription className="leading-6">
              你已勾選「是否參考外部資料」。系統將把下列文字送至雲端 LLM，
              以進行即時財務資料查詢。請確認內容無誤後再送出。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">即將送出的查詢文字</div>
            <Textarea
              value={externalDataQueryDraft}
              onChange={(event) => setExternalDataQueryDraft(event.target.value)}
              className="min-h-[112px] rounded-xl border-input bg-secondary text-sm leading-6 text-foreground"
            />
          </div>

          <div className="text-sm leading-6 text-muted-foreground">
            你可以直接修改上方文字。點選「確認」後才會正式送出查詢；若不需要進行外部資料查詢，請按「不採用」。
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => void rejectPendingSubmission()}>
              不採用
            </Button>
            <Button type="button" onClick={confirmPendingSubmission}>
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
