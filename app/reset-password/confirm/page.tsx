"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetMembershipPassword } from "@/services/api/membershipAuthApi";

export default function ResetPasswordConfirmPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReset, setIsReset] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("兩次輸入的新密碼不一致");
      return;
    }

    try {
      setIsSubmitting(true);
      await resetMembershipPassword({ token, newPassword });
      setIsReset(true);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("密碼已重設");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重設密碼失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid h-full place-items-center overflow-auto bg-[#f8fcff] px-4 py-8">
      <section className="w-full max-w-lg rounded-lg border border-[#d6e8f4] bg-white p-6 shadow-[0_18px_48px_rgba(35,92,124,0.10)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#235c7c] text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#12344a]">修改密碼</h1>
            <p className="text-sm text-[#5d7b90]">透過信件連結完成新密碼設定。</p>
          </div>
        </div>
        {isReset ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            密碼已更新，請返回登入頁重新登入。
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Reset Token
              <Input id="reset-password-token-input" value={token} onChange={(event) => setToken(event.target.value)} required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              新密碼
              <Input
                id="reset-password-new-password-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              確認新密碼
              <Input
                id="reset-password-confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <Button id="reset-password-confirm-submit-button" type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
              更新密碼
            </Button>
          </form>
        )}
        <Link href="/login" className="mt-5 inline-block text-sm text-[#235c7c] hover:underline">
          返回登入
        </Link>
      </section>
    </main>
  );
}
