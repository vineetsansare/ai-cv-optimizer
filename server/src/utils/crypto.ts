import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Fallback key if none is provided in environment (for local development only)
const getSecretKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || 'default-super-secret-key-32-chars-long!';
  return crypto.scryptSync(secret, 'salt', 32);
};

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const key = getSecretKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
