export type WarehouseDataCategory = "負面消息" | "新聞" | "年報";

export type WarehouseDataEntry = {
  id: string;
  category: WarehouseDataCategory;
  title: string;
  industry: string;
  companyLabel: string;
  companyPromptValue: string;
  summary: string;
  source: string;
  url: string;
  recordUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};
