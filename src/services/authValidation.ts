export const MIN_PASSWORD_LENGTH = 6;

export const normalizeAuthEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const isValidAuthEmail = (value: unknown): boolean => {
  const email = normalizeAuthEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidAuthPassword = (value: unknown): boolean =>
  typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH;
