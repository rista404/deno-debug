const { noColor, env, stderr } = Deno;
import format from "./format.ts";
import { coerce, selectColor, regexpToNamespace } from "./utils.ts";

interface DebugInstance {
  (log: string | Error, ...args: any[]): void;
  namespace: string;
  enabled: boolean;
  color: number;
  destroy: () => boolean;
  extend: (namespace: string, delimiter?: string) => DebugInstance;
  log?: Function;
}

interface DebugModule {
  (namespace: string): DebugInstance;
  enable: (namespaces: any) => void;
  disable: () => string;
  enabled: (namespace: string) => boolean;
  names: RegExp[];
  skips: RegExp[];
  formatters: Formatters;
  log: Function;
}

interface Formatters {
  [key: string]: (value: any) => string;
}

/**
 * Active `debug` instances.
 */
let instances: DebugInstance[] = [];

/**
 * The currently active debug mode names, and names to skip.
 */
let names: RegExp[] = [];
let skips: RegExp[] = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */
let formatters: Formatters = {};

/**
 * Create a debugger with the given `namespace`.
 */
function createDebug(namespace: string): DebugInstance {
  let prevTime: number;

  let debug: DebugInstance;

  // @ts-ignore-next-line
  debug = function (log: string | Error, ...args: any[]) {
    // Skip if debugger is disabled
    if (!debug.enabled) {
      return;
    }

    const self = debug;

    log = coerce(log);

    if (typeof log !== "string") {
      // Anything else let's inspect with %O
      args.unshift(log);
      log = "%O";
    }

    // Set `diff` timestamp
    const currTime = Number(Date.now());
    // Difference in miliseconds
    const diff = currTime - (prevTime || currTime);
    prevTime = currTime;

    // Apply all custom formatters to our arguments
    const customFormattedArgs = applyFormatters.call(self, log, ...args);
    const { namespace, color } = self;

    // Format the string before logging
    const formattedArgs = formatArgs(
      { namespace, color, diff },
      customFormattedArgs,
    );

    // Use a custom logger if defined
    // If not, we use the default logger
    const logFn = self.log || debugModule.log;

    // Finally, log
    logFn.apply(self, formattedArgs);
    return;
  };

  debug.namespace = namespace;
  debug.color = selectColor(namespace);
  debug.enabled = enabled(namespace);
  debug.destroy = destroy;
  debug.extend = extend;

  instances.push(debug);

  return debug;
}

function destroy(this: DebugInstance) {
  if (instances.includes(this)) {
    this.enabled = false;
    instances = instances.filter((instance) => instance !== this);
    return true;
  }
  return false;
}

/**
 * const server = debug('server');
 * const serverHttp = server.extend('http') // server:http
 * const serverHttpReq = serverHttp.extend('req', '-') // server:http-req
 */
function extend(
  this: DebugInstance,
  subNamespace: string,
  delimiter: string = ":",
) {
  const newNamespace = `${this.namespace}${delimiter}${subNamespace}`;
  const newDebug = createDebug(newNamespace);
  // Pass down the custom logger
  newDebug.log = this.log;
  return newDebug;
}

function applyFormatters(this: DebugInstance, fmt: string, ...args: any[]) {
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

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 */
export function enable(namespaces: any) {
  updateNamespacesEnv(namespaces);

  // Resets enabled and disable namespaces
  names = [];
  skips = [] // Splits on comma
  ; // Loops through the passed namespaces
  // And groups them in enabled and disabled lists
  (typeof namespaces === "string" ? namespaces : "")
    .split(/[\s,]+/)
    // Ignore empty strings
    .filter(Boolean)
    .map((namespace) => namespace.replace(/\*/g, ".*?"))
    .forEach((ns) => {
      // If a namespace starts with `-`, we should disable that namespace
      if (ns[0] === "-") {
        skips.push(new RegExp("^" + ns.slice(1) + "$"));
      } else {
        names.push(new RegExp("^" + ns + "$"));
      }
    });

  instances.forEach((instance) => {
    instance.enabled = enabled(instance.namespace);
  });
}

interface FormatArgsOptions {
  namespace: string;
  color: number;
  diff: number;
}

function formatArgs(
  { namespace, color, diff }: FormatArgsOptions,
  args: any[],
): any[] {
  const colorCode = "\u001B[3" + (color < 8 ? color : "8;5;" + color);
  const prefix = noColor
    ? `  ${namespace} `
    : `  ${colorCode};1m${namespace} \u001B[0m`;
  // Add a prefix on every line
  args[0] = args[0]
    .split("\n")
    .map((line: string) => `${prefix}${line}`)
    .join("\n");

  const lastArg = noColor ? `+${diff}` : `${colorCode}m+${diff}${"\u001B[0m"}`;

  return [...args, lastArg];
}

/**
 * Disable debug output.
 */
export function disable(): string {
  const namespaces = [
    ...names.map(regexpToNamespace),
    ...skips.map(regexpToNamespace).map((namespace) => `-${namespace}`),
  ].join(",");
  enable("");
  return namespaces;
}

/**
 * Save `namespaces` to env.
 */
function updateNamespacesEnv(namespaces: string): void {
  if (namespaces) {
    env.toObject().DEBUG = namespaces;
  } else {
    delete env.toObject().DEBUG;
  }
}

// Default logger
function log(...args: any[]): void {
  const result = format(...args);
  stderr.write(new TextEncoder().encode(result + "\n"));
}

// Exports

const debugModule: DebugModule = Object.assign(createDebug, {
  enable,
  disable,
  enabled,
  names,
  skips,
  formatters,
  log,
});

// Enable namespaces passed from env
enable(env.toObject().DEBUG);

export default debugModule;
