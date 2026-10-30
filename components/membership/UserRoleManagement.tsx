"use client";

import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRowSelectionModel } from "@mui/x-data-grid";
import { RefreshCw, Save, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchMembershipUsers, type MembershipUser } from "@/services/api/membershipUsersApi";
import {
  fetchRoles,
  fetchUserRoleIds,
  setUserRoleIds,
  type Role,
} from "@/services/api/membershipRbacApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

export default function UserRoleManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canUse = hasPermission(MODULE_PERMISSIONS.membershipUserRoles);
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleNames, setUserRoleNames] = useState<Record<string, string[]>>({});
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [targetRoleIds, setTargetRoleIds] = useState<Set<string>>(new Set(["role-default-user"]));
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [userResult, roleRows] = await Promise.all([
        fetchMembershipUsers({ page: 1, pageSize: 200 }),
        fetchRoles({ status: "ACTIVE" }),
      ]);
      const activeRoles = roleRows.filter((role) => role.status === "ACTIVE");
      const roleNameById = new Map(activeRoles.map((role) => [role.id, role.name]));
      const userRoleEntries = await Promise.all(
        userResult.users.map(async (user) => {
          const result = await fetchUserRoleIds(user.id);
          return [
            user.id,
            result.roleIds.map((roleId) => roleNameById.get(roleId) ?? roleId),
          ] as const;
        }),
      );
      setUsers(userResult.users);
      setRoles(activeRoles);
      setUserRoleNames(Object.fromEntries(userRoleEntries));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取使用者角色資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function applyBatchRoles() {
    if (!canUse) {
      toast.error("目前帳號沒有 membership.user-roles 權限。");
      return;
    }
    if (selectedUserIds.size === 0) {
      toast.error("請先選擇要更新的帳號。");
      return;
    }
    if (targetRoleIds.size === 0) {
      toast.error("請至少選擇一個目標角色。");
      return;
    }
    try {
      setIsSaving(true);
      const targetRoles = Array.from(targetRoleIds);
      const selectedUsers = users.filter((user) => selectedUserIds.has(user.id));
      await Promise.all(
        selectedUsers.map((user) => setUserRoleIds(user.id, targetRoles, user.organizationId)),
      );
      toast.success(`已批次更新 ${selectedUsers.length} 個帳號的角色`);
      setBatchDialogOpen(false);
      setSelectedUserIds(new Set());
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批次更新使用者角色失敗");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.has(user.id)),
    [selectedUserIds, users],
  );

  const columns: GridColDef<MembershipUser>[] = [
    {
      field: "roles",
      headerName: "目前角色",
      minWidth: 220,
      flex: 0.9,
      sortable: false,
      renderCell: (params) => <RoleSummary roles={userRoleNames[params.row.id] ?? []} />,
    },
    { field: "username", headerName: "帳號", minWidth: 160, flex: 0.7 },
    { field: "displayName", headerName: "姓名", minWidth: 160, flex: 0.7 },
    { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
    { field: "organizationName", headerName: "組織", minWidth: 140, flex: 0.6 },
    { field: "status", headerName: "帳號狀態", minWidth: 110, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
  ];

  if (isPermissionLoading) return null;
  if (!canUse) return <AccessDenied title="使用者角色批次設定" />;

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">使用者角色批次設定</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">選取多個帳號後，一次覆蓋成指定角色組合。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUse ? (
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={selectedUserIds.size === 0}
                onClick={() => setBatchDialogOpen(true)}
              >
                <UsersRound className="h-4 w-4" />
                批次套用角色
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadData()}>
              <RefreshCw className="h-4 w-4" />
              重新整理
            </Button>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
          <div className="h-full min-h-0 overflow-hidden">
            <DataGrid
              rows={users}
              columns={columns}
              loading={isLoading}
              checkboxSelection
              disableRowSelectionOnClick
              getRowHeight={() => 58}
              rowSelectionModel={{ type: "include", ids: selectedUserIds }}
              onRowSelectionModelChange={(model) => setSelectedUserIds(resolveSelectedRowIds(model, users.map((user) => user.id)))}
              pageSizeOptions={[10, 20, 50, 100]}
              initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            />
          </div>
        </section>
      </div>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5">
            <DialogTitle>批次套用角色</DialogTitle>
            <DialogDescription>
              已選 {selectedUserIds.size} 個帳號；儲存後會覆蓋這些帳號目前的角色組合。
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4 overflow-y-auto px-6 py-5">
            <section>
              <div className="mb-2 text-xs font-semibold text-slate-500">選取帳號</div>
              <div className="max-h-32 overflow-y-auto rounded-md bg-[#f8fcff] p-3 text-sm text-slate-700">
                {selectedUsers.length > 0 ? selectedUsers.map((user) => (
                  <div key={user.id} className="truncate">{user.username} / {user.displayName}</div>
                )) : <span className="text-slate-400">尚未選取帳號</span>}
              </div>
            </section>

            <section>
              <div className="mb-2 text-xs font-semibold text-slate-500">目標角色</div>
              <div className="grid gap-2 md:grid-cols-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
                      targetRoleIds.has(role.id) ? "border-indigo-200 bg-indigo-50/70" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={targetRoleIds.has(role.id)}
                      disabled={!canUse}
                      onChange={(event) => toggleTargetRole(setTargetRoleIds, role.id, event.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{role.name}</span>
                      <span className="block break-all text-xs text-slate-500">{role.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t bg-white px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={isSaving || selectedUserIds.size === 0 || targetRoleIds.size === 0}
              onClick={() => void applyBatchRoles()}
            >
              <Save className="h-4 w-4" />
              套用到選取帳號
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function RoleSummary({ roles }: { roles: string[] }) {
  if (roles.length === 0) {
    return (
      <div className="flex h-full min-w-0 items-center text-sm text-slate-400">-</div>
    );
  }

  const visibleRoles = roles.slice(0, 2);
  const extraCount = Math.max(0, roles.length - visibleRoles.length);
  const fullText = roles.join("、");

  return (
    <Tooltip title={fullText} arrow placement="top">
      <div className="flex h-full min-w-0 items-center gap-1 overflow-hidden">
        {visibleRoles.map((role) => (
          <span
            key={role}
            className="max-w-[6.5rem] truncate rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
          >
            {role}
          </span>
        ))}
        {extraCount > 0 ? (
          <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            +{extraCount}
          </span>
        ) : null}
      </div>
    </Tooltip>
  );
}

function toggleTargetRole(
  setTargetRoleIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  roleId: string,
  checked: boolean,
) {
  setTargetRoleIds((current) => {
    const next = new Set(current);
    if (checked) next.add(roleId);
    else next.delete(roleId);
    return next;
  });
}

function resolveSelectedRowIds(model: GridRowSelectionModel, rowIds: string[]) {
  const modelIds = new Set(Array.from(model.ids).map(String));
  if (model.type === "exclude") {
    return new Set(rowIds.filter((rowId) => !modelIds.has(rowId)));
  }
  return modelIds;
}

function AccessDenied({ title }: { title: string }) {
  return (
    <main className="grid h-full place-items-center bg-[#f8fcff] p-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm">目前帳號沒有 membership.user-roles 權限。</div>
      </section>
    </main>
  );
}
