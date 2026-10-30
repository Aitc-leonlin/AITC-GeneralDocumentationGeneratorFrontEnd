export type MetricFormulaItem = {
  metricName: string;
  metricNameEn: string;
  metricAbbr: string;
  formula: string;
  analysisPurpose: string;
  keyInsight: string;
  example: string;
};

export type MetricFormulaCategoryKey =
  | "solvency_analysis"
  | "capital_structure_analysis"
  | "operating_efficiency_analysis"
  | "profitability_analysis";

export type MetricFormulaCategory = {
  key: MetricFormulaCategoryKey;
  label: string;
};

export type MetricFormulaMap = Record<
  MetricFormulaCategoryKey,
  MetricFormulaItem[]
>;

export const METRIC_FORMULA_CATEGORIES: MetricFormulaCategory[] = [
  { key: "solvency_analysis", label: "償債能力分析" },
  { key: "capital_structure_analysis", label: "資本結構分析" },
  { key: "operating_efficiency_analysis", label: "經營效率分析" },
  { key: "profitability_analysis", label: "獲利能力分析" },
];

export const METRIC_FORMULAS: MetricFormulaMap = {
  solvency_analysis: [
    {
      metricName: "流動比率",
      metricNameEn: "Current Ratio",
      metricAbbr: "CR",
      formula: "流動資產 / 流動負債",
      analysisPurpose: "衡量公司短期償債能力",
      keyInsight: "比率過低可能代表短期資金壓力較高",
      example:
        "例如：流動資產 520 億元、流動負債 260 億元，CR = 2.0 倍，代表每 1 元短期負債有 2 元流動資產支應。",
    },
    {
      metricName: "速動比率",
      metricNameEn: "Quick Ratio",
      metricAbbr: "QR",
      formula: "(流動資產 - 存貨) / 流動負債",
      analysisPurpose: "衡量扣除存貨後之即時償債能力",
      keyInsight: "較能反映實際短期流動性",
      example:
        "例如：流動資產 520 億元、存貨 140 億元、流動負債 260 億元，QR = 1.46 倍。",
    },
    {
      metricName: "負債比率",
      metricNameEn: "Debt Ratio",
      metricAbbr: "DR",
      formula: "總負債 / 總資產",
      analysisPurpose: "衡量企業財務槓桿程度",
      keyInsight: "比率過高代表財務風險較高",
      example:
        "例如：總負債 780 億元、總資產 1,500 億元，DR = 52.0%，代表資產中約一半由負債支應。",
    },
    {
      metricName: "利息保障倍數",
      metricNameEn: "Interest Coverage Ratio",
      metricAbbr: "ICR",
      formula: "EBIT / 利息費用",
      analysisPurpose: "衡量公司支付利息能力",
      keyInsight: "倍數過低可能影響後續償債能力",
      example:
        "例如：EBIT 96 億元、利息費用 12 億元，ICR = 8.0 倍，表示本業獲利足以覆蓋利息支出。",
    },
    {
      metricName: "現金流量比率",
      metricNameEn: "Cash Flow Ratio",
      metricAbbr: "CFR",
      formula: "營業活動現金流量 / 流動負債",
      analysisPurpose: "衡量現金流支應短期負債能力",
      keyInsight: "能反映實際現金償債能力",
      example:
        "例如：營業活動現金流量 88 億元、流動負債 260 億元，CFR = 33.8%。",
    },
  ],
  capital_structure_analysis: [
    {
      metricName: "股東權益比率",
      metricNameEn: "Equity Ratio",
      metricAbbr: "ER",
      formula: "股東權益 / 總資產",
      analysisPurpose: "衡量自有資本占資產比重",
      keyInsight: "比率越高通常財務結構越穩定",
      example:
        "例如：股東權益 720 億元、總資產 1,500 億元，ER = 48.0%。",
    },
    {
      metricName: "營業活動現金流量比率",
      metricNameEn: "Operating Cash Flow Ratio",
      metricAbbr: "OCFR",
      formula: "營業活動現金流量 / 總負債",
      analysisPurpose: "衡量現金流支應負債能力",
      keyInsight: "能反映企業實際還款能力",
      example:
        "例如：營業活動現金流量 88 億元、總負債 780 億元，OCFR = 11.3%。",
    },
    {
      metricName: "現金週轉週期",
      metricNameEn: "Cash Conversion Cycle",
      metricAbbr: "CCC",
      formula: "存貨週轉天數 + 應收帳款週轉天數 - 應付帳款週轉天數",
      analysisPurpose: "衡量營運資金占用期間",
      keyInsight: "天數越短通常代表資金效率越佳",
      example:
        "例如：存貨週轉天數 62 天、應收帳款週轉天數 48 天、應付帳款週轉天數 36 天，CCC = 74 天。",
    },
    {
      metricName: "長期資金佔不動產設備比率",
      metricNameEn: "Fixed Asset to Long-term Capital Ratio",
      metricAbbr: "FALCR",
      formula: "(股東權益 + 長期負債) / 不動產、廠房及設備",
      analysisPurpose: "衡量長期資金支應固定資產能力",
      keyInsight: "避免短支長用情況",
      example:
        "例如：股東權益 720 億元、長期負債 260 億元、PPE 840 億元，FALCR = 1.17 倍。",
    },
  ],
  operating_efficiency_analysis: [
    {
      metricName: "總資產週轉率",
      metricNameEn: "Total Asset Turnover",
      metricAbbr: "TAT",
      formula: "營業收入 / 平均總資產",
      analysisPurpose: "衡量資產使用效率",
      keyInsight: "比率越高代表資產運用效率越佳",
      example:
        "例如：全年營業收入 1,200 億元、平均總資產 1,500 億元，TAT = 0.80 倍。",
    },
    {
      metricName: "存貨週轉率",
      metricNameEn: "Inventory Turnover",
      metricAbbr: "ITR",
      formula: "營業成本 / 平均存貨",
      analysisPurpose: "衡量存貨銷售效率",
      keyInsight: "週轉變慢可能代表庫存壓力",
      example:
        "例如：營業成本 780 億元、平均存貨 130 億元，ITR = 6.0 倍，約等於 61 天存貨週轉。",
    },
    {
      metricName: "應收帳款週轉率",
      metricNameEn: "Accounts Receivable Turnover",
      metricAbbr: "ART",
      formula: "營業收入 / 平均應收帳款",
      analysisPurpose: "衡量收款效率",
      keyInsight: "週轉下降需留意收款品質",
      example:
        "例如：營業收入 1,200 億元、平均應收帳款 160 億元，ART = 7.5 倍，約等於 49 天收款。",
    },
    {
      metricName: "應付帳款週轉率",
      metricNameEn: "Accounts Payable Turnover",
      metricAbbr: "APT",
      formula: "進貨成本 / 平均應付帳款",
      analysisPurpose: "衡量付款效率",
      keyInsight: "過低可能代表資金壓力",
      example:
        "例如：進貨成本 720 億元、平均應付帳款 72 億元，APT = 10.0 倍，約等於 36 天付款。",
    },
  ],
  profitability_analysis: [
    {
      metricName: "毛利率",
      metricNameEn: "Gross Margin",
      metricAbbr: "GM",
      formula: "毛利 / 營業收入",
      analysisPurpose: "衡量產品基本獲利能力",
      keyInsight: "下降可能代表價格競爭或成本上升",
      example:
        "例如：營業收入 1,200 億元、毛利 420 億元，GM = 35.0%。",
    },
    {
      metricName: "營業利益率",
      metricNameEn: "Operating Margin",
      metricAbbr: "OPM",
      formula: "營業利益 / 營業收入",
      analysisPurpose: "衡量本業獲利能力",
      keyInsight: "可觀察營運效率變化",
      example:
        "例如：營業利益 168 億元、營業收入 1,200 億元，OPM = 14.0%。",
    },
    {
      metricName: "純益率",
      metricNameEn: "Net Profit Margin",
      metricAbbr: "NPM",
      formula: "稅後淨利 / 營業收入",
      analysisPurpose: "衡量最終獲利能力",
      keyInsight: "反映整體經營成果",
      example:
        "例如：稅後淨利 126 億元、營業收入 1,200 億元，NPM = 10.5%。",
    },
    {
      metricName: "股東權益報酬率(ROE)",
      metricNameEn: "Return on Equity",
      metricAbbr: "ROE",
      formula: "稅後淨利 / 平均股東權益",
      analysisPurpose: "衡量股東資本報酬",
      keyInsight: "為法人常用核心獲利指標",
      example:
        "例如：稅後淨利 126 億元、平均股東權益 700 億元，ROE = 18.0%。",
    },
    {
      metricName: "資產報酬率(ROA)",
      metricNameEn: "Return on Assets",
      metricAbbr: "ROA",
      formula: "(稅後淨利 + 利息費用 × (1 - 稅率)) / 平均總資產",
      analysisPurpose: "衡量資產整體使用效益",
      keyInsight: "可排除部分財務槓桿影響",
      example:
        "例如：稅後淨利 126 億元、利息費用 12 億元、稅率 20%、平均總資產 1,500 億元，ROA 約為 9.0%。",
    },
    {
      metricName: "每股盈餘(EPS)",
      metricNameEn: "Earnings Per Share",
      metricAbbr: "EPS",
      formula: "(稅後淨利 - 特別股股利) / 流通在外股數",
      analysisPurpose: "衡量每股獲利能力",
      keyInsight: "常用於投資與估值分析",
      example:
        "例如：稅後淨利 126 億元、特別股股利 0 元、流通在外股數 52 億股，EPS 約為 2.42 元。",
    },
    {
      metricName: "EBITDA 利潤率",
      metricNameEn: "EBITDA Margin",
      metricAbbr: "EBITDA Margin",
      formula: "EBITDA / 營業收入",
      analysisPurpose: "衡量核心營運現金創造能力",
      keyInsight: "常用於資本密集產業分析",
      example:
        "例如：EBITDA 240 億元、營業收入 1,200 億元，EBITDA Margin = 20.0%。",
    },
  ],
};

export function getMetricFormulasByCategory(
  category: MetricFormulaCategoryKey,
) {
  return METRIC_FORMULAS[category];
}

export function getMetricFormulaCategoryLabel(
  category: MetricFormulaCategoryKey,
) {
  return (
    METRIC_FORMULA_CATEGORIES.find((item) => item.key === category)?.label ??
    category
  );
}

export function getAllMetricFormulas() {
  return METRIC_FORMULAS;
}
