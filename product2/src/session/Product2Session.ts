export type Product2Access = 'active' | 'inactive';

export interface Product2Session {
  userId: string;
  accountId: string;
  email: string;
  displayName: string;
  productAccess: Product2Access;
}
