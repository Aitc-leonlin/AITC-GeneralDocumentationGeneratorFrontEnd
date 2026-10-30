"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotMembershipPassword } from "@/services/api/membershipAuthApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("system.admin@example.local");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      const result = await forgotMembershipPassword(email);
      setResetToken(result.resetToken);
      toast.success("已建立密碼重設請求");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "忘記密碼請求失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid h-full place-items-center overflow-auto bg-[#f8fcff] px-4 py-8">
      <section className="w-full max-w-lg rounded-lg border border-[#d6e8f4] bg-white p-6 shadow-[0_18px_48px_rgba(35,92,124,0.10)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#235c7c] text-white">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            {/* TEMPORARY: 實際寄送重設密碼信尚未完成，此標示為權宜處理，完成後移除。 */}
            <h1 className="text-xl font-semibold text-rose-700">忘記密碼(尚未完成)</h1>
            <p className="text-sm text-[#5d7b90]">建立密碼重設請求。</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Email
            <Input id="forgot-password-email-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <Button id="forgot-password-submit-button" type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
            送出
          </Button>
        </form>
        {resetToken ? (
          // NOTE: 目前後端尚未串接實際寄信，所以前端暫時顯示 reset token 供開發測試。
          // 正式產品應移除此區塊，改為提示使用者到信箱收取重設密碼連結。
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">開發測試 Reset Token</div>
            <div className="mt-2 break-all font-mono text-xs">{resetToken}</div>
            <Link href={`/reset-password/confirm?token=${encodeURIComponent(resetToken)}`} className="mt-3 inline-block text-[#235c7c] hover:underline">
              前往重設密碼
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
