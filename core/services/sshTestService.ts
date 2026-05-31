import { exec } from "child_process";
import { promisify } from "util";
import { isSSHAuthSuccess } from "../utils/providerUtils.ts";

const execAsync = promisify(exec);

export interface SSHTestParams {
  hostAlias: string;
  sshUser: string;
  keyPath?: string;
}

export interface SSHTestResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Run `ssh -T` against a provider host alias to verify authentication.
 * Shared by the desktop app (IPC) and the CLI (`devswitch test`).
 */
export async function testSSHConnection(
  params: SSHTestParams,
): Promise<SSHTestResult> {
  try {
    const keyFlag = params.keyPath ? ` -i "${params.keyPath}"` : "";
    const command = `ssh -T${keyFlag} -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new ${params.sshUser}@${params.hostAlias}`;

    try {
      const { stdout, stderr } = await execAsync(command);
      const output = (stdout + "\n" + stderr).trim();
      return { success: true, output };
    } catch (err: unknown) {
      // Most git providers exit non-zero even on successful auth (banner only).
      const execErr = err as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const output = (
        (execErr.stdout || "") +
        "\n" +
        (execErr.stderr || "")
      ).trim();

      if (isSSHAuthSuccess(output)) {
        return { success: true, output };
      }

      return {
        success: false,
        output,
        error: execErr.message || "SSH connection failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Failed to run SSH test",
    };
  }
}
