import { env, stderr } from "deno";
import format from "./format.ts";
import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import { coerce, selectColor, regexpToNamespace } from "./utils.ts";

// State

interface Formatters {
  [key: string]: (value: any) => string;
}

let instances: Debugger[] = [];
let names: RegExp[] = [];
let skips: RegExp[] = [];
let formatters: Formatters = {};

interface DebuggerConstructorOpts {
  namespace: string;
  log?: Function;
}

export class Debugger {
  private prevTime: number;
  readonly namespace: string;
  readonly color: number;
  enabled: boolean;
  log: Function;

  constructor({ namespace, log }: DebuggerConstructorOpts) {
    this.namespace = namespace;
    this.color = selectColor(namespace);
    this.enabled = enabled(namespace);
    this.log = log || defaultLogger;
    this.debug = this.debug.bind(this);
    this.destroy = this.destroy.bind(this);
    this.extend = this.extend.bind(this);
    this.applyFormatters = this.applyFormatters.bind(this);

    instances.push(this);
  }

  debug(..._args: any[]) {
    // Skip if debugger is disabled
    if (!this.enabled) {
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
    const diff = currTime - (this.prevTime || currTime);
    this.prevTime = currTime;

    // Apply all custom formatters to our arguments
    const customFormattedArgs = this.applyFormatters(fmt, args);

    const { namespace, color } = this;

    // Format the string to be logged
    const prettyLog = prettifyLog({ namespace, color, diff })(
      ...customFormattedArgs
    );
    // Finally, log
    this.log(prettyLog);
  }

  destroy() {
    if (instances.includes(this)) {
      this.enabled = false;
      instances = instances.filter(instance => instance !== this);
      return true;
    }
    return false;
  }

  extend(subNamespace: string, delimiter: string = ":") {
    const newNamespace = `${this.namespace}${delimiter}${subNamespace}`;
    const newDebugger = new Debugger({
      namespace: newNamespace,
      // Pass down the custom logger
      log: this.log
    });
    // newDebugger.log = this.log
    return wrapDebugger(newDebugger);
  }

  private applyFormatters(fmt: string, args: any[]) {
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

interface DebugInstance {
  (...args: any[]): void;
  namespace: string;
  enabled: boolean;
  color: number;
  destroy: () => boolean;
  extend: (namespace: string, delimiter?: string) => DebugInstance;
  log: Function | void;
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

/**
 * Creates a callable class instance
 * so instead of doing this
 * ```ts
 * const http = debug('http')
 * http.debug('request arrived')
 * ```
 * You can do this:
 * ```ts
 * const http = debug('http')
 * http('request arrived')
 * ```
 */
function wrapDebugger(debuggerInstance: Debugger): DebugInstance {
  const instance: DebugInstance = Object.assign(
    debuggerInstance.debug,
    debuggerInstance,
    { instance: debuggerInstance }
  );
  return instance;
}

function createDebug(namespace: string) {
  const debuggerInstance = new Debugger({ namespace });
  return wrapDebugger(debuggerInstance);
}

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

// Usage
const worker = debug("worker");

worker("working...");

console.log(worker.log);
// @ts-ignore
console.log(worker.instance.log);

worker.log = () => {};

console.log(worker.log);
// @ts-ignore
console.log(worker.instance.log);

export default debug;
