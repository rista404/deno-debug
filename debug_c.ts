// Module dependencies
import { env, inspect } from "deno";
import ms from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";
import { camelCase } from "https://raw.githubusercontent.com/denolib/camelcase/master/index.ts";

const currentEnv = env()

/**
 * Build up the default `inspectOpts` object from the environment variables.
 * DEBUG_HIDE_DATE
 * DEBUG_COLORS
 * DEBUG_DEPTH
 * DEBUG_SHOW_HIDDEN
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */
interface InspectOpts {
	hideDate?: boolean | null,
	colors?: boolean | null,
	depth?: number | null,
	showHidden?: boolean | null,
};

export const inspectOpts: InspectOpts = Object.keys(currentEnv)
	.filter(key => /^debug_/i.test(key))
	.reduce((obj, key) => {
		const prop = camelCase(key.slice(6));

		let envVar: string = currentEnv[key];
		let val: boolean | number | null;
		if (/^(yes|on|true|enabled)$/i.test(envVar)) {
			val = true;
		} else if (/^(no|off|false|disabled)$/i.test(envVar)) {
			val = false;
		} else if (envVar === 'null') {
			val = null;
		} else {
			val = Number(envVar);
		}

		obj[prop] = val;
		return obj;
	}, {})


function getDate(): string {
	return inspectOpts.hideDate
		? ''
		: new Date().toISOString() + ' ';
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	return currentEnv.DEBUG
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */
function init(debug) {
	debug.inspectOpts = {...inspectOpts};
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	if (namespaces) {
		currentEnv.DEBUG = namespaces;
	} else {
		delete currentEnv.DEBUG;
	}
}




// common.js

interface DebugInstance {
	(formatter: any, ...args: any[]): void;
	enabled: boolean;
	log: Function;
	namespace: string;
}

interface createDebug {
	(namespace: string): DebugInstance;
	// This is set from the env vars
	names: RegExp[];
	skips: RegExp[];
	instances: DebugInstance[];
	enable: (namespaces: string) => void;
	enabled: (namespaces: string) => boolean;
}

let createDebug: createDebug;
createDebug = function createDebug(namespace: string): DebugInstance {
	let prevTime: number;

	function debug(...args) {

	}

	debug.namespace = namespace;

	return debug;
}

createDebug.enable = enable;
createDebug.enabled = enabled;
export default createDebug;
export const debug = createDebug;

export function enable(namespaces: string) {
	save(namespaces);

	createDebug.names = [];
	createDebug.skips = [];

	const splits = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);

	splits.forEach((split) => {
		if(!split) return;

		namespaces = split[i].replace(/\*/g, '.*?');

		if (namespaces[0] === '-') {
			createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
		} else {
			createDebug.names.push(new RegExp('^' + namespaces + '$'));
		}
	});

	createDebug.instances.forEach((instance) => {
		instance.enabled = createDebug.enabled(instance.namespace);
	});
}

/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
function enabled(namespace: string): boolean {
	if (namespace[namespace.length - 1] === '*') {
		return true;
	}

	for (const skip of createDebug.skips) {
		if (skip.test(namespace)) {
			return false;
		}
	}
	for (const name of createDebug.names) {
		if (name.test(namespace)) {
			return false;
		}
	}

	return false;
}



