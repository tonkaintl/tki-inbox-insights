// Email parsing utilities and constants

// Emoji regex patterns for removal
export const EMOJI_PATTERNS = {
  // Main emoji ranges
  EMOTICONS: /[\u{1F600}-\u{1F64F}]/gu, // Emoticons
  SYMBOLS: /[\u{1F300}-\u{1F5FF}]/gu, // Misc Symbols and Pictographs
  TRANSPORT: /[\u{1F680}-\u{1F6FF}]/gu, // Transport and Map Symbols
  FLAGS: /[\u{1F1E0}-\u{1F1FF}]/gu, // Regional Indicator Symbols (flags)
  MISC_SYMBOLS: /[\u{2600}-\u{26FF}]/gu, // Misc symbols
  DINGBATS: /[\u{2700}-\u{27BF}]/gu, // Dingbats
  // Additional emoji patterns
  SUPPLEMENTAL: /[\u{1F900}-\u{1F9FF}]/gu, // Supplemental Symbols and Pictographs
  EXTENDED_A: /[\u{1FA70}-\u{1FAFF}]/gu, // Symbols and Pictographs Extended-A
} as const;

// Combined emoji removal regex
export const ALL_EMOJIS_REGEX = new RegExp(
  Object.values(EMOJI_PATTERNS)
    .map((pattern) => pattern.source)
    .join("|"),
  "gu"
);

/**
 * Remove all emojis from text and normalize whitespace
 */
export function stripEmojis(text: string): string {
  return text.replace(ALL_EMOJIS_REGEX, "").replace(/\s+/g, " ").trim();
}

/**
 * Decode UTF-8 encoded email subjects like =?UTF-8?B?8J+OrA==?=
 */
export function decodeSubject(subject: string): string {
  return subject.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, base64) => {
    try {
      return Buffer.from(base64, "base64").toString("utf-8");
    } catch {
      return subject;
    }
  });
}

/**
 * Decode quoted-printable encoding commonly used in emails
 */
export function decodeQuotedPrintable(input: string): string {
  return (
    input
      // Decode =XX hex sequences
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      // Handle soft line breaks (= at end of line)
      .replace(/=\r?\n/g, "")
      // Decode =3D sequences (= signs)
      .replace(/=3D/g, "=")
      // Clean up any remaining encoding artifacts
      .replace(/=\r?\n/g, "")
  );
}

/**
 * Generate a unique object ID for grouping related content sections
 */
export function generateObjectId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date consistently between server and client to prevent hydration mismatches
 * Uses ISO format which is consistent across environments
 */
export function formatDateConsistently(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Use ISO string and extract just the date part, then format manually
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  } catch {
    return dateString; // Return original if parsing fails
  }
}
