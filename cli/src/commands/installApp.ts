import * as fs from "fs";
import * as path from "path";
import os from "os";
import { exec } from "child_process";
import type { ParsedArgs } from "../args.ts";
import { error, success, info, c } from "../ui.ts";

export async function installCommand(args: ParsedArgs): Promise<number> {
  const { positionals } = args;
  const target = positionals[0];

  if (target !== "app") {
    error(
      `Invalid argument: "${
        target || ""
      }". Did you mean "devswitch install app"?`
    );
    return 1;
  }

  info("Fetching latest desktop app installer from GitHub...");

  let releaseData: any;
  try {
    const res = await fetch(
      "https://api.github.com/repos/umesh-saini/DevSwitch/releases/latest",
      { headers: { "User-Agent": "devswitch-cli" } }
    );
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }
    releaseData = await res.json();
  } catch (err) {
    error(
      `Failed to fetch release info: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }

  const platform = os.platform();
  let fileExtension = "";
  if (platform === "linux") fileExtension = ".deb";
  else if (platform === "darwin") fileExtension = ".dmg";
  else if (platform === "win32") fileExtension = ".exe";

  if (!fileExtension) {
    error(`Unsupported operating system platform: ${platform}`);
    return 1;
  }

  const assets: any[] = releaseData.assets || [];
  const installerAsset = assets.find((asset) =>
    asset.name.endsWith(fileExtension)
  );

  if (!installerAsset) {
    error(
      `Could not find a desktop installer for platform "${platform}" (${fileExtension}) in the latest release.`
    );
    return 1;
  }

  const downloadUrl = installerAsset.browser_download_url;
  const tempDir = os.tmpdir();
  const destPath = path.join(tempDir, installerAsset.name);

  info(`Downloading installer: ${c.cyan(installerAsset.name)}...`);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const fileStream = fs.createWriteStream(destPath);
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Could not get reader from response body");
    }

    let receivedLength = 0;
    const totalLength = parseInt(
      response.headers.get("Content-Length") || "0",
      10
    );

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
      receivedLength += value.length;
      if (totalLength) {
        const pct = Math.round((receivedLength / totalLength) * 100);
        process.stdout.write(
          `\rProgress: ${pct}% (${(receivedLength / (1024 * 1024)).toFixed(
            1
          )} MB / ${(totalLength / (1024 * 1024)).toFixed(1)} MB)`
        );
      }
    }
    fileStream.end();
    process.stdout.write("\n");

    success(`Successfully downloaded to: ${destPath}`);

    if (platform === "linux") {
      info(`To install, run the following command in your terminal:`);
      console.log(c.bold(c.cyan(`sudo dpkg -i ${destPath}`)));
    } else if (platform === "darwin") {
      info("Opening installer DMG...");
      exec(`open "${destPath}"`);
    } else if (platform === "win32") {
      info("Launching installer...");
      exec(`start "" "${destPath}"`);
    }

    return 0;
  } catch (err) {
    error(
      `Failed to download or run installer: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return 1;
  }
}
