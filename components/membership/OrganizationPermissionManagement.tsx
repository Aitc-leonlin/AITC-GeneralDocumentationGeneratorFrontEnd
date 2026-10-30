"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import {
  GitBranch,
  Pencil,
  Plus,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import { fetchMembershipUsers, type MembershipUser } from "@/services/api/membershipUsersApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import {
  createOrganizationUnit,
  createPosition,
  deleteOrganizationUnit,
  deletePosition,
  fetchOrganizationTree,
  fetchOrganizationUnits,
  fetchPositions,
  updateOrganizationUnit,
  updatePosition,
  type OrganizationUnit,
  type OrganizationUnitPayload,
  type OrganizationUnitType,
  type Position,
  type PositionPayload,
  type Status,
} from "@/services/api/membershipOrganizationApi";
import { cn } from "@/utils/cn";

type TabKey = "tree" | "positions";
type DialogMode = "unit" | "position";

const TABS: Array<{ key: TabKey; label: string; icon: typeof GitBranch }> = [
  { key: "tree", label: "組織樹", icon: GitBranch },
  { key: "positions", label: "職位", icon: UserRoundCog },
];

const UNIT_EMPTY: OrganizationUnitPayload = {
  code: "",
  name: "",
  unitType: "DEPARTMENT",
  parentId: null,
  companyId: null,
  managerUserId: null,
  description: "",
  status: "ACTIVE",
};

const POSITION_EMPTY: PositionPayload = {
  name: "",
  description: "",
  level: 0,
  status: "ACTIVE",
};

export default function OrganizationPermissionManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission(MODULE_PERMISSIONS.organizationScopeView);
  const canAdd = hasPermission(MODULE_PERMISSIONS.organizationScopeAdd);
  const canEdit = hasPermission(MODULE_PERMISSIONS.organizationScopeEdit);
  const canDelete = hasPermission(MODULE_PERMISSIONS.organizationScopeDelete);
  const [tab, setTab] = useState<TabKey>("tree");
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [tree, setTree] = useState<OrganizationUnit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnit | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<OrganizationUnit | null>(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);
  const [pendingDeletePosition, setPendingDeletePosition] = useState<Position | null>(null);
  const [isDeletingPosition, setIsDeletingPosition] = useState(false);
  const [unitForm, setUnitForm] = useState<OrganizationUnitPayload>(UNIT_EMPTY);
  const [positionForm, setPositionForm] = useState<PositionPayload>(POSITION_EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const flatTreeRows = useMemo(() => flattenTree(tree), [tree]);
  const pendingDeleteDescendants = useMemo(
    () => pendingDeleteUnit ? getDescendantUnits(units, pendingDeleteUnit.id) : [],
    [pendingDeleteUnit, units],
  );
  const availableParentUnits = useMemo(() => {
    if (!selectedUnit) return units;
    const unavailableIds = getOrganizationAndChildIds(units, selectedUnit.id);
    return units.filter((unit) => !unavailableIds.has(unit.id));
  }, [selectedUnit, units]);
  const unitManagerScopeId = selectedUnit?.id ?? unitForm.parentId ?? unitForm.companyId ?? "";
  const unitManagerUsers = useMemo(
    () => filterUsersByOrganization(users, units, unitManagerScopeId),
    [users, units, unitManagerScopeId],
  );
  const unitManagerUserIds = useMemo(() => new Set(unitManagerUsers.map((user) => user.id)), [unitManagerUsers]);
  const unitManagerValue = unitForm.managerUserId && unitManagerUserIds.has(unitForm.managerUserId)
    ? unitForm.managerUserId
    : "";

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      setIsLoading(true);
      const [
        unitRows,
        treeRows,
        positionRows,
        userRows,
      ] = await Promise.all([
        fetchOrganizationUnits(),
        fetchOrganizationTree(),
        fetchPositions(),
        fetchMembershipUsers({ page: 1, pageSize: 200 }),
      ]);
      setUnits(unitRows);
      setTree(treeRows);
      setPositions(positionRows);
      setUsers(userRows.users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取組織資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  function openUnit(unit?: OrganizationUnit) {
    if (unit && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!unit && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    setSelectedUnit(unit ?? null);
    setUnitForm(unit ? toUnitForm(unit) : UNIT_EMPTY);
    setFieldErrors({});
    setDialogMode("unit");
  }

  function openPosition(position?: Position) {
    if (position && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!position && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    setSelectedPosition(position ?? null);
    setPositionForm(position ? toPositionForm(position) : POSITION_EMPTY);
    setFieldErrors({});
    setDialogMode("position");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUnit(null);
    setSelectedPosition(null);
    setFieldErrors({});
  }

  function openDeleteUnit(unit: OrganizationUnit) {
    if (!canDelete) {
      toast.error("目前帳號沒有 organization-scope.delete 權限。");
      return;
    }
    setPendingDeleteUnit(unit);
  }

  async function confirmDeleteUnit() {
    if (!pendingDeleteUnit || isDeletingUnit) return;
    try {
      setIsDeletingUnit(true);
      const result = await deleteOrganizationUnit(pendingDeleteUnit.id);
      const detachedMessage = result.detachedUserCount > 0
        ? `，${result.detachedUserCount} 位使用者已解除組織歸屬`
        : "";
      toast.success(`已刪除 ${result.deletedCount} 個組織${detachedMessage}`);
      setPendingDeleteUnit(null);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除組織失敗");
    } finally {
      setIsDeletingUnit(false);
    }
  }

  function openDeletePosition(position: Position) {
    if (!canDelete) {
      toast.error("目前帳號沒有 organization-scope.delete 權限。");
      return;
    }
    setPendingDeletePosition(position);
  }

  async function confirmDeletePosition() {
    if (!pendingDeletePosition || isDeletingPosition) return;
    try {
      setIsDeletingPosition(true);
      await deletePosition(pendingDeletePosition.id);
      toast.success("已刪除職位");
      setPendingDeletePosition(null);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除職位失敗");
    } finally {
      setIsDeletingPosition(false);
    }
  }

  function updateUnitFormWithManagerScope(nextForm: OrganizationUnitPayload) {
    const nextScopeId = selectedUnit?.id ?? nextForm.parentId ?? nextForm.companyId ?? "";
    const nextManagerUsers = filterUsersByOrganization(users, units, nextScopeId);
    const isManagerInScope = !nextForm.managerUserId || nextManagerUsers.some((user) => user.id === nextForm.managerUserId);
    setUnitForm({
      ...nextForm,
      managerUserId: isManagerInScope ? nextForm.managerUserId : null,
    });
  }

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codeError = getOrganizationCodeError(unitForm.code);
    if (codeError) {
      setFieldErrors((current) => ({ ...current, unitCode: codeError }));
      toast.error(codeError);
      return;
    }
    if (selectedUnit && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!selectedUnit && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      const payload = {
        ...unitForm,
        code: unitForm.code.trim().toUpperCase(),
        managerUserId: unitManagerValue || null,
      };
      if (selectedUnit) await updateOrganizationUnit(selectedUnit.id, payload);
      else await createOrganizationUnit(payload);
      toast.success("已儲存組織單位");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存組織單位失敗");
    }
  }

  async function submitPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedPosition && !canEdit) {
      toast.error("目前帳號沒有 organization-scope.edit 權限。");
      return;
    }
    if (!selectedPosition && !canAdd) {
      toast.error("目前帳號沒有 organization-scope.add 權限。");
      return;
    }
    try {
      if (selectedPosition) await updatePosition(selectedPosition.id, positionForm);
      else await createPosition(positionForm);
      toast.success("已儲存職位");
      closeDialog();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存職位失敗");
    }
  }

  const unitColumns: GridColDef<OrganizationUnit>[] = [
    {
      field: "name",
      headerName: "組織名稱",
      minWidth: 220,
      flex: 1,
      renderCell: (params) => (
        <span style={{ paddingLeft: `${params.row.level * 18}px` }} className="font-medium text-slate-800">
          {params.row.name}
        </span>
      ),
    },
    { field: "code", headerName: "代碼", minWidth: 130 },
    { field: "unitType", headerName: "類型", minWidth: 120 },
    { field: "managerDisplayName", headerName: "組織主管", minWidth: 140, flex: 0.6 },
    { field: "path", headerName: "Path", minWidth: 220, flex: 1 },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<OrganizationUnit>) => (
        <div className="flex h-full items-center gap-1.5">
          {canEdit ? <IconButton title="編輯" onClick={() => openUnit(params.row)}><Pencil className="h-4 w-4" /></IconButton> : null}
          {canDelete ? <IconButton title="刪除" danger onClick={() => openDeleteUnit(params.row)}><Trash2 className="h-4 w-4" /></IconButton> : null}
        </div>
      ),
    },
  ];

  const positionColumns: GridColDef<Position>[] = [
    { field: "name", headerName: "職位名稱", minWidth: 180, flex: 1 },
    { field: "level", headerName: "職等", minWidth: 90 },
    { field: "status", headerName: "狀態", minWidth: 100, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
    {
      field: "actions",
      headerName: "操作",
      minWidth: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Position>) => (
        <div className="flex h-full items-center gap-1.5">
          {canEdit ? <IconButton title="編輯" onClick={() => openPosition(params.row)}><Pencil className="h-4 w-4" /></IconButton> : null}
          {canDelete ? <IconButton title="刪除" danger onClick={() => openDeletePosition(params.row)}><Trash2 className="h-4 w-4" /></IconButton> : null}
        </div>
      ),
    },
  ];

  if (isPermissionLoading) return null;

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">組織管理</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">管理 Company、Department、Team 與 Position；帳號所屬部門請至帳號管理設定。</p>
          </div>
          <Button variant="outline" onClick={() => void loadAll()}>重新整理</Button>
        </section>

        <section className="flex flex-wrap gap-2 border-b border-[#d6e8f4] pb-3">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium",
                  tab === item.key
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-[#c7dcea] bg-white text-[#34556b] hover:bg-indigo-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </section>

        <section className="min-h-0 overflow-hidden">
          {tab === "tree" ? (
            <Panel
              title="Organization Tree"
              action={canAdd ? <Button onClick={() => openUnit()} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增組織</Button> : null}
            >
              <DataGrid rows={flatTreeRows} columns={unitColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

          {tab === "positions" ? (
            <Panel
              title="Position"
              action={canAdd ? <Button onClick={() => openPosition()} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />新增職位</Button> : null}
            >
              <DataGrid rows={positions} columns={positionColumns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }} />
            </Panel>
          ) : null}

        </section>
      </div>

      <Dialog open={dialogMode === "unit"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selectedUnit ? "修改組織單位" : "新增組織單位"}</DialogTitle></DialogHeader>
          <form className="grid gap-x-5 gap-y-4 md:grid-cols-12 md:items-start" onSubmit={submitUnit}>
            <Field className="md:col-span-6" label="代碼" hint="請輸入兩碼英文字母；小寫會在儲存時自動轉成大寫。" error={fieldErrors.unitCode}>
              <Input
                value={unitForm.code}
                onChange={(event) => {
                  const code = event.target.value;
                  setUnitForm({ ...unitForm, code });
                  if (!getOrganizationCodeError(code)) {
                    setFieldErrors((current) => ({ ...current, unitCode: "" }));
                  }
                }}
                required
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                autoCapitalize="characters"
                className={cn(fieldErrors.unitCode ? "border-red-500 ring-1 ring-red-200 focus-visible:ring-red-500" : "")}
              />
            </Field>
            <Field className="md:col-span-6" label="名稱"><Input value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} required /></Field>
            <Field className="md:col-span-6" label="類型"><Select value={unitForm.unitType} onChange={(value) => setUnitForm({ ...unitForm, unitType: value as OrganizationUnitType })} options={[["COMPANY", "Company"], ["DEPARTMENT", "Department"], ["TEAM", "Team"]]} /></Field>
            <Field className="md:col-span-6" label="狀態"><StatusSelect value={unitForm.status} onChange={(status) => setUnitForm({ ...unitForm, status })} /></Field>
            <Field className="md:col-span-6" label="上層組織"><Select value={unitForm.parentId ?? ""} onChange={(value) => updateUnitFormWithManagerScope({ ...unitForm, parentId: value || null })} options={unitOptions(availableParentUnits, "不指定")} /></Field>
            <Field className="md:col-span-12" label="組織主管" hint={unitManagerScopeId ? "此主管會自動成為本組織成員的主管；下層組織未設定主管時也會自動沿用。" : "選定主管後，系統會依使用者所屬組織自動判定其主管。"}>
              <Select value={unitManagerValue} onChange={(value) => setUnitForm({ ...unitForm, managerUserId: value || null })} options={userOptions(unitManagerUsers, "不指定")} />
            </Field>
            <Field className="md:col-span-12" label="描述">
              <textarea
                className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
                value={unitForm.description}
                onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })}
              />
            </Field>
            <DialogActions onCancel={closeDialog} className="border-t pt-4 md:col-span-12" />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "position"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedPosition ? "修改職位" : "新增職位"}</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={submitPosition}>
            <Field label="名稱"><Input value={positionForm.name} onChange={(event) => setPositionForm({ ...positionForm, name: event.target.value })} required /></Field>
            <Field label="職等"><Input type="number" value={positionForm.level} onChange={(event) => setPositionForm({ ...positionForm, level: Number(event.target.value) })} /></Field>
            <Field label="狀態"><StatusSelect value={positionForm.status} onChange={(status) => setPositionForm({ ...positionForm, status })} /></Field>
            <Field label="描述"><Input value={positionForm.description} onChange={(event) => setPositionForm({ ...positionForm, description: event.target.value })} /></Field>
            <DialogActions onCancel={closeDialog} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteUnit !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingUnit) setPendingDeleteUnit(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>確認刪除組織</DialogTitle></DialogHeader>
          {pendingDeleteUnit ? (
            <div className="grid gap-4">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                確定要刪除「{pendingDeleteUnit.name}（{pendingDeleteUnit.code}）」嗎？此操作會採用軟刪除。
              </div>

              {pendingDeleteDescendants.length > 0 ? (
                <div className="grid gap-2">
                  <div className="text-sm font-semibold text-slate-800">
                    下列 {pendingDeleteDescendants.length} 個子組織也會一併刪除：
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                    <ul className="grid gap-1">
                      {pendingDeleteDescendants.map((unit) => (
                        <li key={unit.id} className="rounded bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                          <span className="font-medium">{unit.name}</span>
                          <span className="ml-2 text-xs text-slate-500">{unit.code} · {unit.path}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">此組織沒有有效的子組織。</p>
              )}

              <p className="text-xs leading-5 text-slate-500">
                屬於這些組織的使用者會改為未指定組織，相關的組織角色範圍也會解除。
              </p>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" disabled={isDeletingUnit} onClick={() => setPendingDeleteUnit(null)}>取消</Button>
                <Button type="button" variant="destructive" disabled={isDeletingUnit} onClick={() => void confirmDeleteUnit()}>
                  {isDeletingUnit ? "刪除中…" : pendingDeleteDescendants.length > 0 ? `刪除全部 ${pendingDeleteDescendants.length + 1} 個組織` : "確認刪除"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={pendingDeletePosition !== null}
        title="確認刪除職位"
        description={pendingDeletePosition ? <>確定要刪除職位「{pendingDeletePosition.name}」嗎？此操作會採用軟刪除。</> : null}
        detail="刪除後，此職位將不再顯示於職位清單，也無法再指派給使用者。"
        isDeleting={isDeletingPosition}
        onCancel={() => setPendingDeletePosition(null)}
        onConfirm={() => void confirmDeletePosition()}
      />

    </main>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-[#d6e8f4] bg-white">
      <div className="flex items-center justify-between border-b border-[#d6e8f4] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#12344a]">{title}</h2>
        {action}
      </div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("grid min-w-0 content-start gap-1.5 text-sm font-medium text-slate-700", className)}>
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal leading-5 text-red-600">{error}</span> : null}
      {hint ? <span className="text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function DialogActions({ onCancel, className }: { onCancel: () => void; className?: string }) {
  return (
    <div className={cn("flex justify-end gap-2", className)}>
      <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      <Button type="submit">儲存</Button>
    </div>
  );
}

function getOrganizationCodeError(code: string) {
  if (/^[A-Za-z]{2}$/.test(code.trim())) return "";
  return "組織代碼必須是兩碼英文字母。";
}

function Select({ value, onChange, options, required = false }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; required?: boolean }) {
  return (
    <select className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
      {options.map(([optionValue, label]) => <option key={`${optionValue}-${label}`} value={optionValue}>{label}</option>)}
    </select>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (status: Status) => void }) {
  return <Select value={value} onChange={(next) => onChange(next as Status)} options={[["ACTIVE", "啟用"], ["INACTIVE", "停用"]]} />;
}

function IconButton({ title, onClick, danger = false, children }: { title: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
          danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function AccessDenied() {
  return (
    <main className="grid h-full place-items-center bg-[#f8fcff] p-6">
      <div className="max-w-md rounded-lg border border-[#d6e8f4] bg-white p-6 text-center">
        <div className="text-lg font-semibold text-[#12344a]">沒有組織管理權限</div>
        <p className="mt-2 text-sm leading-6 text-[#5d7b90]">需要 organization-scope.view 權限才能檢視組織管理設定。</p>
      </div>
    </main>
  );
}

function unitOptions(units: OrganizationUnit[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...units.map((unit) => [unit.id, `${unit.name} (${unit.unitType})`] as [string, string])];
}

function userOptions(users: MembershipUser[], emptyLabel: string): Array<[string, string]> {
  return [["", emptyLabel], ...users.map((user) => [user.id, `${user.displayName} (${user.username})`] as [string, string])];
}

function filterUsersByOrganization(users: MembershipUser[], units: OrganizationUnit[], organizationId: string) {
  if (!organizationId) return users;
  const organizationIds = getOrganizationAndChildIds(units, organizationId);
  return users.filter((user) => {
    const departmentId = user.departmentId ?? user.organizationId;
    return departmentId ? organizationIds.has(departmentId) : false;
  });
}

function getOrganizationAndChildIds(units: OrganizationUnit[], organizationId: string) {
  const target = units.find((unit) => unit.id === organizationId);
  const ids = new Set<string>([organizationId]);
  if (!target) return ids;
  const pathPrefix = `${target.path}/`;
  units.forEach((unit) => {
    if (unit.id === organizationId || unit.path.startsWith(pathPrefix)) ids.add(unit.id);
  });
  return ids;
}

function getDescendantUnits(units: OrganizationUnit[], organizationId: string) {
  const descendants: OrganizationUnit[] = [];
  const collectChildren = (parentId: string) => {
    units
      .filter((unit) => unit.parentId === parentId)
      .sort((left, right) => left.name.localeCompare(right.name, "zh-TW"))
      .forEach((unit) => {
        descendants.push(unit);
        collectChildren(unit.id);
      });
  };
  collectChildren(organizationId);
  return descendants;
}

function flattenTree(units: OrganizationUnit[]): OrganizationUnit[] {
  return units.flatMap((unit) => [unit, ...flattenTree(unit.children ?? [])]);
}

function toUnitForm(unit: OrganizationUnit): OrganizationUnitPayload {
  return {
    code: unit.code,
    name: unit.name,
    unitType: unit.unitType,
    parentId: unit.parentId,
    companyId: unit.companyId,
    managerUserId: unit.managerUserId,
    description: unit.description,
    status: unit.status,
  };
}

function toPositionForm(position: Position): PositionPayload {
  return {
    name: position.name,
    description: position.description,
    level: position.level,
    status: position.status,
  };
}
