export function normalizeTermText(text: string): string {
  return text
    .trim()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/，/g, ",")
    .replace(/。/g, ".")
    .replace(/？/g, "?")
    .replace(/！/g, "!")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?])(?=\S)/g, "$1 ")
    .trim()
    .toLowerCase();
}

export function sameMeaning(a: string, b: string): boolean {
  return a.trim() === b.trim();
}
