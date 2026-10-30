import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details: Record<string, unknown> } | null;
  meta: Record<string, unknown>;
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string;
  roleType: "SYSTEM" | "BUSINESS" | "USER";
  status: "ACTIVE" | "INACTIVE";
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PermissionGroup = {
  id: string;
  code: string;
  name: string;
  description: string;
  moduleName: string;
  status: "ACTIVE" | "INACTIVE";
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Permission = {
  id: string;
  code: string;
  name: string;
  description: string;
  action: string;
  status: "ACTIVE" | "INACTIVE";
  groupId: string | null;
  groupCode: string | null;
  groupName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RolePayload = Pick<Role, "name" | "description" | "roleType" | "status"> & {
  isSystem: boolean;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "RBAC API 呼叫失敗");
  }
  return body.data;
}

function rbacPath(path = "") {
  return `${BACKEND_API_PATHS.membershipRbac}${path}`;
}

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...getMembershipAuthHeaders() };
}

export async function fetchMyPermissions() {
  const response = await fetchBackendApi(rbacPath("/me/permissions"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<{ permissions: string[] }>(response);
}

export async function fetchRoles(params: { keyword?: string; status?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.status) searchParams.set("status", params.status);
  const response = await fetchBackendApi(`${rbacPath("/roles")}?${searchParams.toString()}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<Role[]>(response);
}

export async function createRole(payload: RolePayload) {
  const response = await fetchBackendApi(rbacPath("/roles"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<Role>(response);
}

export async function updateRole(roleId: string, payload: RolePayload) {
  const response = await fetchBackendApi(rbacPath(`/roles/${roleId}`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<Role>(response);
}

export async function deleteRole(roleId: string) {
  const response = await fetchBackendApi(rbacPath(`/roles/${roleId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}

export async function fetchPermissionGroups() {
  const response = await fetchBackendApi(rbacPath("/permission-groups"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<PermissionGroup[]>(response);
}

export async function fetchPermissions(params: { keyword?: string; groupId?: string; status?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.groupId) searchParams.set("groupId", params.groupId);
  if (params.status) searchParams.set("status", params.status);
  const response = await fetchBackendApi(`${rbacPath("/permissions")}?${searchParams.toString()}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<Permission[]>(response);
}

export async function fetchRolePermissionIds(roleId: string) {
  const response = await fetchBackendApi(rbacPath(`/roles/${roleId}/permissions`), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<{ roleId: string; permissionIds: string[] }>(response);
}

export async function setRolePermissionIds(roleId: string, ids: string[]) {
  const response = await fetchBackendApi(rbacPath(`/roles/${roleId}/permissions`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ids }),
  });
  return parseApiResponse<{ roleId: string; permissionIds: string[] }>(response);
}

export async function fetchUserRoleIds(userId: string) {
  const response = await fetchBackendApi(rbacPath(`/users/${userId}/roles`), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<{ userId: string; roleIds: string[] }>(response);
}

export async function setUserRoleIds(userId: string, roleIds: string[], organizationId: string | null) {
  const response = await fetchBackendApi(rbacPath(`/users/${userId}/roles`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ roleIds, organizationId }),
  });
  return parseApiResponse<{ userId: string; roleIds: string[] }>(response);
}
