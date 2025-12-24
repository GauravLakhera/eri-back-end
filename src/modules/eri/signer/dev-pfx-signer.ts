import * as forge from 'node-forge';
import * as fs from 'fs';
import { Signer } from './signer.interface';

export class DevPfxSigner implements Signer {
  private privateKey: any; // Changed from forge.pki.PrivateKey to any for compatibility

  constructor(pfxPath: string, password: string) {
    const pfxBuffer = fs.readFileSync(pfxPath);
    const pfxBase64 = pfxBuffer.toString('base64');
    const pfxDer = forge.util.decode64(pfxBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

    // Extract private key
    const bags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

    if (!keyBag?.key) {
      throw new Error('Private key not found in PFX');
    }

    this.privateKey = keyBag.key;
  }

  async sign(data: string): Promise<string> {
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    
    // Use type assertion to access sign method
    const signature = (this.privateKey as any).sign(md);
    return forge.util.encode64(signature);
  }
}