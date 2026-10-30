function buildSchemaSegment(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

export function buildExpertKnowledgeSourceSchemaKey(
  dataSource: string,
  industry: string,
  companyLabel: string,
) {
  return `expert_knowledge.${buildSchemaSegment(dataSource)}.${buildSchemaSegment(industry)}.${buildSchemaSegment(companyLabel)}`;
}
