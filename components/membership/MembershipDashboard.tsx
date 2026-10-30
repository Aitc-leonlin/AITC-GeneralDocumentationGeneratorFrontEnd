"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  FileSearch,
  KeyRound,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { WidgetPermission } from "@/components/membership/authorization";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  type AdminDashboard,
  fetchMembershipAdminDashboard,
  resetMembershipSeedData,
} from "@/services/api/membershipAdminApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";

const widgets = [
  {
    title: "會員帳號",
    description: "使用者新增、停用、鎖定與密碼維護。",
    href: "/membership/users",
    permission: "membership.read",
    icon: Users,
  },
  {
    title: "角色管理",
    description: "Role CRUD、多角色與角色權限設定。",
    href: "/membership/roles",
    permission: MODULE_PERMISSIONS.rbacView,
    icon: KeyRound,
  },
  {
    title: "批次套用角色",
    description: "替帳號配置一個或多個角色。",
    href: "/membership/user-roles",
    permission: MODULE_PERMISSIONS.membershipUserRoles,
    icon: UserCog,
  },
  {
    title: "功能權限管理",
    description: "Permission、Permission Group 與 resource/action 定義。",
    href: "/membership/permissions",
    permission: MODULE_PERMISSIONS.rbacView,
    icon: ShieldCheck,
  },
  {
    title: "組織管理",
    description: "公司、部門、團隊與職位設定；帳號所屬部門由帳號管理維護。",
    href: "/membership/organizations",
    permission: MODULE_PERMISSIONS.organizationScopeView,
    icon: Building2,
  },
  {
    title: "日誌安全",
    description: "Audit log 查詢、登入統計與操作紀錄追蹤。",
    href: "/membership/audit",
    permission: MODULE_PERMISSIONS.auditView,
    icon: FileSearch,
  },
  {
    title: "通知管理",
    description: "Email 通知範本、通知 outbox 與發送狀態管理。",
    href: "/membership/notifications",
    permission: MODULE_PERMISSIONS.notificationView,
    icon: Bell,
  },
];

function metricValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("zh-TW") : "0";
}

export default function MembershipDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const result = await fetchMembershipAdminDashboard();
      setDashboard(result);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "管理總覽載入失敗");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      try {
        const result = await fetchMembershipAdminDashboard();
        if (!ignore) {
          setDashboard(result);
          setError("");
        }
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : "管理總覽載入失敗");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleResetSeed() {
    if (isResetting) return;

    setIsResetting(true);
    setError("");
    setResetMessage("");
    try {
      const result = await resetMembershipSeedData();
      setResetMessage(`已清空 ${result.clearedTableCount} 張 membership table，並重新寫入 SEED 資料。`);
      setResetConfirmationOpen(false);
      await loadDashboard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "SEED 重建失敗");
    } finally {
      setIsResetting(false);
    }
  }

  const metrics = useMemo(
    () => [
      { label: "使用者總數", value: dashboard?.userStats.totalUsers },
      { label: "鎖定帳號", value: dashboard?.userStats.lockedUsers },
      { label: "角色數", value: dashboard?.permissionOverview.roles },
      { label: "權限數", value: dashboard?.permissionOverview.permissions },
      { label: "成功登入", value: dashboard?.loginStats.successfulLogins },
      { label: "失敗登入", value: dashboard?.loginStats.failedLogins },
      { label: "待發通知", value: dashboard?.notificationStats.pendingNotifications },
      { label: "已發通知", value: dashboard?.notificationStats.sentNotifications },
    ],
    [dashboard],
  );

  return (
    <main className="h-full overflow-y-auto bg-[#f8fcff]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <section className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase text-indigo-600">Dashboard</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">會員權限管理總覽</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              權限總覽、使用者統計、登入統計、通知狀態與近期 Audit Log。
            </p>
          </div>
          <WidgetPermission permission={MODULE_PERMISSIONS.rbacDelete}>
            <button
              type="button"
              onClick={() => setResetConfirmationOpen(true)}
              disabled={isResetting}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-700 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AlertTriangle className="h-4 w-4" />
              {isResetting ? "重建中..." : "清空 MEMBERSHIP 並重建 SEED"}
            </button>
          </WidgetPermission>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {isLoading ? "-" : metricValue(metric.value)}
              </div>
            </div>
          ))}
        </section>

        {error ? (
          <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {resetMessage ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {resetMessage}
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">近期 Audit Log</h2>
            <Link href="/membership/audit" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
              查看全部
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboard?.recentAuditLogs ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {typeof log.metadata.actionLabel === "string" ? log.metadata.actionLabel : log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {typeof log.metadata.module === "string" ? log.metadata.module : log.resourceType}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.outcome}</td>
                  </tr>
                ))}
                {!isLoading && (dashboard?.recentAuditLogs ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      目前沒有 Audit Log。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <WidgetPermission key={widget.href} permission={widget.permission}>
                <Link
                  href={widget.href}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">{widget.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{widget.description}</p>
                </Link>
              </WidgetPermission>
            );
          })}
        </section> */}
      </div>

      <Dialog
        open={resetConfirmationOpen}
        onOpenChange={(open) => {
          if (!open && !isResetting) setResetConfirmationOpen(false);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>確認清空並重建會員資料</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
              警告：這會清空目前所有 MEMBERSHIP_ 開頭資料表的資料，並用 SEED 重新建立預設資料。
            </div>
            <p className="text-sm leading-6 text-slate-600">
              此操作會移除現有會員、角色、授權、登入紀錄與通知資料，且會立即影響目前使用者。
            </p>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isResetting}
                onClick={() => setResetConfirmationOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isResetting}
                onClick={() => void handleResetSeed()}
              >
                {isResetting ? "重建中…" : "確認清空並重建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
