"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchCurrentMembershipMenus,
  type MembershipMenu,
} from "@/services/api/membershipMenuApi";

export function flattenMembershipMenus(menus: MembershipMenu[]) {
  const rows: MembershipMenu[] = [];
  function visit(menu: MembershipMenu) {
    rows.push(menu);
    menu.children.forEach(visit);
  }
  menus.forEach(visit);
  return rows;
}

export function useMembershipMenus() {
  const [menus, setMenus] = useState<MembershipMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadMenus() {
      try {
        setIsLoading(true);
        const result = await fetchCurrentMembershipMenus();
        if (mounted) setMenus(result.menus);
      } catch {
        if (mounted) setMenus([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadMenus();
    return () => {
      mounted = false;
    };
  }, []);

  const flattenedMenus = useMemo(() => flattenMembershipMenus(menus), [menus]);

  return { menus, flattenedMenus, isLoading };
}
