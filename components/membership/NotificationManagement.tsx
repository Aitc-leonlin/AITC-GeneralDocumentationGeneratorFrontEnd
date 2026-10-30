"use client";

import { useCallback, useEffect, useState } from "react";

import {
  dispatchNotificationOutbox,
  fetchNotificationOutbox,
  fetchNotificationTemplates,
  type NotificationOutboxListResult,
  type NotificationTemplate,
} from "@/services/api/membershipAdminApi";

export default function NotificationManagement() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [outbox, setOutbox] = useState<NotificationOutboxListResult | null>(null);
  const [status, setStatus] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadOutbox = useCallback(() => {
    setIsLoading(true);
    return fetchNotificationOutbox({ page, pageSize: 20, status, templateCode })
      .then((data) => {
        setOutbox(data);
        setError("");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "通知 outbox 載入失敗"))
      .finally(() => setIsLoading(false));
  }, [page, status, templateCode]);

  useEffect(() => {
    fetchNotificationTemplates()
      .then(setTemplates)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "通知範本載入失敗"));
  }, []);

  useEffect(() => {
    void loadOutbox();
  }, [loadOutbox]);

  const totalPages = Math.max(1, Math.ceil((outbox?.total ?? 0) / 20));

  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <section className="mb-5">
          <div className="text-xs font-semibold uppercase text-indigo-600">Notifications</div>
          {/* TEMPORARY: 實際寄信服務尚未完成，此紅色標示為權宜處理，完成 mail worker 後移除。 */}
          <h1 className="mt-1 text-2xl font-semibold text-rose-700">通知管理(尚未完成)</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Email 通知範本、通知 outbox 與發送狀態管理。</p>
        </section>

        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-rose-700">Email 通知範本(尚未完成)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{template.code}</div>
                    <div className="mt-1 text-sm text-slate-600">{template.subject}</div>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {template.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部狀態</option>
            <option value="PENDING">PENDING</option>
            <option value="SENT">SENT</option>
            <option value="FAILED">FAILED</option>
          </select>
          <select
            value={templateCode}
            onChange={(event) => {
              setPage(1);
              setTemplateCode(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">全部範本</option>
            {templates.map((template) => (
              <option key={template.id} value={template.code}>
                {template.code}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadOutbox()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            重新整理
          </button>
        </section>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">建立時間</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(outbox?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.createdAt}</td>
                    <td className="px-4 py-3 font-medium text-slate-950">{item.templateCode}</td>
                    <td className="px-4 py-3 text-slate-600">{item.recipientEmail ?? item.recipientUserId ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.status}</td>
                    <td className="px-4 py-3">
                      {/* NOTE: 目前這個操作只標記 outbox 狀態，沒有真的寄信；實際送信需後續串接 SMTP/mail worker。 */}
                      <button
                        type="button"
                        disabled={item.status === "SENT"}
                        onClick={() => {
                          void dispatchNotificationOutbox(item.id).then(() => loadOutbox());
                        }}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-slate-300"
                      >
                        標記已發送
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && (outbox?.items ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={5}>
                      目前沒有通知資料。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>共 {outbox?.total ?? 0} 筆</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              >
                上一頁
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              >
                下一頁
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
