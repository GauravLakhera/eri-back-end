export interface EriResponse {
  ok: boolean;
  messages: string[];
  errors: string[];
  raw: any;
  authToken?: string;
  transactionId?: string;
}