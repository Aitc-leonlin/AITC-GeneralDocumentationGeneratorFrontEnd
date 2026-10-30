export type ChatDocument = {
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  uploadUser: string;
  chatId: string;
  caseId: string | null;
  status: "UPLOADED";
  createdAt: string;
};

export type StagedChatDocument = {
  localId: string;
  file: File;
  fileType: string;
};

export type ChatDocumentUpload = {
  localId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  progress: number;
  status: "queued" | "uploading" | "completed" | "failed";
};
