const STORAGE_KEY = "aitc-report-generator-latest-graph-nodes-v1";

export type LatestReportGraphTrace = {
  threadId: string;
  responseIndex: number;
  nodes: string[];
};

export function readReportGraphTrace(): LatestReportGraphTrace | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const trace = parsed as Partial<LatestReportGraphTrace>;
    return typeof trace.threadId === "string" &&
      typeof trace.responseIndex === "number" &&
      Array.isArray(trace.nodes) &&
      trace.nodes.every((node) => typeof node === "string")
      ? trace as LatestReportGraphTrace
      : null;
  } catch {
    return null;
  }
}

export function saveReportGraphTrace(trace: LatestReportGraphTrace): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trace));
  } catch {
    // The current trace remains visible until the page is reloaded.
  }
}

export function deleteReportGraphTrace(threadId: string): void {
  if (readReportGraphTrace()?.threadId !== threadId) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The deleted thread is also removed from React state.
  }
}
