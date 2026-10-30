# SQLAlchemy DB 回歸測試

此套件從 WEB 與 Playwright API request 驗證後端改用 SQLAlchemy 後的資料持久化行為。測試不 mock DB；請只連到獨立測試資料庫。

## 涵蓋範圍

- 專家知識與外部資料 CRUD、搜尋、特殊字元、時間欄位、軟刪除。
- Server-side pagination 的 `total`、`pageSize`、`offset` 與跨頁不重複。
- 使用者新增、重整、搜尋、鎖定、解鎖、密碼重設、停用與軟刪除。
- 唯一鍵衝突後不留下半套使用者或角色關聯資料。
- 角色、權限 mapping 與使用者角色 mapping。
- 組織父子樹、職位、使用者關聯與 cascade soft-delete／detach。
- Audit Log JSON、Audit retention 設定、Dashboard 統計、Notification Outbox 與報告歷史讀取。
- 原有 `membership/groups/group-management.spec.ts` 覆蓋群組與成員的多表寫入。
- 原有 `ai-assistant/chatbot/conversation-history.spec.ts` 覆蓋對話、訊息、專家知識及外部資料關聯還原。
- 原有 `membership/audit/auth-audit.spec.ts` 覆蓋登入、忘記密碼及無效 token 的 Audit Log。

## 執行條件

前端預設為 `http://127.0.0.1:3000`，後端預設為 `http://127.0.0.1:3001`。可用下列環境變數覆寫：

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:3001 \
E2E_BOOTSTRAP_ADMIN_LOGIN=system.admin \
E2E_BOOTSTRAP_ADMIN_PASSWORD='system admin 密碼' \
E2E_TEST_LOGIN=playwrighttestuser \
E2E_TEST_PASSWORD='PlaywrightTest123!' \
npm run test:e2e -- tests/e2e/db-regression
```

`setup` project 是唯一使用 system admin 的測試步驟，用來建立或同步
`playwrighttestuser`。其餘 DB 回歸案例都使用測試帳號執行。

建議以完全相同的案例分別連線至 SQLite 與 PostgreSQL 測試 DB。測試會自行清除建立的使用者、角色、組織、職位與知識資料；Audit retention 案例會在 `finally` 還原原設定。
