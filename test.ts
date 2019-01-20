import { env } from "deno";
import createDebug, { enable } from "./debug.ts";

// Not actually a test, more of a demo
// Should add testing

const server = createDebug("deno:server");
const dotenv = createDebug("dotenv");
const worker = createDebug("deno:worker");

server("foo bar");
worker("bar foo");

enable("deno:server,dotenv,-deno:worker");

dotenv("env variables loaded");

worker("blablabla");

server("this is a number: %d", 5);
server("this is a string: %s, and some json here: %j", "server", { bla: true });
server("this is a string: %s, and some json here: %j", "server", { bla: true });
server("what is this, %o ,an object?", { bla: true });
server("object again %0", {
  bla: true,
  justify: "column",
  align: { center: true }
});
server("my name is %s", "deno server", 5);

enable("*");

worker("foo bar");

setTimeout(() => {
  worker("wooooorking");
}, 300);
