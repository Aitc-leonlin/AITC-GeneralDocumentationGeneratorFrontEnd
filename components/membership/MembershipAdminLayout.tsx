"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  LucideIcon,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { useMembershipMenus } from "@/hooks/useMembershipMenus";
import { type MembershipMenu } from "@/services/api/membershipMenuApi";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { cn } from "@/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  Building2,
  ChevronDown,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
};

const INCOMPLETE_MENU_CODES = new Set(["MEMBERSHIP_NOTIFICATIONS"]);
// TEMPORARY: 未完成標示是目前的權宜處理，待後端功能完整串接後移除。
function isIncompleteMenu(menu: MembershipMenu) {
  return INCOMPLETE_MENU_CODES.has(menu.code);
}
function menuHref(menu: MembershipMenu) {
  return menu.routePath || "/membership/dashboard";
}

function menuTitle(menu: MembershipMenu) {
  if (!INCOMPLETE_MENU_CODES.has(menu.code) || menu.title.includes("(尚未完成)")) {
    return menu.title;
  }
  return `${menu.title}(尚未完成)`;
}

function isMenuActive(menu: MembershipMenu, pathname: string): boolean {
  const href = menuHref(menu);
  return (
    pathname === href ||
    (href !== "/membership" && pathname.startsWith(`${href}/`)) ||
    menu.children.some((child) => isMenuActive(child, pathname))
  );
}

function MenuAccordionItem({
  menu,
  depth = 0,
  collapsed = false,
  onRequestExpand,
}: {
  menu: MembershipMenu;
  depth?: number;
  collapsed?: boolean;
  onRequestExpand?: () => void;
}) {
  const pathname = usePathname();
  const Icon = ICONS[menu.icon] ?? ShieldCheck;
  const hasChildren = menu.children.length > 0;
  const href = menu.routePath || "/membership/dashboard";
  const isActive = isMenuActive(menu, pathname);
  const isDirectActive = pathname === href || (href !== "/membership" && pathname.startsWith(`${href}/`));
  const [isOpen, setIsOpen] = useState(() => isActive || depth === 0);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (!hasChildren) {
    return (
      <Link
        href={href}
        title={collapsed ? menuTitle(menu) : undefined}
        style={
          depth > 0 && !collapsed
            ? { marginLeft: `${depth}rem`, width: `calc(100% - ${depth}rem)` }
            : undefined
        }
        className={cn(
          "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          isDirectActive
            ? isIncompleteMenu(menu) ? "bg-rose-50 text-rose-700" : "bg-indigo-600 text-white"
            : isIncompleteMenu(menu)
              ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {collapsed ? null : <span className="min-w-0 break-words leading-tight">{menuTitle(menu)}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            setIsOpen(true);
            onRequestExpand?.();
            return;
          }
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-label={collapsed ? `展開${menuTitle(menu)}選單` : undefined}
        title={collapsed ? menuTitle(menu) : undefined}
        style={
          depth > 0 && !collapsed
            ? { marginLeft: `${depth}rem`, width: `calc(100% - ${depth}rem)` }
            : undefined
        }
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          isActive
            ? isIncompleteMenu(menu) ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-800"
            : isIncompleteMenu(menu)
              ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1 break-words leading-tight">{menuTitle(menu)}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </>
        )}
      </button>
      {!collapsed ? <div
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
          isOpen
            ? "mt-1 grid-rows-[1fr] opacity-100"
            : "pointer-events-none mt-0 grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "grid gap-1 transition-transform duration-300 ease-in-out",
              isOpen ? "translate-y-0" : "-translate-y-1",
            )}
          >
            {menu.children.map((child) => (
              <MenuAccordionItem key={child.id} menu={child} depth={depth + 1} collapsed={collapsed} onRequestExpand={onRequestExpand} />
            ))}
          </div>
        </div>
      </div> : null}
    </div>
  );
}

export default function MembershipAdminLayout({ children }: { children: ReactNode }) {
  const { menus, isLoading } = useMembershipMenus();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem("membership.adminSidebarCollapsed") === "true");
  }, []);

  function setSidebarCollapsed(collapsed: boolean) {
    setIsCollapsed(collapsed);
    window.localStorage.setItem("membership.adminSidebarCollapsed", String(collapsed));
  }

  return (
    <MembershipSessionGuard>
      <div className={cn("grid h-full min-h-0 bg-[#f8fcff] transition-[grid-template-columns] duration-300 ease-in-out", isCollapsed ? "md:grid-cols-[72px_minmax(0,1fr)]" : "md:grid-cols-[260px_minmax(0,1fr)]")}>
        <aside className="hidden min-h-0 overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-300 md:flex md:flex-col">
          <div className={cn("flex min-h-[73px] items-center border-b border-slate-200", isCollapsed ? "justify-center px-2" : "justify-between gap-3 px-5 py-4")}>
            {isCollapsed ? null : (
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-indigo-600">Membership Admin</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">管理後台</div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "展開管理後台選單" : "收合管理後台選單"}
              title={isCollapsed ? "展開選單" : "收合選單"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <nav className={cn("min-h-0 flex-1 overflow-y-auto", isCollapsed ? "p-2" : "p-3")}>
            {isLoading ? (
              <div className={cn("py-2 text-sm text-slate-500", isCollapsed ? "text-center" : "px-3")} title="載入選單中">{isCollapsed ? "…" : "載入選單中"}</div>
            ) : menus.length > 0 ? (
              <div className="grid gap-1">
                {menus.map((menu) => (
                  <MenuAccordionItem key={menu.id} menu={menu} collapsed={isCollapsed} onRequestExpand={() => setSidebarCollapsed(false)} />
                ))}
              </div>
            ) : (
              <div className={cn("rounded-md border border-slate-200 bg-slate-50 text-sm leading-6 text-slate-600", isCollapsed ? "px-2 py-3 text-center" : "px-3 py-3")} title="目前帳號沒有可用的管理選單">
                {isCollapsed ? "—" : "目前帳號沒有可用的管理選單。"}
              </div>
            )}
          </nav>
          {/* <div className="border-t border-slate-200 p-3">
            <Link
              href={firstRoute}
              className="flex items-center justify-center rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              回到可用功能
            </Link>
          </div> */}
        </aside>
        <section className="min-h-0 overflow-hidden">{children}</section>
      </div>
    </MembershipSessionGuard>
  );
}
