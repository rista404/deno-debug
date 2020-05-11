// Copied from https://github.com/defunctzombie/node-util/blob/master/test/node/format.js
import {
  assert,
  assertEquals,
  assertStrictEq,
} from "https://deno.land/std@v0.50.0/testing/asserts.ts";
import debug from "./debug.ts";

Deno.test("passes a basic sanity check", function () {
  const log = debug("test");
  log.enabled = true;
  log.log = () => {};

  log("hello world");
});

Deno.test("allows namespaces to be a non-string value", function () {
  const log = debug("test");
  log.enabled = true;
  log.log = () => {};

  debug.enable(true);
});

Deno.test("logger should handle error as the first param", function () {
  const log = debug("test");
  log.enabled = true;
  const messages: any[][] = [];
  log.log = (...args: any[]) => messages.push(args);

  log(new Error());

  assertEquals(typeof messages[0][0], "string");
  assertEquals(typeof messages[0][1], "string");
});

Deno.test("honors global debug namespace enable calls", function () {
  assertEquals(debug("test:12345").enabled, false);
  assertEquals(debug("test:67890").enabled, false);

  debug.enable("test:12345");
  assertEquals(debug("test:12345").enabled, true);
  assertEquals(debug("test:67890").enabled, false);
});

Deno.test("uses custom log function", function () {
  const log = debug("test");
  log.enabled = true;

  const messages = [];
  log.log = (...args: any[]) => messages.push(args);

  log("using custom log function");
  log("using custom log function again");
  log("%O", 12345);

  assertEquals(messages.length, 3);
});

// Extending

Deno.test("extend should extend namespace", function () {
  const log = debug("foo");
  log.enabled = true;
  log.log = () => {};

  const logBar = log.extend("bar");
  assertEquals(logBar.namespace, "foo:bar");
});

Deno.test("extend should extend namespace with custom delimiter", function () {
  const log = debug("foo");
  log.enabled = true;
  log.log = () => {};

  const logBar = log.extend("bar", "--");
  assertEquals(logBar.namespace, "foo--bar");
});

Deno.test("extend should extend namespace with empty delimiter", function () {
  const log = debug("foo");
  log.enabled = true;
  log.log = () => {};

  const logBar = log.extend("bar", "");
  assertStrictEq(logBar.namespace, "foobar");
});

Deno.test(
  "extend should keep the log function between extensions",
  function () {
    const log = debug("foo");
    log.log = () => {};

    const logBar = log.extend("bar");
    assertStrictEq(log.log, logBar.log);
  },
);

// log.destroy()

Deno.test("destroy works", function () {
  const log = debug("test");
  log.enabled = true;

  const messages = [];
  log.log = (...args: any[]) => messages.push(args);

  log("using custom log function");
  log("using custom log function again");

  log.destroy();

  log("using custom log function");

  assertEquals(messages.length, 2);
});

// debug.enable

Deno.test("enable handles empty", function () {
  debug.enable("");
  assertEquals(debug.names, []);
  assertEquals(debug.skips, []);
});

Deno.test("enable works", function () {
  assertEquals(debug.enabled("test"), false);

  debug.enable("test");
  assertEquals(debug.enabled("test"), true);

  debug.disable();
  assertEquals(debug.enabled("test"), false);
});

// debug.disable

Deno.test(
  "disable should keep the log function between extensions",
  function () {
    debug.enable("test,abc*,-abc");
    const namespaces = debug.disable();
    assertEquals(namespaces, "test,abc*,-abc");
  },
);

Deno.test("disable handles empty", function () {
  debug.enable("");
  const namespaces = debug.disable();
  assertEquals(namespaces, "");
  assertEquals(debug.names, []);
  assertEquals(debug.skips, []);
});

Deno.test("disable handles all", function () {
  debug.enable("*");
  const namespaces = debug.disable();
  assertEquals(namespaces, "*");
});

Deno.test("disable handles skip all", function () {
  debug.enable("-*");
  const namespaces = debug.disable();
  assertEquals(namespaces, "-*");
});

Deno.test("properly skips logging if all is disabled", function () {
  debug.enable("-*");
  const log = debug("test");

  const messages = [];
  log.log = (...args: any[]) => messages.push(args);

  log("using custom log function");
  log("using custom log function again");
  log("%O", 12345);

  assertEquals(messages.length, 0);

  debug.enable("test");
  debug.disable();

  log("using custom log function");
  log("using custom log function again");
  log("%O", 12345);

  assertEquals(messages.length, 0);
});

Deno.test("names+skips same with new string", function () {
  debug.enable("test,abc*,-abc");
  const oldNames = [...debug.names];
  const oldSkips = [...debug.skips];
  const namespaces = debug.disable();
  assertEquals(namespaces, "test,abc*,-abc");
  debug.enable(namespaces);
  assertEquals(oldNames.map(String), debug.names.map(String));
  assertEquals(oldSkips.map(String), debug.skips.map(String));
});

// custom formatters

Deno.test("adds a custom formatter", function () {
  const log = debug("test");
  log.enabled = true;
  const messages: any[][] = [];
  log.log = (...args: any[]) => messages.push(args);

  debug.formatters.t = function (v: any) {
    return `test`;
  };
  debug.formatters.w = (v) => {
    return v + 5;
  };
  log("this is: %t", "this will be ignored");
  log("this is: %w", 5);

  assert(messages[0][0].includes("this is: test"));
  assert(messages[1][0].includes("this is: 10"));
});

Deno.test("formatters can access logger on this", function () {
  const log = debug("test");
  log.enabled = true;
  log.log = () => {};

  debug.formatters.t = function (v: any) {
    assertStrictEq(this, log);
    return `test`;
  };
  log("this is: %t", "this will be ignored");
});

// Custom global logger

Deno.test("overrides all per-namespace log settings", function () {
  const loger1 = debug("test");
  loger1.enabled = true;
  const loger2 = debug("test2");
  loger2.enabled = true;

  const messages = [];

  debug.log = (...args: any[]) => messages.push(args);

  loger1("using custom log function");
  loger2("using custom log function again");
  loger1("%O", 12345);

  assertEquals(messages.length, 3);
});
