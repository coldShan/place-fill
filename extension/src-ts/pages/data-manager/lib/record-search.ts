import { FIELD_KEYS, type ProfileFieldMap } from "../page-model";

export type HighlightSegment = { text: string; match: boolean };

export function tokenizeQuery(query: string): string[] {
  return String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesQuery(profile: ProfileFieldMap, extraTexts: string[], query: string): boolean {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return true;
  const haystack = FIELD_KEYS.map(function (fieldKey) {
    return profile[fieldKey];
  })
    .concat(extraTexts)
    .join("\n")
    .toLowerCase();
  return tokens.every(function (token) {
    return haystack.includes(token);
  });
}

export function splitHighlight(text: string, query: string): HighlightSegment[] {
  const value = String(text || "");
  const tokens = tokenizeQuery(query);
  if (!value || !tokens.length) return [{ text: value, match: false }];
  const lower = value.toLowerCase();
  const marks = new Array<boolean>(value.length).fill(false);
  tokens.forEach(function (token) {
    let index = lower.indexOf(token);
    while (index >= 0) {
      for (let offset = 0; offset < token.length; offset += 1) marks[index + offset] = true;
      index = lower.indexOf(token, index + token.length);
    }
  });
  const segments: HighlightSegment[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const match = !!marks[index];
    const last = segments[segments.length - 1];
    if (last && last.match === match) {
      last.text += value[index];
    } else {
      segments.push({ text: value[index] || "", match });
    }
  }
  return segments;
}
