import type { WarehouseDataEntry } from "@/types/warehouseData";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

export type WarehouseDataListResponse = {
  entries: WarehouseDataEntry[];
  page: number;
  pageSize: number;
  total: number;
  offset: number;
};

export type WarehouseDataSavePayload = Omit<
  WarehouseDataEntry,
  "id" | "recordUpdatedAt" | "createdAt" | "updatedAt"
>;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as
    | (T & { detail?: string; error?: string })
    | null;

  if (!response.ok) {
    throw new Error(json?.detail || json?.error || "資料倉儲 API 回傳失敗");
  }

  if (!json) {
    throw new Error("資料倉儲 API 沒有回傳資料");
  }

  return json;
}

export async function fetchWarehouseDataEntries(params: {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}): Promise<WarehouseDataListResponse> {
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
  if (params.category?.trim()) {
    searchParams.set("category", params.category.trim());
  }

  return readJsonResponse<WarehouseDataListResponse>(
    await fetchBackendApi(
      `${BACKEND_API_PATHS.warehouseData}?${searchParams.toString()}`,
      { cache: "no-store" },
    ),
  );
}

export async function fetchWarehouseDataEntry(entryId: string) {
  return readJsonResponse<WarehouseDataEntry>(
    await fetchBackendApi(`${BACKEND_API_PATHS.warehouseData}/${entryId}`, {
      cache: "no-store",
    }),
  );
}

export async function createWarehouseDataEntry(payload: WarehouseDataSavePayload) {
  return readJsonResponse<WarehouseDataEntry>(
    await fetchBackendApi(BACKEND_API_PATHS.warehouseData, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateWarehouseDataEntry(
  entryId: string,
  payload: WarehouseDataSavePayload,
) {
  return readJsonResponse<WarehouseDataEntry>(
    await fetchBackendApi(`${BACKEND_API_PATHS.warehouseData}/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteWarehouseDataEntry(entryId: string) {
  const response = await fetchBackendApi(
    `${BACKEND_API_PATHS.warehouseData}/${entryId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new Error(json?.detail || json?.error || "刪除資料失敗");
  }
}

export async function fetchAppliedWarehouseDataEntries(params?: {
  companyLabel?: string;
  companyPromptValue?: string;
  industry?: string;
  category?: string;
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
  if (params?.category?.trim()) {
    searchParams.set("category", params.category.trim());
  }

  const path = `${BACKEND_API_PATHS.warehouseDataApplied}${
    searchParams.size > 0 ? `?${searchParams.toString()}` : ""
  }`;

  return readJsonResponse<WarehouseDataEntry[]>(
    await fetchBackendApi(path, { cache: "no-store" }),
  );
}
