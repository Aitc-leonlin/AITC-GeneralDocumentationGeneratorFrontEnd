# Audit Log

存放 Audit Log 查詢、篩選、保留天數設定、每日 TXT 封存提示及權限控制測試。

`auth-audit.spec.ts` 會從 WEB 執行操作，再用 Audit Log API 反查本次操作產生的 action，並非 mock 測試。

執行前請先啟動後端（預設 `http://127.0.0.1:3001`），且只可使用測試環境資料庫：

```bash
E2E_BOOTSTRAP_ADMIN_LOGIN=system.admin \
E2E_BOOTSTRAP_ADMIN_PASSWORD='system admin 密碼' \
E2E_TEST_LOGIN=playwrighttestuser \
E2E_TEST_PASSWORD='PlaywrightTest123!' \
npm run test:e2e -- tests/e2e/membership/audit
```

system admin 只由 `setup` project 用來建立／同步測試帳號；Audit Log 的實際 WEB 操作由
`playwrighttestuser` 執行。

若後端不在預設位置，另設定 `PLAYWRIGHT_BACKEND_URL`。未自動化案例集中於 `audit-actions.manual.spec.ts`，執行報告會顯示為 skipped。
