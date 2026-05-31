/**
 * Tiny zero-dependency terminal UI helpers (colors, symbols, tables).
 * Respects NO_COLOR and non-TTY output.
 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function wrap(code: string, str: string): string {
  return useColor ? `\x1b[${code}m${str}\x1b[0m` : str;
}

export const c = {
  bold: (s: string) => wrap("1", s),
  dim: (s: string) => wrap("2", s),
  red: (s: string) => wrap("31", s),
  green: (s: string) => wrap("32", s),
  yellow: (s: string) => wrap("33", s),
  blue: (s: string) => wrap("34", s),
  magenta: (s: string) => wrap("35", s),
  cyan: (s: string) => wrap("36", s),
  gray: (s: string) => wrap("90", s),
};

export const sym = {
  ok: useColor ? c.green("✓") : "[ok]",
  err: useColor ? c.red("✗") : "[x]",
  warn: useColor ? c.yellow("!") : "[!]",
  info: useColor ? c.blue("i") : "[i]",
  arrow: useColor ? c.cyan("→") : "->",
  dot: c.gray("•"),
};

export function success(msg: string): void {
  console.log(`${sym.ok} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${sym.err} ${c.red(msg)}`);
}

export function warn(msg: string): void {
  console.log(`${sym.warn} ${c.yellow(msg)}`);
}

export function info(msg: string): void {
  console.log(`${sym.info} ${msg}`);
}

export function heading(msg: string): void {
  console.log("\n" + c.bold(msg));
}

/** Render a simple left-aligned table with a header row. */
export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(stripLen(h), ...rows.map((r) => stripLen(r[i] ?? ""))),
  );

  const pad = (s: string, w: number) =>
    s + " ".repeat(Math.max(0, w - stripLen(s)));

  const headerLine = headers
    .map((h, i) => c.bold(pad(h, widths[i])))
    .join("  ");
  console.log(headerLine);
  console.log(c.gray(widths.map((w) => "─".repeat(w)).join("  ")));

  for (const row of rows) {
    console.log(row.map((cell, i) => pad(cell ?? "", widths[i])).join("  "));
  }
}

/** Visible length of a string, ignoring ANSI color codes. */
function stripLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}
