import debug from "./debug.ts";

// Not actually a test, more of a demo
// Should improve it

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
server("object again %O", {
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

const nestedObj: any = { a: { b: { c: { d: { e: { f: 42 } } } } } };
workerHttp("Nested object: %O", nestedObj);

const obj = { a: 1 };
const obj2 = { b: 2 };
const weakSet = new WeakSet([obj, obj2]);
worker("Object with hidden fields: %O", weakSet);

workerTcp(`multi
line
comment`);

setTimeout(() => {
  worker("wooooorking");
}, 300);
