// Copied from https://github.com/defunctzombie/node-util/blob/master/test/node/format.js
import {
  assert,
  assertEquals,
  assertStrictEq,
} from "https://deno.land/std@v0.50.0/testing/asserts.ts";
import format from "./format.ts";

Deno.test("testFormat", function () {
  assertEquals(format(), "");
  assertEquals(format(""), "");
  assertEquals(format([]), "[]");
  assertEquals(format({}), "{}");
  assertEquals(format(null), "null");
  assertEquals(format(true), "true");
  assertEquals(format(false), "false");
  assertEquals(format("test"), "test");

  // CHECKME this is for console.log() compatibility - but is it *right*?
  assertEquals(format("foo", "bar", "baz"), "foo bar baz");

  assertEquals(format("%d", 42.0), "42");
  assertEquals(format("%d", 42), "42");
  assertEquals(format("%s", 42), "42");
  assertEquals(format("%j", 42), "42");

  assertEquals(format("%d", "42.0"), "42");
  assertEquals(format("%d", "42"), "42");
  assertEquals(format("%s", "42"), "42");
  assertEquals(format("%j", "42"), '"42"');

  assertEquals(format("%%s%s", "foo"), "%sfoo");

  assertEquals(format("%s"), "%s");
  assertEquals(format("%s", undefined), "undefined");
  assertEquals(format("%s", "foo"), "foo");
  assertEquals(format("%s:%s"), "%s:%s");
  assertEquals(format("%s:%s", undefined), "undefined:%s");
  assertEquals(format("%s:%s", "foo"), "foo:%s");
  assertEquals(format("%s:%s", "foo", "bar"), "foo:bar");
  assertEquals(format("%s:%s", "foo", "bar", "baz"), "foo:bar baz");
  assertEquals(format("%%%s%%", "hi"), "%hi%");
  assertEquals(format("%%%s%%%%", "hi"), "%hi%%");

  (function () {
    let o: { o?: any } = {};
    o.o = o;
    assertEquals(format("%j", o), "[Circular]");
  })();

  // Ignore erros until we see should util package be ported
  // or a replacement found

  // Errors
  // assertEquals(format(new Error('foo')), 'Error: foo');
  // class CustomError extends Error {
  // 	constructor(msg) {
  // 		super(msg);
  // 		Object.defineProperty(this, 'message', { value: msg, enumerable: false });
  // 		Object.defineProperty(this, 'name', { value: 'CustomError', enumerable: false });
  // 	}
  // }
  // assertEquals(format(new CustomError('bar')), 'CustomError: bar');
});
