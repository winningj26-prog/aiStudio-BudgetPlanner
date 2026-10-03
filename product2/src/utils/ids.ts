export const id = (_prefix: string) => crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);
