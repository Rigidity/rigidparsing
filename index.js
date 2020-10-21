function linecolumn(index, text) {
	const lines = text.split('\n');
	const count = lines.length;
	while (lines.length && index >= lines[0].length) {
		index -= lines[0].length;
		lines.shift();
	}
	return {
		line: count - lines.length,
		column: index
	}
}

function append(target, source) {
	for (let i = 0; i < source.length; i++) {
		target.push(source[i]);
	}
}
function prepend(target, source) {
	for (let i = source.length - 1; i >= 0; i--) {
		target.unshift(source[i]);
	}
}

class Context {
	constructor(text, rules, options = {}) {
		this.text = text;
		this.rules = rules;
		this.options = options;
		this.stack = [];
	}
	scope() {
		return this.stack[this.stack.length - 1];
	}
}

class Scope {
	constructor(text, ...items) {
		this.error = false;
		this.matches = 0;
		this.text = text;
		this.items = items;
		this.tokens = [];
		this.check = null;
		this.exit = null;
		this.source = '';
	}
}

class Token {
	constructor(text, start, stop) {
		this.text = text;
		this.start = start;
		this.stop = stop;
	}
}

function runSync(text, rules, options = {}) {
	const main = options.main ?? 'main';
	const debug = options.debug ?? false;
	const exact = options.exact ?? true;
	const result = options.result ?? 'tokens';
	if (!['tokens', 'scope'].includes(result)) throw new Error(`Invalid result type "${result}". Valid types are "tokens", "scope".`)
	if (rules[main] === undefined) throw new Error('The "main" rule is not defined.');
	const context = new Context(text, rules, options);
	const root = new Scope(context.text);
	root.items = [rules[main]];
	context.stack.push(root);
	function error(data = null) {
		const index = text.length - root.text.length;
		throw {
			...linecolumn(index, text),
			data
		};
	}
	while (true) {
		const scope = context.scope();
		if (scope === undefined) break;
		if (debug) console.log('[SCOPE]', scope);
		if (!(scope.check?.() ?? true) || !scope.items.length) {
			if (scope === root) break;
			context.stack.pop();
			const parent = context.scope();
			parent.source += scope.source;
			scope.exit?.(parent);
			continue;
		}
		const item = scope.items.shift();
		if (debug) console.log('[ITEM]', item);
		if (typeof item == 'string') {
			if (scope.text.startsWith(item)) {
				scope.text = scope.text.slice(item.length);
				const end = text.length - scope.text.length;
				scope.tokens.push(new Token(item, end - item.length, end));
				scope.source += item;
				scope.matches++;
			} else scope.error = true;
		} else if (item instanceof RegExp) {
			const match = scope.text.match(item);
			if (match !== null && match.index == 0) {
				scope.text = scope.text.slice(match[0].length);
				const end = text.length - scope.text.length;
				scope.tokens.push(new Token(match[0], end - match[0].length, end));
				scope.source += match[0];
				scope.matches++;
			} else scope.error = true;
		} else if (typeof item == 'object') {
			const args = Array.isArray(item) ? item : [item];
			if (args.length < 2) args.push({});
			args[1].exact = false;
			args[1].result = 'scope';
			args[1].debug = args[1].debug ?? options.debug;
			try {
				const res = runSync(scope.text, ...args);
				scope.text = scope.text.slice(res.source.length);
				append(scope.tokens, res.tokens);
				scope.matches++;
				scope.source += res.source;
			} catch {
				scope.error = true;
			}
		} else item(context);
	}
	if ((exact && root.text.length) || root.error) error();
	if (result == 'tokens') return root.tokens;
	else if (result == 'scope') return root;
}

async function runAsync(text, rules, options = {}) {
	const main = options.main ?? 'main';
	const debug = options.debug ?? false;
	const exact = options.exact ?? true;
	const result = options.result ?? 'tokens';
	if (!['tokens', 'scope'].includes(result)) throw new Error(`Invalid result type "${result}". Valid types are "tokens", "scope".`)
	if (rules[main] === undefined) throw new Error('The "main" rule is not defined.');
	const context = new Context(text, rules, options);
	const root = new Scope(context.text);
	root.items = [rules[main]];
	context.stack.push(root);
	function error(data = null) {
		const index = text.length - root.text.length;
		throw {
			...linecolumn(index, text),
			data
		};
	}
	while (true) {
		const scope = context.scope();
		if (scope === undefined) break;
		if (debug) console.log('[SCOPE]', scope);
		if (!((await scope.check?.()) ?? true) || !scope.items.length) {
			if (scope === root) break;
			context.stack.pop();
			const parent = context.scope();
			parent.source += scope.source;
			await scope.exit?.(parent);
			continue;
		}
		const item = scope.items.shift();
		if (debug) console.log('[ITEM]', item);
		if (typeof item == 'string') {
			if (scope.text.startsWith(item)) {
				scope.text = scope.text.slice(item.length);
				const end = text.length - scope.text.length;
				scope.tokens.push(new Token(item, end - item.length, end));
				scope.source += item;
				scope.matches++;
			} else scope.error = true;
		} else if (item instanceof RegExp) {
			const match = scope.text.match(item);
			if (match !== null && match.index == 0) {
				scope.text = scope.text.slice(match[0].length);
				const end = text.length - scope.text.length;
				scope.tokens.push(new Token(match[0], end - match[0].length, end));
				scope.source += match[0];
				scope.matches++;
			} else scope.error = true;
		} else if (typeof item == 'object') {
			const args = Array.isArray(item) ? item : [item];
			if (args.length < 2) args.push({});
			args[1].exact = false;
			args[1].result = 'scope';
			args[1].debug = args[1].debug ?? options.debug;
			try {
				const res = await run(scope.text, ...args);
				scope.text = scope.text.slice(res.source.length);
				append(scope.tokens, res.tokens);
				scope.matches++;
				scope.source += res.source;
			} catch {
				scope.error = true;
			}
		} else await item(context);
	}
	if ((exact && root.text.length) || root.error) error();
	if (result == 'tokens') return root.tokens;
	else if (result == 'scope') return root;
}

function run(text, rules, options = {}) {
	return (options.async ?? false) ? runAsync(text, rules, options) : runSync(text, rules, options);
}

const And = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	append(scope.items, items);
	scope.check = () => !scope.error;
	scope.exit = parent => {
		if (scope.error) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const Hide = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	append(scope.items, items);
	scope.check = () => !scope.error;
	scope.exit = parent => {
		if (scope.error) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
		}
	};
	ctx.stack.push(scope);
};

const Wrap = (name, ...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	append(scope.items, items);
	scope.check = () => !scope.error;
	scope.exit = parent => {
		if (scope.error) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
			parent.tokens.push({
				key: name,
				val: scope.tokens,
				text: scope.source
			});
		}
	};
	ctx.stack.push(scope);
};

const Group = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	append(scope.items, items);
	scope.check = () => !scope.error;
	scope.exit = parent => {
		if (scope.error) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
			parent.tokens.push(scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const One = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	scope.items = items.length > 1 ? [And(...items)] : items;
	scope.check = () => {
		if (scope.error) return false;
		if (scope.text.length) scope.items.push(scope.items[0]);
		return true;
	};
	scope.exit = parent => {
		if (!scope.matches) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const Zero = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	scope.items = items.length > 1 ? [And(...items)] : items;
	scope.check = () => {
		if (scope.error) return false;
		if (scope.text.length) scope.items.push(scope.items[0]);
		return true;
	};
	scope.exit = parent => {
		if (scope.matches) {
			parent.text = scope.text;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const Opt = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	scope.items = items.length > 1 ? [And(...items)] : items;
	scope.check = () => !scope.error;
	scope.exit = parent => {
		if (!scope.error) {
			parent.text = scope.text;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const Or = (...items) => ctx => {
	const scope = new Scope(ctx.scope().text);
	append(scope.items, items);
	scope.check = () => !scope.matches;
	scope.exit = parent => {
		if (!scope.matches) {
			parent.error = true;
		} else {
			parent.text = scope.text;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	ctx.stack.push(scope);
};

const Rule = (...names) => ctx => {
	prepend(ctx.scope().items, names.map(name => {
		const rule = ctx.rules[name];
		if (rule === undefined) throw new Error(`Cannot find a rule name "${name}"`);
		return rule;
	}));
};

const Insert = (...items) => ctx => {
	append(ctx.scope().tokens, items);
};

module.exports = {
	linecolumn, append, prepend,
	Context, Scope, Token, run, runSync, runAsync,
	And, Hide, Wrap, Or, Opt, Zero, One,
	Rule, Group, Insert
};