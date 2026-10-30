import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details: Record<string, unknown> } | null;
  meta: Record<string, unknown>;
};

export type MembershipMenu = {
  id: string;
  code: string;
  title: string;
  parentId: string | null;
  routePath: string;
  componentKey: string;
  icon: string;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
  requiredPermissionCode: string | null;
  children: MembershipMenu[];
  createdAt: string;
  updatedAt: string;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "Menu API 呼叫失敗");
  }
  return body.data;
}

function menuPath(path = "") {
  return `${BACKEND_API_PATHS.membershipMenus}${path}`;
}

export async function fetchCurrentMembershipMenus() {
  const response = await fetchBackendApi(menuPath("/current"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<{ menus: MembershipMenu[] }>(response);
}
