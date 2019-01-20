import { env } from "deno";
import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import { selectColor, getInspectOpts } from "./utils.ts";
import format from "./format.ts";

interface DebugInstance {
  (...args: any[]): void;
  namespace: string;
  enabled: boolean;
  color: number;
  destroy: () => boolean;
  extend: (namespace: string, delimiter?: string) => DebugInstance;
  log: Function;
  // Private
  diff: number;
  prev: number;
  curr: number;
}

interface Debug {
  (namespace: string): DebugInstance;
  // For reference only
  names: RegExp[];
  skips: RegExp[];
  instances: DebugInstance[];
  enable: (namespaces: string) => void;
  disable: (namespaces: string) => string;
  enabled: (namespaces: string) => boolean;
  coerce: (namespaces: string) => boolean;
}

interface Formatters {
  [key: string]: (value: any) => string;
}

const currentEnv = env();

const NAMESPACES = currentEnv.DEBUG;

/**
 * Active `debug` instances.
 */
let instances: DebugInstance[] = [];
/**
 * The currently active debug mode names, and names to skip.
 */
let names: RegExp[] = [];
let skips: RegExp[] = [];

// Enable namespaces passed from env
enable(NAMESPACES);

const inspectOpts = getInspectOpts();

/**
 * Save `namespaces` to env.
 */
function updateNamespacesEnv(namespaces: string): void {
  if (namespaces) {
    currentEnv.DEBUG = namespaces;
  } else {
    delete currentEnv.DEBUG;
  }
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 */
export function enabled(namespace: string): boolean {
  if (namespace[namespace.length - 1] === "*") {
    return true;
  }

  for (const skip of skips) {
    if (skip.test(namespace)) {
      return false;
    }
  }
  for (const name of names) {
    if (name.test(namespace)) {
      return true;
    }
  }

  return false;
}

export function enable(namespaces: string) {
  updateNamespacesEnv(namespaces);

  names = [];
  skips = [];

  const splits = (typeof namespaces === "string" ? namespaces : "").split(
    /[\s,]+/
  );

  splits.forEach(split => {
    if (!split) return;

    namespaces = split.replace(/\*/g, ".*?");

    if (namespaces[0] === "-") {
      skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
    } else {
      names.push(new RegExp("^" + namespaces + "$"));
    }
  });

  instances.forEach(instance => {
    instance.enabled = enabled(instance.namespace);
  });
}

/**
 * Disable debug output.
 */
export function disable(): string {
  const namespaces = [
    ...names.map(regexpToNamespace),
    ...skips.map(regexpToNamespace).map(namespace => "-" + namespace)
  ].join(",");
  enable("");
  return namespaces;
}

/**
 * Convert regexp to namespace
 *
 * @param {RegExp} regxep
 * @return {String} namespace
 * @api private
 */
function regexpToNamespace(regexp: RegExp): string {
  return regexp
    .toString()
    .substring(2, regexp.toString().length - 2)
    .replace(/\.\*\?$/, "*");
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */
function coerce(val: any): any {
  if (val instanceof Error) {
    return val.stack || val.message;
  }
  return val;
}

function log(fmt: string, ...args: any): void {
  const { namespace: name, color: c } = this;
  const colorCode = "\u001B[3" + (c < 8 ? c : "8;5;" + c);
  const prefix = `  ${colorCode};1m${name} \u001B[0m`;
  const result = `${prefix}${format(fmt, ...args)} ${colorCode}m+${ms(
    this.diff
  )}${"\u001B[0m"}`;
  console.log(result);
}

// SINGLE DEBUG INSTANCE

export default function createDebug(namespace: string): DebugInstance {
  let prevTime: number;

  let debug: DebugInstance;
  // @ts-ignore
  debug = function(fmt: string, ...args: any[]) {
    // Disabled?
    if (!debug.enabled) {
      return;
    }

    const self = debug;

    // Set `diff` timestamp
    const curr = Number(new Date());
    const ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    const logFn = self.log || log;
    logFn.apply(self, [fmt, ...args]);
  };

  function destroy() {
    const index = instances.indexOf(this);
    if (index !== -1) {
      instances.splice(index, 1);
      return true;
    }
    return false;
  }

  function extend(namespace: string, delimiter?: string) {
    const newDebug = createDebug(
      this.namespace +
        (typeof delimiter === "undefined" ? ":" : delimiter) +
        namespace
    );
    newDebug.log = this.log;
    return newDebug;
  }

  debug.namespace = namespace;
  debug.enabled = enabled(namespace);
  debug.color = selectColor(namespace);
  debug.destroy = destroy;
  debug.extend = extend;

  instances.push(debug);

  return debug;
}
