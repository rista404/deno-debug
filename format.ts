// Copied from https://github.com/defunctzombie/node-util/blob/master/util.js
// Modified to format %o and %O as deno objects
import { inspect } from "deno";
const formatRegExp = /%[sdjoO%]/g;

export default function format(f: string, ..._args: any[]) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
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
