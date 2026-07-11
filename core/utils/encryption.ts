import crypto from "crypto";
import os from "os";

/**
 * Machine-bound AES-256-GCM encryption for secrets (passphrases, OAuth tokens).
 *
 * The key is derived from stable machine identifiers, so a value encrypted by
 * the desktop app can be decrypted by the CLI on the same machine and vice
 * versa. This MUST stay byte-for-byte identical to the desktop app's original
 * implementation to keep already-stored secrets readable.
 */
function getMachineKey(): Buffer {
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.scryptSync(machineId, "dev-switch-salt", 32);
}

export function encryptPassphrase(passphrase: string): string {
  if (!passphrase) return "";

  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(passphrase, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptPassphrase(encryptedData: string): string {
  if (!encryptedData) return "";

  const key = getMachineKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export interface EncryptedPayload {
  encrypted: true;
  salt: string;
  iv: string;
  data: string;
}

export function encryptWithPassword(text: string, password: string): EncryptedPayload {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted: true,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    data: encrypted,
  };
}

export function decryptWithPassword(payload: EncryptedPayload, password: string): string {
  const salt = Buffer.from(payload.salt, "hex");
  const iv = Buffer.from(payload.iv, "hex");
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(payload.data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

