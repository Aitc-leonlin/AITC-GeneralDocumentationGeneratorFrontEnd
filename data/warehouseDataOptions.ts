import type { WarehouseDataCategory } from "@/types/warehouseData";

export const WAREHOUSE_DATA_ALL_COMPANY_VALUE = "All";

export const WAREHOUSE_DATA_CATEGORIES = [
  "負面消息",
  "新聞",
  "年報",
] as const satisfies readonly WarehouseDataCategory[];

export const DEFAULT_WAREHOUSE_DATA_CATEGORY =
  WAREHOUSE_DATA_CATEGORIES[0];
