// Legacy global setting used by pages that are not scoped to a chat thread.
export const CHAT_SETTINGS_STORAGE_KEY = "aitc-chatbot-chat-settings-v1";

export const CHAT_SETTINGS_BY_THREAD_STORAGE_KEY =
  "aitc-chatbot-chat-settings-by-thread-v1";

export type StoredChatSettings = {
  company?: string;
  period?: string;
  periodYear?: string;
  periodQuarter?: string;
  statementType?: string;
  useExpertKnowledge?: boolean;
  useWarehouseData?: boolean;
  useExternalData?: boolean;
};

export type StoredChatSettingsByThread = Record<string, StoredChatSettings>;
