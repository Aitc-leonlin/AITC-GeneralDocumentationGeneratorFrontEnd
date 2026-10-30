"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginMembership } from "@/services/api/membershipAuthApi";

const REMEMBERED_LOGIN_KEY = "membership.rememberedLogin";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rememberedLogin = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!rememberedLogin) return;
    setLogin(rememberedLogin);
    setRememberMe(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      await loginMembership({ login, password, rememberMe });
      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_LOGIN_KEY, login.trim());
      } else {
        window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      }
      toast.success("登入成功");
      const nextPath =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("next");
      router.push(nextPath?.startsWith("/") ? nextPath : "/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登入失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid h-full place-items-center overflow-auto bg-[#f4fafe] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-[#bfe1f4] bg-white p-6 shadow-[0_18px_48px_rgba(87,166,212,0.18)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#57A6D4] text-white shadow-[0_10px_24px_rgba(87,166,212,0.28)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#174763]">會員權限登入</h1>
            <p className="text-sm text-[#4f7f9c]">使用企業帳號進入管理模組。</p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            帳號
            <Input id="login-account-input" value={login} onChange={(event) => setLogin(event.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            密碼
            <span className="relative">
              <Input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pr-10"
              />
              <button
                id="login-password-visibility-button"
                type="button"
                aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 text-[#4f7f9c] transition-colors hover:text-[#2f85b8]"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Remember me
          </label>
          <Button id="login-submit-button" type="submit" disabled={isSubmitting} className="bg-[#57A6D4] text-white shadow-[0_10px_24px_rgba(87,166,212,0.24)] hover:bg-[#3f95c7]">
            <LogIn className="h-4 w-4" />
            登入
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-[#2f85b8] hover:text-[#246d99] hover:underline">
            忘記密碼
          </Link>
          <Link href="/reset-password" className="inline-flex items-center gap-1 text-[#2f85b8] hover:text-[#246d99] hover:underline">
            <KeyRound className="h-4 w-4" />
            重設密碼
          </Link>
        </div>
      </section>
    </main>
  );
}
