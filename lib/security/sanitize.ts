/**
 * User content is stored as plain text and always rendered through React (which
 * escapes it) or escaped explicitly for email HTML. These helpers normalise input
 * before storage: strip control characters and tags, collapse whitespace, cap length.
 */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAGS = /<\/?[a-z][^>]*>/gi;

export function cleanText(input: string, maxLength = 5000): string {
  return input.replace(CONTROL, "").replace(TAGS, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxLength);
}

export function cleanLine(input: string, maxLength = 200): string {
  return cleanText(input, maxLength).replace(/\s+/g, " ");
}

export function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Normalise a US phone number to E.164 where possible. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return input.trim();
}
