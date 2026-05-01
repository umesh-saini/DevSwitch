export interface UploadSSHKeyResult {
  success: boolean;
  keyTitle?: string;
  error?: string;
}

export interface CheckKeyExistsResult {
  exists: boolean;
  error?: string;
}

/**
 * Abstract base class for all provider API services.
 * To add a new provider: extend this class, implement the two methods,
 * and register the instance in services/index.ts.
 */
export abstract class BaseApiService {
  abstract uploadSSHKey(profileId: string): Promise<UploadSSHKeyResult>;
  abstract checkKeyExists(profileId: string): Promise<CheckKeyExistsResult>;
}

/**
 * Stub used for providers whose API integration is not yet implemented.
 */
export class StubApiService extends BaseApiService {
  private readonly pendingMessage: string;

  constructor(pendingMessage: string) {
    super();
    this.pendingMessage = pendingMessage;
  }

  async uploadSSHKey(_profileId: string): Promise<UploadSSHKeyResult> {
    return { success: false, error: this.pendingMessage };
  }

  async checkKeyExists(_profileId: string): Promise<CheckKeyExistsResult> {
    return { exists: false };
  }
}
