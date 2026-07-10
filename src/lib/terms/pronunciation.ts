export function buildPronunciationAudioUrl(text: string) {
  return `/api/tts?text=${encodeURIComponent(text)}`;
}
