export function parseMetricIds(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const idList = trimmed.match(/^([A-Z]\d{5}_\d{3}E)(\s*,\s*[A-Z]\d{5}_\d{3}E)*$/i);
  if (!idList) return [];
  return trimmed.split(/\s*,\s*/);
}

export function parseActionQuery(input: string): string | null {
  const match = input.trim().match(/^(add|map|show)\s+([^?!.]+)$/i);
  if (!match) return null;
  const rest = match[2].trim();
  const words = rest.split(/\s+/);
  if (words.length < 1 || words.length > 7) return null;
  return rest;
}
