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