import type { ToolkitEntitlementResponse } from '../types/toolkit';

export const syncToolkitAccount = async ({
  idToken,
}: {
  idToken: string;
}): Promise<ToolkitEntitlementResponse> => {
  const response = await fetch('/api/toolkit/session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Toolkit account session unavailable (${response.status})`);
  }

  return response.json() as Promise<ToolkitEntitlementResponse>;
};
