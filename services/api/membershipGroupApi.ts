import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

export type GroupStatus = "ACTIVE" | "INACTIVE";

export type GroupMember = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  status: GroupStatus;
  isMaster: boolean;
  createdAt: string;
};

export type MembershipGroup = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  masterUserId: string | null;
  masterUsername: string | null;
  masterDisplayName: string | null;
  status: GroupStatus;
  memberCount: number;
  members: GroupMember[];
  canEditGroup: boolean;
  canManageMembers: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GroupPayload = {
  code: string;
  name: string;
  category: string;
  description: string;
  masterUserId: string | null;
  status: GroupStatus;
};

export type GroupAvailableUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: GroupStatus;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "群組管理 API 呼叫失敗");
  }
  return body.data;
}

function groupPath(path = "") {
  return `${BACKEND_API_PATHS.membershipGroups}${path}`;
}

export async function fetchMembershipGroups(params?: { keyword?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params?.keyword) search.set("keyword", params.keyword);
  if (params?.status) search.set("statusFilter", params.status);
  const suffix = search.size ? `?${search.toString()}` : "";
  const response = await fetchBackendApi(`${groupPath()}${suffix}`, { cache: "no-store" });
  return parseResponse<{ groups: MembershipGroup[]; canCreateGroup: boolean }>(response);
}

export async function fetchMembershipGroup(groupId: string) {
  const response = await fetchBackendApi(groupPath(`/${groupId}`), { cache: "no-store" });
  return parseResponse<MembershipGroup>(response);
}

export async function fetchGroupAvailableUsers() {
  const response = await fetchBackendApi(groupPath("/available-users"), { cache: "no-store" });
  return parseResponse<GroupAvailableUser[]>(response);
}

export async function createMembershipGroup(payload: GroupPayload) {
  const response = await fetchBackendApi(groupPath(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MembershipGroup>(response);
}

export async function updateMembershipGroup(groupId: string, payload: GroupPayload) {
  const response = await fetchBackendApi(groupPath(`/${groupId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<MembershipGroup>(response);
}

export async function deleteMembershipGroup(groupId: string) {
  const response = await fetchBackendApi(groupPath(`/${groupId}`), { method: "DELETE" });
  return parseResponse<{ deleted: boolean }>(response);
}

export async function addMembershipGroupMembers(groupId: string, userIds: string[]) {
  const response = await fetchBackendApi(groupPath(`/${groupId}/members`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  return parseResponse<MembershipGroup>(response);
}

export async function removeMembershipGroupMember(groupId: string, userId: string) {
  const response = await fetchBackendApi(groupPath(`/${groupId}/members/${userId}`), {
    method: "DELETE",
  });
  return parseResponse<MembershipGroup>(response);
}

export async function removeMembershipGroupMembers(groupId: string, userIds: string[]) {
  const response = await fetchBackendApi(groupPath(`/${groupId}/members`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  return parseResponse<MembershipGroup>(response);
}
