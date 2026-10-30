"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyMembershipEmail } from "@/services/api/membershipAuthApi";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      await verifyMembershipEmail(token);
      toast.success("Email 已驗證");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email 驗證失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid h-full place-items-center overflow-auto bg-[#f8fcff] px-4 py-8">
      <section className="w-full max-w-lg rounded-lg border border-[#d6e8f4] bg-white p-6 shadow-[0_18px_48px_rgba(35,92,124,0.10)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#235c7c] text-white">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div>
            {/* TEMPORARY: 驗證信寄送尚未完成，目前僅能手動輸入 token；完成後移除此權宜標示。 */}
            <h1 className="text-xl font-semibold text-rose-700">Email 驗證(尚未完成)</h1>
            <p className="text-sm text-[#5d7b90]">輸入 verification token 完成驗證。</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Verification Token
            <Input id="email-verification-token-input" value={token} onChange={(event) => setToken(event.target.value)} required />
          </label>
          <Button id="email-verification-submit-button" type="submit" disabled={isSubmitting} className="bg-[#235c7c] text-white hover:bg-[#16445f]">
            驗證 Email
          </Button>
        </form>
      </section>
    </main>
  );
}
