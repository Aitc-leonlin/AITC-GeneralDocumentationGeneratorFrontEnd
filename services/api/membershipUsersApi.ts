import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";

export type MembershipUserStatus = "ACTIVE" | "INACTIVE";

export type MembershipUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  employeeNo: string;
  organizationId: string | null;
  organizationName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  managerUserId: string | null;
  managerDisplayName: string | null;
  status: MembershipUserStatus;
  locale: string;
  timezone: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  failedLoginCount: number;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MembershipUserListResult = {
  users: MembershipUser[];
  total: number;
  page: number;
  pageSize: number;
  offset: number;
};

export type MembershipUserPayload = {
  username: string;
  email: string;
  displayName: string;
  employeeNo: string;
  organizationId: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  status: MembershipUserStatus;
  locale: string;
  timezone: string;
  roleIds?: string[];
};

export type MembershipUserCreatePayload = MembershipUserPayload & {
  password: string;
  mustChangePassword: boolean;
  roleIds: string[];
};

export type MembershipProfilePayload = {
  displayName: string;
  email: string;
  locale: string;
  timezone: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  } | null;
  meta: Record<string, unknown>;
};

type FetchUsersParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  locked?: boolean | null;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "會員帳號 API 呼叫失敗");
  }
  return body.data;
}

function usersPath(path = "") {
  return `${BACKEND_API_PATHS.membershipUsers}${path}`;
}

export async function fetchMembershipUsers(params: FetchUsersParams) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.status) searchParams.set("status", params.status);
  if (params.locked !== null && params.locked !== undefined) {
    searchParams.set("locked", String(params.locked));
  }

  const response = await fetchBackendApi(`${usersPath()}?${searchParams.toString()}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<MembershipUserListResult>(response);
}

export async function createMembershipUser(payload: MembershipUserCreatePayload) {
  const response = await fetchBackendApi(usersPath(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function updateMembershipUser(userId: string, payload: MembershipUserPayload) {
  const response = await fetchBackendApi(usersPath(`/${userId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function deleteMembershipUser(userId: string) {
  const response = await fetchBackendApi(usersPath(`/${userId}`), {
    method: "DELETE",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}

export async function updateMembershipUserProfile(
  userId: string,
  payload: MembershipProfilePayload,
) {
  const response = await fetchBackendApi(usersPath(`/${userId}/profile`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function activateMembershipUser(userId: string) {
  const response = await fetchBackendApi(usersPath(`/${userId}/activate`), {
    method: "POST",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function deactivateMembershipUser(userId: string) {
  const response = await fetchBackendApi(usersPath(`/${userId}/deactivate`), {
    method: "POST",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function lockMembershipUser(userId: string) {
  const response = await fetchBackendApi(usersPath(`/${userId}/lock`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify({}),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function unlockMembershipUser(userId: string) {
  const response = await fetchBackendApi(usersPath(`/${userId}/unlock`), {
    method: "POST",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function changeMembershipUserPassword(
  userId: string,
  payload: { currentPassword: string; newPassword: string },
) {
  const response = await fetchBackendApi(usersPath(`/${userId}/password`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipUser>(response);
}

export async function resetMembershipUserPassword(
  userId: string,
  payload: { newPassword: string; mustChangePassword: boolean },
) {
  const response = await fetchBackendApi(usersPath(`/${userId}/reset-password`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<MembershipUser>(response);
}
