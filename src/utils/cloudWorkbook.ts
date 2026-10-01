/**
 * Validates the outer shape accepted by the cloud workbook API.
 * The server deliberately treats workbook contents as opaque JSON while
 * requiring an object payload so null/arrays/primitives cannot be persisted.
 */
export function isValidCloudWorkbookPayload(payload: unknown): payload is { data: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const data = (payload as { data?: unknown }).data;
  return Boolean(data && typeof data === 'object' && !Array.isArray(data));
}
