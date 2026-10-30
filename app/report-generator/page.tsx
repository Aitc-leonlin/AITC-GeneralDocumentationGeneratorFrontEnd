"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, GitBranch, History, Loader2, MessageSquarePlus, PanelRight, Send, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MembershipRouteGuard } from "@/components/membership/authorization";
import MembershipSessionGuard from "@/components/membership/MembershipSessionGuard";
import { MODULE_PERMISSIONS } from "@/data/modulePermissions";
import { deleteReportThread, fetchReportQuickStarts, fetchReportThreads, generateReportThreadDocument, sendReportThreadMessage } from "@/services/api/reportGeneratorApi";
import type { ReportConversationThread, ReportQuickStart } from "@/types/reportGenerator";
import { deleteReportGraphTrace, readReportGraphTrace, saveReportGraphTrace, type LatestReportGraphTrace } from "@/lib/reportGraphTrace";

const OUTLINE_WIDTH_STORAGE_KEY = "aitc-report-generator-outline-width-v1";
const DEFAULT_OUTLINE_WIDTH = 340;
const MIN_OUTLINE_WIDTH = 260;
const MAX_OUTLINE_WIDTH = 800;
const MIN_CHAT_WIDTH = 360;
const HISTORY_PANEL_WIDTH = 290;
const ACTIVE_PANEL_BUTTON_CLASS = "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

export default function ReportGeneratorPage() {
  return (
    <MembershipRouteGuard permission={MODULE_PERMISSIONS.reportGeneratorCreate}>
      <MembershipSessionGuard><ReportGeneratorContent /></MembershipSessionGuard>
    </MembershipRouteGuard>
  );
}

function ReportGeneratorContent() {
  const [threads, setThreads] = useState<ReportConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE_WIDTH);
  const [resizingOutline, setResizingOutline] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"history" | "outline" | null>(null);
  const [compactToolbar, setCompactToolbar] = useState(true);
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [quickStarts, setQuickStarts] = useState<ReportQuickStart[]>([]);
  const [quickStartsLoading, setQuickStartsLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const [graphTrace, setGraphTrace] = useState<LatestReportGraphTrace | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  const centerPaneRef = useRef<HTMLDivElement>(null);
  const outlineAsideRef = useRef<HTMLElement>(null);
  const outlineWidthRef = useRef(DEFAULT_OUTLINE_WIDTH);
  const resizingOutlineRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeThread = threads.find((thread) => thread.id === activeThreadId);
  const messages = activeThread?.messages ?? [];
  const generalOutline = activeThread?.generalOutline ?? null;
  const purposeOutline = activeThread?.purposeOutline ?? null;
  const generalSourceMode = activeThread?.sourceMode ?? null;
  const canDownload = messages.some((message) => message.role === "user");
  const latestResponse = messages.at(-1);
  const savedGraphTrace = graphTrace?.threadId === activeThreadId ? graphTrace : null;
  const latestGraphNodes =
    latestResponse?.role === "assistant" &&
    savedGraphTrace?.responseIndex === messages.length - 1
      ? savedGraphTrace.nodes
      : [];

  useEffect(() => {
    setGraphTrace(readReportGraphTrace());
  }, []);

  useEffect(() => {
    const pane = centerPaneRef.current;
    if (!pane) return;
    const updateToolbar = () => setCompactToolbar(pane.getBoundingClientRect().width < 600);
    updateToolbar();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateToolbar);
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem(OUTLINE_WIDTH_STORAGE_KEY));
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_OUTLINE_WIDTH) {
        const width = Math.min(savedWidth, MAX_OUTLINE_WIDTH);
        outlineWidthRef.current = width;
        setOutlineWidth(width);
      }
    } catch {
      // The panel remains resizable when browser storage is unavailable.
    }
  }, []);

  function maxAllowedOutlineWidth() {
    const pageWidth = pageRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    return Math.max(
      MIN_OUTLINE_WIDTH,
      Math.min(MAX_OUTLINE_WIDTH, pageWidth - (historyOpen ? HISTORY_PANEL_WIDTH : 0) - MIN_CHAT_WIDTH),
    );
  }

  function updateOutlineWidth(width: number, persist = false) {
    const nextWidth = Math.max(MIN_OUTLINE_WIDTH, Math.min(Math.round(width), maxAllowedOutlineWidth()));
    outlineWidthRef.current = nextWidth;
    setOutlineWidth(nextWidth);
    if (persist) {
      try {
        window.localStorage.setItem(OUTLINE_WIDTH_STORAGE_KEY, String(nextWidth));
      } catch {
        // Keep the current width even if storage is unavailable.
      }
    }
  }

  function finishOutlineResize() {
    if (!resizingOutlineRef.current) return;
    resizingOutlineRef.current = false;
    setResizingOutline(false);
    updateOutlineWidth(outlineWidthRef.current, true);
  }

  function handleOutlinePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    resizingOutlineRef.current = true;
    setResizingOutline(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleOutlinePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!resizingOutlineRef.current) return;
    const rightEdge = outlineAsideRef.current?.getBoundingClientRect().right;
    if (rightEdge === undefined) return;
    updateOutlineWidth(rightEdge - event.clientX);
  }

  function handleOutlineResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateOutlineWidth(outlineWidthRef.current + 20, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateOutlineWidth(outlineWidthRef.current - 20, true);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchReportThreads()
      .then((items) => {
        if (!active) return;
        setThreads(items);
        setActiveThreadId(items[0]?.id ?? crypto.randomUUID());
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "讀取報告對話紀錄失敗");
        setActiveThreadId(crypto.randomUUID());
      })
      .finally(() => { if (active) setThreadsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchReportQuickStarts()
      .then((items) => { if (active) setQuickStarts(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "快捷問題載入失敗"); })
      .finally(() => { if (active) setQuickStartsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThreadId, messages.length, pendingMessage]);

  async function sendMessage(quickPrompt?: string) {
    const content = (quickPrompt ?? input).trim();
    if (!content || !activeThreadId || threadsLoading || drafting || downloading) return;
    setDrafting(true);
    setPendingMessage(content);
    setConfirmed(false);
    setError("");
    setStatus("");
    try {
      const saved = await sendReportThreadMessage(activeThreadId, content);
      const { graphNodes, ...thread } = saved;
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      const latestMessage = thread.messages.at(-1);
      if (latestMessage?.role === "assistant") {
        const trace = {
          threadId: thread.id,
          responseIndex: thread.messages.length - 1,
          nodes: Array.isArray(graphNodes) ? graphNodes : [],
        };
        saveReportGraphTrace(trace);
        setGraphTrace(trace);
      }
      if (saved.purposeOutline || saved.generalOutline) {
        setOutlineOpen(true);
        setMobilePanel("outline");
      }
      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "大綱整理失敗，請重試");
      if (quickPrompt) setInput(content);
    } finally {
      setPendingMessage("");
      setDrafting(false);
    }
  }

  async function downloadReport() {
    if (!activeThread || !canDownload || !confirmed || drafting || downloading) return;
    setDownloading(true);
    setError("");
    setStatus("");
    try {
      const result = await generateReportThreadDocument(activeThread);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus("已下載 " + result.filename);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "DOCX 產生失敗");
    } finally {
      setDownloading(false);
    }
  }

  function startNewThread() {
    if (drafting || downloading) return;
    setMobilePanel(null);
    setActiveThreadId(crypto.randomUUID());
    setInput("");
    setConfirmed(false);
    setError("");
    setStatus("");
  }

  function selectThread(threadId: string) {
    if (drafting || downloading) return;
    setMobilePanel(null);
    setActiveThreadId(threadId);
    setInput("");
    setConfirmed(false);
    setError("");
    setStatus("");
  }

  async function removeThread(threadId: string) {
    if (drafting || downloading) return;
    try {
      await deleteReportThread(threadId);
      const remaining = threads.filter((thread) => thread.id !== threadId);
      setThreads(remaining);
      deleteReportGraphTrace(threadId);
      setGraphTrace((current) => current?.threadId === threadId ? null : current);
      if (threadId === activeThreadId) {
        setActiveThreadId(remaining[0]?.id ?? crypto.randomUUID());
        setInput("");
        setConfirmed(false);
        setStatus("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "刪除報告對話失敗");
    }
  }

  return (
    <main ref={pageRef} className={"relative flex h-full min-h-0 overflow-hidden bg-background text-foreground " + (resizingOutline ? "cursor-col-resize select-none" : "")}>
      <aside id="report-history-panel" className={`absolute inset-0 z-20 w-full flex-col border-r border-border bg-background lg:static lg:z-auto lg:flex lg:shrink-0 lg:overflow-hidden lg:bg-muted/30 lg:transition-[width] lg:duration-300 ${mobilePanel === "history" ? "flex" : "hidden"} ${historyOpen ? "lg:w-[290px]" : "lg:w-0 lg:border-r-0"}`} aria-label="歷史對話紀錄">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <div><h2 className="text-sm font-semibold">對話歷史紀錄</h2><p className="mt-1 text-xs text-muted-foreground">可切換過去的報告對話</p></div>
          <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setMobilePanel(null)} aria-label="關閉歷史對話"><X className="h-4 w-4" />關閉</Button>
          <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setHistoryOpen(false)} aria-label="收合歷史對話"><ChevronLeft className="h-4 w-4" />收合</Button>
        </div>
        {error ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 lg:hidden">{error}</div> : null}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {threadsLoading ? <p className="p-2 text-sm text-muted-foreground">載入對話中…</p> : null}
          {!threadsLoading && threads.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">目前尚無歷史紀錄</p> : null}
          {threads.map((thread) => (
            <div key={thread.id} className={"flex items-start gap-1 rounded-lg border p-1 transition-colors " + (thread.id === activeThreadId ? "border-primary bg-background" : "border-transparent bg-background/60 hover:border-border")}>
              <button type="button" onClick={() => selectThread(thread.id)} disabled={drafting || downloading} className="min-w-0 flex-1 rounded-md px-2 py-2 text-left disabled:opacity-50" aria-current={thread.id === activeThreadId ? "true" : undefined}>
                <span className="line-clamp-2 break-words text-sm font-medium leading-5">{thread.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(thread.updatedAt).toLocaleString("zh-TW")}</span>
              </button>
              <button type="button" onClick={() => void removeThread(thread.id)} disabled={drafting || downloading} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" aria-label={`刪除對話：${thread.title}`} title="刪除對話"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3"><Button type="button" variant="outline" className="w-full" onClick={startNewThread} disabled={drafting || downloading || threadsLoading}><MessageSquarePlus className="h-4 w-4" />新對話</Button></div>
      </aside>

      <div ref={centerPaneRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button type="button" variant="outline" size={compactToolbar ? "icon" : "sm"} className={"hidden lg:inline-flex " + (historyOpen ? ACTIVE_PANEL_BUTTON_CLASS : "")} onClick={() => setHistoryOpen((open) => !open)} aria-label={historyOpen ? "收合歷史對話" : "展開歷史對話"} aria-controls="report-history-panel" aria-expanded={historyOpen} title={historyOpen ? "收合歷史對話" : "展開歷史對話"}><History className="h-4 w-4" />{compactToolbar ? null : "歷史對話"}</Button>
              <div className="min-w-0"><h1 className="flex min-w-0 items-center gap-2 text-base font-semibold"><FileText className="h-5 w-5 shrink-0" /><span className="min-w-0 truncate">通用文件產生器</span></h1><p className="mt-1 max-w-[12rem] truncate text-xs text-muted-foreground">{activeThread?.title ?? "新對話"}</p></div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button type="button" variant="outline" size={compactToolbar ? "icon" : "sm"} className={"lg:hidden " + (mobilePanel === "history" ? ACTIVE_PANEL_BUTTON_CLASS : "")} onClick={() => setMobilePanel("history")} aria-label="歷史紀錄" aria-controls="report-history-panel" aria-expanded={mobilePanel === "history"} title="歷史紀錄"><History className="h-4 w-4" />{compactToolbar ? null : "歷史紀錄"}</Button>
              <Button type="button" variant="outline" size={compactToolbar ? "icon" : "sm"} onClick={startNewThread} disabled={drafting || downloading || threadsLoading} aria-label="新對話" title="新對話"><MessageSquarePlus className="h-4 w-4" />{compactToolbar ? null : "新對話"}</Button>
              <Button type="button" variant="outline" size={compactToolbar ? "icon" : "sm"} className={"lg:hidden " + (mobilePanel === "outline" ? ACTIVE_PANEL_BUTTON_CLASS : "")} onClick={() => setMobilePanel("outline")} aria-label="報告大綱" aria-controls="report-outline-panel" aria-expanded={mobilePanel === "outline"} title="報告大綱"><PanelRight className="h-4 w-4" />{compactToolbar ? null : "報告大綱"}</Button>
              <Button type="button" variant="outline" size={compactToolbar ? "icon" : "sm"} className={"hidden lg:inline-flex " + (outlineOpen ? ACTIVE_PANEL_BUTTON_CLASS : "")} onClick={() => setOutlineOpen((open) => !open)} aria-label={outlineOpen ? "收合報告大綱" : "展開報告大綱"} aria-controls="report-outline-panel" aria-expanded={outlineOpen} title={outlineOpen ? "收合報告大綱" : "展開報告大綱"}><PanelRight className="h-4 w-4" />{compactToolbar ? null : "報告大綱"}</Button>
            </div>
          </div>
        </header>

        {error ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}
        {status ? <div role="status" className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{status}</div> : null}

        <section className="flex min-h-0 flex-1 flex-col" aria-label="報告對話視窗">

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6" aria-live="polite">
              {messages.length === 0 ? (
                <div className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary"><FileText className="h-6 w-6" /></div>
                  <div><h2 className="text-lg font-semibold">開始規劃文件</h2><p className="mt-2 text-sm text-muted-foreground">描述想做的文件或直接提問。我會參考文件種類與對話內容，回答問題、追問需求，或整理可修改的大綱。</p></div>
                  <div className="mt-3 w-full"><p className="mb-3 text-sm font-medium text-muted-foreground">範例需求</p>
                    {quickStartsLoading ? <span className="text-xs text-muted-foreground">載入快捷問題中…</span> : null}
                    <div className="flex flex-wrap justify-center gap-2">{quickStarts.map((item) => (
                      <Button key={item.id} type="button" variant="outline" onClick={() => void sendMessage(item.prompt)} disabled={drafting || downloading || threadsLoading} className="h-auto max-w-[280px] whitespace-normal rounded-full px-4 py-3 text-left text-xs leading-5">{item.label}：{item.prompt}</Button>
                    ))}</div>
                  </div>
                </div>
              ) : null}
              <div className="mx-auto w-full max-w-[1050px] space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={"flex " + (message.role === "user" ? "justify-end" : "justify-start")}>
                  {message.role === "assistant" ? <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold">AI</div> : null}
                  <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 " + (message.role === "user" ? "bg-secondary text-secondary-foreground" : "text-foreground")}>{message.content}</div>
                </div>
              ))}
              {pendingMessage ? (
                <>
                  <div className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">{pendingMessage}</div></div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold">AI</div><Loader2 className="h-4 w-4 animate-spin" />正在理解問題…</div>
                </>
              ) : null}
              <div ref={chatEndRef} />
              </div>
            </div>

            <div className="border-t border-border bg-background px-4 py-4">
              <div className="mx-auto w-full max-w-[1050px] rounded-lg border border-input bg-secondary p-2">
              <label htmlFor="report-message" className="sr-only">輸入文件需求、問題或補充資料</label>
              <textarea
                id="report-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }}
                maxLength={4000}
                rows={2}
                disabled={drafting || downloading || threadsLoading}
                placeholder="例如：我想做四天三夜的旅遊規劃，預算一萬八，偏好博物館與步行…"
                className="max-h-[160px] min-h-14 w-full resize-y border-0 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1">
                <span className="text-xs text-muted-foreground">Enter 傳送 · Shift + Enter 換行</span>
                <Button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || drafting || downloading || threadsLoading} size="sm">
                  {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}傳送
                </Button>
              </div>
              </div>
            </div>
        </section>
      </div>

      <aside
        id="report-outline-panel"
        ref={outlineAsideRef}
        style={{ "--report-outline-width": `${outlineWidth}px` } as CSSProperties}
        className={`absolute inset-0 z-20 w-full flex-col border-l border-border bg-background lg:relative lg:inset-auto lg:z-auto lg:flex lg:shrink-0 lg:overflow-hidden lg:bg-muted/20 lg:duration-300 ${resizingOutline ? "lg:transition-none" : "lg:transition-[width]"} ${mobilePanel === "outline" ? "flex" : "hidden"} ${outlineOpen ? `lg:w-[var(--report-outline-width)] ${historyOpen ? "lg:max-w-[calc(100%_-_650px)]" : "lg:max-w-[calc(100%_-_360px)]"}` : "lg:w-0 lg:border-l-0"}`}
        aria-label="報告大綱與下載設定"
      >
        {outlineOpen ? (
          <div
            role="separator"
            aria-label="調整報告大綱寬度"
            title="拖曳調整報告大綱寬度，或使用左右方向鍵"
            aria-orientation="vertical"
            aria-valuemin={MIN_OUTLINE_WIDTH}
            aria-valuemax={MAX_OUTLINE_WIDTH}
            aria-valuenow={outlineWidth}
            tabIndex={0}
            onPointerDown={handleOutlinePointerDown}
            onPointerMove={handleOutlinePointerMove}
            onPointerUp={finishOutlineResize}
            onPointerCancel={finishOutlineResize}
            onLostPointerCapture={finishOutlineResize}
            onKeyDown={handleOutlineResizeKeyDown}
            className="group absolute inset-y-0 left-0 z-10 hidden w-3 cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
          >
            <span className="h-12 w-1 rounded-full bg-border group-hover:bg-muted-foreground group-focus-visible:bg-primary" />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <div><h2 className="text-sm font-semibold">報告大綱</h2><p className="mt-1 text-xs text-muted-foreground"><span className="lg:hidden">檢視規劃並確認下載</span><span className="hidden lg:inline">拖曳左緣調整寬度</span></p></div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setGraphDialogOpen(true)} aria-label="檢視最新回答的 Graph Node 路徑" title="檢視最新回答的 Graph Node 路徑"><GitBranch className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setMobilePanel(null)} aria-label="關閉報告大綱"><X className="h-4 w-4" />關閉</Button>
            <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setOutlineOpen(false)} aria-label="收合報告大綱"><ChevronRight className="h-4 w-4" />收合</Button>
          </div>
        </div>
        {error ? <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 lg:hidden">{error}</div> : null}
        {status ? <div role="status" className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 lg:hidden">{status}</div> : null}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <section className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="font-semibold">大綱預覽</h2>{pendingMessage ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}</div>
              <p className="mt-1 text-xs text-muted-foreground">先確認文件用途，再整理成一份可修改的大綱。</p>
              {activeThread?.pendingClarification ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-medium">需要確認：{activeThread.pendingClarification.missingDecision}</p><p className="mt-1">{activeThread.pendingClarification.question}</p></div> : null}
              {(purposeOutline || generalOutline) && generalSourceMode === "default_json" ? <p className="mt-2 text-xs text-muted-foreground">下載時會先比對測試資料與大綱；相符才引用 JSON，否則由 AI 依大綱撰寫。</p> : null}
              {purposeOutline ? (
                <div className="mt-5 space-y-5 text-sm">
                  <div className="rounded-lg bg-secondary p-4">
                    <span className="text-xs font-semibold text-muted-foreground">統一文件大綱</span>
                    <h3 className="mt-1 text-base font-semibold">{purposeOutline.title}</h3>
                    <dl className="mt-3 grid grid-cols-[60px_1fr] gap-y-1 text-foreground">
                      <dt className="text-muted-foreground">對象</dt><dd>{purposeOutline.subject}</dd>
                      <dt className="text-muted-foreground">期間</dt><dd>{purposeOutline.period}</dd>
                    </dl>
                  </div>
                  <div><h3 className="font-semibold">文件用途</h3><ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">{purposeOutline.purposes.map((purpose) => <li key={purpose.purposeId}>{purpose.description}</li>)}</ul></div>
                  <div><h3 className="font-semibold">文件目的</h3><p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{purposeOutline.objective}</p></div>
                  <div><h3 className="font-semibold">章節規劃（{purposeOutline.sections.length}）</h3>
                    <div className="mt-2 space-y-3">{purposeOutline.sections.map((section, index) => (
                      <div key={section.sectionKey} className="rounded-lg border border-border p-3">
                        <h4 className="font-medium">{index + 1}. {section.heading}</h4>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{section.focus}</p>
                        {section.contents.length ? <p className="mt-2 text-xs text-muted-foreground">預計內容：{section.contents.map((content) => content.name).join("、")}</p> : null}
                      </div>
                    ))}</div>
                  </div>
                  <div><h3 className="font-semibold">資料來源規劃</h3><p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{purposeOutline.sourcePlan}</p></div>
                </div>
              ) : generalOutline ? (
                <div className="mt-5 space-y-5 text-sm">
                  <div className="rounded-lg bg-secondary p-4">
                    <span className="text-xs font-semibold text-muted-foreground">{generalOutline.documentTypeId} {generalOutline.documentTypeName}</span>
                    <h3 className="mt-1 text-base font-semibold">{generalOutline.title}</h3>
                    <dl className="mt-3 grid grid-cols-[60px_1fr] gap-y-1 text-foreground">
                      <dt className="text-muted-foreground">對象</dt><dd>{generalOutline.subject}</dd>
                      <dt className="text-muted-foreground">期間</dt><dd>{generalOutline.period}</dd>
                    </dl>
                  </div>
                  <div><h3 className="font-semibold">文件目的</h3><p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{generalOutline.objective}</p></div>
                  <div>
                    <h3 className="font-semibold">章節規劃（{generalOutline.sections.length}）</h3>
                    <div className="mt-2 space-y-3">{generalOutline.sections.map((section, index) => (
                      <div key={section.sectionId} className="rounded-lg border border-border p-3">
                        <h4 className="font-medium">{index + 1}. {section.heading} <span className="text-xs font-normal text-muted-foreground">{section.sectionId} · {section.isRequired ? "必要" : "可選"}</span></h4>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{section.focus}</p>
                        <p className="mt-2 text-xs text-muted-foreground">預計內容：{section.contents.map((content) => content.name).join("、")}</p>
                      </div>
                    ))}</div>
                  </div>
                  <div><h3 className="font-semibold">資料來源規劃</h3><p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">{generalOutline.sourcePlan}</p></div>
                </div>
              ) : <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">先在聊天視窗描述報告需求，這裡會顯示可修改的大綱。</div>}
            </section>

            <section className="rounded-lg border border-border bg-background p-4">
              <h2 className="font-semibold">下載目前版本</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {generalSourceMode === "user_data"
                  ? "依目前大綱與使用者資料匯出；資料不足的章節會標示為待補。"
                  : "有大綱時先比對測試案例的標題與描述；相符才引用 JSON，否則由 AI 依大綱撰寫。尚無大綱時匯出規劃進度。"}
              </p>
            </section>
        </div>
        <footer className="shrink-0 space-y-3 border-t border-border bg-background p-4">
          <label className="flex items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!canDownload || drafting || downloading} className="mt-1 accent-primary" />
            <span>我已確認將依目前資訊產生 DOCX；有合適案例時才會引用測試 JSON。</span>
          </label>
          <Button type="button" onClick={() => void downloadReport()} disabled={!canDownload || !confirmed || drafting || downloading} className="h-auto w-full py-3">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{downloading ? "DOCX 產生中…" : "下載目前版本 DOCX"}
          </Button>
        </footer>
      </aside>
      <Dialog open={graphDialogOpen} onOpenChange={setGraphDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>最新回答的 Graph Node 路徑</DialogTitle>
            <DialogDescription>目前對話最新一則助理回答實際經過的節點。</DialogDescription>
          </DialogHeader>
          {latestGraphNodes.length > 0 ? (
            <ol className="space-y-2 text-sm">
              {latestGraphNodes.map((node, index) => (
                <li key={`${node}-${index}`} className="flex gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
                  <span className="min-w-0 break-all">{node}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              目前沒有可檢視的紀錄。請在此對話送出新問題。
            </p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
