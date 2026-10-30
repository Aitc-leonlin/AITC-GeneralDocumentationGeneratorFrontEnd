import { expect, test } from "@playwright/test";

import { backendURL } from "../support/audit-log";
import {
  authHeaders,
  deleteIfPresent,
  expectEnvelope,
  loginAsAdmin,
  uniqueSuffix,
} from "../support/db-regression";

type OrganizationUnit = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  companyId: string | null;
  path: string;
  children: OrganizationUnit[];
};

type Position = { id: string; name: string; level: number; status: string };
type User = {
  id: string;
  organizationId: string | null;
  departmentId: string | null;
  positionId: string | null;
};

function organizationCodes(seed: string, usedCodes: Set<string>): [string, string] {
  const number = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  const available: string[] = [];
  for (let offset = 0; offset < 676 && available.length < 2; offset += 1) {
    const value = (number + offset) % 676;
    const candidate = `${String.fromCharCode(65 + Math.floor(value / 26))}${String.fromCharCode(65 + (value % 26))}`;
    if (!usedCodes.has(candidate)) available.push(candidate);
  }
  expect(available, "測試 DB 需要至少兩個未使用的兩碼組織代碼").toHaveLength(2);
  return [available[0], available[1]];
}

test("TC-DB-ORG-001 組織樹刪除會軟刪除子節點並解除使用者關聯", async ({ page }) => {
  // 階段一：讀取既有組織代碼，產生不衝突的公司／部門代碼並準備清理 ID。
  const suffix = uniqueSuffix();
  let companyId = "";
  let departmentId = "";
  let positionId = "";
  let userId = "";
  const { accessToken } = await loginAsAdmin(page);
  const existingUnits = await expectEnvelope<OrganizationUnit[]>(
    await page.request.get(`${backendURL}/api/membership/organizations/units`, {
      headers: authHeaders(accessToken),
    }),
  );
  const [companyCode, departmentCode] = organizationCodes(
    suffix,
    new Set(existingUnits.map((unit) => unit.code)),
  );

  try {
    // 階段二：建立公司根節點並保存 companyId。
    const company = await expectEnvelope<OrganizationUnit>(
      await page.request.post(`${backendURL}/api/membership/organizations/units`, {
        headers: authHeaders(accessToken, true),
        data: {
          code: companyCode,
          name: `E2E 公司 ${suffix}`,
          unitType: "COMPANY",
          parentId: null,
          companyId: null,
          managerUserId: null,
          description: "SQLAlchemy organization root",
          status: "ACTIVE",
        },
      }),
    );
    companyId = company.id;

    // 階段三：在公司下建立部門，驗證 parentId 與 path 正確反映組織階層。
    const department = await expectEnvelope<OrganizationUnit>(
      await page.request.post(`${backendURL}/api/membership/organizations/units`, {
        headers: authHeaders(accessToken, true),
        data: {
          code: departmentCode,
          name: `E2E 部門 ${suffix}`,
          unitType: "DEPARTMENT",
          parentId: companyId,
          companyId,
          managerUserId: null,
          description: "SQLAlchemy organization child",
          status: "ACTIVE",
        },
      }),
    );
    departmentId = department.id;
    expect(department.parentId).toBe(companyId);
    expect(department.path).toContain(companyCode);
    expect(department.path).toContain(departmentCode);

    // 階段四：建立職位，供後續使用者組織關聯測試。
    const position = await expectEnvelope<Position>(
      await page.request.post(`${backendURL}/api/membership/organizations/positions`, {
        headers: authHeaders(accessToken, true),
        data: {
          name: `E2E Position ${suffix}`,
          description: "SQLAlchemy relationship test",
          level: 7,
          status: "ACTIVE",
        },
      }),
    );
    positionId = position.id;

    // 階段五：建立同時關聯部門與職位的使用者。
    const roles = await expectEnvelope<Array<{ id: string }>>(
      await page.request.get(`${backendURL}/api/membership/rbac/roles`, {
        headers: authHeaders(accessToken),
      }),
    );
    const user = await expectEnvelope<User>(
      await page.request.post(`${backendURL}/api/membership/users`, {
        headers: authHeaders(accessToken, true),
        data: {
          username: `e2e.org.${suffix}`,
          email: `e2e.org.${suffix}@example.local`,
          displayName: `E2E Org User ${suffix}`,
          employeeNo: "",
          organizationId: departmentId,
          departmentId,
          positionId,
          status: "ACTIVE",
          locale: "zh-TW",
          timezone: "Asia/Taipei",
          password: "E2eOrganization123!",
          mustChangePassword: false,
          roleIds: [roles[0].id],
        },
      }),
    );
    userId = user.id;

    // 階段六：從組織管理 UI 驗證公司與部門可見，且 reload 後部門仍存在。
    await page.goto("/membership/organizations");
    await expect(page.getByText(`E2E 公司 ${suffix}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`E2E 部門 ${suffix}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`E2E 部門 ${suffix}`, { exact: true })).toBeVisible();

    // 階段七：刪除公司根節點，驗證公司與子部門一併軟刪除且使用者關聯被解除。
    const deletion = await expectEnvelope<{
      deleted: boolean;
      deletedCount: number;
      detachedUserCount: number;
    }>(
      await page.request.delete(
        `${backendURL}/api/membership/organizations/units/${companyId}`,
        { headers: authHeaders(accessToken) },
      ),
    );
    expect(deletion.deleted).toBe(true);
    expect(deletion.deletedCount).toBe(2);
    expect(deletion.detachedUserCount).toBeGreaterThanOrEqual(1);
    companyId = "";
    departmentId = "";

    // 階段八：查詢組織確認節點消失，並驗證使用者仍存在但組織／部門欄位已清空。
    const units = await expectEnvelope<OrganizationUnit[]>(
      await page.request.get(
        `${backendURL}/api/membership/organizations/units?keyword=${encodeURIComponent(suffix)}`,
        { headers: authHeaders(accessToken) },
      ),
    );
    expect(units).toHaveLength(0);

    const persistedUser = await expectEnvelope<User>(
      await page.request.get(`${backendURL}/api/membership/users/${userId}`, {
        headers: authHeaders(accessToken),
      }),
    );
    expect(persistedUser.organizationId).toBeNull();
    expect(persistedUser.departmentId).toBeNull();
  } finally {
    // 階段九：若案例中途失敗，依使用者、部門、公司、職位順序補做清理。
    if (userId) await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
    if (departmentId) {
      await deleteIfPresent(
        page.request,
        `/api/membership/organizations/units/${departmentId}`,
        accessToken,
      );
    }
    if (companyId) {
      await deleteIfPresent(
        page.request,
        `/api/membership/organizations/units/${companyId}`,
        accessToken,
      );
    }
    if (positionId) {
      await deleteIfPresent(
        page.request,
        `/api/membership/organizations/positions/${positionId}`,
        accessToken,
      );
    }
  }
});

test("TC-DB-AUDIT-001 Audit Log 篩選可找到本次 DB 寫入的結構化紀錄", async ({ page }) => {
  // 階段一：準備唯一角色名稱與開始時間，避免誤認先前的 Audit Log。
  const suffix = uniqueSuffix();
  const roleName = `E2E Audit Role ${suffix}`;
  const startedAt = Date.now();
  let roleId = "";
  const { accessToken } = await loginAsAdmin(page);

  try {
    // 階段二：建立角色以觸發 membership.role.create Audit Log。
    const role = await expectEnvelope<{ id: string }>(
      await page.request.post(`${backendURL}/api/membership/rbac/roles`, {
        headers: authHeaders(accessToken, true),
        data: {
          name: roleName,
          description: "Audit JSON persistence",
          roleType: "BUSINESS",
          status: "ACTIVE",
          isSystem: false,
        },
      }),
    );
    roleId = role.id;

    // 階段三：輪詢 Audit Log API，驗證 action、resource、outcome、時間及 metadata 結構。
    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${backendURL}/api/membership/admin/audit-logs?page=1&pageSize=50&actions=membership.role.create&outcome=SUCCESS`,
          { headers: authHeaders(accessToken) },
        );
        if (!response.ok()) return false;
        const result = await expectEnvelope<{
          logs: Array<{
            action: string;
            resourceId: string;
            outcome: string;
            metadata: Record<string, unknown>;
            createdAt: string;
          }>;
        }>(response);
        return result.logs.some(
          (log) =>
            log.resourceId === roleName &&
            log.action === "membership.role.create" &&
            log.outcome === "SUCCESS" &&
            Date.parse(log.createdAt) >= startedAt - 1_000 &&
            typeof log.metadata === "object",
        );
      }, { timeout: 10_000 })
      .toBe(true);

    // 階段四：開啟 Audit 頁面，驗證管理介面可正常呈現。
    await page.goto("/membership/audit");
    await expect(page.getByText("Audit Log", { exact: false }).first()).toBeVisible();
  } finally {
    // 階段五：刪除用來產生 Audit Log 的測試角色。
    if (roleId) await deleteIfPresent(page.request, `/api/membership/rbac/roles/${roleId}`, accessToken);
  }
});

test("TC-DB-ADMIN-001 Audit 保留設定更新後重整仍存在，結束時還原原值", async ({ page }) => {
  // 階段一：讀取原始保留天數，準備一個不同的新值供更新測試。
  const { accessToken } = await loginAsAdmin(page);
  const path = `${backendURL}/api/membership/admin/audit-retention`;
  const original = await expectEnvelope<{ retentionDays: number }>(
    await page.request.get(path, { headers: authHeaders(accessToken) }),
  );
  const nextRetentionDays = original.retentionDays === 91 ? 92 : 91;

  try {
    // 階段二：更新 Audit 保留天數，驗證 API response 回傳新值。
    const updated = await expectEnvelope<{ retentionDays: number }>(
      await page.request.put(path, {
        headers: authHeaders(accessToken, true),
        data: { retentionDays: nextRetentionDays },
      }),
    );
    expect(updated.retentionDays).toBe(nextRetentionDays);

    // 階段三：從 UI 驗證新值，並確認 reload 後仍維持相同設定。
    await page.goto("/membership/audit");
    await page.locator("#audit-retention-settings-button").click();
    await expect(page.locator("#audit-retention-days")).toHaveValue(String(nextRetentionDays));
    await page.reload();
    await page.locator("#audit-retention-settings-button").click();
    await expect(page.locator("#audit-retention-days")).toHaveValue(String(nextRetentionDays));
  } finally {
    // 階段四：無論案例成功或失敗，都將 Audit 保留天數還原為原始值。
    await expectEnvelope(
      await page.request.put(path, {
        headers: authHeaders(accessToken, true),
        data: { retentionDays: original.retentionDays },
      }),
    );
  }
});

test("TC-DB-READ-001 Dashboard、通知 Outbox 與報告歷史查詢契約可正常反序列化", async ({
  page,
}) => {
  // 階段一：取得管理員授權，供三組唯讀管理 API 與頁面驗證使用。
  const { accessToken } = await loginAsAdmin(page);

  // 階段二：查詢 Dashboard，驗證統計欄位為有限數值且 Audit Log 為陣列。
  const dashboard = await expectEnvelope<{
    userStats: Record<string, number>;
    permissionOverview: Record<string, number>;
    notificationStats: Record<string, number>;
    recentAuditLogs: unknown[];
  }>(
    await page.request.get(`${backendURL}/api/membership/admin/dashboard`, {
      headers: authHeaders(accessToken),
    }),
  );
  expect(Object.values(dashboard.userStats).every(Number.isFinite)).toBe(true);
  expect(Object.values(dashboard.permissionOverview).every(Number.isFinite)).toBe(true);
  expect(Array.isArray(dashboard.recentAuditLogs)).toBe(true);

  // 階段三：查詢通知 Outbox，驗證分頁契約、筆數上限及 payload 物件格式。
  const outbox = await expectEnvelope<{
    items: Array<{ payload: Record<string, unknown>; createdAt: string }>;
    total: number;
    page: number;
    pageSize: number;
    offset: number;
  }>(
    await page.request.get(
      `${backendURL}/api/membership/admin/notification-outbox?page=1&pageSize=5`,
      { headers: authHeaders(accessToken) },
    ),
  );
  expect(outbox.page).toBe(1);
  expect(outbox.pageSize).toBe(5);
  expect(outbox.items.length).toBeLessThanOrEqual(5);
  expect(outbox.items.every((item) => typeof item.payload === "object")).toBe(true);

  // 階段四：查詢報告歷史，驗證 response 可反序列化且符合分頁筆數契約。
  const reportResponse = await page.request.get(
    `${backendURL}/api/report-generator/history?page=1&pageSize=5&offset=0`,
    { headers: authHeaders(accessToken) },
  );
  expect(reportResponse.ok()).toBe(true);
  const reports = (await reportResponse.json()) as {
    reports?: Array<{ publicId?: string; createdAt?: string }>;
    total?: number;
    page?: number;
    pageSize?: number;
  };
  expect(Array.isArray(reports.reports)).toBe(true);
  expect(reports.reports!.length).toBeLessThanOrEqual(5);
  expect(Number.isFinite(reports.total)).toBe(true);

  // 階段五：依序開啟三個管理頁面，驗證對應 UI 可載入且沒有報告載入錯誤。
  await page.goto("/membership/dashboard");
  await expect(page.getByRole("heading", { name: "會員權限管理總覽" })).toBeVisible();
  await page.goto("/membership/notifications");
  await expect(page.getByText("通知", { exact: false }).first()).toBeVisible();
  await page.goto("/report-generator/history");
  await expect(page.getByRole("heading", { name: "歷史報告" })).toBeVisible();
  await expect(page.getByText("歷史報告載入失敗")).toHaveCount(0);
});
