export function normalizePlatformAdminEmails(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined, allowedEmails: string[]): boolean {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return Boolean(normalizedEmail && allowedEmails.includes(normalizedEmail));
}
