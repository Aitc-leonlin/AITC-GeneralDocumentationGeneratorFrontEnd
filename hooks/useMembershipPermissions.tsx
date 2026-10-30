"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

import { fetchMyPermissions } from "@/services/api/membershipRbacApi";

export function useMembershipPermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPermissions() {
      try {
        setIsLoading(true);
        const result = await fetchMyPermissions();
        if (mounted) setPermissions(result.permissions);
      } catch {
        if (mounted) setPermissions([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadPermissions();
    return () => {
      mounted = false;
    };
  }, []);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  return {
    permissions,
    isLoading,
    hasPermission: (permissionCode: string) => permissionSet.has(permissionCode),
  };
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission, isLoading } = useMembershipPermissions();
  if (isLoading) return null;
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
