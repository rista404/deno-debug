import { test, assert, equal } from "https://deno.land/x/testing/mod.ts";
import debug from './debug.ts';

test({
	name: 'passes a basic sanity check',
	fn() {
		const log = debug('test');
		log.enabled = true;
		log.log = () => { };

		log('hello world');
	},
})

test({
	name: 'allows namespaces to be a non-string value',
	fn() {
		const log = debug('test');
		log.enabled = true;
		log.log = () => { };

		debug.enable(true);
	},
})

test({
	name: 'honors global debug namespace enable calls',
	fn() {
		equal(debug('test:12345').enabled, false);
		equal(debug('test:67890').enabled, false);

		debug.enable('test:12345');
		equal(debug('test:12345').enabled, true);
		equal(debug('test:67890').enabled, false);
	},
})

test({
	name: 'uses custom log function',
	fn() {
		const log = debug('test');
		log.enabled = true;

		const messages = [];
		log.log = (...args: any[]) => messages.push(args);

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		equal(messages.length, 3);
	},
})

// Extending

test({
	name: 'extend should extend namespace',
	fn() {
		const log = debug('foo');
		log.enabled = true;
		log.log = () => { };

		const logBar = log.extend('bar');
		equal(logBar.namespace, 'foo:bar');
	},
})

test({
	name: 'extend should extend namespace with custom delimiter',
	fn() {
		const log = debug('foo');
		log.enabled = true;
		log.log = () => { };

		const logBar = log.extend('bar', '--');
		equal(logBar.namespace, 'foo--bar');
	},
})

test({
	name: 'extend should extend namespace with empty delimiter',
	fn() {
		const log = debug('foo');
		log.enabled = true;
		log.log = () => { };

		const logBar = log.extend('bar', '');
		assert.strictEqual(logBar.namespace, 'foobar');
	},
})

test({
	name: 'extend should keep the log function between extensions',
	fn() {
		const log = debug('foo');
		log.log = () => { };

		const logBar = log.extend('bar');
		assert.strictEqual(log.log, logBar.log);
	},
})

// debug.enable

test({
	name: 'enable handles empty',
	fn() {
		debug.enable('');
		assert.equal(debug.names, []);
		assert.equal(debug.skips, []);
	},
})

// debug.disable


test({
	name: 'disable should keep the log function between extensions',
	fn() {
		debug.enable('test,abc*,-abc');
		const namespaces = debug.disable();
		assert.equal(namespaces, 'test,abc*,-abc');
	},
})

test({
	name: 'disable handles empty',
	fn() {
		debug.enable('');
		const namespaces = debug.disable();
		assert.equal(namespaces, '');
		assert.equal(debug.names, []);
		assert.equal(debug.skips, []);
	},
})

test({
	name: 'disable handles all',
	fn() {
		debug.enable('*');
		const namespaces = debug.disable();
		assert.equal(namespaces, '*');
	},
})

test({
	name: 'disable handles skip all',
	fn() {
		debug.enable('-*');
		const namespaces = debug.disable();
		assert.equal(namespaces, '-*');
	},
})

test({
	name: 'properly skips logging if all is disabled',
	fn() {
		debug.enable('-*');
		const log = debug('test');
		log.enabled = true;

		const messages = [];
		log.log = (...args: any[]) => messages.push(args);

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		equal(messages.length, 0);

		debug.enable('test');
		debug.disable();

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		equal(messages.length, 0);
	},
})


test({
	name: 'names+skips same with new string',
	fn() {
		debug.enable('test,abc*,-abc');
		const oldNames = [...debug.names];
		const oldSkips = [...debug.skips];
		const namespaces = debug.disable();
		assert.equal(namespaces, 'test,abc*,-abc');
		debug.enable(namespaces);
		assert.equal(oldNames.map(String), debug.names.map(String));
		assert.equal(oldSkips.map(String), debug.skips.map(String));
	},
})

