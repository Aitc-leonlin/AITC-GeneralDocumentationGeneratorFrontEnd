import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";
import { getMembershipAuthHeaders } from "@/services/api/membershipAuthApi";

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogListResult = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  offset: number;
};

export type AuditRetentionSetting = {
  retentionDays: number;
  scheduleTimeZone: string;
  lastRunAt: string | null;
  lastArchiveAt: string | null;
  lastArchivedCount: number;
  lastCutoffAt: string | null;
  lastArchiveFilename: string;
  lastError: string;
  updatedAt: string;
};

export type AdminDashboard = {
  userStats: Record<string, number>;
  permissionOverview: Record<string, number>;
  loginStats: Record<string, number>;
  notificationStats: Record<string, number>;
  recentAuditLogs: AuditLog[];
};

export type NotificationTemplate = {
  id: string;
  code: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationOutbox = {
  id: string;
  templateCode: string;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientDisplayName: string | null;
  channel: string;
  payload: Record<string, unknown>;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationOutboxListResult = {
  items: NotificationOutbox[];
  total: number;
  page: number;
  pageSize: number;
  offset: number;
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

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "會員管理後台 API 呼叫失敗");
  }
  return body.data;
}

function adminPath(path = "") {
  return `${BACKEND_API_PATHS.membershipAdmin}${path}`;
}

export async function fetchMembershipAdminDashboard() {
  const response = await fetchBackendApi(adminPath("/dashboard"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<AdminDashboard>(response);
}

export async function resetMembershipSeedData() {
  const response = await fetchBackendApi(adminPath("/reset-seed"), {
    method: "POST",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{
    clearedTables: string[];
    clearedTableCount: number;
    seedCounts: Record<string, number>;
  }>(response);
}

export async function fetchMembershipAuditLogs(params: {
  page: number;
  pageSize: number;
  action?: string;
  actions?: string[];
  resourceType?: string;
  outcome?: string;
}) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.action) searchParams.set("action", params.action);
  params.actions?.forEach((action) => searchParams.append("actions", action));
  if (params.resourceType) searchParams.set("resourceType", params.resourceType);
  if (params.outcome) searchParams.set("outcome", params.outcome);

  const response = await fetchBackendApi(`${adminPath("/audit-logs")}?${searchParams.toString()}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<AuditLogListResult>(response);
}

export async function fetchAuditRetentionSetting() {
  const response = await fetchBackendApi(adminPath("/audit-retention"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<AuditRetentionSetting>(response);
}

export async function updateAuditRetentionSetting(retentionDays: number) {
  const response = await fetchBackendApi(adminPath("/audit-retention"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify({ retentionDays }),
  });
  return parseApiResponse<AuditRetentionSetting>(response);
}

export async function fetchNotificationTemplates() {
  const response = await fetchBackendApi(adminPath("/notification-templates"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<NotificationTemplate[]>(response);
}

export async function fetchNotificationOutbox(params: {
  page: number;
  pageSize: number;
  status?: string;
  templateCode?: string;
}) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.status) searchParams.set("status", params.status);
  if (params.templateCode) searchParams.set("templateCode", params.templateCode);

  const response = await fetchBackendApi(`${adminPath("/notification-outbox")}?${searchParams.toString()}`, {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  return parseApiResponse<NotificationOutboxListResult>(response);
}

export async function dispatchNotificationOutbox(outboxId: string, status = "SENT") {
  const response = await fetchBackendApi(adminPath(`/notification-outbox/${outboxId}/dispatch`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getMembershipAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  return parseApiResponse<NotificationOutbox>(response);
}
