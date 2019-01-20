import { env, stderr } from "deno";
import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import { selectColor, getInspectOpts } from "./utils.ts";
import format from "./format.ts";

interface DebugFunction {
  (...args: any[]): void;
}

interface DebugInstance {
  (...args: any[]): void;
  namespace: string;
  enabled: boolean;
  color: number;
  destroy: () => boolean;
  extend: (namespace: string, delimiter?: string) => DebugInstance;
  log: Function | void;
}

// Default export public API
interface Debug {
  (namespace: string): DebugInstance;
  enable: (namespaces: any) => void;
  disable: () => string;
  enabled: (namespace: string) => boolean;
  names: RegExp[],
  skips: RegExp[],
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

// Default export
export const debug = createDebug;

let defaultExport: Debug;
// @ts-ignore
defaultExport = createDebug;
Object.assign(defaultExport, {
  enable,
  disable,
  enabled,
  names,
  skips,
});

export default defaultExport;

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

export function enable(namespaces: any) {
  updateNamespacesEnv(namespaces);

  // Resets enabled and disable namespaces
  names = [];
  skips = [];

  // Splits on comma
  // Loops through the passed namespaces
  // And groups them in enabled and disabled lists
  (typeof namespaces === "string" ? namespaces : "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((namespace) => namespace.replace(/\*/g, ".*?"))
    .forEach(ns => {
      // Ignore empty strings
      if (!ns) return;

      // If a namespace starts with `-`, we should disable that namespace
      if (ns[0] === "-") {
        skips.push(new RegExp("^" + ns.slice(1) + "$"));
      } else {
        names.push(new RegExp("^" + ns + "$"));
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
    ...skips.map(regexpToNamespace).map(namespace => `-${namespace}`)
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

interface PrettifyLogOptions {
  namespace: string,
  color: number,
  diff: number,
}

interface LoggerFunction {
  (fmt: string, ...args: any): void,
}

// Usage
// const prettyLog = prettifyLog({ namespace, color, diff })(debug.log || defaultLog)
// prettyLog(fmt, ...args)
// 
// or
// 
// const prettyLog = prettifyLog({ namespace, color, diff })(fmt, ...args)
// const logger = debug.log || defaultLog;
// logger(prettyLog)
function prettifyLog({ namespace, color, diff }: PrettifyLogOptions): LoggerFunction {
  return (fmt: string, ...args: any) => {
    const colorCode = "\u001B[3" + (color < 8 ? color : "8;5;" + color);
    const prefix = `  ${colorCode};1m${namespace} \u001B[0m`;
    const result = `${prefix}${format(fmt, ...args)} ${colorCode}m+${ms(diff)}${"\u001B[0m"}`;
    return result;
  }
}

function defaultLogger(msg: string): void {
  stderr.write(new TextEncoder().encode(msg + '\n'));
}

// SINGLE DEBUG INSTANCE

function createDebug(namespace: string): DebugInstance {
  let currTime: number;
  let prevTime: number;
  let diff: number;
  const color = selectColor(namespace);

  let debug: DebugInstance;

  // @ts-ignore
  debug = function(fmt: string, ...args: any[]) {
    // Skip if debugger is disabled
    if (!debug.enabled) {
      return;
    }

    // Set `diff` timestamp
    currTime = Number(new Date());
    // Difference in miliseconds
    diff = currTime - (prevTime || currTime);
    prevTime = currTime;

    // Format the string to be logged
    const prettyLog = prettifyLog({ namespace, color, diff })(fmt, ...args);
    // Use custom logger if set
    const logger = debug.log || defaultLogger;
    // Finally, log
    logger(prettyLog)
  };

  function destroy() {
    const index = instances.indexOf(this);
    if (index !== -1) {
      instances.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * const server = debug('server');
   * const serverHttp = server.extend('http') // server:http
   * const serverHttpReq = serverHttp.extend('req', '-') // server:http-req
   */
  function extend(subNamespace: string, delimiter: string = ":") {
    const newNamespace = `${namespace}${delimiter}${subNamespace}`
    const newDebug = createDebug(newNamespace);
    // Pass down the custom logger
    newDebug.log = this.log;
    return newDebug;
  }

  Object.assign(debug, {
    namespace,
    color,
    destroy,
    extend,
    enabled: enabled(namespace),
  })

  instances.push(debug);

  return debug;
}
