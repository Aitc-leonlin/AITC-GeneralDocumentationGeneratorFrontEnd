"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, FileText, ShieldCheck } from "lucide-react";

import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

const MODULE_PERMISSION_GROUPS = {
  creditAi: [
    MODULE_PERMISSIONS.creditAiChat,
    MODULE_PERMISSIONS.creditAiExpertKnowledgeView,
    MODULE_PERMISSIONS.creditAiExpertKnowledgeAdd,
    MODULE_PERMISSIONS.creditAiExpertKnowledgeEdit,
    MODULE_PERMISSIONS.creditAiExpertKnowledgeDelete,
    MODULE_PERMISSIONS.creditAiWarehouseDataView,
    MODULE_PERMISSIONS.creditAiWarehouseDataAdd,
    MODULE_PERMISSIONS.creditAiWarehouseDataEdit,
    MODULE_PERMISSIONS.creditAiWarehouseDataDelete,
  ],
  reportGenerator: [
    MODULE_PERMISSIONS.reportGeneratorCreate,
    MODULE_PERMISSIONS.reportGeneratorHistory,
  ],
  membership: [
    MODULE_PERMISSIONS.membershipRead,
    MODULE_PERMISSIONS.membershipWrite,
    MODULE_PERMISSIONS.rbacView,
    MODULE_PERMISSIONS.rbacAdd,
    MODULE_PERMISSIONS.rbacEdit,
    MODULE_PERMISSIONS.rbacDelete,
    MODULE_PERMISSIONS.membershipUserRoles,
    MODULE_PERMISSIONS.organizationScopeView,
    MODULE_PERMISSIONS.organizationScopeAdd,
    MODULE_PERMISSIONS.organizationScopeEdit,
    MODULE_PERMISSIONS.organizationScopeDelete,
    MODULE_PERMISSIONS.auditView,
    MODULE_PERMISSIONS.notificationView,
  ],
} as const;

const entryCards = [
  {
    title: "授信 AI 助理",
    description: "進入授信 AI 助理，針對公司財務、授信風險與資料倉儲內容進行多輪問答。",
    href: "/chatbot",
    icon: Bot,
    accentClassName: "bg-[#57A6D4] text-white",
    permissions: MODULE_PERMISSION_GROUPS.creditAi,
  },
  {
    title: "跨領域報告產生器",
    description: "使用醫療、金融、教育或美食範例資料，比較 AI Markdown 與標準 DOCX 文件。",
    href: "/report-generator",
    icon: FileText,
    accentClassName: "bg-[#2F8F83] text-white",
    permissions: MODULE_PERMISSION_GROUPS.reportGenerator,
  },
  {
    title: "會員權限管理",
    description: "管理企業會員帳號、角色權限與後台授權入口。",
    href: "/membership/dashboard",
    icon: ShieldCheck,
    accentClassName: "bg-indigo-600 text-white",
    permissions: MODULE_PERMISSION_GROUPS.membership,
  },
];

export default function Home() {
  return (
    <MembershipSessionGuard>
      <HomeContent />
    </MembershipSessionGuard>
  );
}

function HomeContent() {
  const { hasPermission, isLoading } = useMembershipPermissions();
  const visibleEntryCards = isLoading
    ? []
    : entryCards.filter((entry) => entry.permissions.some((permission) => hasPermission(permission)));

  return (
    <main className="h-full overflow-y-auto overflow-x-hidden bg-[#f8fcff]">
        <div className="mx-auto flex min-h-full max-w-7xl flex-col justify-center gap-2 px-4 py-4 md:gap-3 md:px-6">
          <section className="shrink-0">
            <div className="text-xs font-semibold text-[#2d689d] md:text-sm">
              AITC Credit Investigation
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#12344a] md:text-4xl lg:text-5xl">
              徵審授信AI平台
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4c7187] md:text-base">
              點選進入授信AI助理進行授信風險問答，或使用跨領域報告產生器建立 DOCX 文件。
            </p>
          </section>

          <section className="grid min-h-0 content-start grid-rows-[auto_minmax(0,1fr)] gap-4 md:grid-cols-[4fr_6fr] md:grid-rows-1 md:items-start md:gap-6 lg:gap-8">
            <div className="grid gap-3 md:gap-4">
              {visibleEntryCards.map((entry) => {
                const Icon = entry.icon;

                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className="group rounded-lg border border-[#d6e8f4] bg-white p-4 shadow-[0_14px_40px_rgba(48,169,216,0.08)] transition-colors hover:border-[#57A6D4] hover:bg-[#f4fafe] md:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:h-11 md:w-11 ${entry.accentClassName}`}>
                        <Icon className="h-5 w-5 md:h-6 md:w-6" />
                      </span>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#57A6D4] transition-transform group-hover:translate-x-1" />
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-[#12344a] md:text-xl">
                      {entry.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#4c7187]">
                      {entry.description}
                    </p>
                  </Link>
                );
              })}
            </div>

            <div className="min-h-0">
              <Image
                src="/images/HomePageBanner.png"
                alt="徵審授信AI平台"
                width={1774}
                height={887}
                priority
                className="h-full max-h-[42vh] w-full rounded-lg border border-[#d6e8f4] object-contain shadow-[0_14px_40px_rgba(48,169,216,0.10)] md:max-h-[68vh]"
              />
            </div>
          </section>
        </div>
      </main>
  );
}
