import { Signer } from './signer.interface';
import { DevPfxSigner } from './dev-pfx-signer';
import { KmsSigner } from './kms-signer';

export function createSigner(): Signer {
  const mode = process.env.SIGNER_MODE || 'DEV_PFX';

  switch (mode) {
    case 'DEV_PFX':
      const pfxPath = process.env.PFX_PATH;
      const pfxPassword = process.env.PFX_PASSWORD;

      if (!pfxPath || !pfxPassword) {
        throw new Error('PFX_PATH and PFX_PASSWORD required for DEV_PFX mode');
      }

      return new DevPfxSigner(pfxPath, pfxPassword);

    case 'KMS':
      const keyId = process.env.KMS_KEY_ID;
      if (!keyId) {
        throw new Error('KMS_KEY_ID required for KMS mode');
      }
      return new KmsSigner(keyId);

    default:
      throw new Error(`Unknown signer mode: ${mode}`);
  }
}