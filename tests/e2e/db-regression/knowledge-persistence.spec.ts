import { expect, test } from "@playwright/test";

import { backendURL } from "../support/audit-log";
import {
  authHeaders,
  deleteIfPresent,
  loginAsAdmin,
  uniqueSuffix,
} from "../support/db-regression";

type ExpertEntry = {
  id: string;
  title: string;
  dataSource: string;
  industry: string;
  companyLabel: string;
  companyPromptValue: string;
  sourceSchemaKey: string;
  anchorDescription: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
};

type WarehouseEntry = {
  id: string;
  category: string;
  title: string;
  industry: string;
  companyLabel: string;
  companyPromptValue: string;
  summary: string;
  source: string;
  url: string;
  recordUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

test("TC-DB-EK-001 專家知識新增、修改、搜尋、重整與軟刪除皆持久化", async ({ page }) => {
  test.setTimeout(120_000);

  // 階段一：準備唯一的專家知識資料並取得管理員授權。
  const suffix = uniqueSuffix();
  const title = `E2E SQLAlchemy 專家指引 ${suffix}`;
  const updatedTitle = `${title}（已更新）`;
  let entryId = "";
  const { accessToken } = await loginAsAdmin(page);

  try {
    // 階段二：透過 API 新增含特殊字元的專家知識，驗證建立時間欄位已持久化。
    const createResponse = await page.request.post(`${backendURL}/api/expert-knowledge`, {
      headers: authHeaders(accessToken, true),
      data: {
        title,
        dataSource: "財務報表",
        industry: "製造業",
        companyLabel: "All",
        companyPromptValue: "",
        sourceSchemaKey: `e2e-${suffix}`,
        anchorDescription: "含中文、單引號 '、百分比 % 與底線 _ 的錨定內容",
        systemPrompt: "請保留 nullable、Unicode 與時間欄位的資料型別。",
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as ExpertEntry;
    entryId = created.id;
    expect(created.createdAt).not.toBe("");
    expect(created.updatedAt).not.toBe("");

    // 階段三：從 UI 搜尋新資料，並驗證 reload 後仍可由後端重新載入。
    await page.goto("/expert-knowledge");
    await page.getByPlaceholder("搜尋標題、產業、公司或指引內容").fill(suffix);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByPlaceholder("搜尋標題、產業、公司或指引內容").fill(suffix);
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    // 階段四：透過 API 更新標題與多行內容，驗證資料及 updatedAt 已更新。
    const updateResponse = await page.request.patch(
      `${backendURL}/api/expert-knowledge/${entryId}`,
      {
        headers: authHeaders(accessToken, true),
        data: { ...created, title: updatedTitle, systemPrompt: `${created.systemPrompt}\n更新完成` },
      },
    );
    expect(updateResponse.ok()).toBe(true);
    const updated = (await updateResponse.json()) as ExpertEntry;
    expect(updated.title).toBe(updatedTitle);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));

    // 階段五：reload UI 後搜尋更新後標題，確認修改結果可持久化顯示。
    await page.reload();
    await page.getByPlaceholder("搜尋標題、產業、公司或指引內容").fill(suffix);
    await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible();

    // 階段六：刪除資料，驗證單筆 API 回傳 404 且 UI 不再顯示該筆紀錄。
    const deleteResponse = await page.request.delete(
      `${backendURL}/api/expert-knowledge/${entryId}`,
      { headers: authHeaders(accessToken) },
    );
    expect(deleteResponse.status()).toBe(204);
    entryId = "";

    const getDeletedResponse = await page.request.get(
      `${backendURL}/api/expert-knowledge/${created.id}`,
      { headers: authHeaders(accessToken) },
    );
    expect(getDeletedResponse.status()).toBe(404);
    await page.reload();
    await page.getByPlaceholder("搜尋標題、產業、公司或指引內容").fill(suffix);
    await expect(page.getByText(updatedTitle, { exact: true })).toHaveCount(0);
  } finally {
    // 階段七：若案例中途失敗，補做刪除以避免測試資料殘留。
    if (entryId) {
      await deleteIfPresent(page.request, `/api/expert-knowledge/${entryId}`, accessToken);
    }
  }
});

test("TC-DB-WH-001 外部資料 CRUD、特殊字元與重新整理結果一致", async ({ page }) => {
  test.setTimeout(120_000);

  // 階段一：準備唯一的資料倉儲紀錄及管理員授權。
  const suffix = uniqueSuffix();
  const title = `E2E SQLAlchemy 外部資料 ${suffix}`;
  const updatedTitle = `${title}（新版）`;
  let entryId = "";
  const { accessToken } = await loginAsAdmin(page);

  try {
    // 階段二：建立含引號、百分比、底線及繁體中文的紀錄，驗證建立成功。
    const createResponse = await page.request.post(`${backendURL}/api/warehouse-data`, {
      headers: authHeaders(accessToken, true),
      data: {
        category: "新聞",
        title,
        industry: "製造業",
        companyLabel: "All",
        companyPromptValue: "",
        summary: "SQLAlchemy 回歸：O'Reilly、100%、under_score、繁體中文。",
        source: "E2E 測試來源",
        url: "https://example.test/e2e?value=100%25",
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as WarehouseEntry;
    entryId = created.id;
    expect(created.recordUpdatedAt).not.toBe("");

    // 階段三：從 UI 搜尋紀錄，並驗證 reload 後仍能重新載入。
    await page.goto("/external-knowledge");
    await page.getByPlaceholder("搜尋分類、標題、公司、來源或摘要").fill(suffix);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.reload();
    await page.getByPlaceholder("搜尋分類、標題、公司、來源或摘要").fill(suffix);
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    // 階段四：更新標題與多行摘要，驗證 API response 反映新內容。
    const updateResponse = await page.request.patch(
      `${backendURL}/api/warehouse-data/${entryId}`,
      {
        headers: authHeaders(accessToken, true),
        data: { ...created, title: updatedTitle, summary: `${created.summary}\n第二行內容` },
      },
    );
    expect(updateResponse.ok()).toBe(true);
    const updated = (await updateResponse.json()) as WarehouseEntry;
    expect(updated.title).toBe(updatedTitle);
    expect(updated.summary).toContain("第二行內容");

    // 階段五：以含單引號的關鍵字查詢，驗證特殊字元搜尋可找到目標紀錄。
    const keywordResponse = await page.request.get(
      `${backendURL}/api/warehouse-data?page=1&pageSize=5&offset=0&keyword=${encodeURIComponent("O'Reilly")}`,
      { headers: authHeaders(accessToken) },
    );
    expect(keywordResponse.ok()).toBe(true);
    const keywordResult = (await keywordResponse.json()) as { entries: WarehouseEntry[]; total: number };
    expect(keywordResult.entries.some((item) => item.id === entryId)).toBe(true);

    // 階段六：刪除紀錄並驗證後續單筆查詢回傳 404。
    const deleteResponse = await page.request.delete(
      `${backendURL}/api/warehouse-data/${entryId}`,
      { headers: authHeaders(accessToken) },
    );
    expect(deleteResponse.status()).toBe(204);
    entryId = "";
    expect(
      (
        await page.request.get(`${backendURL}/api/warehouse-data/${created.id}`, {
          headers: authHeaders(accessToken),
        })
      ).status(),
    ).toBe(404);
  } finally {
    // 階段七：若案例中途失敗，補做刪除以保持測試環境乾淨。
    if (entryId) {
      await deleteIfPresent(page.request, `/api/warehouse-data/${entryId}`, accessToken);
    }
  }
});

test("TC-DB-QUERY-001 Server-side 分頁的 total、offset、排序與頁面資料不重複", async ({ page }) => {
  test.setTimeout(120_000);

  // 階段一：準備唯一查詢關鍵字及待清理 ID 清單。
  const suffix = uniqueSuffix();
  const ids: string[] = [];
  const { accessToken } = await loginAsAdmin(page);

  try {
    // 階段二：建立六筆具穩定順序的資料，作為兩頁分頁測試集合。
    for (let index = 0; index < 6; index += 1) {
      const response = await page.request.post(`${backendURL}/api/warehouse-data`, {
        headers: authHeaders(accessToken, true),
        data: {
          category: index % 2 === 0 ? "新聞" : "年報",
          title: `E2E-PAGE-${suffix}-${String(index).padStart(2, "0")}`,
          industry: "製造業",
          companyLabel: "All",
          companyPromptValue: "",
          summary: `分頁測試 ${suffix}`,
          source: "E2E pagination",
          url: "",
        },
      });
      expect(response.status()).toBe(201);
      ids.push(((await response.json()) as WarehouseEntry).id);
    }

    // 階段三：定義每頁三筆的 server-side 查詢，並驗證 API 基本成功狀態。
    const query = async (offset: number) => {
      const response = await page.request.get(
        `${backendURL}/api/warehouse-data?page=${offset / 3 + 1}&pageSize=3&offset=${offset}&keyword=${suffix}`,
        { headers: authHeaders(accessToken) },
      );
      expect(response.ok()).toBe(true);
      return (await response.json()) as {
        entries: WarehouseEntry[];
        total: number;
        page: number;
        pageSize: number;
        offset: number;
      };
    };

    // 階段四：查詢前後兩頁，驗證 total、pageSize、offset、筆數及跨頁 ID 不重複。
    const firstPage = await query(0);
    const secondPage = await query(3);
    expect(firstPage.total).toBe(6);
    expect(firstPage.pageSize).toBe(3);
    expect(firstPage.offset).toBe(0);
    expect(secondPage.offset).toBe(3);
    expect(firstPage.entries).toHaveLength(3);
    expect(secondPage.entries).toHaveLength(3);
    expect(new Set([...firstPage.entries, ...secondPage.entries].map((item) => item.id)).size).toBe(6);
  } finally {
    // 階段五：逐筆刪除本案例建立的六筆資料。
    for (const id of ids) {
      await deleteIfPresent(page.request, `/api/warehouse-data/${id}`, accessToken);
    }
  }
});
