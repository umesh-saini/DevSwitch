/**
 * Re-export of the shared core encryption util.
 * Identical algorithm to keep secrets interchangeable between the app and CLI.
 */
export {
  encryptPassphrase,
  decryptPassphrase,
} from "../../core/utils/encryption.ts";
