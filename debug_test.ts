import { test } from "https://deno.land/x/testing/mod.ts";
import { assert, assertEquals, assertStrictEq } from "https://deno.land/std/testing/asserts.ts";
import debug from "./debug.ts";

test({
  name: "passes a basic sanity check",
  fn() {
    const log = debug("test");
    log.enabled = true;
    log.log = () => { };

    log("hello world");
  }
});

test({
  name: "allows namespaces to be a non-string value",
  fn() {
    const log = debug("test");
    log.enabled = true;
    log.log = () => { };

    debug.enable(true);
  }
});

test({
  name: "logger should handle error as the first param",
  fn() {
    const log = debug("test");
    log.enabled = true;
    const messages = [];
    log.log = (...args: any[]) => messages.push(args);

    log(new Error());

    assertEquals(typeof messages[0][0], "string");
    assertEquals(typeof messages[0][1], "string");
  }
});

test({
  name: "honors global debug namespace enable calls",
  fn() {
    assertEquals(debug("test:12345").enabled, false);
    assertEquals(debug("test:67890").enabled, false);

    debug.enable("test:12345");
    assertEquals(debug("test:12345").enabled, true);
    assertEquals(debug("test:67890").enabled, false);
  }
});

test({
  name: "uses custom log function",
  fn() {
    const log = debug("test");
    log.enabled = true;

    const messages = [];
    log.log = (...args: any[]) => messages.push(args);

    log("using custom log function");
    log("using custom log function again");
    log("%O", 12345);

    assertEquals(messages.length, 3);
  }
});

// Extending

test({
  name: "extend should extend namespace",
  fn() {
    const log = debug("foo");
    log.enabled = true;
    log.log = () => { };

    const logBar = log.extend("bar");
    assertEquals(logBar.namespace, "foo:bar");
  }
});

test({
  name: "extend should extend namespace with custom delimiter",
  fn() {
    const log = debug("foo");
    log.enabled = true;
    log.log = () => { };

    const logBar = log.extend("bar", "--");
    assertEquals(logBar.namespace, "foo--bar");
  }
});

test({
  name: "extend should extend namespace with empty delimiter",
  fn() {
    const log = debug("foo");
    log.enabled = true;
    log.log = () => { };

    const logBar = log.extend("bar", "");
    assertStrictEq(logBar.namespace, "foobar");
  }
});

test({
  name: "extend should keep the log function between extensions",
  fn() {
    const log = debug("foo");
    log.log = () => { };

    const logBar = log.extend("bar");
    assertStrictEq(log.log, logBar.log);
  }
});

// log.destroy()

test({
  name: "destroy works",
  fn() {
    const log = debug("test");
    log.enabled = true;

    const messages = [];
    log.log = (...args: any[]) => messages.push(args);

    log("using custom log function");
    log("using custom log function again");

    log.destroy();

    log("using custom log function");

    assertEquals(messages.length, 2);
  }
});

// debug.enable

test({
  name: "enable handles empty",
  fn() {
    debug.enable("");
    assertEquals(debug.names, []);
    assertEquals(debug.skips, []);
  }
});

test({
  name: "enable works",
  fn() {
    assertEquals(debug.enabled("test"), false);

    debug.enable("test");
    assertEquals(debug.enabled("test"), true);

    debug.disable();
    assertEquals(debug.enabled("test"), false);
  }
});

// debug.disable

test({
  name: "disable should keep the log function between extensions",
  fn() {
    debug.enable("test,abc*,-abc");
    const namespaces = debug.disable();
    assertEquals(namespaces, "test,abc*,-abc");
  }
});

test({
  name: "disable handles empty",
  fn() {
    debug.enable("");
    const namespaces = debug.disable();
    assertEquals(namespaces, "");
    assertEquals(debug.names, []);
    assertEquals(debug.skips, []);
  }
});

test({
  name: "disable handles all",
  fn() {
    debug.enable("*");
    const namespaces = debug.disable();
    assertEquals(namespaces, "*");
  }
});

test({
  name: "disable handles skip all",
  fn() {
    debug.enable("-*");
    const namespaces = debug.disable();
    assertEquals(namespaces, "-*");
  }
});

test({
  name: "properly skips logging if all is disabled",
  fn() {
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
  }
});

test({
  name: "names+skips same with new string",
  fn() {
    debug.enable("test,abc*,-abc");
    const oldNames = [...debug.names];
    const oldSkips = [...debug.skips];
    const namespaces = debug.disable();
    assertEquals(namespaces, "test,abc*,-abc");
    debug.enable(namespaces);
    assertEquals(oldNames.map(String), debug.names.map(String));
    assertEquals(oldSkips.map(String), debug.skips.map(String));
  }
});

// custom formatters

test({
  name: "adds a custom formatter",
  fn() {
    const log = debug("test");
    log.enabled = true;
    const messages = [];
    log.log = (...args: any[]) => messages.push(args);

    debug.formatters.t = function (v: any) {
      return `test`;
    };
    debug.formatters.w = v => {
      return v + 5;
    };
    log("this is: %t", "this will be ignored");
    log("this is: %w", 5);

    assert(messages[0][0].includes("this is: test"));
    assert(messages[1][0].includes("this is: 10"));
  }
});

test({
  name: "formatters can access logger on this",
  fn() {
    const log = debug("test");
    log.enabled = true;
    log.log = () => { };

    debug.formatters.t = function (v: any) {
      assertStrictEq(this, log);
      return `test`;
    };
    log("this is: %t", "this will be ignored");
  }
});

// Custom global logger

test({
  name: "overrides all per-namespace log settings",
  fn() {
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
  }
});
