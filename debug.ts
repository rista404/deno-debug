import { env } from "deno";
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
  enable: (namespaces: string) => void;
  disable: (namespaces: string) => string;
  enabled: (namespaces: string) => boolean;
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

  // Resets enabled and disable
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

interface PrettifyLogOptions {
  namespace: string,
  color: number,
  diff: number,
}

interface LoggerFunction {
  (fmt: string, ...args: any): void,
}

function prettifyLog({ namespace, color, diff }: PrettifyLogOptions): LoggerFunction {
  return (fmt: string, ...args: any) => {
    const colorCode = "\u001B[3" + (color < 8 ? color : "8;5;" + color);
    const prefix = `  ${colorCode};1m${namespace} \u001B[0m`;
    const result = `${prefix}${format(fmt, ...args)} ${colorCode}m+${ms(diff)}${"\u001B[0m"}`;
    console.log(result);
  }
}

// SINGLE DEBUG INSTANCE

export const debug = createDebug;

let defaultExport: Debug;
// @ts-ignore
defaultExport = createDebug;
Object.assign(defaultExport, {
  enable,
  disable,
  enabled,
});
export default defaultExport;

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

    // TODO: Custom log function
    const prettyLog = prettifyLog({ namespace, color, diff })
    prettyLog(fmt, ...args)
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
