import { expect, test } from "@playwright/test";

import { backendURL } from "../../support/audit-log";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

type GroupResponse = {
  id: string;
  members: Array<{ userId: string }>;
};

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator("#login-account-input").fill(username);
  await page.locator("#login-password-input").fill(password);
  await page.locator("#login-submit-button").click();
  await page.waitForURL((url) => url.pathname === "/");
}

test("TC-GROUP-001 成員數開啟唯讀清單，管理員僅能從編輯群組管理組員", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);

  // 階段一：建立唯一群組與帳號資料，並確認目前使用 Playwright 專用管理帳號。
  const suffix = Date.now();
  const masterUsername = `e2e.group.master.${suffix}`;
  const memberUsername = `e2e.group.member.${suffix}`;
  const password = "E2eGroup123!";
  const groupCode = `E2E_REVIEW_${suffix}`;
  const groupName = `E2E 徵審團隊 ${suffix}`;
  let groupId = "";
  const createdUserIds: string[] = [];

  await page.goto("/");
  const adminSession = await page.evaluate(() => ({
    accessToken: window.localStorage.getItem("membership.accessToken"),
    username: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.username,
  }));
  const adminToken = adminSession.accessToken;
  expect(adminToken).toBeTruthy();
  expect(adminSession.username).toBe(process.env.E2E_TEST_LOGIN ?? "playwrighttestuser");

  const rolesResponse = await page.request.get(`${backendURL}/api/membership/rbac/roles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const rolesBody = (await rolesResponse.json()) as ApiEnvelope<
    Array<{ id: string; code: string }>
  >;
  expect(rolesResponse.ok(), rolesBody.error?.message).toBe(true);
  const defaultRole = rolesBody.data?.find((role) => role.code === "DEFAULT_USER");
  expect(defaultRole, "測試 DB 應存在 DEFAULT_USER 角色").toBeTruthy();
  const defaultRoleId = defaultRole!.id;

  // 測試資料工具：透過 API 建立 MASTER／一般組員，並記錄 ID 供 finally 清理。
  async function createUser(username: string, displayName: string) {
    const response = await page.request.post(`${backendURL}/api/membership/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username,
        email: `${username}@example.local`,
        displayName,
        employeeNo: "",
        organizationId: null,
        departmentId: null,
        positionId: null,
        status: "ACTIVE",
        locale: "zh-TW",
        timezone: "Asia/Taipei",
        password,
        mustChangePassword: false,
        roleIds: [defaultRoleId],
      },
    });
    const body = (await response.json()) as ApiEnvelope<{ id: string }>;
    expect(response.ok(), body.error?.message).toBe(true);
    createdUserIds.push(body.data!.id);
    return body.data!.id;
  }

  try {
    // 階段二：建立 MASTER 與一般組員兩個測試帳號。
    const masterUserId = await createUser(masterUsername, "E2E Group Master");
    const memberUserId = await createUser(memberUsername, "E2E Group Member");

    // 階段三：由管理員從 UI 建立群組，並以 POST response 驗證建立成功及取得 groupId。
    await page.goto("/membership/groups");
    await page.locator("#group-create-button").click();
    await page.locator("#group-code-input").fill(groupCode);
    await page.locator("#group-name-input").fill(groupName);
    await page.locator("#group-category-input").fill("徵審流程");
    await page.locator("#group-master-select").selectOption(masterUserId);
    const createGroupResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/membership/groups",
    );
    await page.locator("#group-save-button").click();
    const createGroupResponse = await createGroupResponsePromise;
    const createGroupBody = (await createGroupResponse.json()) as ApiEnvelope<GroupResponse>;
    expect(createGroupResponse.ok(), createGroupBody.error?.message).toBe(true);
    expect(createGroupBody.success, createGroupBody.error?.message).toBe(true);
    expect(createGroupBody.data).not.toBeNull();
    groupId = createGroupBody.data!.id;

    // 階段四：從成員數入口開啟唯讀清單，驗證只能檢視 MASTER、不能新增或移除組員。
    await page
      .getByRole("row", { name: new RegExp(groupName) })
      .getByRole("button", { name: new RegExp(`檢視 ${groupName} 的`) })
      .click();
    await expect(page.getByRole("heading", { name: `${groupName}－組員清單` })).toBeVisible();
    await expect(page.getByText("E2E Group Master", { exact: true }).first()).toBeVisible();
    await expect(page.locator("#group-member-add-button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "移除" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // 階段五：從編輯群組加入一般組員，並以成員 POST response 驗證 DB 已包含該組員。
    await page.getByRole("button", { name: `編輯 ${groupName}` }).click();
    await expect(page.locator("#group-member-add-button")).toBeVisible();
    await page.locator("#group-member-add-button").click();
    await page.locator("#group-member-search-input").fill(memberUsername);
    await page
      .getByRole("row", { name: new RegExp(memberUsername) })
      .getByRole("checkbox")
      .check();
    await page.locator("#group-member-save-button").click();
    await page.locator("#group-save-button").click();
    const addMemberResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/membership/groups/${groupId}/members`,
    );
    await page.locator("#group-save-confirm-button").click();
    const addMemberResponse = await addMemberResponsePromise;
    const addMemberBody = (await addMemberResponse.json()) as ApiEnvelope<GroupResponse>;
    expect(addMemberResponse.ok(), addMemberBody.error?.message).toBe(true);
    expect(addMemberBody.success, addMemberBody.error?.message).toBe(true);
    expect(addMemberBody.data?.members.some((member) => member.userId === memberUserId)).toBe(true);

    // 階段六：改用群組 MASTER 登入，驗證可查看組員但沒有編輯、新增或移除權限。
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    try {
      await login(masterPage, masterUsername, password);
      await masterPage.goto("/membership/groups");
      await masterPage
        .getByRole("row", { name: new RegExp(groupName) })
        .getByRole("button", { name: new RegExp(`檢視 ${groupName} 的`) })
        .click();
      await expect(masterPage.getByRole("button", { name: `編輯 ${groupName}` })).toHaveCount(0);
      await expect(masterPage.locator("#group-member-add-button")).toHaveCount(0);
      await expect(masterPage.getByRole("button", { name: "移除" })).toHaveCount(0);
      await expect(masterPage.getByText("E2E Group Member", { exact: true })).toBeVisible();
    } finally {
      await masterContext.close();
    }

    // 階段七：切回管理員移除一般組員，並以 DELETE response 驗證 DB 已不含該組員。
    await page.getByRole("button", { name: `編輯 ${groupName}` }).click();
    await page
      .getByRole("row", { name: new RegExp(memberUsername) })
      .getByRole("checkbox")
      .check();
    await expect(page.locator("#group-member-batch-remove-button")).toContainText("批次移除（1）");
    await page.locator("#group-member-batch-remove-button").click();
    await page.locator("#group-save-button").click();
    const removeMemberResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        new URL(response.url()).pathname === `/api/membership/groups/${groupId}/members`,
    );
    await page.locator("#group-save-confirm-button").click();
    const removeMemberResponse = await removeMemberResponsePromise;
    const removeMemberBody = (await removeMemberResponse.json()) as ApiEnvelope<GroupResponse>;
    expect(removeMemberResponse.ok(), removeMemberBody.error?.message).toBe(true);
    expect(removeMemberBody.success, removeMemberBody.error?.message).toBe(true);
    expect(removeMemberBody.data?.members.some((member) => member.userId === memberUserId)).toBe(
      false,
    );
  } finally {
    // 階段八：無論案例成功或失敗，都依關聯順序刪除群組及測試帳號。
    if (groupId) {
      await page.request.delete(`${backendURL}/api/membership/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    for (const userId of createdUserIds) {
      await page.request.delete(`${backendURL}/api/membership/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  }
});
