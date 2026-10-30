const STORAGE_KEY = "aitc-chatbot-graph-nodes-v1";

export type ChatGraphTraces = Record<string, Record<string, string[]>>;

export function readChatGraphTraces(): ChatGraphTraces {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const traces: ChatGraphTraces = {};
    for (const [sessionId, messages] of Object.entries(parsed)) {
      if (!messages || typeof messages !== "object" || Array.isArray(messages)) continue;
      traces[sessionId] = {};
      for (const [messageId, nodes] of Object.entries(messages)) {
        if (Array.isArray(nodes) && nodes.every((node) => typeof node === "string")) {
          traces[sessionId][messageId] = nodes;
        }
      }
    }
    return traces;
  } catch {
    return {};
  }
}

export function saveChatGraphTrace(
  sessionId: string,
  messageId: string,
  nodes: string[],
): ChatGraphTraces {
  const traces = readChatGraphTraces();
  const next = {
    ...traces,
    [sessionId]: { ...traces[sessionId], [messageId]: nodes },
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The trace stays visible in React state if browser storage is unavailable.
  }
  return next;
}
