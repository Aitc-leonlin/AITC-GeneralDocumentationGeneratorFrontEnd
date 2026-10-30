"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { useRouter } from "next/navigation";
import { Chip, Tooltip } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getMembershipAccessToken,
  getStoredAuthUser,
  requestMembershipEmailVerification,
  type AuthUser,
} from "@/services/api/membershipAuthApi";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  activateMembershipUser,
  changeMembershipUserPassword,
  createMembershipUser,
  deactivateMembershipUser,
  deleteMembershipUser,
  fetchMembershipUsers,
  lockMembershipUser,
  resetMembershipUserPassword,
  unlockMembershipUser,
  updateMembershipUser,
  updateMembershipUserProfile,
  type MembershipUser,
  type MembershipUserCreatePayload,
  type MembershipUserPayload,
  type MembershipUserStatus,
} from "@/services/api/membershipUsersApi";
import { fetchRoles, fetchUserRoleIds, type Role } from "@/services/api/membershipRbacApi";
import {
  fetchOrganizationUnits,
  fetchPositions,
  type OrganizationUnit,
  type Position,
} from "@/services/api/membershipOrganizationApi";

type UserDialogMode = "create" | "edit" | "profile" | "changePassword" | "resetPassword";

type UserFormState = {
  username: string;
  email: string;
  displayName: string;
  employeeNo: string;
  organizationId: string;
  departmentId: string;
  positionId: string;
  status: MembershipUserStatus;
  locale: string;
  timezone: string;
  password: string;
  currentPassword: string;
  newPassword: string;
  mustChangePassword: boolean;
  roleIds: string[];
};

const DEFAULT_FORM_STATE: UserFormState = {
  username: "",
  email: "",
  displayName: "",
  employeeNo: "",
  organizationId: "",
  departmentId: "",
  positionId: "",
  status: "ACTIVE",
  locale: "zh-TW",
  timezone: "Asia/Taipei",
  password: "",
  currentPassword: "",
  newPassword: "",
  mustChangePassword: true,
  roleIds: ["role-default-user"],
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW");
}

function userToFormState(user: MembershipUser): UserFormState {
  return {
    ...DEFAULT_FORM_STATE,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    employeeNo: user.employeeNo,
    organizationId: user.organizationId ?? "",
    departmentId: user.departmentId ?? "",
    positionId: user.positionId ?? "",
    status: user.status,
    locale: user.locale,
    timezone: user.timezone,
    mustChangePassword: user.mustChangePassword,
  };
}

function toUserPayload(form: UserFormState): MembershipUserPayload {
  return {
    username: form.username,
    email: form.email,
    displayName: form.displayName,
    employeeNo: form.employeeNo,
    organizationId: form.departmentId || form.organizationId || null,
    departmentId: form.departmentId || null,
    positionId: form.positionId || null,
    status: form.status,
    locale: form.locale,
    timezone: form.timezone,
  };
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<OrganizationUnit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const { hasPermission } = useMembershipPermissions();
  const canWriteUsers = hasPermission("membership.write");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogMode, setDialogMode] = useState<UserDialogMode | null>(null);
  const [selectedUser, setSelectedUser] = useState<MembershipUser | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<MembershipUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [form, setForm] = useState<UserFormState>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (!getMembershipAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthUser(getStoredAuthUser());
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetchMembershipUsers({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      });
      setUsers(result.users);
      setRowCount(result.total);
    } catch (error) {
      const message = error instanceof Error ? error.message : "讀取使用者清單失敗";
      toast.error(message);
      if (message.toLowerCase().includes("unauthorized") || message.includes("401")) {
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    router,
  ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!canWriteUsers) return;
    Promise.all([
      fetchRoles({ status: "ACTIVE" }),
      fetchOrganizationUnits({ status: "ACTIVE" }),
      fetchPositions({ status: "ACTIVE" }),
    ])
      .then(([roleRows, organizationRows, positionRows]) => {
        setRoles(roleRows);
        setDepartments(organizationRows);
        setPositions(positionRows);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "讀取表單選項失敗"));
  }, [canWriteUsers]);

  function openCreateDialog() {
    setSelectedUser(null);
    setForm(DEFAULT_FORM_STATE);
    setDialogMode("create");
  }

  async function openUserDialog(mode: UserDialogMode, user: MembershipUser) {
    setSelectedUser(user);
    const nextForm = userToFormState(user);
    if (mode === "edit") {
      try {
        const result = await fetchUserRoleIds(user.id);
        nextForm.roleIds = result.roleIds.length > 0 ? result.roleIds : ["role-default-user"];
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "讀取使用者角色失敗");
      }
    }
    setForm(nextForm);
    setDialogMode(mode);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUser(null);
    setForm(DEFAULT_FORM_STATE);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      if (dialogMode === "create") {
        const payload: MembershipUserCreatePayload = {
          ...toUserPayload(form),
          password: form.password,
          mustChangePassword: form.mustChangePassword,
          roleIds: form.roleIds.length > 0 ? form.roleIds : ["role-default-user"],
        };
        await createMembershipUser(payload);
        toast.success("已新增使用者");
      } else if (dialogMode === "edit" && selectedUser) {
        await updateMembershipUser(selectedUser.id, {
          ...toUserPayload(form),
          roleIds: form.roleIds.length > 0 ? form.roleIds : ["role-default-user"],
        });
        toast.success("已更新使用者");
      } else if (dialogMode === "profile" && selectedUser) {
        await updateMembershipUserProfile(selectedUser.id, {
          displayName: form.displayName,
          email: form.email,
          locale: form.locale,
          timezone: form.timezone,
        });
        toast.success("已更新個人資料");
      } else if (dialogMode === "changePassword" && selectedUser) {
        await changeMembershipUserPassword(selectedUser.id, {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
        toast.success("已修改密碼");
      } else if (dialogMode === "resetPassword" && selectedUser) {
        await resetMembershipUserPassword(selectedUser.id, {
          newPassword: form.newPassword,
          mustChangePassword: form.mustChangePassword,
        });
        toast.success("已重設密碼");
      }
      closeDialog();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "使用者操作失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleUserAction = useCallback(async (
    action: () => Promise<MembershipUser | { deleted: boolean }>,
    message: string,
  ) => {
    try {
      await action();
      toast.success(message);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "使用者操作失敗");
    }
  }, [loadUsers]);

  async function confirmDeleteUser() {
    if (!pendingDeleteUser || isDeletingUser) return;
    try {
      setIsDeletingUser(true);
      await deleteMembershipUser(pendingDeleteUser.id);
      toast.success("已刪除帳號");
      setPendingDeleteUser(null);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除帳號失敗");
    } finally {
      setIsDeletingUser(false);
    }
  }

  async function handleRequestEmailVerification() {
    try {
      const result = await requestMembershipEmailVerification();
      if (result.verificationToken) {
        // NOTE: 目前尚未串接實際寄信，所以暫時用 toast 顯示 verification token 供開發測試。
        // 正式產品應改為寄送 Email 驗證連結，不應在 UI 直接露出 token。
        toast.success(`Email 驗證 token：${result.verificationToken}`);
      } else {
        toast.success("已建立 Email 驗證請求");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email 驗證請求失敗");
    }
  }

  const columns: GridColDef<MembershipUser>[] = [
      {
        field: "displayName",
        headerName: "使用者",
        minWidth: 230,
        flex: 1.1,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full min-w-0 flex-col justify-center py-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {params.row.displayName}
            </div>
            <div className="truncate text-xs text-slate-500">
              {params.row.username}
            </div>
          </div>
        ),
      },
      {
        field: "email",
        headerName: "Email",
        minWidth: 230,
        flex: 1,
      },
      {
        field: "organizationName",
        headerName: "所屬組織",
        minWidth: 150,
        flex: 0.7,
        valueGetter: (_, row) => row.departmentName || row.departmentId || row.organizationName || row.organizationId || "-",
      },
      {
        field: "positionName",
        headerName: "職位",
        minWidth: 130,
        flex: 0.55,
        valueGetter: (_, row) => row.positionName || "-",
      },
      {
        field: "managerDisplayName",
        headerName: "主管",
        minWidth: 140,
        flex: 0.6,
        valueGetter: (_, row) => row.managerDisplayName || "-",
      },
      {
        field: "status",
        headerName: "帳號狀態",
        minWidth: 110,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center">
            <MembershipStatusChip status={params.row.status} />
          </div>
        ),
      },
      {
        field: "lockedUntil",
        headerName: "鎖定",
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center">
            <Chip
              label={params.row.lockedUntil ? "已鎖定" : "未鎖定"}
              size="small"
              sx={{
                borderRadius: "999px",
                fontWeight: 700,
                color: params.row.lockedUntil ? "#92400e" : "#075985",
                backgroundColor: params.row.lockedUntil ? "#fef3c7" : "#e0f2fe",
              }}
            />
          </div>
        ),
      },
      {
        field: "updatedAt",
        headerName: "更新時間",
        minWidth: 180,
        flex: 0.8,
        valueGetter: (_, row) => formatDateTime(row.updatedAt),
      },
      {
        field: "actions",
        headerName: "操作",
        minWidth: 300,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<MembershipUser>) => (
          <div className="flex h-full items-center gap-1.5">
            {canWriteUsers ? (
              <>
                <IconAction title="編輯" onClick={() => void openUserDialog("edit", params.row)}>
                  <Pencil className="h-4 w-4" />
                </IconAction>
                <IconAction title="個人資料" onClick={() => void openUserDialog("profile", params.row)}>
                  <UserCog className="h-4 w-4" />
                </IconAction>
                <IconAction title="修改密碼" onClick={() => void openUserDialog("changePassword", params.row)}>
                  <KeyRound className="h-4 w-4" />
                </IconAction>
                <IconAction title="管理員重設密碼" onClick={() => void openUserDialog("resetPassword", params.row)}>
                  <RefreshCw className="h-4 w-4" />
                </IconAction>
              </>
            ) : null}
            {params.row.status === "ACTIVE" ? (
              canWriteUsers ? (
                <IconAction title="停用" onClick={() => handleUserAction(() => deactivateMembershipUser(params.row.id), "已停用帳號")}>
                  <Ban className="h-4 w-4" />
                </IconAction>
              ) : null
            ) : (
              canWriteUsers ? (
                <IconAction title="啟用" onClick={() => handleUserAction(() => activateMembershipUser(params.row.id), "已啟用帳號")}>
                  <CheckCircle2 className="h-4 w-4" />
                </IconAction>
              ) : null
            )}
            {params.row.lockedUntil ? (
              canWriteUsers ? (
                <IconAction title="解鎖" onClick={() => handleUserAction(() => unlockMembershipUser(params.row.id), "已解鎖帳號")}>
                  <Unlock className="h-4 w-4" />
                </IconAction>
              ) : null
            ) : (
              canWriteUsers ? (
                <IconAction title="鎖定" onClick={() => handleUserAction(() => lockMembershipUser(params.row.id), "已鎖定帳號")}>
                  <Lock className="h-4 w-4" />
                </IconAction>
              ) : null
            )}
            {canWriteUsers ? (
              <IconAction title="刪除" danger onClick={() => setPendingDeleteUser(params.row)}>
                <Trash2 className="h-4 w-4" />
              </IconAction>
            ) : null}
          </div>
        ),
      },
    ];

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="flex h-full min-h-0 flex-col gap-4 px-5 py-5 md:px-7">
        <section className="shrink-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#12344a]">會員帳號管理</h1>
              <p className="mt-1 text-sm text-[#5d7b90]">
                管理企業使用者帳號、狀態、鎖定與密碼維護。
                {authUser ? ` 目前登入：${authUser.displayName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadUsers()}>
                <RefreshCw className="h-4 w-4" />
                重新整理
              </Button>
              {/* TEMPORARY: 寄送 Email 驗證信尚未完成，此紅色標示為權宜處理，完成後移除。 */}
              <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleRequestEmailVerification}>
                <CheckCircle2 className="h-4 w-4" />
                Email 驗證(尚未完成)
              </Button>
              {canWriteUsers ? (
                <Button onClick={openCreateDialog} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
                  <Plus className="h-4 w-4" />
                  新增會員帳號
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
          <DataGrid
            rows={users}
            columns={columns}
            rowCount={rowCount}
            loading={isLoading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={(nextModel) => setPaginationModel((current) => ({ ...nextModel, page: nextModel.pageSize !== current.pageSize ? 0 : nextModel.page }))}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            getRowHeight={() => 64}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f4fafe",
                color: "#12344a",
                fontWeight: 700,
              },
              "& .MuiDataGrid-cell": {
                borderColor: "#e5eef5",
              },
            }}
          />
        </section>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col overflow-hidden border-[#d6e8f4] bg-white p-0">
          <DialogHeader className="shrink-0 border-b border-[#e5eef5] px-6 py-5">
            <DialogTitle>{dialogTitle(dialogMode)}</DialogTitle>
            <DialogDescription>
              {dialogDescription(dialogMode)}
            </DialogDescription>
          </DialogHeader>
          <form className="membership-user-form flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {dialogMode === "create" || dialogMode === "edit" ? (
                <UserFields
                  form={form}
                  setForm={setForm}
                  includePassword={dialogMode === "create"}
                  roles={roles}
                  departments={departments}
                  positions={positions}
                  includeRoles={dialogMode === "create" || dialogMode === "edit"}
                />
              ) : null}
              {dialogMode === "profile" ? (
                <ProfileFields form={form} setForm={setForm} />
              ) : null}
              {dialogMode === "changePassword" ? (
                <PasswordFields form={form} setForm={setForm} includeCurrentPassword />
              ) : null}
              {dialogMode === "resetPassword" ? (
                <PasswordFields form={form} setForm={setForm} includeMustChange />
              ) : null}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-[#e5eef5] bg-white px-6 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
              <Button type="button" variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
                儲存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={pendingDeleteUser !== null}
        title="確認刪除使用者"
        description={pendingDeleteUser ? <>確定要刪除「{pendingDeleteUser.displayName}（{pendingDeleteUser.username}）」嗎？此操作會採用軟刪除。</> : null}
        detail="刪除後，此帳號將無法登入，並不再顯示於使用者清單。"
        isDeleting={isDeletingUser}
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={() => void confirmDeleteUser()}
      />
    </main>
  );
}

function IconAction({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
          danger
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-[#d6e8f4] bg-[#f8fcff] text-[#235c7c] hover:bg-[#eef7fc]"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function UserFields({
  form,
  setForm,
  includePassword,
  roles,
  departments,
  positions,
  includeRoles,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  includePassword: boolean;
  roles: Role[];
  departments: OrganizationUnit[];
  positions: Position[];
  includeRoles: boolean;
}) {
  const organizationTreeItems = useMemo(() => buildOrganizationTreeItems(departments), [departments]);
  const selectedOrganization = departments.find((department) => department.id === form.departmentId) ?? null;
  const selectedOrganizationPath = useMemo(
    () => getOrganizationPathLabel(departments, form.departmentId),
    [departments, form.departmentId],
  );
  const [expandedOrganizationIds, setExpandedOrganizationIds] = useState<string[]>([]);

  useEffect(() => {
    const validIds = new Set(departments.map((department) => department.id));
    const rootIds = departments
      .filter((department) => !department.parentId || !validIds.has(department.parentId))
      .map((department) => department.id);
    const selectedPathIds = getOrganizationAncestorIds(departments, form.departmentId);
    setExpandedOrganizationIds((current) => [
      ...new Set([
        ...current.filter((id) => validIds.has(id)),
        ...rootIds,
        ...selectedPathIds,
      ]),
    ]);
  }, [departments, form.departmentId]);

  function handleDepartmentChange(departmentId: string) {
    setForm((current) => ({
      ...current,
      departmentId,
      organizationId: departmentId,
    }));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="帳號" required>
        <Input className="invalid:border-input invalid:ring-0" value={form.username} onChange={(event) => setFormValue(setForm, "username", event.target.value)} required minLength={3} />
      </Field>
      <Field label="姓名" required>
        <Input className="invalid:border-input invalid:ring-0" value={form.displayName} onChange={(event) => setFormValue(setForm, "displayName", event.target.value)} required />
      </Field>
      <Field label="Email" required>
        <Input className="invalid:border-input invalid:ring-0" type="email" value={form.email} onChange={(event) => setFormValue(setForm, "email", event.target.value)} required />
      </Field>
      <Field label="員工編號">
        <Input value={form.employeeNo} onChange={(event) => setFormValue(setForm, "employeeNo", event.target.value)} />
      </Field>
      <Field label="職位">
        <select
          value={form.positionId}
          onChange={(event) => setFormValue(setForm, "positionId", event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="">未指定職位</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.name}
            </option>
          ))}
        </select>
      </Field>
      <section className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
        <span>使用者部門</span>
        <div className="overflow-hidden rounded-md border border-input bg-white shadow-sm">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#e5eef5] bg-[#f8fcff] px-3 py-2">
            <span className="min-w-0 truncate text-sm font-normal text-slate-700">
              {selectedOrganization ? `已選擇：${selectedOrganizationPath}` : "尚未指定部門"}
            </span>
            {selectedOrganization ? (
              <button
                type="button"
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                onClick={() => handleDepartmentChange("")}
              >
                清除選擇
              </button>
            ) : null}
          </div>
          <div className="max-h-60 min-h-32 overflow-y-auto px-2 py-2">
            {organizationTreeItems.length > 0 ? (
              <RichTreeView
                aria-label="選擇使用者部門"
                items={organizationTreeItems}
                selectedItems={form.departmentId || null}
                expandedItems={expandedOrganizationIds}
                onExpandedItemsChange={(_, itemIds) => setExpandedOrganizationIds(itemIds)}
                onSelectedItemsChange={(_, itemId) => handleDepartmentChange(itemId ?? "")}
                expansionTrigger="iconContainer"
                itemChildrenIndentation={22}
                sx={{
                  "& .MuiTreeItem-content": {
                    borderRadius: "6px",
                    minHeight: 34,
                    paddingY: "3px",
                  },
                  "& .MuiTreeItem-content:hover": {
                    backgroundColor: "#eef7fc",
                  },
                  "& .MuiTreeItem-content.Mui-selected": {
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                  },
                  "& .MuiTreeItem-content.Mui-selected:hover": {
                    backgroundColor: "#c7d2fe",
                  },
                  "& .MuiTreeItem-label": {
                    fontSize: "0.875rem",
                  },
                }}
              />
            ) : (
              <div className="flex min-h-28 items-center justify-center text-sm font-normal text-slate-500">
                目前沒有可選擇的組織
              </div>
            )}
          </div>
        </div>
        <span className="text-xs font-normal leading-5 text-slate-500">
          主管會依此組織的主管設定自動帶入；本層未設定時會往上層組織尋找。
        </span>
      </section>
      <Field label="帳號狀態">
        <select
          value={form.status}
          onChange={(event) => setFormValue(setForm, "status", event.target.value as MembershipUserStatus)}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="ACTIVE">啟用</option>
          <option value="INACTIVE">停用</option>
        </select>
      </Field>
      <Field label="語系">
        <Input value={form.locale} onChange={(event) => setFormValue(setForm, "locale", event.target.value)} />
      </Field>
      <Field label="時區">
        <Input value={form.timezone} onChange={(event) => setFormValue(setForm, "timezone", event.target.value)} />
      </Field>
      {includePassword ? (
        <Field label="初始密碼" required>
          <Input className="invalid:border-input invalid:ring-0" type="password" value={form.password} onChange={(event) => setFormValue(setForm, "password", event.target.value)} minLength={8} required />
        </Field>
      ) : null}
      {includeRoles ? (
        <section className="grid gap-2 md:col-span-2">
          <div className="text-sm font-medium text-slate-700">角色</div>
          <div className="grid gap-2 rounded-md border border-[#d6e8f4] bg-[#f8fcff] p-3 md:grid-cols-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.roleIds.includes(role.id)}
                  onChange={(event) => toggleRole(setForm, role.id, event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">{role.name}</span>
                  <span className="block break-all text-xs text-slate-500">{role.code}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}
      <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.mustChangePassword}
          onChange={(event) => setFormValue(setForm, "mustChangePassword", event.target.checked)}
        />
        下次登入需變更密碼
      </label>
    </div>
  );
}

function ProfileFields({
  form,
  setForm,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="姓名">
        <Input value={form.displayName} onChange={(event) => setFormValue(setForm, "displayName", event.target.value)} required />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(event) => setFormValue(setForm, "email", event.target.value)} required />
      </Field>
      <Field label="語系">
        <Input value={form.locale} onChange={(event) => setFormValue(setForm, "locale", event.target.value)} />
      </Field>
      <Field label="時區">
        <Input value={form.timezone} onChange={(event) => setFormValue(setForm, "timezone", event.target.value)} />
      </Field>
    </div>
  );
}

function PasswordFields({
  form,
  setForm,
  includeCurrentPassword,
  includeMustChange,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  includeCurrentPassword?: boolean;
  includeMustChange?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {includeCurrentPassword ? (
        <Field label="目前密碼">
          <Input type="password" value={form.currentPassword} onChange={(event) => setFormValue(setForm, "currentPassword", event.target.value)} required />
        </Field>
      ) : null}
      <Field label="新密碼">
        <Input type="password" value={form.newPassword} onChange={(event) => setFormValue(setForm, "newPassword", event.target.value)} required minLength={8} />
      </Field>
      {includeMustChange ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.mustChangePassword}
            onChange={(event) => setFormValue(setForm, "mustChangePassword", event.target.checked)}
          />
          下次登入需變更密碼
        </label>
      ) : null}
    </div>
  );
}

function Field({ label, hint, required = false, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="ml-1 text-red-600" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

type OrganizationTreeItem = {
  id: string;
  label: string;
  children: OrganizationTreeItem[];
};

function buildOrganizationTreeItems(units: OrganizationUnit[]): OrganizationTreeItem[] {
  const itemsById = new Map<string, OrganizationTreeItem>();

  units.forEach((unit) => {
    itemsById.set(unit.id, {
      id: unit.id,
      label: unit.name,
      children: [],
    });
  });

  const roots: OrganizationTreeItem[] = [];
  units.forEach((unit) => {
    const item = itemsById.get(unit.id);
    if (!item) return;
    const parent = unit.parentId ? itemsById.get(unit.parentId) : null;
    if (parent && parent !== item) parent.children.push(item);
    else roots.push(item);
  });

  const sortItems = (items: OrganizationTreeItem[]) => {
    items.sort((left, right) => left.label.localeCompare(right.label, "zh-TW"));
    items.forEach((item) => sortItems(item.children));
  };
  sortItems(roots);
  return roots;
}

function getOrganizationAncestorIds(units: OrganizationUnit[], organizationId: string): string[] {
  if (!organizationId) return [];
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const ancestorIds: string[] = [];
  const visited = new Set<string>();
  let current = unitsById.get(organizationId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (!current.parentId) break;
    ancestorIds.push(current.parentId);
    current = unitsById.get(current.parentId);
  }
  return ancestorIds;
}

function getOrganizationPathLabel(units: OrganizationUnit[], organizationId: string): string {
  if (!organizationId) return "";
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const labels: string[] = [];
  const visited = new Set<string>();
  let current = unitsById.get(organizationId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    labels.unshift(current.name);
    current = current.parentId ? unitsById.get(current.parentId) : undefined;
  }
  return labels.join(" / ");
}

function setFormValue<Key extends keyof UserFormState>(
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>,
  key: Key,
  value: UserFormState[Key],
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function toggleRole(
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>,
  roleId: string,
  checked: boolean,
) {
  setForm((current) => {
    const roleIds = new Set(current.roleIds);
    if (checked) roleIds.add(roleId);
    else roleIds.delete(roleId);
    return { ...current, roleIds: Array.from(roleIds) };
  });
}

function dialogTitle(mode: UserDialogMode | null) {
  switch (mode) {
    case "create":
      return "新增會員帳號";
    case "edit":
      return "修改帳號資料";
    case "profile":
      return "修改個人資料";
    case "changePassword":
      return "修改密碼";
    case "resetPassword":
      return "管理員重設密碼";
    default:
      return "使用者維護";
  }
}

function dialogDescription(mode: UserDialogMode | null) {
  switch (mode) {
    case "create":
      return "建立企業會員帳號並設定初始密碼。";
    case "edit":
      return "更新帳號主檔、組織與啟用狀態。";
    case "profile":
      return "更新姓名、Email、語系與時區。";
    case "changePassword":
      return "使用目前密碼驗證後變更密碼。";
    case "resetPassword":
      return "由管理員直接設定新密碼並可要求使用者下次登入變更。";
    default:
      return "";
  }
}
