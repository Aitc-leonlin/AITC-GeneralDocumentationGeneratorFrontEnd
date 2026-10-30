import { expect, test } from "@playwright/test";

import { backendURL } from "../../support/audit-log";
import { authHeaders, expectEnvelope } from "../../support/db-regression";

test("TC-CHAT-HISTORY-001 對話只寫入 DB，重新整理後依帳號還原", async ({ page }) => {
  test.setTimeout(300_000);

  // 階段一：準備固定問題，並確認目前登入的是具備授信 AI 助理權限的測試帳號。
  const question = `判斷2025年度新光產物保險股份有限公司(2850.TW)的資訊現金水位是否充足？`;

  await page.goto("/");

  const session = await page.evaluate(() => ({
    accessToken: window.localStorage.getItem("membership.accessToken"),
    username: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.username,
  }));
  const accessToken = session.accessToken;
  expect(accessToken).toBeTruthy();
  expect(session.username).toBe(process.env.E2E_TEST_LOGIN ?? "playwrighttestuser");

  const permissions = await expectEnvelope<{ permissions: string[] }>(
    await page.request.get(`${backendURL}/api/membership/rbac/me/permissions`, {
      headers: authHeaders(accessToken!),
    }),
  );
  expect(permissions.permissions, "測試帳號需要授信 AI 助理權限").toContain("credit-ai.chat");

  await expectEnvelope<unknown[]>(
    await page.request.get(`${backendURL}/api/chat/conversations`, {
      headers: authHeaders(accessToken!),
    }),
  );

  // 階段二：建立新對話並送出問題，驗證 AI 回覆已完成且內容不是空字串。
  await page.goto("/chatbot");
  await expect(page.getByRole("heading", { name: "無權限存取" })).toHaveCount(0);
  await expect(page.locator("#chat-message-input")).toBeVisible();
  await page.getByRole("button", { name: "新對話" }).click();

  const messageInput = page.locator("#chat-message-input");
  await messageInput.fill(question);
  await page.locator("#chat-message-submit-button").click();

  const assistantReply = page.getByTestId("chat-message-assistant-content").last();
  await expect(assistantReply).toBeVisible({ timeout: 180_000 });
  await expect
    .poll(
      async () => (await assistantReply.getAttribute("data-message-content"))?.trim() ?? "",
      { timeout: 180_000 },
    )
    .not.toBe("");
  await expect(page.locator("#chat-message-submit-button")).toHaveText("送出", {
    timeout: 180_000,
  });

  // 階段三：輪詢對話 API，驗證問題與非空字串格式的助理回覆已持久化至 DB。
  let conversationId = "";
  await expect
    .poll(async () => {
      const response = await page.request.get(`${backendURL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok()) return false;
      const body = (await response.json()) as {
        data?: Array<{
          id: string;
          messages: Array<{ id: string; role: string; content: unknown }>;
        }>;
      };
      const conversation = body.data?.find((item) =>
        item.messages.some((message) => String(message.content).includes(question)),
      );
      if (!conversation) return false;
      const assistantMessage = conversation.messages.find(
        (message) => message.role === "assistant",
      );
      if (
        typeof assistantMessage?.content !== "string" ||
        assistantMessage.content.trim() === ""
      ) {
        return false;
      }
      conversationId = conversation.id;
      return true;
    })
    .toBe(true);

  // 階段四：確認前端沒有使用舊版 localStorage 保存對話，資料來源僅為 DB。
  expect(
    await page.evaluate(() => window.localStorage.getItem("aitc-chatbot-sessions-v1")),
  ).toBeNull();

  // 階段五：複製 reload 前的完整訊息內容，重新整理後驗證訊息數量、順序與文字一致。
  const conversationMessages = page.locator(
    '[data-testid="chat-message-user-content"], [data-testid="chat-message-assistant-content"]',
  );
  const conversationTextBeforeReload = await conversationMessages.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-message-content") ?? ""),
  );
  expect(conversationTextBeforeReload.length).toBeGreaterThan(0);

  await page.reload();
  await expect
    .poll(
      async () =>
        conversationMessages.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-message-content") ?? ""),
        ),
      { timeout: 30_000 },
    )
    .toEqual(conversationTextBeforeReload);

  // 階段六：刪除本次建立的對話，驗證清理 API 成功。
  const deleteResponse = await page.request.delete(
    `${backendURL}/api/chat/conversations/${conversationId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  expect(deleteResponse.ok()).toBe(true);
});
