import os from "os";

export const isWindows = os.platform() === "win32";
export const isMac = os.platform() === "darwin";
export const isLinux = os.platform() === "linux";

export const system = isLinux
  ? "Linux"
  : isMac
    ? "Mac"
    : isWindows
      ? "Windows"
      : "N/A";

export const platformFolder = isLinux
  ? "linux"
  : isMac
    ? "mac"
    : isWindows
      ? "windows"
      : "";

export const isDev = process.env.NODE_ENV === "development";
