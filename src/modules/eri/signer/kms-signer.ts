import { Signer } from './signer.interface';

export class KmsSigner implements Signer {
  private keyId: string;

  constructor(keyId: string) {
    this.keyId = keyId;
  }

  async sign(data: string): Promise<string> {
    // TODO: Implement KMS signing
    // Example AWS KMS integration:
    // import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
    // const kms = new KMSClient({ region: process.env.KMS_REGION });
    // const command = new SignCommand({
    //   KeyId: this.keyId,
    //   Message: Buffer.from(data),
    //   MessageType: 'RAW',
    //   SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256'
    // });
    // const response = await kms.send(command);
    // return Buffer.from(response.Signature).toString('base64');

    throw new Error('KMS signing not yet implemented - use DEV_PFX mode');
  }
}