import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  private getMasterKey(): Buffer {
    const key = process.env.CRYPTO_MASTER_KEY;
    if (!key) {
      throw new Error('CRYPTO_MASTER_KEY not configured');
    }
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt data using envelope encryption
   * Returns: Buffer containing [DEK_IV + DEK_TAG + ENC_DEK + DATA_IV + DATA_TAG + ENC_DATA]
   */
  encrypt(plaintext: string): Buffer {
    // Generate data encryption key (DEK)
    const dek = crypto.randomBytes(CryptoService.KEY_LENGTH);
    const iv = crypto.randomBytes(CryptoService.IV_LENGTH);

    // Encrypt plaintext with DEK
    const cipher = crypto.createCipheriv(CryptoService.ALGORITHM, dek, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Encrypt DEK with master key
    const masterKey = this.getMasterKey();
    const dekIv = crypto.randomBytes(CryptoService.IV_LENGTH);
    const dekCipher = crypto.createCipheriv(CryptoService.ALGORITHM, masterKey, dekIv);
    const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();

    // Combine all parts
    return Buffer.concat([dekIv, dekAuthTag, encryptedDek, iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  decrypt(ciphertext: Buffer): string {
    let offset = 0;

    // Extract DEK components
    const dekIv = ciphertext.subarray(offset, offset + CryptoService.IV_LENGTH);
    offset += CryptoService.IV_LENGTH;

    const dekAuthTag = ciphertext.subarray(offset, offset + CryptoService.AUTH_TAG_LENGTH);
    offset += CryptoService.AUTH_TAG_LENGTH;

    const encryptedDek = ciphertext.subarray(offset, offset + CryptoService.KEY_LENGTH);
    offset += CryptoService.KEY_LENGTH;

    // Decrypt DEK
    const masterKey = this.getMasterKey();
    const dekDecipher = crypto.createDecipheriv(CryptoService.ALGORITHM, masterKey, dekIv);
    dekDecipher.setAuthTag(dekAuthTag);
    const dek = Buffer.concat([dekDecipher.update(encryptedDek), dekDecipher.final()]);

    // Extract data components
    const iv = ciphertext.subarray(offset, offset + CryptoService.IV_LENGTH);
    offset += CryptoService.IV_LENGTH;

    const authTag = ciphertext.subarray(offset, offset + CryptoService.AUTH_TAG_LENGTH);
    offset += CryptoService.AUTH_TAG_LENGTH;

    const encrypted = ciphertext.subarray(offset);

    // Decrypt data
    const decipher = crypto.createDecipheriv(CryptoService.ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Hash for lookup (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt PAN
   */
  encryptPan(pan: string): { encrypted: Buffer; hash: string } {
    return {
      encrypted: this.encrypt(pan),
      hash: this.hash(pan),
    };
  }

  /**
   * Decrypt PAN
   */
  decryptPan(encrypted: Buffer): string {
    return this.decrypt(encrypted);
  }

  /**
   * Encrypt DOB
   */
  encryptDob(dob: string): Buffer {
    return this.encrypt(dob);
  }

  /**
   * Decrypt DOB
   */
  decryptDob(encrypted: Buffer): string {
    return this.decrypt(encrypted);
  }

  /**
   * Mask PAN for display
   */
  maskPan(pan: string): string {
    if (pan.length !== 10) return 'INVALID';
    return `${pan.substring(0, 2)}${'*'.repeat(6)}${pan.substring(8)}`;
  }
}