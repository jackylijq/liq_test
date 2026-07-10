export function isPlaceholderPhonetic(termText: string, phoneticSymbol: string | null | undefined) {
  const normalizedPhonetic = phoneticSymbol?.replace(/^\/|\/$/g, "").trim().toLowerCase();
  return Boolean(normalizedPhonetic && normalizedPhonetic === termText.trim().toLowerCase());
}

export function choosePhoneticSymbol(termText: string, existing: string | null | undefined, incoming: string | null | undefined) {
  if (incoming?.trim()) return incoming;
  if (!existing) return null;
  return isPlaceholderPhonetic(termText, existing) ? null : existing;
}
