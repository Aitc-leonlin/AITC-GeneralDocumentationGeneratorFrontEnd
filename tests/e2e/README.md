# Playwright E2E 測試案例

此目錄依前端功能分類存放 WEB 操作測試。測試檔使用 `*.spec.ts` 命名，案例應明確包含前置條件、操作步驟與可判斷的成功／失敗結果。

## 功能分類

- `home`：首頁與主要導覽。
- `authentication`：登入、忘記密碼、重設密碼與 Email 驗證。
- `ai-assistant`：Chatbot、外部知識與負面新聞。
- `expert-knowledge`：專家知識庫查詢、新增、編輯與刪除。
- `report-generator`：報告產生及歷史報告。
- `membership`：會員管理後台；依 dashboard、使用者、角色、權限、組織、通知及 Audit Log 再分類。
- `developer-tools`：目前 `agents`、`ai_sdk`、`langgraph`、`retrieval` 等開發／實驗頁面。
- `fixtures`：登入狀態、測試資料等共用 fixture。
- `support`：頁面物件、API helper 與共用 assertion。

## 執行方式

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:report
```

UI mode 會同時列出 `setup` 與 `chromium` projects。第一次開啟時，先手動執行
`auth.setup.ts` 產生測試帳號登入狀態，再執行其他 `.spec.ts`。新增測試流程時，將
`*.spec.ts` 放在 `tests/e2e` 底下任一非 `setup` 目錄，重新開啟或重新整理 UI 即可。

預設測試 `http://127.0.0.1:3000`。如需測試其他環境，可設定 `PLAYWRIGHT_BASE_URL`。

執行測試時，`setup` project 會先以 `E2E_BOOTSTRAP_ADMIN_LOGIN` 建立或同步
`E2E_TEST_LOGIN`（預設 `playwrighttestuser`），並將 system admin 的角色完整套用給測試帳號。
setup 隨後會登入測試帳號並輸出 `storageState`；`chromium` project 的其餘 `.spec.ts`
會載入該登入狀態，只使用 `E2E_TEST_LOGIN` 執行管理操作，不會拿 system admin 作為測試行為帳號。
若測試帳號已存在，setup 只會重設該測試帳號的密碼、啟用／解鎖狀態及角色。

涉及新增、修改、刪除資料的測試，應使用獨立測試資料庫或專用測試帳號，不可直接對正式環境執行。
