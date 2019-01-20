// Copied from https://github.com/defunctzombie/node-util/blob/master/util.js
// Modified to format %o and %O as deno objects
import { inspect } from "deno";
import { coerce } from "./utils.ts";
const formatRegExp = /%[sdjoO%]/g;

export default function format(..._args: any[]) {
  let i = 1;
  const f = coerce(_args[0]);
  const args = _args.slice(1);
  const len = args.length;
  let str = String(f).replace(formatRegExp, function(x) {
    if (x === "%%") return "%";
    if (i >= len) return x;
    switch (x) {
      case "%s":
        return String(args[i++]);
      case "%d":
        return String(Number(args[i++]));
      case "%j":
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return "[Circular]";
        }
      case "%o":
      case "%O":
        return inspect(args[i++]);
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (x == null || typeof x !== "object") {
      str += " " + x;
    } else {
      str += " " + inspect(x);
    }
  }
  return str;
}
