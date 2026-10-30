import {
  EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
} from "@/data/expertKnowledgeOptions";
import type { ExpertKnowledgeEntry } from "@/types/expertKnowledge";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

export type ExpertKnowledgeListResponse = {
  entries: ExpertKnowledgeEntry[];
  page: number;
  pageSize: number;
  total: number;
};

export type ExpertKnowledgeSavePayload = Omit<
  ExpertKnowledgeEntry,
  "id" | "createdAt" | "updatedAt"
>;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as
    | (T & { error?: string; detail?: string })
    | null;

  if (!response.ok) {
    throw new Error(json?.detail || json?.error || "專家知識庫 API 回傳失敗");
  }

  if (!json) {
    throw new Error("專家知識庫 API 沒有回傳資料");
  }

  return json;
}

export async function fetchExpertKnowledgeEntries(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<ExpertKnowledgeListResponse> {
  const page = params.page + 1;
  const offset = params.page * params.pageSize;
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(params.pageSize),
    offset: String(offset),
  });
  if (params.search?.trim()) {
    searchParams.set("keyword", params.search.trim());
  }

  return readJsonResponse<ExpertKnowledgeListResponse>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.expertKnowledge}?${searchParams.toString()}`,
      { cache: "no-store" },
    ),
  );
}

export async function fetchExpertKnowledgeEntry(entryId: string) {
  return readJsonResponse<ExpertKnowledgeEntry>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.expertKnowledge}/${entryId}`,
      { cache: "no-store" },
    ),
  );
}

export async function createExpertKnowledgeEntry(
  payload: ExpertKnowledgeSavePayload,
  options: { aiGenerated?: boolean } = {},
) {
  return readJsonResponse<ExpertKnowledgeEntry>(
    await fetchBackendApi(BACKEND_API_PATHS.expertKnowledge, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.aiGenerated ? { "X-Audit-Source": "ai-generated" } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateExpertKnowledgeEntry(
  entryId: string,
  payload: ExpertKnowledgeSavePayload,
  options: { aiGenerated?: boolean } = {},
) {
  return readJsonResponse<ExpertKnowledgeEntry>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.expertKnowledge}/${entryId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(options.aiGenerated ? { "X-Audit-Source": "ai-generated" } : {}),
        },
        body: JSON.stringify(payload),
      },
    ),
  );
}

export async function deleteExpertKnowledgeEntry(entryId: string) {
  const response = await fetchBackendApi(
    `${BACKEND_API_PATHS.expertKnowledge}/${entryId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new Error(json?.detail || json?.error || "刪除專家指引失敗");
  }
}

export async function fetchAppliedExpertKnowledgeEntries(params?: {
  companyLabel?: string;
  companyPromptValue?: string;
  industry?: string;
  dataSource?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.companyLabel?.trim()) {
    searchParams.set("companyLabel", params.companyLabel.trim());
  }
  if (params?.companyPromptValue?.trim()) {
    searchParams.set("companyPromptValue", params.companyPromptValue.trim());
  }
  if (params?.industry?.trim()) {
    searchParams.set("industry", params.industry.trim());
  }
  if (params?.dataSource?.trim()) {
    searchParams.set("dataSource", params.dataSource.trim());
  }

  const path = `${BACKEND_API_PATHS.expertKnowledgeApplied}${
    searchParams.size > 0 ? `?${searchParams.toString()}` : ""
  }`;
  const json = await readJsonResponse<ExpertKnowledgeEntry[]>(
    await fetchBackendApi(path, { cache: "no-store" }),
  );

  return json.filter(
    (entry) =>
      entry.companyLabel ||
      entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE,
  );
}
