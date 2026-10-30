import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details: Record<string, unknown> } | null;
  meta: Record<string, unknown>;
};

export type Status = "ACTIVE" | "INACTIVE";
export type OrganizationUnitType = "COMPANY" | "DEPARTMENT" | "TEAM";

export type OrganizationUnit = {
  id: string;
  code: string;
  name: string;
  unitType: OrganizationUnitType;
  parentId: string | null;
  companyId: string | null;
  managerUserId: string | null;
  managerDisplayName: string | null;
  description: string;
  path: string;
  level: number;
  status: Status;
  children: OrganizationUnit[];
  createdAt: string;
  updatedAt: string;
};

export type OrganizationUnitPayload = {
  code: string;
  name: string;
  unitType: OrganizationUnitType;
  parentId: string | null;
  companyId: string | null;
  managerUserId: string | null;
  description: string;
  status: Status;
};

export type Position = {
  id: string;
  name: string;
  description: string;
  level: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
};

export type PositionPayload = Omit<Position, "id" | "createdAt" | "updatedAt">;

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "組織管理 API 呼叫失敗");
  }
  return body.data;
}

function organizationPath(path = "") {
  return `${BACKEND_API_PATHS.membershipOrganizations}${path}`;
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getMembershipAuthHeaders() };
}

function withSearchParams(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function fetchOrganizationUnits(params: { keyword?: string; unitType?: string; status?: string } = {}) {
  const response = await fetchBackendApi(withSearchParams(organizationPath("/units"), params), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<OrganizationUnit[]>(response);
}

export async function fetchOrganizationTree() {
  const response = await fetchBackendApi(organizationPath("/tree"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<OrganizationUnit[]>(response);
}

export async function createOrganizationUnit(payload: OrganizationUnitPayload) {
  const response = await fetchBackendApi(organizationPath("/units"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<OrganizationUnit>(response);
}

export async function updateOrganizationUnit(unitId: string, payload: OrganizationUnitPayload) {
  const response = await fetchBackendApi(organizationPath(`/units/${unitId}`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<OrganizationUnit>(response);
}

export async function deleteOrganizationUnit(unitId: string) {
  const response = await fetchBackendApi(organizationPath(`/units/${unitId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean; deletedCount: number; detachedUserCount: number }>(response);
}

export async function fetchPositions(params: { keyword?: string; status?: string } = {}) {
  const response = await fetchBackendApi(withSearchParams(organizationPath("/positions"), params), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<Position[]>(response);
}

export async function createPosition(payload: PositionPayload) {
  const response = await fetchBackendApi(organizationPath("/positions"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<Position>(response);
}

export async function updatePosition(positionId: string, payload: PositionPayload) {
  const response = await fetchBackendApi(organizationPath(`/positions/${positionId}`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<Position>(response);
}

export async function deletePosition(positionId: string) {
  const response = await fetchBackendApi(organizationPath(`/positions/${positionId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}
