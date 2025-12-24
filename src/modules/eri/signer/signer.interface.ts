export interface Signer {
  sign(data: string): Promise<string>;
}