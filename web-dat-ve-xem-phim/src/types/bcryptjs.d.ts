declare module 'bcryptjs' {
  export function hash(value: string, salt: number): Promise<string>;
  export function compare(value: string, hash: string): Promise<boolean>;
}
