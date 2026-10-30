"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, type GridColDef, type GridRowSelectionModel } from "@mui/x-data-grid";
import { Crown, Minus, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MembershipStatusChip from "@/components/membership/MembershipStatusChip";
import {
  addMembershipGroupMembers,
  createMembershipGroup,
  deleteMembershipGroup,
  fetchGroupAvailableUsers,
  fetchMembershipGroup,
  fetchMembershipGroups,
  removeMembershipGroupMembers,
  updateMembershipGroup,
  type GroupAvailableUser,
  type GroupMember,
  type GroupPayload,
  type MembershipGroup,
} from "@/services/api/membershipGroupApi";

const EMPTY_GROUP: GroupPayload = {
  code: "",
  name: "",
  category: "GENERAL",
  description: "",
  masterUserId: null,
  status: "ACTIVE",
};

function normalizeGroupCode(code: string) {
  return code.trim().toUpperCase().replaceAll(" ", "_");
}

const DATA_GRID_PAGINATION_SLOT_PROPS = {
  basePagination: {
    material: {
      slotProps: {
        select: { native: true },
      },
    },
  },
};

export default function GroupManagement() {
  const [groups, setGroups] = useState<MembershipGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MembershipGroup | null>(null);
  const [availableUsers, setAvailableUsers] = useState<GroupAvailableUser[]>([]);
  const [canCreateGroup, setCanCreateGroup] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MembershipGroup | null>(null);
  const [groupForm, setGroupForm] = useState<GroupPayload>(EMPTY_GROUP);
  const [draftMembers, setDraftMembers] = useState<GroupMember[]>([]);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [memberOverviewOpen, setMemberOverviewOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedExistingMemberIds, setSelectedExistingMemberIds] = useState<Set<string>>(new Set());
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<MembershipGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const savedEditorScrollTopRef = useRef(0);

  useEffect(() => {
    void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGroups(nextSelectedId?: string) {
    try {
      setIsLoading(true);
      const result = await fetchMembershipGroups({ keyword, status: statusFilter });
      setGroups(result.groups);
      setCanCreateGroup(result.canCreateGroup);
      const selectedId = nextSelectedId ?? selectedGroup?.id;
      if (selectedId && result.groups.some((group) => group.id === selectedId)) {
        await selectGroup(selectedId);
      } else if (selectedGroup && !result.groups.some((group) => group.id === selectedGroup.id)) {
        setSelectedGroup(null);
      }
      if (result.canCreateGroup || result.groups.some((group) => group.canManageMembers)) {
        await loadAvailableUsers();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取群組失敗");
    } finally {
      setIsLoading(false);
    }
  }

  async function selectGroup(groupId: string, openMemberOverview = false) {
    try {
      const group = await fetchMembershipGroup(groupId);
      setSelectedGroup(group);
      if (openMemberOverview) setMemberOverviewOpen(true);
      if (group.canManageMembers && availableUsers.length === 0) {
        await loadAvailableUsers();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取群組內容失敗");
    }
  }

  async function loadAvailableUsers() {
    try {
      setAvailableUsers(await fetchGroupAvailableUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取可選會員失敗");
    }
  }

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP);
    setDraftMembers([]);
    setGroupDialogOpen(true);
  }

  async function openEditGroup(group: MembershipGroup) {
    try {
      const detail = await fetchMembershipGroup(group.id);
      setSelectedGroup(detail);
      setEditingGroup(detail);
      setGroupForm({
        code: detail.code,
        name: detail.name,
        category: detail.category,
        description: detail.description,
        masterUserId: detail.masterUserId,
        status: detail.status,
      });
      setDraftMembers(detail.members);
      if (detail.canManageMembers) await loadAvailableUsers();
      setSelectedExistingMemberIds(new Set());
      setGroupDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取群組內容失敗");
    }
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingGroup) {
      setSaveConfirmationOpen(true);
      return;
    }
    try {
      setIsSavingGroup(true);
      const normalizedForm = { ...groupForm, code: normalizeGroupCode(groupForm.code) };
      const existingGroups = await fetchMembershipGroups();
      if (existingGroups.groups.some((group) => normalizeGroupCode(group.code) === normalizedForm.code)) {
        setGroupForm(normalizedForm);
        toast.error(`群組代碼「${normalizedForm.code}」已存在，請使用其他代碼。`);
        return;
      }
      const saved = await createMembershipGroup(normalizedForm);
      toast.success("群組已新增");
      setGroupDialogOpen(false);
      await loadGroups(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存群組失敗");
    } finally {
      setIsSavingGroup(false);
    }
  }

  async function confirmSaveGroup() {
    if (!editingGroup) return;
    try {
      setIsSavingGroup(true);
      let updated = await updateMembershipGroup(editingGroup.id, groupForm);
      const addedUserIds = pendingAddedMembers.map((member) => member.userId);
      const removedUserIds = pendingRemovedMembers.map((member) => member.userId);
      if (addedUserIds.length > 0) {
        updated = await addMembershipGroupMembers(editingGroup.id, addedUserIds);
      }
      if (removedUserIds.length > 0) {
        updated = await removeMembershipGroupMembers(editingGroup.id, removedUserIds);
      }
      toast.success("群組與成員異動已儲存");
      setSaveConfirmationOpen(false);
      setGroupDialogOpen(false);
      setSelectedExistingMemberIds(new Set());
      await loadGroups(updated.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存群組失敗");
    } finally {
      setIsSavingGroup(false);
    }
  }

  function returnToGroupEditor() {
    if (isSavingGroup) return;
    setSaveConfirmationOpen(false);
  }

  function openDeleteGroup(group: MembershipGroup) {
    setPendingDeleteGroup(group);
  }

  async function confirmDeleteGroup() {
    if (!pendingDeleteGroup || isDeletingGroup) return;
    try {
      setIsDeletingGroup(true);
      await deleteMembershipGroup(pendingDeleteGroup.id);
      toast.success("群組已刪除");
      setSelectedGroup(null);
      setPendingDeleteGroup(null);
      await loadGroups();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除群組失敗");
    } finally {
      setIsDeletingGroup(false);
    }
  }

  async function openMemberDialog() {
    try {
      savedEditorScrollTopRef.current = editorScrollRef.current?.scrollTop ?? 0;
      setMemberOverviewOpen(false);
      setMemberSearch("");
      setSelectedMemberIds(new Set());
      setMemberDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取可選會員失敗");
    }
  }

  function addSelectedMembers() {
    if (selectedMemberIds.size === 0) return;
    const selectedUsers = availableUsers.filter((user) => selectedMemberIds.has(user.id));
    setDraftMembers((current) => {
      const existingIds = new Set(current.map((member) => member.userId));
      return [
        ...current,
        ...selectedUsers
          .filter((user) => !existingIds.has(user.id))
          .map((user) => availableUserToDraftMember(user, groupForm.masterUserId)),
      ];
    });
    closeMemberDialog();
    setSelectedMemberIds(new Set());
    toast.success(`已暫存加入 ${selectedUsers.length} 位群組成員，儲存後才會更新`);
  }

  function closeMemberDialog() {
    setMemberDialogOpen(false);
    window.requestAnimationFrame(() => {
      if (editorScrollRef.current) {
        editorScrollRef.current.scrollTop = savedEditorScrollTopRef.current;
      }
    });
  }

  function removeMember(userId: string) {
    if (groupForm.masterUserId === userId) return;
    setDraftMembers((current) => current.filter((member) => member.userId !== userId));
    setSelectedExistingMemberIds((current) => {
      const next = new Set(current);
      next.delete(userId);
      return next;
    });
  }

  function removeSelectedMembers() {
    if (selectedExistingMemberIds.size === 0) return;
    setDraftMembers((current) => current.filter((member) => !selectedExistingMemberIds.has(member.userId)));
    setSelectedExistingMemberIds(new Set());
  }

  const addableUsers = useMemo(() => {
    const memberIds = new Set(draftMembers.map((member) => member.userId));
    return availableUsers.filter((user) => !memberIds.has(user.id));
  }, [availableUsers, draftMembers]);

  const displayedDraftMembers = useMemo(
    () => draftMembers.map((member) => ({ ...member, isMaster: member.userId === groupForm.masterUserId })),
    [draftMembers, groupForm.masterUserId],
  );

  const pendingAddedMembers = useMemo(() => {
    const originalIds = new Set(editingGroup?.members.map((member) => member.userId) ?? []);
    return displayedDraftMembers.filter((member) => !originalIds.has(member.userId));
  }, [displayedDraftMembers, editingGroup]);

  const pendingRemovedMembers = useMemo(() => {
    const draftIds = new Set(displayedDraftMembers.map((member) => member.userId));
    return (editingGroup?.members ?? []).filter((member) => !draftIds.has(member.userId));
  }, [displayedDraftMembers, editingGroup]);

  function changeMasterUser(masterUserId: string | null) {
    setGroupForm((current) => ({ ...current, masterUserId }));
    if (!masterUserId || draftMembers.some((member) => member.userId === masterUserId)) return;
    const user = availableUsers.find((candidate) => candidate.id === masterUserId);
    if (user) setDraftMembers((current) => [...current, availableUserToDraftMember(user, masterUserId)]);
  }

  const filteredAddableUsers = useMemo(() => {
    const normalizedKeyword = memberSearch.trim().toLowerCase();
    if (!normalizedKeyword) return addableUsers;
    return addableUsers.filter((user) =>
      [user.displayName, user.username, user.email]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [addableUsers, memberSearch]);

  const totalMembers = groups.reduce((total, group) => total + group.memberCount, 0);
  const activeGroups = groups.filter((group) => group.status === "ACTIVE").length;

  const groupColumns: GridColDef<MembershipGroup>[] = [
    { field: "name", headerName: "群組名稱", minWidth: 180, flex: 0.9 },
    { field: "code", headerName: "群組代碼", minWidth: 180, flex: 0.8 },
    { field: "category", headerName: "用途分類", minWidth: 140, flex: 0.65 },
    {
      field: "masterDisplayName",
      headerName: "MASTER",
      minWidth: 160,
      flex: 0.75,
      valueGetter: (_, row) => row.masterDisplayName || row.masterUsername || "未指定",
    },
    {
      field: "memberCount",
      headerName: "成員數",
      width: 95,
      type: "number",
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <button
          type="button"
          className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900"
          aria-label={`檢視 ${params.row.name} 的 ${params.row.memberCount} 位組員`}
          onClick={(event) => {
            event.stopPropagation();
            void selectGroup(params.row.id, true);
          }}
        >
          {params.row.memberCount}
        </button>
      ),
    },
    {
      field: "status",
      headerName: "狀態",
      width: 100,
      renderCell: (params) => (
        <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div>
      ),
    },
    {
      field: "actions",
      headerName: "操作",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex h-full items-center gap-1">
          {params.row.canEditGroup ? (
            <>
              <Button type="button" variant="ghost" size="icon" aria-label={`編輯 ${params.row.name}`} onClick={(event) => { event.stopPropagation(); void openEditGroup(params.row); }}><Pencil className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="text-rose-600" aria-label={`刪除 ${params.row.name}`} onClick={(event) => { event.stopPropagation(); openDeleteGroup(params.row); }}><Trash2 className="h-4 w-4" /></Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const memberColumns: GridColDef<GroupMember>[] = [
    {
      field: "displayName",
      headerName: "姓名",
      minWidth: 170,
      flex: 0.8,
      renderCell: (params) => (
        <span className="inline-flex items-center gap-2">
          {params.row.displayName || params.row.username}
          {params.row.isMaster ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">MASTER</span> : null}
        </span>
      ),
    },
    { field: "username", headerName: "帳號", minWidth: 160, flex: 0.7 },
    { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
    { field: "status", headerName: "帳號狀態", minWidth: 110, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
    {
      field: "actions",
      headerName: "操作",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        selectedGroup?.canManageMembers && !params.row.isMaster ? (
          <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => removeMember(params.row.userId)}>移除</Button>
        ) : null,
    },
  ];

  const availableUserColumns: GridColDef<GroupAvailableUser>[] = [
    { field: "displayName", headerName: "姓名", minWidth: 170, flex: 0.8 },
    { field: "username", headerName: "帳號", minWidth: 180, flex: 0.8 },
    { field: "email", headerName: "Email", minWidth: 240, flex: 1 },
    { field: "status", headerName: "帳號狀態", minWidth: 110, renderCell: (params) => <div className="flex h-full items-center"><MembershipStatusChip status={params.row.status} /></div> },
  ];

  const readOnlyMemberColumns = memberColumns.filter((column) => column.field !== "actions");

  return (
    <main className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Membership Groups</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">群組管理總覽</h1>
            <p className="mt-1 text-sm text-slate-600">集中檢視專項群組、MASTER 與成員配置。</p>
          </div>
          {canCreateGroup ? (
            <Button id="group-create-button" type="button" onClick={openCreateGroup}><Plus className="h-4 w-4" />新增群組</Button>
          ) : null}
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <OverviewCard label="群組總數" value={groups.length} />
          <OverviewCard label="啟用群組" value={activeGroups} />
          <OverviewCard label="成員配置總數" value={totalMembers} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <Input id="group-search-input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜尋群組名稱、代碼、用途或說明" />
            <select id="group-status-filter" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部狀態</option><option value="ACTIVE">啟用</option><option value="INACTIVE">停用</option>
            </select>
            <Button type="button" variant="outline" onClick={() => void loadGroups()} disabled={isLoading}>查詢</Button>
          </div>
          <div className="mt-4 h-[440px] w-full">
            <DataGrid
              rows={groups}
              columns={groupColumns}
              loading={isLoading}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 20, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              slotProps={DATA_GRID_PAGINATION_SLOT_PROPS}
              localeText={{ noRowsLabel: "尚未建立群組" }}
            />
          </div>
        </section>

      </div>

      <Dialog open={memberOverviewOpen} onOpenChange={setMemberOverviewOpen}>
        <DialogContent className="h-[82vh] max-w-5xl overflow-hidden p-0">
          {selectedGroup ? (
            <div className="flex h-full min-h-0 flex-col">
              <DialogHeader className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <DialogTitle>{selectedGroup.name}－組員清單</DialogTitle>
                    <DialogDescription className="mt-1">{selectedGroup.code}｜{selectedGroup.category}｜共 {selectedGroup.members.length} 位組員</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <p className="text-sm text-slate-600">{selectedGroup.description || "尚未填寫群組說明。"}</p>
                <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900"><Crown className="h-4 w-4" />MASTER：{selectedGroup.masterDisplayName || selectedGroup.masterUsername || "未指定"}</div>
              </div>
              <div className="min-h-0 flex-1 px-6 py-4">
                <DataGrid rows={selectedGroup.members} columns={readOnlyMemberColumns} disableRowSelectionOnClick pageSizeOptions={[10, 20, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }} slotProps={DATA_GRID_PAGINATION_SLOT_PROPS} localeText={{ noRowsLabel: "此群組尚無組員" }} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteGroup !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingGroup) setPendingDeleteGroup(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>確認刪除群組</DialogTitle></DialogHeader>
          {pendingDeleteGroup ? (
            <div className="grid gap-4">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                確定要刪除群組「{pendingDeleteGroup.name}（{pendingDeleteGroup.code}）」嗎？此操作會採用軟刪除。
              </div>
              <p className="text-sm leading-6 text-slate-600">
                群組刪除後，現有組員關聯也會一併停用，使用者將無法再檢視或管理此群組。
              </p>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeletingGroup}
                  onClick={() => setPendingDeleteGroup(null)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeletingGroup}
                  onClick={() => void confirmDeleteGroup()}
                >
                  {isDeletingGroup ? "刪除中…" : "確認刪除"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupDialogOpen}
        onOpenChange={(open) => {
          if (!open && (saveConfirmationOpen || memberDialogOpen)) return;
          setGroupDialogOpen(open);
        }}
      >
        <DialogContent
          className={editingGroup ? "h-[90vh] max-w-5xl overflow-hidden p-0" : "sm:max-w-xl"}
          hideCloseButton={saveConfirmationOpen || memberDialogOpen}
          onInteractOutside={(event) => {
            if (saveConfirmationOpen || memberDialogOpen) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (!saveConfirmationOpen && !memberDialogOpen) return;
            event.preventDefault();
            if (memberDialogOpen) closeMemberDialog();
            else returnToGroupEditor();
          }}
        >
          <form className={editingGroup ? "flex h-full min-h-0 flex-col" : "grid gap-4"} onSubmit={saveGroup} aria-hidden={saveConfirmationOpen || memberDialogOpen} inert={saveConfirmationOpen || memberDialogOpen ? true : undefined}>
            <DialogHeader className={editingGroup ? "shrink-0 border-b border-slate-200 px-6 py-5" : ""}>
              <DialogTitle>{editingGroup ? "編輯群組" : "新增群組"}</DialogTitle>
              {editingGroup ? <DialogDescription>編輯群組資料，並在同一視窗檢視及管理目前組員。</DialogDescription> : null}
            </DialogHeader>
            <div ref={editingGroup ? editorScrollRef : undefined} className={editingGroup ? "min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5" : "grid gap-4"}>
              <div className={editingGroup ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
                <label className="grid gap-1.5 text-sm font-medium">群組代碼<Input id="group-code-input" value={groupForm.code} onChange={(event) => setGroupForm({ ...groupForm, code: event.target.value })} placeholder="例如：CREDIT_REVIEW_TEAM" required /></label>
                <label className="grid gap-1.5 text-sm font-medium">群組名稱<Input id="group-name-input" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="例如：徵審團隊" required /></label>
                <label className="grid gap-1.5 text-sm font-medium">群組用途<Input id="group-category-input" value={groupForm.category} onChange={(event) => setGroupForm({ ...groupForm, category: event.target.value })} placeholder="例如：徵審流程" /></label>
                <label className="grid gap-1.5 text-sm font-medium">群組 MASTER
                  <select id="group-master-select" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={groupForm.masterUserId ?? ""} onChange={(event) => changeMasterUser(event.target.value || null)}>
                    <option value="">尚未指定</option>
                    {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.username}（{user.username}）{user.status === "INACTIVE" ? "－停用" : ""}</option>)}
                  </select>
                </label>
                <label className={editingGroup ? "grid gap-1.5 text-sm font-medium md:col-span-2" : "grid gap-1.5 text-sm font-medium"}>群組說明<textarea id="group-description-input" className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} /></label>
                <label className="grid gap-1.5 text-sm font-medium">狀態
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={groupForm.status} onChange={(event) => setGroupForm({ ...groupForm, status: event.target.value as GroupPayload["status"] })}><option value="ACTIVE">啟用</option><option value="INACTIVE">停用</option></select>
                </label>
              </div>
              {editingGroup ? (
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">目前組員</h3>
                      <p className="mt-1 text-sm text-slate-500">共 {displayedDraftMembers.length} 位，已選取 {selectedExistingMemberIds.size} 位；目前僅暫存於畫面，MASTER 不可移除。</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button id="group-member-batch-remove-button" type="button" variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={selectedExistingMemberIds.size === 0} onClick={removeSelectedMembers}><Trash2 className="h-4 w-4" />批次移除（{selectedExistingMemberIds.size}）</Button>
                      <Button id="group-member-add-button" type="button" size="sm" onClick={() => void openMemberDialog()}><UserPlus className="h-4 w-4" />新增組員</Button>
                    </div>
                  </div>
                  <div className="h-[300px] w-full bg-white">
                    <DataGrid
                      rows={displayedDraftMembers}
                      columns={memberColumns}
                      getRowId={(row) => row.userId}
                      checkboxSelection
                      disableRowSelectionOnClick
                      isRowSelectable={(params) => !params.row.isMaster}
                      rowSelectionModel={{ type: "include", ids: selectedExistingMemberIds }}
                      onRowSelectionModelChange={(model) => setSelectedExistingMemberIds(resolveSelectedRowIds(model, displayedDraftMembers.filter((member) => !member.isMaster).map((member) => member.userId)))}
                      pageSizeOptions={[10, 20, 50]}
                      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                      slotProps={DATA_GRID_PAGINATION_SLOT_PROPS}
                      localeText={{ noRowsLabel: "此群組尚無組員" }}
                    />
                  </div>
                </section>
              ) : null}
            </div>
            <div className={editingGroup ? "flex shrink-0 justify-end gap-2 border-t border-slate-200 px-6 py-4" : "flex justify-end gap-2"}><Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)} disabled={isSavingGroup}>取消</Button><Button id="group-save-button" type="submit" disabled={isSavingGroup}>{isSavingGroup ? "儲存中…" : "儲存"}</Button></div>
          </form>

          {memberDialogOpen ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
              <section className="flex h-[82vh] max-h-full w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="group-member-dialog-title" aria-describedby="group-member-dialog-description">
                <div className="shrink-0 border-b border-slate-200 px-6 py-5">
                  <h2 id="group-member-dialog-title" className="text-lg font-semibold text-slate-950">批次加入群組成員</h2>
                  <p id="group-member-dialog-description" className="mt-1.5 text-sm text-slate-500">搜尋會員並勾選多筆；可點擊欄位標題進行排序。</p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Input id="group-member-search-input" className="sm:max-w-md" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="搜尋姓名、帳號或 Email" autoFocus />
                    <div className="text-sm text-slate-600">已選擇 {selectedMemberIds.size} 位，共 {filteredAddableUsers.length} 位可選</div>
                  </div>
                  <div className="min-h-0 flex-1">
                    <DataGrid
                      rows={filteredAddableUsers}
                      columns={availableUserColumns}
                      checkboxSelection
                      disableRowSelectionOnClick
                      rowSelectionModel={{ type: "include", ids: selectedMemberIds }}
                      onRowSelectionModelChange={(model) => setSelectedMemberIds(resolveSelectedRowIds(model, filteredAddableUsers.map((user) => user.id)))}
                      pageSizeOptions={[10, 20, 50, 100]}
                      initialState={{ pagination: { paginationModel: { pageSize: 20, page: 0 } } }}
                      slotProps={DATA_GRID_PAGINATION_SLOT_PROPS}
                      localeText={{ noRowsLabel: "沒有符合條件的可加入會員" }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
                  <Button type="button" variant="outline" onClick={closeMemberDialog}>取消</Button>
                  <Button id="group-member-save-button" type="button" onClick={addSelectedMembers} disabled={selectedMemberIds.size === 0}>加入暫存清單（{selectedMemberIds.size}）</Button>
                </div>
              </section>
            </div>
          ) : null}

          {saveConfirmationOpen ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
              <section className="grid max-h-[80vh] w-full max-w-xl gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="group-save-confirmation-title" aria-describedby="group-save-confirmation-description">
                <div>
                  <h2 id="group-save-confirmation-title" className="text-lg font-semibold text-slate-950">確認儲存群組異動</h2>
                  <p id="group-save-confirmation-description" className="mt-1.5 text-sm text-slate-500">確認後才會呼叫後端 API，更新群組資料與成員清單。</p>
                </div>
                <div className="max-h-[52vh] space-y-4 overflow-y-auto py-2">
                  <MemberChangeList title={`新增成員（${pendingAddedMembers.length}）`} members={pendingAddedMembers} type="add" />
                  <MemberChangeList title={`移除成員（${pendingRemovedMembers.length}）`} members={pendingRemovedMembers} type="remove" />
                  {pendingAddedMembers.length === 0 && pendingRemovedMembers.length === 0 ? (
                    <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">成員清單沒有異動，僅儲存群組基本資料。</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={returnToGroupEditor} disabled={isSavingGroup} autoFocus>返回修改</Button>
                  <Button id="group-save-confirm-button" type="button" onClick={() => void confirmSaveGroup()} disabled={isSavingGroup}>{isSavingGroup ? "儲存中…" : "確認儲存"}</Button>
                </div>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

    </main>
  );
}

function MemberChangeList({ title, members, type }: { title: string; members: GroupMember[]; type: "add" | "remove" }) {
  const isAdd = type === "add";
  return (
    <section>
      <h3 className={isAdd ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-rose-700"}>{title}</h3>
      {members.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {members.map((member) => (
            <li key={member.userId} className={isAdd ? "flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" : "flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"}>
              {isAdd ? <Plus className="h-4 w-4 shrink-0" /> : <Minus className="h-4 w-4 shrink-0" />}
              <span className="font-medium">{member.displayName || member.username}</span>
              <span className="opacity-75">（{member.username}）</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function availableUserToDraftMember(user: GroupAvailableUser, masterUserId: string | null): GroupMember {
  return {
    id: `pending-${user.id}`,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    isMaster: user.id === masterUserId,
    createdAt: "",
  };
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4 text-indigo-500" />{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function resolveSelectedRowIds(model: GridRowSelectionModel, rowIds: string[]) {
  const modelIds = new Set(Array.from(model.ids).map(String));
  if (model.type === "exclude") {
    return new Set(rowIds.filter((rowId) => !modelIds.has(rowId)));
  }
  return modelIds;
}
