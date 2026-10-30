"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { AlertCircle, FileText, FileUp, X } from "lucide-react";
import { Tooltip } from "@mui/material";

import type { StagedChatDocument } from "@/types/chatDocument";
import { cn } from "@/utils/cn";
import { Button } from "./ui/button";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "txt",
  "md",
  "markdown",
  "csv",
  "xlsx",
  "xbrl",
  "xml",
  "html",
  "htm",
  "xhtml",
]);
const FILE_INPUT_ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,.csv,.xlsx,.xbrl,.xml,.html,.htm,.xhtml";
const XBRL_CANDIDATE_EXTENSIONS = new Set(["xbrl", "xml"]);
const HTML_EXTENSIONS = new Set(["html", "htm", "xhtml"]);
const XBRL_INSTANCE_NAMESPACE = "http://www.xbrl.org/2003/instance";
const INLINE_XBRL_NAMESPACES = new Set([
  "http://www.xbrl.org/2008/inlineXBRL",
  "http://www.xbrl.org/2013/inlineXBRL",
]);
const INLINE_XBRL_FACT_NAMES = new Set([
  "nonfraction",
  "nonnumeric",
  "fraction",
]);

type RejectedFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  error: string;
};

function createLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sameFile(left: File, right: File) {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified
  );
}

function detectXbrlDocumentType(document: Document) {
  const root = document.documentElement;
  if (
    root.namespaceURI === XBRL_INSTANCE_NAMESPACE &&
    root.localName.toLowerCase() === "xbrl"
  ) {
    return "XBRL";
  }
  if (root.localName.toLowerCase() !== "html") return null;

  let hasHeader = false;
  let hasFact = false;
  let hasContext = false;
  for (const element of Array.from(document.getElementsByTagName("*"))) {
    const namespace = element.namespaceURI ?? "";
    const localName = element.localName.toLowerCase();
    if (INLINE_XBRL_NAMESPACES.has(namespace)) {
      hasHeader ||= localName === "header";
      hasFact ||= INLINE_XBRL_FACT_NAMES.has(localName);
    } else if (namespace === XBRL_INSTANCE_NAMESPACE) {
      hasContext ||= localName === "context";
    }
    if (hasHeader && hasFact && hasContext) return "Inline XBRL";
  }
  return null;
}

async function detectedFileType(file: File, extension: string) {
  if (
    !XBRL_CANDIDATE_EXTENSIONS.has(extension) &&
    !HTML_EXTENSIONS.has(extension)
  ) {
    return extension;
  }

  const document = new DOMParser().parseFromString(
    await file.text(),
    "application/xml",
  );
  if (document.getElementsByTagName("parsererror").length) {
    return HTML_EXTENSIONS.has(extension) ? "html" : null;
  }
  const xbrlDocumentType = detectXbrlDocumentType(document);
  if (xbrlDocumentType) return xbrlDocumentType;
  return HTML_EXTENSIONS.has(extension) ? "html" : null;
}

function TruncatedFileName({ name }: { name: string }) {
  return (
    <Tooltip title={name} arrow placement="top">
      <span
        tabIndex={0}
        className="block w-full max-w-full truncate text-sm font-medium text-slate-800 outline-none"
      >
        {name}
      </span>
    </Tooltip>
  );
}

export function UploadDocumentsForm({
  stagedDocuments,
  onCancel,
  onConfirm,
}: {
  stagedDocuments: StagedChatDocument[];
  onCancel: () => void;
  onConfirm: (documents: StagedChatDocument[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedDocuments, setSelectedDocuments] =
    useState<StagedChatDocument[]>(stagedDocuments);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isInspectingFiles, setIsInspectingFiles] = useState(false);
  const isInspectingFilesRef = useRef(false);

  async function selectFiles(files: File[]) {
    if (!files.length || isInspectingFilesRef.current) return;

    isInspectingFilesRef.current = true;
    setIsInspectingFiles(true);

    const next = [...selectedDocuments];
    const nextRejectedFiles: RejectedFile[] = [];
    try {
      for (const file of files) {
        const extension = fileExtension(file.name);
        let error = "";
        let fileType = extension;
        if (!ACCEPTED_EXTENSIONS.has(extension)) {
          error = "不支援此檔案格式";
        } else if (!file.size) {
          error = "不可選擇空白檔案";
        } else if (file.size > MAX_FILE_SIZE_BYTES) {
          error = "檔案不可超過 20 MB";
        } else if (next.some((item) => sameFile(item.file, file))) {
          error = "此檔案已在待上傳清單中";
        } else {
          try {
            const detectedType = await detectedFileType(file, extension);
            if (!detectedType) {
              error = "內容不是有效的 XBRL 或 Inline XBRL 文件";
            } else {
              fileType = detectedType;
            }
          } catch {
            error = "無法讀取檔案內容";
          }
        }
        if (error) {
          nextRejectedFiles.push({
            id: createLocalId(),
            fileName: file.name,
            fileType: extension || "未知",
            fileSize: file.size,
            error,
          });
        } else {
          next.push({ localId: createLocalId(), file, fileType });
        }
      }
      setSelectedDocuments(next);
      if (nextRejectedFiles.length) {
        setRejectedFiles((current) => [...current, ...nextRejectedFiles]);
      }
    } finally {
      isInspectingFilesRef.current = false;
      setIsInspectingFiles(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void selectFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_INPUT_ACCEPT}
        disabled={isInspectingFiles}
        onChange={handleFileInput}
        className="sr-only"
      />
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors",
          isDragging
            ? "border-sky-500 bg-sky-50"
            : "border-slate-300 bg-slate-50/70",
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <FileUp className="h-5 w-5" />
        </span>
        <div className="mt-3 text-sm font-semibold text-slate-800">
          拖曳檔案到這裡
        </div>
        <div className="mt-1 text-xs text-slate-500">
          選檔後請按「確定」，此時尚不會上傳
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={isInspectingFiles}
          onClick={() => inputRef.current?.click()}
        >
          {isInspectingFiles ? "辨識檔案中…" : "選擇檔案"}
        </Button>
        <div className="mt-3 text-[11px] leading-5 text-slate-500">
          PDF、DOCX、HTML、TXT、Markdown、CSV、XLSX、XBRL（含 Inline XBRL）；每個檔案上限 20 MB
        </div>
      </div>

      <div
        aria-live="polite"
        className="max-h-[42vh] min-w-0 max-w-full space-y-2 overflow-x-hidden overflow-y-auto pr-1"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">待上傳文件</div>
          <div className="text-xs text-slate-500">
            {selectedDocuments.length} 份等待確定
          </div>
        </div>

        {selectedDocuments.length === 0 && rejectedFiles.length === 0 ? (
          <div className="rounded-lg border border-slate-200 py-5 text-center text-sm text-slate-500">
            尚未選擇文件
          </div>
        ) : null}

        {selectedDocuments.map((item) => (
          <div
            key={item.localId}
            className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50 p-3"
          >
            <FileText className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 max-w-full flex-1 overflow-hidden">
              <TruncatedFileName name={item.file.name} />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded bg-white px-1.5 py-0.5 font-semibold uppercase">
                  {item.fileType}
                </span>
                <span>{formatFileSize(item.file.size)}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() =>
                setSelectedDocuments((current) =>
                  current.filter((document) => document.localId !== item.localId),
                )
              }
              aria-label={`移除 ${item.file.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {rejectedFiles.map((item) => (
          <div
            key={item.id}
            className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-rose-200 bg-rose-50 p-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="min-w-0 max-w-full flex-1 overflow-hidden">
              <TruncatedFileName name={item.fileName} />
              <div className="mt-1 break-words text-xs text-rose-700">
                {item.fileType.toUpperCase()} · {formatFileSize(item.fileSize)} ·{" "}
                {item.error}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() =>
                setRejectedFiles((current) =>
                  current.filter((file) => file.id !== item.id),
                )
              }
              aria-label={`移除 ${item.fileName}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        按下確定只會加入待上傳清單；送出 Chat 對話時才會傳送到後端。
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="button"
          disabled={isInspectingFiles}
          onClick={() => onConfirm(selectedDocuments)}
        >
          {isInspectingFiles
            ? "辨識中…"
            : `確定${selectedDocuments.length ? ` (${selectedDocuments.length})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
