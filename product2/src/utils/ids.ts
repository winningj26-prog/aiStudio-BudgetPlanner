export const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const today = () => new Date().toISOString().slice(0, 10);
