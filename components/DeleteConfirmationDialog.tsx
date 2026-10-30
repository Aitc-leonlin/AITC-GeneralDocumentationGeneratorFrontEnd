"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  detail?: ReactNode;
  isDeleting?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirmationDialog({
  open,
  title,
  description,
  detail,
  isDeleting = false,
  confirmLabel = "確認刪除",
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isDeleting && onCancel()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {description}
          </div>
          {detail ? <div className="text-xs leading-5 text-slate-500">{detail}</div> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={onCancel}>
              取消
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={onConfirm}>
              {isDeleting ? "刪除中…" : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
