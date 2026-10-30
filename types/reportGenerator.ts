export type ReportStatus = "已完成" | "產生中" | "失敗";

export type HistoricalReport = {
  id: string;
  publicId: string;
  title: string;
  company: string;
  year: string;
  period: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  status: ReportStatus;
  fileSize: string;
  fileName?: string;
};

export type ReportHistoryResult = {
  reports: HistoricalReport[];
  total?: number;
  page?: number;
  pageSize?: number;
  offset?: number;
};

export type ReportProgressItem = {
  label: string;
  status: string;
};

export type ReportDashboardMetric = {
  label: string;
  value: string;
  trend: string;
  iconKey?: "barChart" | "trendingUp" | "scale" | "shieldCheck" | "dollarSign";
  calculationStatus?: "complete" | "incomplete";
  calculationReason?: string;
};

export type ReportFinancialTrend = {
  period: string;
  revenue: number | null;
  netIncome: number | null;
  grossMargin: number | null;
};

export type ReportDashboard = {
  id?: string;
  historyId?: string;
  summaryItems: string[];
  progressItems: ReportProgressItem[];
  progressPercent: number;
  metricsTitle: string;
  metrics: ReportDashboardMetric[];
  financialTrends: ReportFinancialTrend[];
  createdAt?: string;
  updatedAt?: string;
};

export type ReportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ReportLlmTrace = {
  stage: string;
  requestJson: string;
  responseJson: string;
};

export type GeneralDocumentPlan = {
  documentTypeId: string;
  sections: { sectionId: string; isRequired: boolean; contentTypeIds: string[] }[];
};

export type GeneralDocumentOutline = {
  documentTypeId: string;
  documentTypeName: string;
  title: string;
  subject: string;
  period: string;
  objective: string;
  sections: {
    sectionId: string;
    heading: string;
    focus: string;
    isRequired: boolean;
    contents: { contentTypeId: string; name: string; description: string }[];
  }[];
  sourcePlan: string;
};

export type DocumentPurpose = {
  purposeId: string;
  description: string;
  planningMode: "analysis" | "procedure" | "proposal" | "explanation" | "mixed";
  referenceTemplateIds: string[];
};

export type PurposePlannedSection = {
  sectionKey: string;
  heading: string;
  focusHint: string;
  purposeIds: string[];
  referenceSectionIds: string[];
  contentTypeIds: string[];
};

export type PurposeDocumentPlan = {
  purposes: DocumentPurpose[];
  sections: PurposePlannedSection[];
};

export type PurposeDocumentOutline = {
  title: string;
  subject: string;
  period: string;
  objective: string;
  purposes: DocumentPurpose[];
  sections: (PurposePlannedSection & {
    focus: string;
    contents: { contentTypeId: string; name: string; description: string }[];
  })[];
  sourcePlan: string;
};

export type PendingClarification = {
  question: string;
  missingDecision: string;
  purposes: DocumentPurpose[];
};

export type ReportOutlinePayload = {
  messages: ReportChatMessage[];
  currentDocumentTypeId?: string | null;
  currentGeneralPlan?: GeneralDocumentPlan | null;
  currentGeneralOutline?: GeneralDocumentOutline | null;
  currentPurposePlan?: PurposeDocumentPlan | null;
  currentPurposeOutline?: PurposeDocumentOutline | null;
  pendingClarification?: PendingClarification | null;
  currentSourceMode?: "default_json" | "user_data" | null;
};

export type ReportOutlineResult = {
  assistantMessage: string;
  generalPlan: GeneralDocumentPlan | null;
  generalOutline: GeneralDocumentOutline | null;
  purposePlan: PurposeDocumentPlan | null;
  purposeOutline: PurposeDocumentOutline | null;
  pendingClarification: PendingClarification | null;
  sourceMode?: "default_json" | "user_data" | null;
  llmTraces: ReportLlmTrace[];
};

export type ReportConversationThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ReportChatMessage[];
  documentTypeId: string | null;
  generalPlan: GeneralDocumentPlan | null;
  generalOutline: GeneralDocumentOutline | null;
  purposePlan: PurposeDocumentPlan | null;
  purposeOutline: PurposeDocumentOutline | null;
  pendingClarification: PendingClarification | null;
  sourceMode?: "default_json" | "user_data" | null;
  llmTraces: ReportLlmTrace[];
};

export type ReportThreadMessageResult = ReportConversationThread & {
  graphNodes: string[];
};

export type ReportQuickStart = {
  id: string;
  label: string;
  prompt: string;
};


export type ReportDocumentResult = {
  blob: Blob;
  filename: string;
};
