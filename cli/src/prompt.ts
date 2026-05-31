import * as readline from "readline";
import { Writable } from "stream";

/**
 * Minimal zero-dependency interactive prompts for the CLI.
 * Used by `devswitch add` when run without enough flags.
 */

function createInterface(muted = false) {
  let muteValue = false;
  const mutableStdout = new Writable({
    write(chunk, encoding, callback) {
      if (!muteValue) {
        process.stdout.write(chunk, encoding as BufferEncoding);
      }
      callback();
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  });

  return {
    rl,
    setMuted: (v: boolean) => {
      muteValue = muted ? v : false;
    },
  };
}

export function ask(question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const { rl } = createInterface();
    const suffix = defaultValue ? ` (${defaultValue})` : "";
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue || "");
    });
  });
}

export function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const { rl, setMuted } = createInterface(true);
    rl.question(`${question}: `, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
    setMuted(true);
  });
}

export async function confirm(
  question: string,
  defaultYes = false,
): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await ask(`${question} [${hint}]`)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

/** Present a numbered list and return the chosen index (or -1 if cancelled). */
export async function select(
  question: string,
  options: string[],
): Promise<number> {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`));
  const answer = await ask("Enter choice number");
  const idx = parseInt(answer, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= options.length) return -1;
  return idx;
}
