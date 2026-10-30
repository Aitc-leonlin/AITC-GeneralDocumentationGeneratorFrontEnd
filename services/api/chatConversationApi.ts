import type { Message } from "ai";

import type {
  ExternalReferenceData,
  UsedExpertKnowledge,
} from "@/components/ChatMessageBubble";
import type { ChatDocument } from "@/types/chatDocument";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

export type ChatConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  dataSourcesForMessages: Record<string, any[]>;
  expertKnowledgeForMessages: Record<string, UsedExpertKnowledge[]>;
  externalDataForMessages: Record<string, ExternalReferenceData[]>;
  documentsForMessages: Record<string, ChatDocument[]>;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(body.error?.message || "對話歷史 API 呼叫失敗");
  }
  return body.data;
}

function conversationPath(path = "") {
  return `${BACKEND_API_PATHS.chatConversations}${path}`;
}

export async function fetchChatConversations() {
  const response = await fetchBackendApi(conversationPath(), { cache: "no-store" });
  return parseApiResponse<ChatConversation[]>(response);
}

export async function saveChatConversation(conversation: ChatConversation) {
  const response = await fetchBackendApi(conversationPath(`/${conversation.id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map(({ id, role, content }) => ({ id, role, content })),
      dataSourcesForMessages: conversation.dataSourcesForMessages,
      expertKnowledgeForMessages: conversation.expertKnowledgeForMessages,
      externalDataForMessages: conversation.externalDataForMessages,
      documentsForMessages: Object.fromEntries(
        Object.entries(conversation.documentsForMessages).map(
          ([messageId, documents]) => [
            messageId,
            documents.map(({ documentId }) => ({ documentId })),
          ],
        ),
      ),
    }),
  });
  return parseApiResponse<ChatConversation>(response);
}

export async function deleteChatConversation(conversationId: string) {
  const response = await fetchBackendApi(conversationPath(`/${conversationId}`), {
    method: "DELETE",
  });
  return parseApiResponse<{ deleted: boolean }>(response);
}
