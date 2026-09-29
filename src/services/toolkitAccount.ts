import type { User } from 'firebase/auth';
import type { ToolkitEntitlementResponse } from '../types/toolkit';

export async function loadToolkitAccountSession(
  user: User,
): Promise<ToolkitEntitlementResponse | null> {
  try {
    const idToken = await user.getIdToken();
    const response = await fetch('/api/account/session', {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) {
      console.warn('Toolkit account session unavailable:', response.status);
      return null;
    }

    return (await response.json()) as ToolkitEntitlementResponse;
  } catch (error) {
    console.warn('Toolkit account session could not be loaded:', error);
    return null;
  }
}
