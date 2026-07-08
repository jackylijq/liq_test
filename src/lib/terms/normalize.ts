export function normalizeTermText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function sameMeaning(a: string, b: string): boolean {
  return a.trim() === b.trim();
}
