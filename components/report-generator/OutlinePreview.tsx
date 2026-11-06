"use client";

import type { GeneralDocumentOutline, PurposeDocumentOutline } from "@/types/reportGenerator";
import { OUTLINE_CHANGE_COLORS, OutlineChangeBadge, OutlineChangeText, type OutlineViewMode } from "./OutlineChangeText";

type OutlineContent = { contentTypeId: string; name: string; description: string };
type PreviewSection = {
  heading: string;
  focus: string;
  contents: OutlineContent[];
  focusHint?: string;
  isRequired?: boolean;
  sectionId?: string;
  sectionKey?: string;
  purposeIds?: string[];
  referenceSectionIds?: string[];
  contentTypeIds?: string[];
};
type Pair<T> = { current?: T; previous?: T; currentIndex: number; previousIndex: number };
type ChangeStatus = "added" | "deleted" | "modified" | "unchanged";

function pairItems<T>(
  current: T[], previous: T[], id: (item: T) => string, name: (item: T) => string,
): Pair<T>[] {
  const used = new Set<number>();
  const pairs: Pair<T>[] = current.map((item, currentIndex) => {
    let previousIndex = previous.findIndex((candidate, index) => !used.has(index) && id(candidate) === id(item));
    if (previousIndex < 0) previousIndex = previous.findIndex((candidate, index) => !used.has(index) && name(candidate) === name(item));
    if (previousIndex >= 0) used.add(previousIndex);
    return { current: item, previous: previousIndex >= 0 ? previous[previousIndex] : undefined, currentIndex, previousIndex };
  });
  previous.forEach((item, previousIndex) => {
    if (!used.has(previousIndex)) pairs.push({ current: undefined, previous: item, currentIndex: -1, previousIndex });
  });
  return pairs;
}

function statusOf<T>(pair: Pair<T>, compare: boolean): ChangeStatus {
  if (!compare) return "unchanged";
  if (!pair.current) return "deleted";
  if (!pair.previous) return "added";
  return JSON.stringify(pair.current) !== JSON.stringify(pair.previous) || pair.currentIndex !== pair.previousIndex
    ? "modified" : "unchanged";
}

function DiffField({
  label, current, previous, compare, mode,
}: {
  label: string; current: string; previous?: string; compare: boolean; mode: OutlineViewMode;
}) {
  return <div>
    <h3 className="text-xs font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>{label}</h3>
    <p className="mt-1 whitespace-pre-wrap break-words leading-6"><OutlineChangeText current={current} previous={previous} compare={compare} mode={mode} /></p>
  </div>;
}

function ChangedMetadata({ label, current, previous, compare, mode }: {
  label: string; current: string; previous: string; compare: boolean; mode: OutlineViewMode;
}) {
  if (!compare || mode !== "full" || current === previous) return null;
  return <p className="mt-1 break-words text-xs leading-5">
    <span className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>{label}：</span>
    <OutlineChangeText current={current} previous={previous} compare={compare} mode={mode} showBadge={false} />
  </p>;
}

function ContentList({ current, previous, compare, mode }: {
  current: OutlineContent[]; previous: OutlineContent[]; compare: boolean; mode: OutlineViewMode;
}) {
  const activeComparison = compare && mode !== "latest";
  const pairs = pairItems(current, activeComparison ? previous : [], (item) => item.contentTypeId, (item) => item.name);
  const visible = mode === "full" ? pairs : pairs.filter((pair) => pair.current);
  if (!visible.length) return null;
  return <div className="mt-2 text-xs">
    <span className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>預計內容：</span>
    <ul className="mt-1 list-inside list-disc space-y-1">
      {visible.map((pair, index) => {
        const status = statusOf(pair, activeComparison);
        const name = pair.current?.name ?? "";
        const oldName = pair.previous?.name ?? "";
        const description = pair.current?.description ?? "";
        const oldDescription = pair.previous?.description ?? "";
        return <li key={`${pair.current?.contentTypeId ?? pair.previous?.contentTypeId}-${index}`} className="break-words">
          <OutlineChangeText current={name} previous={oldName} compare={compare} mode={mode} showBadge={false} />
          {description || (mode === "full" && oldDescription) ? <>
            <span style={OUTLINE_CHANGE_COLORS.unchanged}>：</span>
            <OutlineChangeText current={description} previous={oldDescription} compare={compare} mode={mode} showBadge={false} />
          </> : null}
          {compare && mode === "full" && (status === "added" || status === "deleted") ? <OutlineChangeBadge kind={status} /> : null}
        </li>;
      })}
    </ul>
  </div>;
}

function SectionList({ current, previous, compare, mode }: {
  current: PreviewSection[]; previous: PreviewSection[]; compare: boolean; mode: OutlineViewMode;
}) {
  const activeComparison = compare && mode !== "latest";
  const pairs = pairItems(current, activeComparison ? previous : [],
    (item) => item.sectionKey ?? item.sectionId ?? item.heading, (item) => item.heading);
  const visible = mode === "full" ? pairs : pairs.filter((pair) => pair.current);
  return <div>
    <h3 className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>
      章節規劃（<OutlineChangeText current={String(current.length)} previous={compare ? String(previous.length) : undefined} compare={compare} mode={mode} showBadge={false} />）
    </h3>
    {visible.length ? <div className="mt-2 space-y-3">{visible.map((pair, index) => {
      const status = statusOf(pair, activeComparison);
      const section = pair.current;
      const oldSection = pair.previous;
      const currentHint = section?.focusHint && section.focusHint !== section.focus ? section.focusHint : "";
      const previousHint = oldSection?.focusHint && oldSection.focusHint !== oldSection.focus ? oldSection.focusHint : "";
      const borderColor = mode !== "full" ? undefined : status === "added" ? OUTLINE_CHANGE_COLORS.added.color
        : status === "deleted" ? OUTLINE_CHANGE_COLORS.deleted.color
          : status === "modified" ? OUTLINE_CHANGE_COLORS.modified.color : undefined;
      const heading = section?.heading ?? "";
      const oldHeading = oldSection?.heading ?? "";
      return <div
        key={`${section?.sectionKey ?? section?.sectionId ?? oldSection?.sectionKey ?? oldSection?.sectionId ?? index}-${index}`}
        className="rounded-lg border p-3"
        style={{ borderColor }}
      >
        <h4 className="font-medium">
          <span style={OUTLINE_CHANGE_COLORS.unchanged}>{pair.currentIndex >= 0 ? pair.currentIndex + 1 : pair.previousIndex + 1}. </span>
          <OutlineChangeText current={heading} previous={oldHeading} compare={compare} mode={mode} showBadge={false} />
          {compare && mode === "full" && (status === "added" || status === "deleted") ? <OutlineChangeBadge kind={status} /> : null}
        </h4>
        {section?.sectionId || (mode === "full" && oldSection?.sectionId) ? <p className="mt-1 text-xs">
          <OutlineChangeText current={section?.sectionId ?? ""} previous={oldSection?.sectionId} compare={compare} mode={mode} showBadge={false} />
          {section?.isRequired !== undefined || (mode === "full" && oldSection?.isRequired !== undefined) ? <>
            <span style={OUTLINE_CHANGE_COLORS.unchanged}> · </span>
            <OutlineChangeText current={section?.isRequired === undefined ? "" : section.isRequired ? "必要" : "可選"} previous={oldSection?.isRequired === undefined ? "" : oldSection.isRequired ? "必要" : "可選"} compare={compare} mode={mode} showBadge={false} />
          </> : null}
        </p> : null}
        {section?.focus || (mode === "full" && oldSection?.focus) ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
          <span className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>重點：</span>
          <OutlineChangeText current={section?.focus ?? ""} previous={oldSection?.focus} compare={compare} mode={mode} />
        </p> : null}
        {currentHint || (mode === "full" && previousHint) ? <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">
          <span className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>規劃提示：</span>
          <OutlineChangeText current={currentHint} previous={previousHint} compare={compare} mode={mode} />
        </p> : null}
        <ChangedMetadata label="用途關聯" current={(section?.purposeIds ?? []).join("、")} previous={(oldSection?.purposeIds ?? []).join("、")} compare={compare} mode={mode} />
        <ChangedMetadata label="參考章節" current={(section?.referenceSectionIds ?? []).join("、")} previous={(oldSection?.referenceSectionIds ?? []).join("、")} compare={compare} mode={mode} />
        <ChangedMetadata label="內容類型" current={(section?.contentTypeIds ?? []).join("、")} previous={(oldSection?.contentTypeIds ?? []).join("、")} compare={compare} mode={mode} />
        <ContentList current={section?.contents ?? []} previous={oldSection?.contents ?? []} compare={compare} mode={mode} />
        {pair.currentIndex >= 0 && pair.previousIndex >= 0 && pair.currentIndex !== pair.previousIndex && mode === "full" ? <p className="mt-2 text-xs" style={OUTLINE_CHANGE_COLORS.modified}>章節順序由 {pair.previousIndex + 1} 調整為 {pair.currentIndex + 1}</p> : null}
      </div>;
    })}</div> : <p className="mt-2 text-xs" style={OUTLINE_CHANGE_COLORS.unchanged}>本版沒有章節。</p>}
  </div>;
}

export function OutlinePreview({
  purposeOutline, generalOutline, previousPurposeOutline, previousGeneralOutline, compare, mode,
}: {
  purposeOutline: PurposeDocumentOutline | null;
  generalOutline: GeneralDocumentOutline | null;
  previousPurposeOutline: PurposeDocumentOutline | null;
  previousGeneralOutline: GeneralDocumentOutline | null;
  compare: boolean;
  mode: OutlineViewMode;
}) {
  const outline = purposeOutline ?? generalOutline;
  if (!outline) return <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">先在聊天視窗描述報告需求，這裡會顯示可修改的大綱。</div>;

  const previous = purposeOutline ? previousPurposeOutline : previousGeneralOutline;
  const replacedOutline = purposeOutline
    ? !previousPurposeOutline ? previousGeneralOutline : null
    : !previousGeneralOutline ? previousPurposeOutline : null;
  const currentSections = outline.sections as PreviewSection[];
  const previousSections = (previous?.sections ?? []) as PreviewSection[];
  const purposePairs = purposeOutline
    ? pairItems(purposeOutline.purposes, compare && mode !== "latest" ? previousPurposeOutline?.purposes ?? [] : [],
      (item) => item.purposeId, (item) => item.description)
    : [];
  const visiblePurposes = mode === "full" ? purposePairs : purposePairs.filter((pair) => pair.current);

  return <div className="mt-5 space-y-5 text-sm">
    {compare && mode === "full" && replacedOutline ? <div className="rounded-lg border p-3 text-xs" style={{ ...OUTLINE_CHANGE_COLORS.deleted, borderColor: OUTLINE_CHANGE_COLORS.deleted.color }}>
      上一版大綱已替換：{replacedOutline.title}<OutlineChangeBadge kind="deleted" />
    </div> : null}
    <div className="space-y-3 rounded-lg bg-secondary p-4">
      <span className="text-xs font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>{purposeOutline ? "統一文件大綱" : generalOutline?.documentTypeName}</span>
      {generalOutline ? <DiffField label="文件類型" current={`${generalOutline.documentTypeId} ${generalOutline.documentTypeName}`} previous={previousGeneralOutline ? `${previousGeneralOutline.documentTypeId} ${previousGeneralOutline.documentTypeName}` : undefined} compare={compare} mode={mode} /> : null}
      <DiffField label="標題" current={outline.title} previous={previous?.title} compare={compare} mode={mode} />
      <DiffField label="對象" current={outline.subject} previous={previous?.subject} compare={compare} mode={mode} />
      <DiffField label="期間" current={outline.period} previous={previous?.period} compare={compare} mode={mode} />
    </div>
    {purposeOutline && visiblePurposes.length ? <div>
      <h3 className="font-semibold" style={OUTLINE_CHANGE_COLORS.unchanged}>文件用途</h3>
      <ul className="mt-2 list-inside list-disc space-y-1">{visiblePurposes.map((pair, index) => {
        const status = statusOf(pair, compare);
        return <li key={`${pair.current?.purposeId ?? pair.previous?.purposeId}-${index}`}>
          <OutlineChangeText current={pair.current?.description ?? ""} previous={pair.previous?.description} compare={compare} mode={mode} showBadge={false} />
          {compare && mode === "full" && (status === "added" || status === "deleted") ? <OutlineChangeBadge kind={status} /> : null}
          <ChangedMetadata label="規劃方式" current={pair.current?.planningMode ?? ""} previous={pair.previous?.planningMode ?? ""} compare={compare} mode={mode} />
          <ChangedMetadata label="參考範本" current={(pair.current?.referenceTemplateIds ?? []).join("、")} previous={(pair.previous?.referenceTemplateIds ?? []).join("、")} compare={compare} mode={mode} />
        </li>;
      })}</ul>
    </div> : null}
    <DiffField label="文件目的" current={outline.objective} previous={previous?.objective} compare={compare} mode={mode} />
    <SectionList current={currentSections} previous={previousSections} compare={compare} mode={mode} />
    <DiffField label="資料來源規劃" current={outline.sourcePlan} previous={previous?.sourcePlan} compare={compare} mode={mode} />
  </div>;
}
