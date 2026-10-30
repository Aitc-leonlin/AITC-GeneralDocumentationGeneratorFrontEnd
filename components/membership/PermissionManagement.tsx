"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ChevronDown, FolderKey, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchPermissionGroups,
  fetchPermissions,
  type Permission,
  type PermissionGroup,
} from "@/services/api/membershipRbacApi";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";
import { cn } from "@/utils/cn";

export default function PermissionManagement() {
  const { hasPermission, isLoading: isPermissionLoading } = useMembershipPermissions();
  const canRead = hasPermission(MODULE_PERMISSIONS.rbacView);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("__all__");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(["會員權限管理", "授信 AI 助理", "徵審報告產生器", "未分類"]),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [groupRows, permissionRows] = await Promise.all([
        fetchPermissionGroups(),
        fetchPermissions(),
      ]);
      setGroups(groupRows);
      setPermissions(permissionRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取權限資料失敗");
    } finally {
      setIsLoading(false);
    }
  }

  const groupSummaries = useMemo(() => {
    const knownGroupIds = new Set(groups.map((group) => group.id));
    const permissionMap = new Map<string, Permission[]>();
    permissions.forEach((permission) => {
      const key = permission.groupId && knownGroupIds.has(permission.groupId)
        ? permission.groupId
        : "__ungrouped__";
      permissionMap.set(key, [...(permissionMap.get(key) ?? []), permission]);
    });

    const groupedSections = groups.map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      description: group.description,
      moduleName: group.moduleName,
      permissions: permissionMap.get(group.id) ?? [],
    }));
    const ungroupedPermissions = permissionMap.get("__ungrouped__") ?? [];
    if (ungroupedPermissions.length === 0) return groupedSections;
    return [
      ...groupedSections,
      {
        id: "__ungrouped__",
        code: "UNGROUPED",
        name: "未分組權限",
        description: "尚未指定權限群組的系統功能權限。",
        moduleName: "",
        permissions: ungroupedPermissions,
      },
    ];
  }, [groups, permissions]);

  const selectedGroup = useMemo(
    () => groupSummaries.find((group) => group.id === selectedGroupId) ?? null,
    [groupSummaries, selectedGroupId],
  );

  const selectedPermissions = useMemo(() => {
    if (selectedGroupId === "__all__") return permissions;
    return selectedGroup?.permissions ?? [];
  }, [permissions, selectedGroup, selectedGroupId]);

  const moduleSections = useMemo(() => {
    const sectionMap = new Map<string, typeof groupSummaries>();
    groupSummaries.forEach((group) => {
      const moduleName = group.moduleName || "未分類";
      sectionMap.set(moduleName, [...(sectionMap.get(moduleName) ?? []), group]);
    });

    const preferredOrder = ["會員權限管理", "授信 AI 助理", "徵審報告產生器", "未分類"];
    return [...sectionMap.entries()]
      .map(([moduleName, sections]) => ({
        moduleName,
        sections,
        permissionCount: sections.reduce((total, section) => total + section.permissions.length, 0),
      }))
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a.moduleName);
        const bIndex = preferredOrder.indexOf(b.moduleName);
        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
        }
        return a.moduleName.localeCompare(b.moduleName, "zh-Hant");
      });
  }, [groupSummaries]);

  function toggleModule(moduleName: string) {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  }

  const permissionColumns: GridColDef<Permission>[] = [
      { field: "code", headerName: "權限代碼", minWidth: 190, flex: 0.8 },
      { field: "name", headerName: "權限名稱", minWidth: 170, flex: 0.8 },
      { field: "groupName", headerName: "群組", minWidth: 140, flex: 0.6 },
      { field: "action", headerName: "Action", minWidth: 100 },
  ];

  if (isPermissionLoading) return null;

  if (!canRead) {
    return <AccessDenied title="權限管理" />;
  }

  return (
    <main className="h-full overflow-hidden bg-[#f8fcff]">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 px-5 py-5 md:px-7">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12344a]">權限管理</h1>
            <p className="mt-1 text-sm text-[#5d7b90]">權限與權限群組由程式碼定義；角色實際授權存放於資料庫。</p>
          </div>
          <Button variant="outline" onClick={() => void loadData()}>重新整理</Button>
        </section>

        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <Panel
            title="權限群組"
            icon={<FolderKey className="h-4 w-4 text-indigo-600" />}
            action={<span className="text-xs text-slate-500">系統內建</span>}
          >
            <div className="h-full min-h-0 overflow-y-auto p-3">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId("__all__")}
	                  className={cn(
	                    "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left",
	                    selectedGroupId === "__all__"
	                      ? "border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200"
	                      : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/70",
	                  )}
	                >
	                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900">全部權限</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">顯示所有系統功能權限。</span>
                  </span>
	                  <span className="shrink-0 rounded bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">
	                    {permissions.length}
	                  </span>
                </button>
                {moduleSections.map((moduleSection) => {
                  const isExpanded = expandedModules.has(moduleSection.moduleName);
                  return (
                    <div key={moduleSection.moduleName} className="overflow-hidden rounded-md border border-indigo-200 bg-indigo-50/60">
                      <button
                        type="button"
                        onClick={() => toggleModule(moduleSection.moduleName)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-indigo-100/70"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-indigo-700 transition-transform",
                            isExpanded ? "rotate-180" : "",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-indigo-950">{moduleSection.moduleName}</span>
                          <span className="mt-0.5 block text-xs text-indigo-700">
                            {moduleSection.sections.length} 個權限群組
                          </span>
                        </span>
                        <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200">
                          {moduleSection.permissionCount}
                        </span>
                      </button>

                      {isExpanded ? (
                        <div className="space-y-2 border-t border-indigo-200 bg-white p-2">
                          {moduleSection.sections.map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => setSelectedGroupId(section.id)}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left",
                                selectedGroupId === section.id
                                  ? "border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200"
                                  : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/70",
                              )}
                            >
                              <FolderKey className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                              <span className="min-w-0 flex-1">
                                <span className="font-semibold text-slate-900">{section.name}</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                  {section.description || "無描述"}
                                </span>
                              </span>
                              <span className="shrink-0 rounded bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                {section.permissions.length}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel
            title={selectedGroup ? `${selectedGroup.name} 權限` : "全部權限"}
            icon={<ShieldCheck className="h-4 w-4 text-indigo-600" />}
            action={<span className="text-xs text-slate-500">{selectedPermissions.length} 筆</span>}
          >
            <DataGrid
              rows={selectedPermissions}
              columns={permissionColumns}
              loading={isLoading}
              disableRowSelectionOnClick
              initialState={{
                sorting: {
                  sortModel: [{ field: "name", sort: "asc" }],
                },
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </Panel>
        </section>
      </div>

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

function Panel({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-x-auto overflow-y-hidden rounded-lg border border-[#d6e8f4] bg-white">
      <div className="flex items-center justify-between border-b border-[#d6e8f4] px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#12344a]">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}
