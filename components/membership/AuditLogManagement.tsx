"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Settings, X } from "lucide-react";

import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  type AuditLogListResult,
  type AuditRetentionSetting,
  fetchAuditRetentionSetting,
  fetchMembershipAuditLogs,
  updateAuditRetentionSetting,
} from "@/services/api/membershipAdminApi";

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

type AuditActionOption = {
  id: string;
  label: string;
  actions: string[];
};

const AUDIT_ACTION_GROUPS: Array<{ module: string; options: AuditActionOption[] }> = [
  {
    module: "登入與帳號",
    options: [
      { id: "login-success", label: "登入成功", actions: ["auth.login.success"] },
      { id: "login-failed", label: "登入失敗", actions: ["auth.login.failed"] },
      { id: "forgot-password", label: "忘記密碼", actions: ["auth.password.forgot"] },
      { id: "reset-password", label: "重設密碼", actions: ["auth.password.reset"] },
      { id: "email-verification", label: "Email 驗證", actions: ["auth.email_verification.request", "auth.email_verification.verify"] },
    ],
  },
  {
    module: "AI助理",
    options: [
      { id: "ai-conversation", label: "建立 AI 對話", actions: ["ai.conversation.create"] },
      { id: "external-search", label: "外部網路搜尋", actions: ["ai.external_search"] },
    ],
  },
  {
    module: "專家知識庫",
    options: [
      { id: "expert-create", label: "新增", actions: ["expert_knowledge.create"] },
      { id: "expert-update", label: "編輯", actions: ["expert_knowledge.update"] },
      { id: "expert-delete", label: "刪除", actions: ["expert_knowledge.delete"] },
      { id: "expert-ai-store", label: "AI 產生並存入 DB", actions: ["expert_knowledge.ai_generate_and_store"] },
    ],
  },
  {
    module: "資料倉儲",
    options: [
      { id: "warehouse-create", label: "新增", actions: ["warehouse_data.create"] },
      { id: "warehouse-update", label: "編輯", actions: ["warehouse_data.update"] },
      { id: "warehouse-delete", label: "刪除", actions: ["warehouse_data.delete"] },
    ],
  },
  {
    module: "報告",
    options: [
      { id: "report-start", label: "開始產生報告", actions: ["report.generate.started"] },
      { id: "report-complete", label: "完成／失敗", actions: ["report.generate.completed"] },
      // TODO: 歷史報告下載功能尚未完成，待雲端物件儲存串接後恢復篩選項目。
      // { id: "report-download", label: "歷史報告下載", actions: ["report.history.download"] },
    ],
  },
  {
    module: "會員管理",
    options: [
      { id: "member-user-crud", label: "使用者新增／編輯／刪除", actions: ["membership.user.create", "membership.user.update", "membership.user.delete"] },
      { id: "member-status", label: "啟用／停用／鎖定／解鎖", actions: ["membership.user.status"] },
      { id: "member-reset-password", label: "重設密碼", actions: ["membership.user.password.reset"] },
      { id: "member-role-crud", label: "角色 CRUD", actions: ["membership.role.create", "membership.role.update", "membership.role.delete", "membership.role.permissions.update"] },
      { id: "member-batch-roles", label: "批次指派角色", actions: ["membership.user_roles.batch_assign"] },
      { id: "member-organization", label: "組織管理", actions: ["membership.organization_scope.change"] },
      { id: "member-notification", label: "通知範本修改", actions: ["membership.notification_template.update"] },
      { id: "member-audit-retention", label: "Audit Log 保留天數修改", actions: ["membership.audit_retention.update"] },
      { id: "member-group-crud", label: "群組新增／編輯／刪除", actions: ["membership.group.create", "membership.group.update", "membership.group.delete"] },
      { id: "member-group-members", label: "群組成員異動", actions: ["membership.group.member.add", "membership.group.member.delete"] },
    ],
  },
];

const ALL_AUDIT_ACTION_OPTIONS = AUDIT_ACTION_GROUPS.flatMap((group) => group.options);

function AuditActionMultiSelect({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selectedSet = new Set(selectedIds);

  function toggle(id: string) {
    onChange(selectedSet.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 marker:content-none">
        <span>{selectedIds.length ? `已選擇 ${selectedIds.length} 種模組／動作` : "全部模組／動作"}</span>
        <span className="ml-3 text-xs text-slate-400 transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs text-slate-500">可複選篩選類型</span>
          <div className="flex gap-2 text-xs font-medium">
            <button type="button" className="text-indigo-700 hover:text-indigo-900" onClick={() => onChange(ALL_AUDIT_ACTION_OPTIONS.map((item) => item.id))}>全部選取</button>
            <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => onChange([])}>清除</button>
          </div>
        </div>
        <div className="grid gap-3">
          {AUDIT_ACTION_GROUPS.map((group) => (
            <section key={group.module}>
              <div className="mb-1 text-xs font-semibold text-slate-500">{group.module}</div>
              <div className="grid gap-0.5">
                {group.options.map((option) => (
                  <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-indigo-50">
                    <input id={`audit-action-${option.id}`} type="checkbox" checked={selectedSet.has(option.id)} onChange={() => toggle(option.id)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function AuditLogManagement() {
  const { hasPermission } = useMembershipPermissions();
  const [result, setResult] = useState<AuditLogListResult | null>(null);
  const [retention, setRetention] = useState<AuditRetentionSetting | null>(null);
  const [retentionDaysInput, setRetentionDaysInput] = useState("90");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [selectedActionTypeIds, setSelectedActionTypeIds] = useState<string[]>([]);
  const [resourceType, setResourceType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const selectedActions = useMemo(() => {
    const selectedSet = new Set(selectedActionTypeIds);
    return ALL_AUDIT_ACTION_OPTIONS
      .filter((option) => selectedSet.has(option.id))
      .flatMap((option) => option.actions);
  }, [selectedActionTypeIds]);

  useEffect(() => {
    let ignore = false;
    fetchAuditRetentionSetting()
      .then((data) => {
        if (!ignore) {
          setRetention(data);
          setRetentionDaysInput(String(data.retentionDays));
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setSettingsError(err instanceof Error ? err.message : "保留天數設定載入失敗");
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    fetchMembershipAuditLogs({ page, pageSize: 20, actions: selectedActions, resourceType, outcome })
      .then((data) => {
        if (!ignore) {
          setResult(data);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Audit Log 載入失敗");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedActions, resourceType, outcome, page]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / 20));

  async function saveRetentionSetting() {
    const days = Number(retentionDaysInput);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setSettingsError("保留天數必須是 1 到 3650 之間的整數。");
      return;
    }
    try {
      setIsSavingSettings(true);
      setSettingsError("");
      const updated = await updateAuditRetentionSetting(days);
      setRetention(updated);
      setRetentionDaysInput(String(updated.retentionDays));
      setIsSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "保留天數設定儲存失敗");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <section className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-indigo-600">Audit</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Audit Log 查詢</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">查詢登入、AI、知識庫、倉儲、報告與會員管理事件。</p>
          </div>
          {hasPermission(MODULE_PERMISSIONS.auditManage) ? (
            <button
              id="audit-retention-settings-button"
              type="button"
              onClick={() => {
                setSettingsError("");
                setRetentionDaysInput(String(retention?.retentionDays ?? 90));
                setIsSettingsOpen(true);
              }}
              className="flex shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              設定
            </button>
          ) : null}
        </section>

        <section className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Archive className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">
              系統每日自動將超過 {retention?.retentionDays ?? "—"} 天的 Audit Log 封存為 TXT，並從 DB 清除。
            </div>
            {retention?.lastRunAt ? (
              <div className="mt-1 text-xs text-amber-800">
                上次排程：{retention.lastRunAt}；當次清除 {retention.lastArchivedCount} 筆
                {retention.lastArchivedCount > 0 && retention.lastArchiveFilename
                  ? `（${retention.lastArchiveFilename}）`
                  : ""}。
              </div>
            ) : (
              <div className="mt-1 text-xs text-amber-800">排程將依 Asia/Taipei 日期每日確認一次。</div>
            )}
          </div>
        </section>

        <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <AuditActionMultiSelect
            selectedIds={selectedActionTypeIds}
            onChange={(ids) => {
              setPage(1);
              setSelectedActionTypeIds(ids);
            }}
          />
          <input
            value={resourceType}
            onChange={(event) => {
              setPage(1);
              setResourceType(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Resource type"
          />
          <select
            value={outcome}
            onChange={(event) => {
              setPage(1);
              setOutcome(event.target.value);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部結果</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSelectedActionTypeIds([]);
              setResourceType("");
              setOutcome("");
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            清除篩選
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
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">模組／動作</th>
                  <th className="px-4 py-3">操作對象</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(result?.logs ?? []).map((log) => (
                  <tr id={`audit-log-row-${log.id}`} data-audit-action={log.action} key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{log.actorDisplayName ?? log.actorUserId ?? "-"}</div>
                      {log.actorEmail ? (
                        <div className="mt-0.5 break-all text-xs text-slate-400">{log.actorEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-950">
                      <div className="font-medium">
                        {[metadataText(log.metadata, "module"), metadataText(log.metadata, "actionLabel")]
                          .filter(Boolean)
                          .join("／") || log.action}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{log.action}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{log.resourceType}</div>
                      <div className="mt-0.5 break-all text-xs text-slate-500">{log.resourceId || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.outcome}</td>
                    <td className="px-4 py-3 text-slate-600">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
                {!isLoading && (result?.logs ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={6}>
                      沒有符合條件的 Audit Log。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>共 {result?.total ?? 0} 筆</span>
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

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="audit-retention-title">
          <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="audit-retention-title" className="text-lg font-semibold text-slate-950">Audit Log 設定</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">設定資料留在 DB 中的天數。每日排程會先輸出 TXT，成功後才刪除舊資料。</p>
              </div>
              <button type="button" aria-label="關閉設定" onClick={() => setIsSettingsOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="audit-retention-days">DB 保留天數</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="audit-retention-days"
                type="number"
                min={1}
                max={3650}
                step={1}
                value={retentionDaysInput}
                onChange={(event) => setRetentionDaysInput(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-600">天</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">允許範圍為 1～3650 天；新設定會從下一次每日排程開始生效。</p>
            {settingsError ? <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{settingsError}</div> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">取消</button>
              <button type="button" disabled={isSavingSettings} onClick={() => void saveRetentionSetting()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {isSavingSettings ? "儲存中…" : "儲存設定"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
