"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Tooltip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import {
  createRole,
  deleteRole,
  fetchPermissionGroups,
  fetchPermissions,
  fetchRolePermissionIds,
  fetchRoles,
  setRolePermissionIds,
  updateRole,
  type Permission,
  type PermissionGroup,
  type Role,
  type RolePayload,
} from "@/services/api/membershipRbacApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

const EMPTY_ROLE: RolePayload = {
  name: "",
  description: "",
  roleType: "BUSINESS",
  status: "ACTIVE",
  isSystem: false,
};

export default function RoleManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission(MODULE_PERMISSIONS.rbacView);
  const canAdd = hasPermission(MODULE_PERMISSIONS.rbacAdd);
  const canEdit = hasPermission(MODULE_PERMISSIONS.rbacEdit);
  const canDelete = hasPermission(MODULE_PERMISSIONS.rbacDelete);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<RolePayload>(EMPTY_ROLE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<Role | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [expandedPermissionSectionIds, setExpandedPermissionSectionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [roleRows, groupRows, permissionRows] = await Promise.all([
        fetchRoles(),
        fetchPermissionGroups(),
        fetchPermissions(),
      ]);
      setRoles(roleRows);
      setPermissionGroups(groupRows);
      setPermissions(permissionRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取角色資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreate() {
    if (!canAdd) {
      toast.error("目前帳號沒有 rbac.add 權限。");
      return;
    }
    setSelectedRole(null);
    setRoleForm(EMPTY_ROLE);
    const allPermissionIds = permissions.map((permission) => permission.id);
    setSelectedPermissionIds(new Set(allPermissionIds));
    setExpandedPermissionSectionIds(getInitialExpandedSectionIds(allPermissionIds));
    setDialogOpen(true);
  }

  async function openEdit(role: Role) {
    if (!canEdit) {
      toast.error("目前帳號沒有 rbac.edit 權限。");
      return;
    }
    try {
      setSelectedRole(role);
      setRoleForm({
        name: role.name,
        description: role.description,
        roleType: role.roleType,
        status: role.status,
        isSystem: role.isSystem,
      });
      const result = await fetchRolePermissionIds(role.id);
      setSelectedPermissionIds(new Set(result.permissionIds));
      setExpandedPermissionSectionIds(getInitialExpandedSectionIds(result.permissionIds));
      setDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取角色權限失敗");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedRole && !canEdit) {
      toast.error("目前帳號沒有 rbac.edit 權限。");
      return;
    }
    if (!selectedRole && !canAdd) {
      toast.error("目前帳號沒有 rbac.add 權限。");
      return;
    }
    try {
      if (selectedRole) {
        await updateRole(selectedRole.id, roleForm);
        await setRolePermissionIds(selectedRole.id, Array.from(selectedPermissionIds));
        toast.success("已更新角色");
      } else {
        const createdRole = await createRole(roleForm);
        await setRolePermissionIds(createdRole.id, Array.from(selectedPermissionIds));
        toast.success("已新增角色");
      }
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存角色失敗");
    }
  }

  function openDeleteRole(role: Role) {
    if (!canDelete) {
      toast.error("目前帳號沒有 rbac.delete 權限。");
      return;
    }
    setPendingDeleteRole(role);
  }

  async function confirmDeleteRole() {
    if (!pendingDeleteRole || isDeletingRole) return;
    try {
      setIsDeletingRole(true);
      await deleteRole(pendingDeleteRole.id);
      toast.success("已刪除角色");
      setPendingDeleteRole(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除角色失敗");
    } finally {
      setIsDeletingRole(false);
    }
  }

  const permissionSections = useMemo(() => {
    const knownGroupIds = new Set(permissionGroups.map((group) => group.id));
    const permissionMap = new Map<string, Permission[]>();
    permissions.forEach((permission) => {
      const key = permission.groupId && knownGroupIds.has(permission.groupId) ? permission.groupId : "__ungrouped__";
      permissionMap.set(key, [...(permissionMap.get(key) ?? []), permission]);
    });

    const groupedSections = permissionGroups
      .map((group) => ({
        id: group.id,
        code: group.code,
        name: group.name,
        description: group.description,
        permissions: permissionMap.get(group.id) ?? [],
      }))
      .filter((section) => section.permissions.length > 0);

    const ungroupedPermissions = permissionMap.get("__ungrouped__") ?? [];
    if (ungroupedPermissions.length === 0) return groupedSections;
    return [
      ...groupedSections,
      {
        id: "__ungrouped__",
        code: "UNGROUPED",
        name: "未分組權限",
        description: "尚未指定權限群組的功能權限。",
        permissions: ungroupedPermissions,
      },
    ];
  }, [permissionGroups, permissions]);

  function groupSelectionState(groupPermissions: Permission[]) {
    const selectedCount = groupPermissions.filter((permission) => selectedPermissionIds.has(permission.id)).length;
    return {
      selectedCount,
      totalCount: groupPermissions.length,
      isAllSelected: groupPermissions.length > 0 && selectedCount === groupPermissions.length,
      isPartiallySelected: selectedCount > 0 && selectedCount < groupPermissions.length,
    };
  }

  function togglePermissionGroup(groupPermissions: Permission[], shouldSelect: boolean) {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      groupPermissions.forEach((permission) => {
        if (shouldSelect) next.add(permission.id);
        else next.delete(permission.id);
      });
      return next;
    });
  }

  function togglePermission(permissionId: string, shouldSelect: boolean) {
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (shouldSelect) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  }

  function selectAllPermissions() {
    setSelectedPermissionIds(new Set(permissions.map((permission) => permission.id)));
  }

  function clearAllPermissions() {
    setSelectedPermissionIds(new Set());
  }

  function expandAllPermissionSections() {
    setExpandedPermissionSectionIds(new Set(permissionSections.map((section) => section.id)));
  }

  function collapseAllPermissionSections() {
    setExpandedPermissionSectionIds(new Set());
  }

  function getInitialExpandedSectionIds(permissionIds: string[]) {
    const selectedIds = new Set(permissionIds);
    const selectedSectionIds = permissionSections
      .filter((section) => section.permissions.some((permission) => selectedIds.has(permission.id)))
      .map((section) => section.id);

    if (selectedSectionIds.length > 0) return new Set(selectedSectionIds);
    return new Set(permissionSections[0] ? [permissionSections[0].id] : []);
  }

  function togglePermissionSection(sectionId: string) {
    setExpandedPermissionSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  const columns: GridColDef<Role>[] = [
      { field: "name", headerName: "角色名稱", minWidth: 170, flex: 0.8 },
      { field: "code", headerName: "Code", minWidth: 220, flex: 0.9 },
      { field: "description", headerName: "描述", minWidth: 220, flex: 1 },
      {
        field: "status",
        headerName: "狀態",
        minWidth: 100,
        renderCell: (params: GridRenderCellParams<Role>) => (
          <div className="flex h-full items-center">
            <MembershipStatusChip status={params.row.status} />
          </div>
        ),
      },
      { field: "userCount", headerName: "使用者", minWidth: 90 },
      { field: "permissionCount", headerName: "權限", minWidth: 90 },
      {
        field: "actions",
        headerName: "操作",
        minWidth: 190,
        sortable: false,
        renderCell: (params: GridRenderCellParams<Role>) => (
          <div className="flex h-full items-center gap-1.5">
            {canEdit ? (
                <IconButton title="編輯角色與權限" onClick={() => void openEdit(params.row)}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
            ) : null}
            {canDelete && !params.row.isSystem ? (
              <IconButton title="刪除" danger onClick={() => openDeleteRole(params.row)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ];

  if (isPermissionLoading) return null;

  if (!canRead) {
    return <AccessDenied title="角色管理" />;
  }

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="flex h-full flex-col gap-4 px-5 py-5 md:px-7">
        <section className="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">角色管理</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">維護角色、多角色授權與角色權限 mapping。</p>
          </div>
          {canAdd ? (
            <Button onClick={openCreate} className="bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              新增角色
            </Button>
          ) : null}
        </section>
        <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
          <DataGrid rows={roles} columns={columns} loading={isLoading} disableRowSelectionOnClick getRowHeight={() => 58} pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5">
            <DialogTitle>{selectedRole ? "修改角色" : "新增角色"}</DialogTitle>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
              <Field label="角色名稱"><Input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required /></Field>
              <Field label="角色類型">
                <select className="h-9 rounded-md border px-3 text-sm" value={roleForm.roleType} onChange={(event) => setRoleForm({ ...roleForm, roleType: event.target.value as RolePayload["roleType"] })}>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="USER">USER</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </Field>
              <Field label="狀態">
                <select className="h-9 rounded-md border px-3 text-sm" value={roleForm.status} onChange={(event) => setRoleForm({ ...roleForm, status: event.target.value as RolePayload["status"] })}>
                  <option value="ACTIVE">啟用</option>
                  <option value="INACTIVE">停用</option>
                </select>
              </Field>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                描述
                <textarea className="min-h-20 rounded-md border px-3 py-2 text-sm" value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} />
              </label>
              <section className="grid gap-3 md:col-span-2">
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">角色權限</h3>
                  <p className="mt-1 text-xs text-slate-500">新增角色時可直接勾選此角色可使用的權限功能。</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    全選
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions} className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100">
                    全取消
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={collapseAllPermissionSections} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                    全折疊
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={expandAllPermissionSections} className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
                    全展開
                  </Button>
                </div>
              </div>
              {permissionSections.map((section) => {
                const state = groupSelectionState(section.permissions);
                const isExpanded = expandedPermissionSectionIds.has(section.id);
                const contentId = `role-permission-section-${section.id}`;
                return (
                  <section key={section.id} className="rounded-lg border border-slate-200 bg-white">
                    <div className={isExpanded ? "border-b border-slate-100" : ""}>
                      <div className="flex items-start gap-3 p-4">
                        <label className="mt-1 flex shrink-0 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={state.isAllSelected}
                            onChange={(event) => togglePermissionGroup(section.permissions, event.target.checked)}
                            aria-label={`${section.name} 全選`}
                          />
                        </label>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          aria-expanded={isExpanded}
                          aria-controls={contentId}
                          onClick={() => togglePermissionSection(section.id)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{section.name}</span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{section.code}</span>
                              {state.isPartiallySelected ? (
                                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">部分已選</span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-sm text-slate-500">{section.description}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600">
                            {state.selectedCount}/{state.totalCount}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </span>
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                      <div id={contentId} className="grid gap-2 p-4 md:grid-cols-2">
                        {section.permissions.map((permission) => (
                          <label key={permission.id} className="flex cursor-pointer gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selectedPermissionIds.has(permission.id)}
                              onChange={(event) => togglePermission(permission.id, event.target.checked)}
                            />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{permission.name}</span>
                                <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                  {permission.action}
                                </span>
                              </span>
                              <span className="mt-0.5 block break-all text-xs text-slate-500">{permission.code}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
              </section>
            </div>
            <div className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t bg-white px-6 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">儲存</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={pendingDeleteRole !== null}
        title="確認刪除角色"
        description={pendingDeleteRole ? <>確定要刪除角色「{pendingDeleteRole.name}」嗎？此操作會採用軟刪除。</> : null}
        detail={pendingDeleteRole ? `目前有 ${pendingDeleteRole.userCount} 位使用者套用此角色；刪除後將無法再以此角色進行授權。` : null}
        isDeleting={isDeletingRole}
        onCancel={() => setPendingDeleteRole(null)}
        onConfirm={() => void confirmDeleteRole()}
      />
    </main>
  );
}

function AccessDenied({ title }: { title: string }) {
  return (
    <main className="grid h-full place-items-center bg-[#f8fcff] p-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm">目前帳號沒有 rbac.view 權限。</div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function IconButton({ children, title, danger, onClick }: { children: React.ReactNode; title: string; danger?: boolean; onClick: () => void }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button type="button" aria-label={title} onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-md border ${danger ? "border-red-200 bg-red-50 text-red-700" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
        {children}
      </button>
    </Tooltip>
  );
}
