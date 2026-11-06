"use client";

import { useMemo } from "react";

export type OutlineViewMode = "latest" | "changes" | "full";
type ChangeKind = "added" | "deleted" | "unchanged";
type TextPart = { text: string; kind: ChangeKind };

export const OUTLINE_CHANGE_COLORS = {
  added: { color: "#15803D", backgroundColor: "#DCFCE7" },
  deleted: { color: "#B91C1C", backgroundColor: "#FEE2E2" },
  modified: { color: "#92400E", backgroundColor: "#FEF3C7" },
  unchanged: { color: "#374151", backgroundColor: "transparent" },
} as const;

function changedTextParts(previous: string, current: string): TextPart[] {
  if (previous === current) return current ? [{ text: current, kind: "unchanged" }] : [];
  if (!previous) return current ? [{ text: current, kind: "added" }] : [];
  if (!current) return [{ text: previous, kind: "deleted" }];

  const before = Array.from(previous);
  const after = Array.from(current);
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < before.length - prefix && suffix < after.length - prefix &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]
  ) suffix += 1;

  const oldMiddle = before.slice(prefix, before.length - suffix);
  const newMiddle = after.slice(prefix, after.length - suffix);
  const parts: TextPart[] = [];
  const append = (text: string, kind: ChangeKind) => {
    if (!text) return;
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += text;
    else parts.push({ text, kind });
  };
  append(before.slice(0, prefix).join(""), "unchanged");

  // Bound work for unusually long source plans; ordinary outline fields get a character-level diff.
  if (oldMiddle.length * newMiddle.length > 500_000) {
    append(oldMiddle.join(""), "deleted");
    append(newMiddle.join(""), "added");
  } else {
    const width = newMiddle.length + 1;
    const longest = new Uint16Array((oldMiddle.length + 1) * width);
    for (let oldIndex = oldMiddle.length - 1; oldIndex >= 0; oldIndex -= 1) {
      for (let newIndex = newMiddle.length - 1; newIndex >= 0; newIndex -= 1) {
        const cell = oldIndex * width + newIndex;
        longest[cell] = oldMiddle[oldIndex] === newMiddle[newIndex]
          ? 1 + longest[(oldIndex + 1) * width + newIndex + 1]
          : Math.max(longest[(oldIndex + 1) * width + newIndex], longest[cell + 1]);
      }
    }
    let oldIndex = 0;
    let newIndex = 0;
    while (oldIndex < oldMiddle.length || newIndex < newMiddle.length) {
      if (oldIndex < oldMiddle.length && newIndex < newMiddle.length && oldMiddle[oldIndex] === newMiddle[newIndex]) {
        append(newMiddle[newIndex], "unchanged");
        oldIndex += 1;
        newIndex += 1;
      } else if (
        oldIndex < oldMiddle.length &&
        (newIndex === newMiddle.length || longest[(oldIndex + 1) * width + newIndex] >= longest[oldIndex * width + newIndex + 1])
      ) {
        append(oldMiddle[oldIndex], "deleted");
        oldIndex += 1;
      } else {
        append(newMiddle[newIndex], "added");
        newIndex += 1;
      }
    }
  }
  append(after.slice(after.length - suffix).join(""), "unchanged");
  return parts;
}

export function OutlineChangeBadge({ kind }: { kind: "added" | "deleted" }) {
  const label = kind === "added" ? "新增" : "刪除";
  return <span className="ml-1 inline-block rounded px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-none" style={OUTLINE_CHANGE_COLORS[kind]}>{label}</span>;
}

export function OutlineChangeText({
  current,
  previous,
  compare,
  mode = "full",
  showBadge = true,
}: {
  current: string;
  previous?: string;
  compare: boolean;
  mode?: OutlineViewMode;
  showBadge?: boolean;
}) {
  const parts = useMemo(
    () => compare && mode !== "latest"
      ? changedTextParts(previous ?? "", current)
      : current ? [{ text: current, kind: "unchanged" as const }] : [],
    [compare, current, mode, previous],
  );
  const kind = !compare || mode !== "full" || current === (previous ?? "")
    ? null
    : !previous ? "added" : !current ? "deleted" : null;
  return <>
    {parts.filter((part) => mode !== "changes" || part.kind !== "deleted").map((part, index) => (
      <span
        key={index}
        className={part.kind === "unchanged" ? "" : "rounded-sm px-0.5"}
        style={{
          ...OUTLINE_CHANGE_COLORS[part.kind],
          ...(part.kind === "deleted" ? { textDecoration: "line-through" } : {}),
        }}
      >{part.text}</span>
    ))}
    {showBadge && kind ? <OutlineChangeBadge kind={kind} /> : null}
  </>;
}
