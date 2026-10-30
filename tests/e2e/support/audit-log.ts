import { APIRequestContext, expect } from "@playwright/test";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

type LoginResult = {
  accessToken: string;
};

export type AuditLogRecord = {
  id: string;
  action: string;
  resourceId: string;
  outcome: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditLogList = {
  logs: AuditLogRecord[];
};

export const backendURL = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:3001";

export async function loginAsAuditAdmin(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${backendURL}/api/membership/auth/login`, {
    data: {
      login: process.env.E2E_TEST_LOGIN ?? "playwrighttestuser",
      password: process.env.E2E_TEST_PASSWORD ?? "PlaywrightTest123!",
      rememberMe: false,
    },
  });
  const body = (await response.json()) as ApiEnvelope<LoginResult>;
  expect(
    response.ok() && body.success && Boolean(body.data?.accessToken),
    body.error?.message ?? "E2E 測試帳號登入失敗，請確認 setup 與 E2E_TEST_LOGIN/E2E_TEST_PASSWORD。",
  ).toBe(true);
  return body.data!.accessToken;
}

export async function expectAuditLog(
  request: APIRequestContext,
  accessToken: string,
  expected: {
    action: string;
    startedAt: number;
    resourceId?: string;
    outcome?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await expect
    .poll(
      async () => {
        const search = new URLSearchParams({
          page: "1",
          pageSize: "50",
          actions: expected.action,
        });
        const response = await request.get(
          `${backendURL}/api/membership/admin/audit-logs?${search.toString()}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!response.ok()) return false;
        const body = (await response.json()) as ApiEnvelope<AuditLogList>;
        return Boolean(
          body.data?.logs.some((log) => {
            if (log.action !== expected.action) return false;
            if (Date.parse(log.createdAt) < expected.startedAt - 1_000) return false;
            if (expected.resourceId !== undefined && log.resourceId !== expected.resourceId) return false;
            if (expected.outcome !== undefined && log.outcome !== expected.outcome) return false;
            return Object.entries(expected.metadata ?? {}).every(
              ([key, value]) => log.metadata[key] === value,
            );
          }),
        );
      },
      {
        message: `找不到本次 WEB 操作產生的 Audit Log：${expected.action}`,
        timeout: 10_000,
        intervals: [250, 500, 1_000],
      },
    )
    .toBe(true);
}
