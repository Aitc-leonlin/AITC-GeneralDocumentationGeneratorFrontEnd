import type {
  ReportDashboard,
  ReportDocumentResult,
  ReportOutlinePayload,
  ReportOutlineResult,
  ReportHistoryResult,
  ReportQuickStart,
  ReportConversationThread,
  ReportThreadMessageResult,
} from "@/types/reportGenerator";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

type ErrorPayload = {
  detail?: string | { msg?: string }[];
  error?: string;
};

function getErrorMessage(payload: ErrorPayload | null, fallback: string) {
  const detail = payload?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? "資料格式不正確").join("；");
  }
  return payload?.error ?? fallback;
}

type ReportHistoryResponse = Partial<ReportHistoryResult> & ErrorPayload;

type ReportDashboardResponse = {
  dashboard?: ReportDashboard;
} & ErrorPayload;

function getFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return "";

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encodedFilename) {
    return decodeURIComponent(encodedFilename);
  }

  return contentDisposition.match(/filename="([^"]+)"/)?.[1] ?? "";
}

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const json = (await response.json().catch(() => null)) as (T & ErrorPayload) | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(json, fallbackMessage));
  }

  if (!json) {
    throw new Error(fallbackMessage);
  }

  return json;
}

async function readDocumentResponse(
  response: Response,
  fallbackFilename: string,
  fallbackErrorMessage: string,
): Promise<ReportDocumentResult> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const errorPayload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as ErrorPayload | null)
      : null;
    const errorText = errorPayload ? "" : await response.text().catch(() => "");
    throw new Error(
      getErrorMessage(errorPayload, errorText || fallbackErrorMessage),
    );
  }

  return {
    blob: await response.blob(),
    filename:
      getFilenameFromContentDisposition(response.headers.get("content-disposition")) ||
      fallbackFilename,
  };
}

export async function fetchReportHistory(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}) {
  const offset = (params.page - 1) * params.pageSize;
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    offset: String(offset),
  });

  if (params.keyword?.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }
  if (params.status?.trim()) {
    searchParams.set("status", params.status.trim());
  }

  const json = await readJsonResponse<ReportHistoryResponse>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.reportGeneratorHistory}?${searchParams.toString()}`,
      { cache: "no-store" },
    ),
    "歷史報告載入失敗",
  );

  return {
    ...json,
    reports: Array.isArray(json.reports) ? json.reports : [],
  };
}

export async function fetchReportDashboard(reportId: string) {
  return fetchReportDashboardByPath(
    `${BACKEND_API_PATHS.reportGeneratorHistory}/${reportId}/dashboard`,
  );
}

export async function fetchReportDashboardByPath(path: string) {
  const json = await readJsonResponse<ReportDashboardResponse>(
    await fetchBackendApi(path, { cache: "no-store" }),
    "報告資訊載入失敗",
  );

  if (!json.dashboard) {
    throw new Error("報告資訊格式不正確");
  }

  return {
    ...json.dashboard,
    financialTrends: json.dashboard.financialTrends ?? [],
  };
}

// TODO: 歷史報告下載功能尚未完成。
// 雲端部署目前不保存 DOCX 實體檔案，待串接物件儲存後再恢復此 API 呼叫。
// export async function downloadReportHistoryDocument(report: HistoricalReport) {
//   return readDocumentResponse(
//     await fetchBackendApi(
//       `${BACKEND_API_PATHS.reportGeneratorHistory}/${report.publicId}/download`,
//     ),
//     report.fileName || `${report.id}.docx`,
//     "歷史報告下載失敗",
//   );
// }

export async function generateReportThreadDocument(thread: ReportConversationThread) {
  return readDocumentResponse(
    await fetchBackendApi(`${BACKEND_API_PATHS.reportGeneratorThreads}/${encodeURIComponent(thread.id)}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body: JSON.stringify({ confirmed: true }),
    }),
    `${thread.documentTypeId ?? "general"}_current_draft.docx`,
    "報告產生請求失敗",
  );
}

export async function createReportOutline(payload: ReportOutlinePayload): Promise<ReportOutlineResult> {
  const json = await readJsonResponse<ReportOutlineResult & ErrorPayload>(
    await fetchBackendApi(BACKEND_API_PATHS.reportGeneratorDraft, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "報告大綱整理失敗",
  );
  if (typeof json.assistantMessage !== "string") {
    throw new Error("報告大綱回應格式不正確");
  }
  return {
    assistantMessage: json.assistantMessage,
    generalPlan: json.generalPlan ?? null,
    generalOutline: json.generalOutline ?? null,
    purposePlan: json.purposePlan ?? null,
    purposeOutline: json.purposeOutline ?? null,
    pendingClarification: json.pendingClarification ?? null,
    sourceMode: json.sourceMode ?? null,
    llmTraces: Array.isArray(json.llmTraces) ? json.llmTraces : [],
  };
}

export async function fetchReportThreads(): Promise<ReportConversationThread[]> {
  return readJsonResponse<ReportConversationThread[]>(
    await fetchBackendApi(BACKEND_API_PATHS.reportGeneratorThreads, { cache: "no-store" }),
    "讀取報告對話紀錄失敗",
  );
}

export async function sendReportThreadMessage(
  threadId: string,
  content: string,
): Promise<ReportThreadMessageResult> {
  return readJsonResponse<ReportThreadMessageResult>(
    await fetchBackendApi(`${BACKEND_API_PATHS.reportGeneratorThreads}/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
    "報告大綱整理失敗",
  );
}

export async function deleteReportThread(threadId: string): Promise<void> {
  await readJsonResponse<ErrorPayload>(
    await fetchBackendApi(`${BACKEND_API_PATHS.reportGeneratorThreads}/${encodeURIComponent(threadId)}`, {
      method: "DELETE",
    }),
    "刪除報告對話失敗",
  );
}

export async function fetchReportQuickStarts(): Promise<ReportQuickStart[]> {
  const response = await fetchBackendApi(BACKEND_API_PATHS.reportGeneratorQuickStarts, {
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as ReportQuickStart[] | ErrorPayload | null;
  if (!response.ok) {
    throw new Error(getErrorMessage(json && !Array.isArray(json) ? json : null, "快捷問題載入失敗"));
  }
  if (!Array.isArray(json)) {
    throw new Error("快捷問題格式不正確");
  }
  return json;
}

