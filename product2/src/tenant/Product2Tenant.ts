export const PRODUCT2_ID = 'product2' as const;

export type Product2TenantContext = {
  tenantId: string;
  productId: typeof PRODUCT2_ID;
};

export function createProduct2TenantContext(tenantId: string): Product2TenantContext {
  const normalized = tenantId.trim();
  if (!normalized) throw new Error('A tenant id is required.');
  return { tenantId: normalized, productId: PRODUCT2_ID };
}

export function assertProduct2Tenant(recordTenantId: string, context: Product2TenantContext): void {
  if (recordTenantId !== context.tenantId) {
    throw new Error('Product 2 tenant ownership mismatch.');
  }
}
