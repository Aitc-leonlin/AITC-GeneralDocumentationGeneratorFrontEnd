import type { ChatDocument } from "@/types/chatDocument";
import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code?: string; message?: string } | null;
};

async function parseApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success || body.data === null) {
    throw new Error(body?.error?.message || fallbackMessage);
  }
  return body.data;
}

export async function fetchChatDocuments(chatId: string) {
  const params = new URLSearchParams({ chat_id: chatId });
  const response = await fetchBackendApi(`${BACKEND_API_PATHS.chatDocuments}?${params}`, {
    cache: "no-store",
  });
  return parseApiResponse<ChatDocument[]>(response, "讀取已上傳文件失敗");
}

export async function uploadChatDocument(chatId: string, file: File) {
  const formData = new FormData();
  formData.append("chatId", chatId);
  formData.append("file", file);
  const response = await fetchBackendApi(BACKEND_API_PATHS.chatDocuments, {
    method: "POST",
    body: formData,
  });
  return parseApiResponse<ChatDocument>(response, "文件上傳失敗");
}

export async function deleteChatDocument(documentId: string) {
  const response = await fetchBackendApi(
    `${BACKEND_API_PATHS.chatDocuments}/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
  return parseApiResponse<{ deleted: boolean }>(response, "文件刪除失敗");
}
