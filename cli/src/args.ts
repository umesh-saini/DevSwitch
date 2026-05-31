/**
 * Minimal argv parser: splits positionals from --flags / --flag=value / -x.
 */
export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
      } else {
        // Look ahead: if next token isn't a flag, treat as value; else boolean
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          flags[body] = next;
          i++;
        } else {
          flags[body] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      const short = arg.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[short] = next;
        i++;
      } else {
        flags[short] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

export function flagStr(
  flags: Record<string, string | boolean>,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const v = flags[name];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export function flagBool(
  flags: Record<string, string | boolean>,
  ...names: string[]
): boolean {
  for (const name of names) {
    if (flags[name] === true || flags[name] === "true") return true;
  }
  return false;
}
