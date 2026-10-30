"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMembershipPermissions } from "@/hooks/useMembershipPermissions";

export function MembershipAccessDenied({
  title = "無權限存取",
  message = "目前帳號沒有使用此功能的權限。",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="flex h-full items-center justify-center bg-[#f8fcff] p-6">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <Button asChild className="mt-5 bg-indigo-600 text-white hover:bg-indigo-700">
          <Link href="/">回首頁</Link>
        </Button>
      </section>
    </main>
  );
}

export function MembershipRouteGuard({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission, isLoading } = useMembershipPermissions();
  if (isLoading) return null;
  if (!hasPermission(permission)) return <MembershipAccessDenied />;
  return <>{children}</>;
}

export function ButtonPermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, isLoading } = useMembershipPermissions();
  if (isLoading || !hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

export function WidgetPermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, isLoading } = useMembershipPermissions();
  if (isLoading || !hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
