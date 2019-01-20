import debug from "./debug.ts";

// Not actually a test, more of a demo
// Should add testing

const server = debug("deno:server");
const dotenv = debug("dotenv");
const worker = debug("deno:worker");

server("foo bar");
worker("bar foo");

debug.enable("deno:server,dotenv,-deno:worker");

dotenv("env variables loaded");

worker("SHOULD NOT BE SEEN");

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

debug.enable("*");

const workerHttp = worker.extend("http");
workerHttp("Hello from extended worker");

const workerTcp = worker.extend("tcp", "-");
workerTcp("Hello from extended worker with custom delimiter");

worker("foo bar");

setTimeout(() => {
  worker("wooooorking");
}, 300);
