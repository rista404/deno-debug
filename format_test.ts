// Copied from https://github.com/defunctzombie/node-util/blob/master/test/node/format.js
import { test, assert, equal } from "https://deno.land/x/testing/mod.ts";
import format from "./format.ts";

test(function testFormat() {
  assert.equal(format(), "");
  assert.equal(format(""), "");
  assert.equal(format([]), "[]");
  assert.equal(format({}), "{}");
  assert.equal(format(null), "null");
  assert.equal(format(true), "true");
  assert.equal(format(false), "false");
  assert.equal(format("test"), "test");

  // CHECKME this is for console.log() compatibility - but is it *right*?
  assert.equal(format("foo", "bar", "baz"), "foo bar baz");

  assert.equal(format("%d", 42.0), "42");
  assert.equal(format("%d", 42), "42");
  assert.equal(format("%s", 42), "42");
  assert.equal(format("%j", 42), "42");

  assert.equal(format("%d", "42.0"), "42");
  assert.equal(format("%d", "42"), "42");
  assert.equal(format("%s", "42"), "42");
  assert.equal(format("%j", "42"), '"42"');

  assert.equal(format("%%s%s", "foo"), "%sfoo");

  assert.equal(format("%s"), "%s");
  assert.equal(format("%s", undefined), "undefined");
  assert.equal(format("%s", "foo"), "foo");
  assert.equal(format("%s:%s"), "%s:%s");
  assert.equal(format("%s:%s", undefined), "undefined:%s");
  assert.equal(format("%s:%s", "foo"), "foo:%s");
  assert.equal(format("%s:%s", "foo", "bar"), "foo:bar");
  assert.equal(format("%s:%s", "foo", "bar", "baz"), "foo:bar baz");
  assert.equal(format("%%%s%%", "hi"), "%hi%");
  assert.equal(format("%%%s%%%%", "hi"), "%hi%%");

  (function() {
    let o: { o?: any } = {};
    o.o = o;
    assert.equal(format("%j", o), "[Circular]");
  })();

  // Ignore erros until we see should util package be ported
  // or a replacement found

  // Errors
  // assert.equal(format(new Error('foo')), 'Error: foo');
  // class CustomError extends Error {
  // 	constructor(msg) {
  // 		super(msg);
  // 		Object.defineProperty(this, 'message', { value: msg, enumerable: false });
  // 		Object.defineProperty(this, 'name', { value: 'CustomError', enumerable: false });
  // 	}
  // }
  // assert.equal(format(new CustomError('bar')), 'CustomError: bar');
});
