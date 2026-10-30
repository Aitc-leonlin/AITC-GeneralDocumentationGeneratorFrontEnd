"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  clearAuthTokens,
  fetchCurrentMembershipUser,
  getMembershipAccessToken,
} from "@/services/api/membershipAuthApi";

export default function MembershipSessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      const token = getMembershipAccessToken();
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        await fetchCurrentMembershipUser();
        if (mounted) setIsAuthChecking(false);
      } catch {
        clearAuthTokens();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    void verifySession();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (isAuthChecking) return null;

  return <>{children}</>;
}
