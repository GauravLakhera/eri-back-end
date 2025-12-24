import { Signer } from '../signer/signer.interface';
import { EriResponse } from '../types/eri.types';

export class RequestBuilder {
  constructor(private signer: Signer, private eriUserId: string) {}

  async build(requestJson: any): Promise<{ data: string; sign: string; eriUserId: string }> {
    // Convert to JSON and encode to base64
    const jsonStr = JSON.stringify(requestJson);
    const data = Buffer.from(jsonStr, 'utf-8').toString('base64');

    // Sign the base64 data
    const sign = await this.signer.sign(data);

    return {
      data,
      sign,
      eriUserId: this.eriUserId,
    };
  }

  parseResponse(response: any): EriResponse {
    const messages: string[] = [];
    const errors: string[] = [];

    // Extract messages
    if (response.messages) {
      if (Array.isArray(response.messages)) {
        messages.push(...response.messages);
      } else if (typeof response.messages === 'string') {
        messages.push(response.messages);
      }
    }

    // Extract errors
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        errors.push(
          ...response.errors.map((e: any) =>
            typeof e === 'string' ? e : e.errorMessage || e.message || JSON.stringify(e),
          ),
        );
      } else if (typeof response.errors === 'string') {
        errors.push(response.errors);
      } else if (typeof response.errors === 'object') {
        errors.push(response.errors.errorMessage || response.errors.message || JSON.stringify(response.errors));
      }
    }

    // Check for error codes
    if (response.errorCode || response.errorMessage) {
      errors.push(`${response.errorCode || 'ERROR'}: ${response.errorMessage || 'Unknown error'}`);
    }

    const ok =
      errors.length === 0 &&
      (response.status === 'SUCCESS' || response.status === 'success' || !response.status);

    return {
      ok,
      messages,
      errors,
      raw: response,
    };
  }
}