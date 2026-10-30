function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string, baseUrl?: string) {
  const normalizedPath = normalizePath(path);
  if (!baseUrl) return normalizedPath;

  return `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
}

// Centralized frontend-to-backend API config.
export const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "http://localhost:3001";

export const BACKEND_API_PATHS = {
  chat: "/api/chatbot",
  chatWithExternal: "/api/chatbot-with-external",
  chatConversations: "/api/chat/conversations",
  chatDocuments: "/api/chat/documents",
  chatAgents: "/api/chat/agents",
  chatRetrieval: "/api/chat/retrieval",
  chatRetrievalAgents: "/api/chat/retrieval-agents",
  chatStructuredOutput: "/api/chat/structured-output",
  reportGeneratorDraft: "/api/report-generator/draft",
  reportGeneratorThreads: "/api/report-generator/threads",
  reportGeneratorQuickStarts: "/api/report-generator/quick-starts",
  reportGeneratorHistory: "/api/report-generator/history",
  retrievalIngest: "/api/retrieval/ingest",
  expertKnowledge: "/api/expert-knowledge",
  expertKnowledgeApplied: "/api/expert-knowledge/applied",
  expertKnowledgeGenerateAnchor: "/api/expert-knowledge/generate-anchor",
  expertKnowledgeGenerateAnalysis:
    "/api/expert-knowledge/generate-analysis",
  warehouseData: "/api/warehouse-data",
  warehouseDataApplied: "/api/warehouse-data/applied",
  membershipAuth: "/api/membership/auth",
  membershipMenus: "/api/membership/menus",
  membershipRbac: "/api/membership/rbac",
  membershipUsers: "/api/membership/users",
  membershipOrganizations: "/api/membership/organizations",
  membershipGroups: "/api/membership/groups",
  membershipAdmin: "/api/membership/admin",
} as const;

export function buildBackendApiUrl(path: string) {
  return buildApiUrl(path, BACKEND_API_BASE_URL);
}

function getStoredMembershipAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("membership.accessToken");
}

function withMembershipAuthHeader(init?: RequestInit): RequestInit | undefined {
  const token = getStoredMembershipAccessToken();
  if (!token) return init;

  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
  };
}

export async function fetchBackendApi(path: string, init?: RequestInit) {
  const url = buildBackendApiUrl(path);

  return fetch(url, withMembershipAuthHeader(init));
}
