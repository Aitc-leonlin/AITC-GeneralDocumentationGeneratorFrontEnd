import { test } from "@playwright/test";

test.describe("Audit Log 待人工補完案例", () => {
  // TODO：之後由人類處理。需要建立有效 token，且成功案例會永久修改使用者密碼。
  test.skip("auth.password.reset 成功流程", async () => {});

  // TODO：之後由人類處理。request/verify 需要管理測試帳號的驗證狀態與一次性 token。
  test.skip("auth.email_verification.request / verify 成功流程", async () => {});

  // TODO：之後由人類處理。依賴 AI model、外部搜尋服務與可預期的回覆條件。
  test.skip("ai.conversation.create / ai.external_search", async () => {});

  // TODO：之後由人類處理。需定義專用測試資料、AI 產生條件與完整 cleanup。
  test.skip("expert_knowledge create / update / delete / ai_generate_and_store", async () => {});

  // TODO：之後由人類處理。需定義專用資料倉儲紀錄與測試後 cleanup。
  test.skip("warehouse_data create / update / delete", async () => {});

  // TODO：之後由人類處理。需準備報告輸入、等待非同步產生並管理下載檔案。
  test.skip("report generate started / completed / history download", async () => {});

  // TODO：之後由人類處理。會員 CRUD 會變更帳號、角色及登入狀態，需隔離 DB 與 cleanup。
  test.skip("membership user CRUD / status / password reset", async () => {});

  // TODO：之後由人類處理。角色、批次角色與組織管理需固定測試資料集。
  test.skip("membership role / user roles / organization", async () => {});

  // TODO：之後由人類處理。通知範本修改需備份並還原原始範本內容。
  test.skip("membership.notification_template.update", async () => {});
});
