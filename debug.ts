import { env, stderr } from "deno";
import format from "./format.ts";
import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import { coerce, selectColor, regexpToNamespace } from "./utils.ts";

interface DebugInstance {
  (...args: any[]): void;
  namespace: string;
  enabled: boolean;
  color: number;
  destroy: () => boolean;
  extend: (namespace: string, delimiter?: string) => DebugInstance;
  log: Function;
}

interface DebugModule {
  (namespace: string): DebugInstance;
  enable: (namespaces: any) => void;
  disable: () => string;
  enabled: (namespace: string) => boolean;
  names: RegExp[];
  skips: RegExp[];
  formatters: Formatters;
  // TODO: log override
}

interface Formatters {
  [key: string]: (value: any) => string;
}

let instances: DebugInstance[] = [];
let names: RegExp[] = [];
let skips: RegExp[] = [];
let formatters: Formatters = {};

function createDebug(namespace: string): DebugInstance {
  let prevTime: number;

  let debug: DebugInstance;

  // @ts-ignore
  debug = function(..._args: any[]) {
    // Skip if debugger is disabled
    if (!debug.enabled) {
      return;
    }

    let [fmt, ...args] =
      typeof _args[0] !== "string"
        ? // If first argument is not a string
          // add a fmt string of "%O"
          ["%O", ..._args]
        : [coerce(_args[0]), ..._args.slice(1)];

    // Set `diff` timestamp
    const currTime = Number(new Date());
    // Difference in miliseconds
    const diff = currTime - (prevTime || currTime);
    prevTime = currTime;

    // Apply all custom formatters to our arguments
    const customFormattedArgs = applyFormatters.call(debug, fmt, args);

    const { namespace, color } = debug;

    // Format the string to be logged
    const prettyLog = prettifyLog({ namespace, color, diff })(
      ...customFormattedArgs
    );
    // Finally, log
    debug.log(prettyLog);
  };

  debug.namespace = namespace;
  debug.color = selectColor(namespace);
  debug.enabled = enabled(namespace);
  debug.log = defaultLogger;
  debug.destroy = destroy;
  debug.extend = extend;

  instances.push(debug);

  return debug;
}

function destroy() {
  if (instances.includes(this)) {
    this.enabled = false;
    instances = instances.filter(instance => instance !== this);
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
  const newNamespace = `${this.namespace}${delimiter}${subNamespace}`;
  const newDebug = createDebug(newNamespace);
  // Pass down the custom logger
  newDebug.log = this.log;
  return newDebug;
}

function applyFormatters(fmt: string, args: any[]) {
  let index = 0;
  const newFmt = fmt.replace(/%([a-zA-Z%])/g, (match, format) => {
    // If we encounter an escaped % then don't increase the array index
    if (match === "%%") {
      return match;
    }

    const formatter = formatters[format];

    if (typeof formatter === "function") {
      const value = args[index];
      // Remove the argument we used in the custom formatter
      args = [...args.slice(0, index), ...args.slice(index + 1)];
      return formatter.call(this, value);
    }

    index++;
    return match;
  });

  // Return the update fmt string and updated args
  return [newFmt, ...args];
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
    .map(namespace => namespace.replace(/\*/g, ".*?"))
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

interface PrettifyLogOptions {
  namespace: string;
  color: number;
  diff: number;
}

function prettifyLog({ namespace, color, diff }: PrettifyLogOptions) {
  return (...args: any): string => {
    const colorCode = "\u001B[3" + (color < 8 ? color : "8;5;" + color);
    const prefix = `  ${colorCode};1m${namespace} \u001B[0m`;
    const result = `${prefix}${format(...args)} ${colorCode}m+${ms(
      diff
    )}${"\u001B[0m"}`;
    return result;
  };
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
 * Save `namespaces` to env.
 */
function updateNamespacesEnv(namespaces: string): void {
  if (namespaces) {
    env().DEBUG = namespaces;
  } else {
    delete env().DEBUG;
  }
}

function defaultLogger(msg: string): void {
  stderr.write(new TextEncoder().encode(msg + "\n"));
}

// Exports

const debug: DebugModule = Object.assign(createDebug, {
  enable,
  disable,
  enabled,
  names,
  skips,
  formatters
});

// Enable namespaces passed from env
enable(env().DEBUG);

export default debug;
