const { env } = Deno;
import { camelCase } from "https://raw.githubusercontent.com/denolib/camelcase/master/mod.ts";

// We assume the terminal supports colors
export const colors = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  128,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221,
];

/**
 * Selects a color for a debug namespace
 */
export function selectColor(namespace: string): number {
  let hash = 0;

  for (let i = 0; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Build up the default `inspectOpts` object from the environment variables.
 * Used in `deno.inspect` in node.
 * Checkout deno source code for `inspect`: https://github.com/denoland/deno/blob/master/js/console.ts
 *
 * $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */
export interface InspectOpts {
  hideDate?: boolean | null;
  colors?: boolean | null;
  depth?: number;
  showHidden?: boolean | null;
}

export function getInspectOpts(): InspectOpts {
  const currentEnv = env.toObject();
  const inspectOpts: InspectOpts = Object.keys(currentEnv)
    .filter((key) => /^debug_/i.test(key))
    .reduce((obj: { [key: string]: number | boolean | null }, key) => {
      const prop = camelCase(key.slice(6));

      let envVar: string = currentEnv[key];
      let val: boolean | number | null;
      if (/^(yes|on|true|enabled)$/i.test(envVar)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(envVar)) {
        val = false;
      } else if (envVar === "null") {
        val = null;
      } else {
        val = Number(envVar);
      }

      obj[prop] = val;
      return obj;
    }, {});
  return inspectOpts;
}

/**
 * Coerce `val`.
 */
export function coerce(val: any): any {
  if (val instanceof Error) {
    return val.stack || val.message;
  }
  return val;
}

/**
 * Convert regexp to namespace
 */
export function regexpToNamespace(regexp: RegExp): string {
  return regexp
    .toString()
    .substring(2, regexp.toString().length - 2)
    .replace(/\.\*\?$/, "*");
}
