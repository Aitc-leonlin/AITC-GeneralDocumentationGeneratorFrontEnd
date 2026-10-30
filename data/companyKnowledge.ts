export type CompanyOption = {
  label: string;
  promptValue: string;
  industry: string;
  imagePath: string;
};


export const COMPANY_OPTIONS: CompanyOption[] = [
  /* 暫時停用：不在「16間公司2024:2025財務報表」測試資料內。
  {
    label: "士林電機廠股份有限公司 / 1503 / 士電",
    promptValue: "士林電機廠股份有限公司(1503.TW)",
    industry: "機電設備",
    imagePath: "/images/report-generator-companies/ShihlinElectricAndEngineering.png",
  },
  {
    label: "正道工業股份有限公司 / 1506 / 正道",
    promptValue: "正道工業股份有限公司(1506.TW)",
    industry: "汽車工業",
    imagePath: "/images/report-generator-companies/RightWayIndustrial.jpg",
  },
  {
    label: "杏輝藥品工業股份有限公司 / 1734 / 杏輝",
    promptValue: "杏輝藥品工業股份有限公司(1734.TW)",
    industry: "生技醫療",
    imagePath: "/images/report-generator-companies/SinpharPharmaceutical.png",
  },
  {
    label: "聯華電子股份有限公司 / 2303 / 聯電",
    promptValue: "聯華電子股份有限公司(2303.TW)",
    industry: "半導體",
    imagePath: "/images/report-generator-companies/UnitedMicroelectronics.png",
  },
  {
    label: "華邦電子股份有限公司 / 2344 / 華邦電",
    promptValue: "華邦電子股份有限公司(2344.TW)",
    industry: "半導體",
    imagePath: "/images/report-generator-companies/WinbondElectronics.png",
  },
  {
    label: "佳能企業股份有限公司 / 2374 / 佳能",
    promptValue: "佳能企業股份有限公司(2374.TW)",
    industry: "電子零組件",
    imagePath: "/images/report-generator-companies/AbilityEnterprise.png",
  },
  {
    label: "億光電子工業股份有限公司 / 2393 / 億光",
    promptValue: "億光電子工業股份有限公司(2393.TW)",
    industry: "電子零組件",
    imagePath: "/images/report-generator-companies/EverlightElectronics.png",
  },
  {
    label: "晶華國際酒店股份有限公司 / 2707 / 晶華",
    promptValue: "晶華國際酒店股份有限公司(2707.TW)",
    industry: "觀光旅遊",
    imagePath: "/images/report-generator-companies/FormosaInternationalHotels.png",
  },
  {
    label: "雄獅旅行社股份有限公司 / 2731 / 雄獅",
    promptValue: "雄獅旅行社股份有限公司(2731.TW)",
    industry: "觀光旅遊",
    imagePath: "/images/report-generator-companies/LionTravelService.jpg",
  },
  {
    label: "全宇生技控股有限公司 / 4148 / 全宇生技-KY",
    promptValue: "全宇生技控股有限公司(4148.TW)",
    industry: "生技醫療",
    imagePath: "/images/report-generator-companies/AllCosmosBioTechHolding.jpeg",
  },
  {
    label: "臺灣水泥股份有限公司 / 1101 / 台泥",
    promptValue: "臺灣水泥股份有限公司(1101.TW)",
    industry: "水泥建材",
    imagePath: "/images/report-generator-companies/TaiwanCement.png.png",
  },
  */
  {
    label: "新光產物保險股份有限公司 / 2850 / 新產",
    promptValue: "新光產物保險股份有限公司(2850.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/ShinkongInsurance.png",
  },
  {
    label: "中央再保險股份有限公司 / 2851 / 中再保",
    promptValue: "中央再保險股份有限公司(2851.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/CentralReinsurance.png",
  },
  {
    label: "第一產物保險股份有限公司 / 2852 / 第一保",
    promptValue: "第一產物保險股份有限公司(2852.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/FirstInsurance.png",
  },
  {
    label: "三商美邦人壽保險股份有限公司 / 2867 / 三商壽",
    promptValue: "三商美邦人壽保險股份有限公司(2867.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/MercuriesLifeInsurance.png",
  },
  {
    label: "兆豐產物保險股份有限公司 / 5834 / 兆豐保險",
    promptValue: "兆豐產物保險股份有限公司(5834.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/MegaInsurance.png",
  },
  {
    label: "新光人壽保險股份有限公司 / 6985 / 台新人壽",
    promptValue: "新光人壽保險股份有限公司(6985.TW)",
    industry: "金融保險",
    imagePath: "/images/report-generator-companies/TaishinLifeInsurance.png",
  },
  {
    label: "新光合成纖維股份有限公司 / 1409 / 新纖",
    promptValue: "新光合成纖維股份有限公司(1409.TW)",
    industry: "紡織纖維",
    imagePath: "/images/report-generator-companies/ShinkongSyntheticFibers.png",
  },
  {
    label: "中國人造纖維股份有限公司 / 1718 / 中纖",
    promptValue: "中國人造纖維股份有限公司(1718.TW)",
    industry: "紡織纖維",
    imagePath: "/images/report-generator-companies/ChinaManMadeFiber.png",
  },
  {
    label: "和泰汽車股份有限公司 / 2207 / 和泰車",
    promptValue: "和泰汽車股份有限公司(2207.TW)",
    industry: "汽車工業",
    imagePath: "/images/report-generator-companies/HotaiMotor.png",
  },
  {
    label: "三商投資控股股份有限公司 / 2905 / 三商",
    promptValue: "三商投資控股股份有限公司(2905.TW)",
    industry: "貿易百貨",
    imagePath: "/images/report-generator-companies/MercuriesAndAssociatesHolding.png",
  },
  {
    label: "華新麗華股份有限公司 / 1605 / 華新",
    promptValue: "華新麗華股份有限公司(1605.TW)",
    industry: "電線電纜",
    imagePath: "/images/report-generator-companies/WalsinLihwa.png",
  },
  {
    label: "中華電信股份有限公司 / 2412 / 中華電",
    promptValue: "中華電信股份有限公司(2412.TW)",
    industry: "通信網路",
    imagePath: "/images/report-generator-companies/ChunghwaTelecom.png",
  },
  {
    label: "揚智科技股份有限公司 / 3041 / 揚智",
    promptValue: "揚智科技股份有限公司(3041.TW)",
    industry: "半導體",
    imagePath: "/images/report-generator-companies/ALiCorporation.png",
  },
  {
    label: "聯鈞光電股份有限公司 / 3450 / 聯鈞",
    promptValue: "聯鈞光電股份有限公司(3450.TW)",
    industry: "光電",
    imagePath: "/images/report-generator-companies/EliteAdvancedLaser.jpg",
  },
  {
    label: "安馳科技股份有限公司 / 3528 / 安馳",
    promptValue: "安馳科技股份有限公司(3528.TW)",
    industry: "電子通路",
    imagePath: "",
  },
  {
    label: "鑫科材料科技股份有限公司 / 3663 / 鑫科",
    promptValue: "鑫科材料科技股份有限公司(3663.TW)",
    industry: "光電",
    imagePath: "",
  },
  /* 暫時停用：不在「16間公司2024:2025財務報表」測試資料內。
  {
    label: "基泰建設股份有限公司 / 2538 / 基泰",
    promptValue: "基泰建設股份有限公司(2538.TW)",
    industry: "建設營造",
    imagePath: "/images/report-generator-companies/KeeTaiProperties.jpg",
  },
  {
    label: "東元電機股份有限公司 / 1504 / 東元",
    promptValue: "東元電機股份有限公司(1504.TW)",
    industry: "機電設備",
    imagePath: "/images/report-generator-companies/TECOElectricAndMachinery.png",
  },
  {
    label: "誠美材料科技股份有限公司 / 4960 / 誠美材",
    promptValue: "誠美材料科技股份有限公司(4960.TW)",
    industry: "光電",
    imagePath: "/images/report-generator-companies/ChengMeiMaterialsTechnology.png",
  },
  {
    label: "葡萄王生技股份有限公司 / 1707 / 葡萄王",
    promptValue: "葡萄王生技股份有限公司(1707.TW)",
    industry: "生技醫療",
    imagePath: "/images/report-generator-companies/GrapeKingBio.png",
  },
  {
    label: "山富國際旅行社股份有限公司 / 2743 / 山富",
    promptValue: "山富國際旅行社股份有限公司(2743.TW)",
    industry: "觀光旅遊",
    imagePath: "/images/report-generator-companies/RichmondInternationalTravelAndTours.png",
  },
  {
    label: "群創光電股份有限公司 / 3481 / 群創",
    promptValue: "群創光電股份有限公司(3481.TW)",
    industry: "光電",
    imagePath: "/images/report-generator-companies/Innolux.jpg",
  },
  {
    label: "世界先進積體電路股份有限公司 / 5347 / 世界",
    promptValue: "世界先進積體電路股份有限公司(5347.TW)",
    industry: "半導體",
    imagePath: "/images/report-generator-companies/VanguardInternationalSemiconductor.png",
  },
  {
    label: "台灣積體電路製造股份有限公司 / 2330 / 台積電",
    promptValue: "台灣積體電路製造股份有限公司(2330.TW)",
    industry: "半導體",
    imagePath: "/images/report-generator-companies/TaiwanSemiconductorManufacturingCompany.png",
  },
  */
];

export const INDUSTRY_OPTIONS = Array.from(
  new Set(COMPANY_OPTIONS.map((option) => option.industry)),
).sort((left, right) => left.localeCompare(right, "zh-Hant"));

export function getCompanyPromptValue(companyLabel: string) {
  if (!companyLabel) return "";
  return (
    COMPANY_OPTIONS.find((option) => option.label === companyLabel)?.promptValue ??
    companyLabel
  );
}

export function getCompanyByLabel(companyLabel: string) {
  return COMPANY_OPTIONS.find((option) => option.label === companyLabel) ?? null;
}

export function getCompaniesByIndustry(industry: string) {
  if (!industry) return COMPANY_OPTIONS;
  return COMPANY_OPTIONS.filter((option) => option.industry === industry);
}
