/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User } from '@supabase/supabase-js';
import type { WorkbookData } from './workbookRepository';

interface CloudWorkbookResponse {
  data: WorkbookData | null;
  updatedAt: string | null;
  version: number | null;
}

async function request(user: User, init: RequestInit = {}): Promise<CloudWorkbookResponse> {
  const token = await user.getIdToken();
  const response = await fetch('/api/workbook', {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloud workbook request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<CloudWorkbookResponse>;
}

export async function loadCloudWorkbook(user: User): Promise<CloudWorkbookResponse> {
  return request(user);
}

export async function saveCloudWorkbook(user: User, data: WorkbookData): Promise<CloudWorkbookResponse> {
  return request(user, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}
