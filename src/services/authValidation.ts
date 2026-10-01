const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export function normalizeAuthEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidAuthEmail(value: unknown): boolean {
  return EMAIL_PATTERN.test(normalizeAuthEmail(value));
}

export function isValidAuthPassword(value: unknown): boolean {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH;
}
