"use client";

import { cn } from "@/utils/cn";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import HomeIcon from "@mui/icons-material/Home";
import PsychologyAltIcon from "@mui/icons-material/PsychologyAlt";
import FunctionsIcon from "@mui/icons-material/Functions";
import {
  Bot,
  ChevronDown,
  Database,
  FileText,
  LogOut,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  getStoredAuthUser,
  getMembershipAccessToken,
  logoutMembership,
  type AuthUser,
} from "@/services/api/membershipAuthApi";
import {
  METRIC_FORMULA_CATEGORIES,
  getMetricFormulaCategoryLabel,
  getMetricFormulasByCategory,
  type MetricFormulaCategoryKey,
} from "@/data/metricFormula";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

export const ActiveLink = (props: {
  href: string;
  children: ReactNode;
  icon: ReactNode;
  activeClassName?: string;
  exact?: boolean;
}) => {
  const pathname = usePathname();
  const isActive =
    pathname === props.href ||
    (!props.exact &&
      props.href !== "/" &&
      pathname.startsWith(`${props.href}/`));
  return (
    <Link
      href={props.href}
      className={cn(
        "rounded-full border border-[#cfe4f2] bg-white px-4 py-2 text-sm font-medium text-[#12344a] transition-colors duration-200",
        "flex items-center gap-2 whitespace-nowrap",
        !isActive &&
          "hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]",
        isActive &&
          (props.activeClassName ??
            "cursor-default border-[#57A6D4] bg-[#57A6D4] text-white"),
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span>{props.children}</span>
      <span
        className={cn(
          "flex items-center text-[#57A6D4] transition-colors",
          isActive ? "text-white" : "group-hover:text-[#0f3f5d]",
        )}
      >
        {props.icon}
      </span>
    </Link>
  );
};

const navButtonClassName =
  "rounded-full border border-[#cfe4f2] bg-white px-4 py-2 text-sm font-medium text-[#12344a] transition-colors duration-200 flex items-center gap-2 whitespace-nowrap hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]";

function getTopBarTitleConfig(pathname: string) {
  if (pathname.startsWith("/report-generator")) {
    return {
      title: "跨領域報告產生器",
      icon: <FileText className="h-5 w-5" />,
      className:
        "border-teal-200 bg-teal-50/80 text-teal-900 shadow-[0_8px_24px_rgba(15,118,110,0.10)]",
      accentClassName: "bg-teal-600",
      labelClassName: "text-teal-700",
    };
  }

  if (
    pathname.startsWith("/chatbot") ||
    pathname.startsWith("/expert-knowledge") ||
    pathname.startsWith("/external-knowledge")
  ) {
    return {
      title: "授信 AI 助理",
      icon: <Bot className="h-5 w-5" />,
      className:
        "border-[#cfe4f2] bg-[#eef7fc]/90 text-[#12344a] shadow-[0_8px_24px_rgba(48,169,216,0.12)]",
      accentClassName: "bg-[#57A6D4]",
      labelClassName: "text-[#2d689d]",
    };
  }

  if (pathname.startsWith("/membership")) {
    return {
      title: "會員權限管理",
      icon: <ShieldCheck className="h-5 w-5" />,
      className:
        "border-indigo-200 bg-indigo-50/80 text-indigo-950 shadow-[0_8px_24px_rgba(79,70,229,0.10)]",
      accentClassName: "bg-indigo-600",
      labelClassName: "text-indigo-700",
    };
  }

  return null;
}

export function TopBarTitle() {
  const pathname = usePathname();
  const config = getTopBarTitleConfig(pathname);

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2",
        config.className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white",
          config.accentClassName,
        )}
      >
        {config.icon}
      </span>
      <span
        aria-hidden="true"
        className={cn("h-8 w-1 shrink-0 rounded-full", config.accentClassName)}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase leading-none",
            config.labelClassName,
          )}
        >
          CURRENT
        </span>
        <span className="mt-1 block truncate text-base font-semibold leading-tight md:text-lg">
          {config.title}
        </span>
      </span>
    </span>
  );
}

function HomeNavButton() {
  return (
    <Link
      href="/"
      aria-label="回到主頁"
      title="回到主頁"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cfe4f2] bg-white text-[#12344a] transition-colors duration-200 hover:border-[#57A6D4] hover:bg-[#eef7fc] hover:text-[#0f3f5d]"
    >
      <HomeIcon sx={{ fontSize: 18 }} />
    </Link>
  );
}

function FormulaHelperDialog() {
  const [selectedCategory, setSelectedCategory] =
    useState<MetricFormulaCategoryKey>("solvency_analysis");
  const formulas = getMetricFormulasByCategory(selectedCategory);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={navButtonClassName}>
          <span>公式小幫手</span>
          <span className="flex items-center text-[#57A6D4] transition-colors">
            <FunctionsIcon sx={{ fontSize: 18 }} />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="h-[85vh] max-w-6xl overflow-hidden border-[#d6e8f4] bg-[#f8fcff] p-0">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-[#d6e8f4] bg-white px-8 py-6 text-left">
            <DialogTitle className="text-xl text-[#12344a]">
              公式小幫手
            </DialogTitle>
            <DialogDescription className="text-[#4c7187]">
              依分析主題快速查看常用授信與財務指標公式、用途與判讀重點。
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr)] gap-0 md:grid-cols-[240px,minmax(0,1fr)] md:grid-rows-1">
            <aside className="border-b border-[#d6e8f4] bg-[#f4fafe] p-4 md:min-h-0 md:border-b-0 md:border-r">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b88a3]">
                分析類別
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col">
                {METRIC_FORMULA_CATEGORIES.map((category) => {
                  const isSelected = category.key === selectedCategory;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategory(category.key)}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-[#57A6D4] bg-[#57A6D4] text-white shadow-sm"
                          : "border-[#cfe4f2] bg-white text-[#12344a] hover:border-[#57A6D4] hover:bg-[#eef7fc]",
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-h-0 overflow-y-auto px-6 py-5 md:px-8">
              <div className="mb-5">
                <div className="text-lg font-semibold text-[#12344a]">
                  {getMetricFormulaCategoryLabel(selectedCategory)}
                </div>
                <div className="mt-1 text-sm text-[#5d7b90]">
                  共 {formulas.length} 項公式
                </div>
              </div>

              <div className="grid gap-4">
                {formulas.map((item) => (
                  <section
                    key={`${selectedCategory}-${item.metricName}`}
                    className="rounded-3xl border border-[#d6e8f4] bg-white p-5 shadow-[0_10px_30px_rgba(48,169,216,0.08)]"
                  >
                    <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                      <div className="text-base font-semibold text-[#12344a]">
                        {item.metricName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#5d7b90]">
                        <span>{item.metricNameEn}</span>
                        <span className="rounded-full border border-[#cfe4f2] bg-[#f5fbff] px-2 py-0.5 text-xs font-semibold text-[#2d689d]">
                          {item.metricAbbr}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#d9edf8] bg-[#f5fbff] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                        Formula
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-[#12344a]">
                        {item.formula}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[#f8fbfd] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                          分析用途
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[#234b63]">
                          {item.analysisPurpose}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#f8fbfd] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                          判讀重點
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[#234b63]">
                          {item.keyInsight}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#d9edf8] bg-[#f7fbfe] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b88a3]">
                        範例
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#234b63]">
                        {item.example}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembershipDynamicNav() {
  return (
    <ActiveLink
      href="/membership"
      icon={<ShieldCheck className="h-[18px] w-[18px]" />}
      activeClassName="cursor-default border-indigo-600 bg-indigo-600 text-white"
    >
      會員權限管理
    </ActiveLink>
  );
}

function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getMembershipAccessToken()));
    setAuthUser(getStoredAuthUser());
    setIsOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await logoutMembership();
      toast.success("已登出");
    } finally {
      setHasToken(false);
      setAuthUser(null);
      setIsOpen(false);
      router.replace("/login");
    }
  }

  if (!hasToken) return null;

  const displayName = authUser?.displayName || authUser?.username || "使用者";
  const accountText = authUser?.username
    ? `${displayName}（${authUser.username}）`
    : displayName;
  const initials = getUserInitials(displayName);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={accountText}
          aria-label={`目前登入帳號：${accountText}`}
          className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#cfe4f2] bg-[#12344a] text-sm font-semibold text-white shadow-sm transition-colors hover:border-[#57A6D4] hover:bg-[#0f3f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57A6D4] focus-visible:ring-offset-2"
        >
          {initials}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-lg border-[#d6e8f4] p-2">
        <div className="flex items-center gap-3 border-b border-[#e3f0f7] px-2 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12344a] text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#12344a]">{displayName}</div>
            {authUser?.username ? <div className="truncate text-xs text-[#5d7b90]">{authUser.username}</div> : null}
            {authUser?.email ? <div className="truncate text-xs text-[#5d7b90]">{authUser.email}</div> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
        >
          <span className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            登出
          </span>
          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
        </button>
      </PopoverContent>
    </Popover>
  );
}

function getUserInitials(name: string) {
  const value = name.trim();
  if (!value) return <UserRound className="h-5 w-5" />;
  const segments = value.split(/\s+/).filter(Boolean);
  if (segments.length >= 2) return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

export function Navbar() {
  const pathname = usePathname();
  const isReportGeneratorSection = pathname.startsWith("/report-generator");
  const isMembershipSection = pathname.startsWith("/membership");
  const isChatbotSection =
    pathname.startsWith("/chatbot") ||
    pathname.startsWith("/expert-knowledge") ||
    pathname.startsWith("/external-knowledge");
  const isAuthSection =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email");
  const hasSectionNav =
    isChatbotSection || isReportGeneratorSection || isMembershipSection;

  if (isAuthSection) return null;

  if (pathname === "/") {
    return <LogoutButton />;
  }

  return (
    <nav className="flex min-w-0 items-center overflow-x-auto">
      <div className="mr-[15px]">
        <HomeNavButton />
      </div>
      {hasSectionNav ? (
        <div className="flex flex-nowrap items-center gap-2 rounded-full border border-[#d6e8f4] bg-[#f8fcff] p-1.5">
          {isChatbotSection ? (
            <>
              <ActiveLink
                href="/chatbot"
                icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
              >
                授信AI助理
              </ActiveLink>
              <ActiveLink
                href="/expert-knowledge"
                icon={<PsychologyAltIcon sx={{ fontSize: 18 }} />}
              >
                專家知識庫
              </ActiveLink>
              <ActiveLink
                href="/external-knowledge"
                icon={<Database className="h-[18px] w-[18px]" />}
              >
                資料倉儲
              </ActiveLink>
              <FormulaHelperDialog />
            </>
          ) : null}
          {isReportGeneratorSection ? (
            <>
              <ActiveLink
                href="/report-generator"
                icon={<FileText className="h-[18px] w-[18px]" />}
                activeClassName="cursor-default border-[rgb(47_143_131)] bg-[rgb(47_143_131)] text-white"
                exact
              >
                跨領域報告產生器
              </ActiveLink>
              <ActiveLink
                href="/report-generator/history"
                icon={<HistoryEduIcon sx={{ fontSize: 18 }} />}
                activeClassName="cursor-default border-[rgb(47_143_131)] bg-[rgb(47_143_131)] text-white"
              >
                舊版徵審歷史
              </ActiveLink>
            </>
          ) : null}
          {isMembershipSection ? (
            <MembershipDynamicNav />
          ) : null}
        </div>
      ) : null}
      <LogoutButton />
    </nav>
  );
}
