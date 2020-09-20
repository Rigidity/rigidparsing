const {compile} = require('universal-lexer')
const lineColumn = require('line-column');

function lexer(tokens = {}, {
	hide = []
} = {}) {
	const definitions = [];
	for (const [key, val] of Object.entries(tokens)) {
		let token = {
			type: key
		};
		if (typeof val == 'string') {
			token.value = val;
		} else if (val instanceof RegExp) {
			const text = val.toString();
			const sides = text.split(/\//g);
			const flags = sides[sides.length - 1];
			token.regex = text.slice(1, -1 - flags.length);
			token.regexFlags = flags;
		} else if (typeof val == 'object') {
			token = {...token, ...val};
		}
		definitions.push(token);
	}
	const lexer = compile(definitions);
	return text => {
		const pre = Date.now();
		const res = lexer(text);
		const post = Date.now();
		if (res.error) {
			throw {
				type: 'lex',
				char: res.index + 1,
				line: res.line,
				col: res.column,
				content: text.split('\n')[res.line - 1],
				source: text,
				time: post - pre
			};
		} else {
			const tokens = res.tokens.filter(token => !hide.includes(token.type)).map(token => {
				return {
					key: token.type,
					val: token.data.value,
					start: token.start,
					stop: token.end
				};
			});
			return {
				tokens, source: text,
				time: post - pre
			};
		}
	};
}

function parser(rules = {}, {
	main = 'main',
	exact = true
} = {}) {
	return ({tokens, source}) => {
		let callAmount = 0, itemAmount = 0, ruleAmount = 0;
		const pre = Date.now();
		function rule(name, tokens) {
			callAmount++;
			if (typeof name == 'function') {
				itemAmount++;
				return name.apply(rule, [tokens]);
			}
			ruleAmount++;
			const item = rules[name];
			const sub = copy(tokens);
			const res = item.apply(rule, [sub]);
			if (res === null) return null;
			uncopy(tokens, sub);
			return {
				key: name,
				val: res
			};
		}
		const sub = copy(tokens);
		const res = rule(main, sub);
		if (res === null) {
			throw {
				type: 'eof', source
			};
		}
		uncopy(tokens, sub);
		const post = Date.now();
		if (tokens.length && exact) {
			const token = tokens[0];
			const {line, col} = lineColumn(source).fromIndex(token.start);
			const content = source.split('\n')[line - 1];
			throw {
				type: 'parse',
				char: token.start + 1,
				line, col,
				content,
				source,
				token,
				tokens,
				time: post - pre
			};
		}
		return {
			tree: res,
			source,
			tokens,
			calls: callAmount,
			items: itemAmount,
			rules: ruleAmount,
			time: post - pre
		};
	}
}

function runner(items) {
	return tree => {
		if (tree.key in items) {
			return items[tree.key](tree.val);
		} else {
			throw tree.key;
		}
	};
}

function copy(array) {
	return array.slice();
}
function uncopy(array, items) {
	array.splice(0, array.length, ...items);
}

function and(...args) {
	if (args.filter(item => typeof item != 'function').length) {
		throw new Error('Invalid and arguments.');
	}
	return function(tokens) {
		const items = [];
		const sub = copy(tokens);
		for (var i = 0; i < args.length; i++) {
			const res = this(args[i], sub);
			if (res === null) return null;
			items.push(...res);
		}
		uncopy(tokens, sub);
		return items;
	};
}
function or(...args) {
	if (args.filter(item => typeof item != 'function').length) {
		throw new Error('Invalid or arguments.');
	}
	return function(tokens) {
		let res = null;
		const sub = copy(tokens);
		for (var i = 0; i < args.length; i++) {
			res = this(args[i], sub);
			if (res !== null) {
				break;
			}
		}
		if (res !== null) {
			uncopy(tokens, sub);
		}
		return res;
	};
}
function opt(arg) {
	if (typeof arg != 'function') {
		throw new Error('Invalid opt argument.');
	}
	return function(tokens) {
		const sub = copy(tokens);
		const res = this(arg, sub);
		if (res === null) return [];
		uncopy(tokens, sub);
		return res;
	};
}
function zero(arg) {
	if (typeof arg != 'function') {
		throw new Error('Invalid zero argument.');
	}
	return function(tokens) {
		const items = [];
		const sub = copy(tokens);
		while (true) {
			const res = this(arg, sub);
			if (res === null) break;
			items.push(...res);
		}
		uncopy(tokens, sub);
		return items;
	};
}
function one(arg) {
	if (typeof arg != 'function') {
		throw new Error('Invalid one argument.');
	}
	return function(tokens) {
		const items = [];
		const sub = copy(tokens);
		while (true) {
			const res = this(arg, sub);
			if (res === null) break;
			items.push(...res);
		}
		if (items.length) {
			uncopy(tokens, sub);
			return items;
		} else return null;
	};
}
function range(arg, min = -1, max = -1) {
	if (typeof arg != 'function' || typeof min != 'number' || typeof max != 'number') {
		throw new Error('Invalid range arguments.');
	}
	return function(tokens) {
		const items = [];
		const sub = copy(tokens);
		while (true) {
			const res = this(arg, sub);
			if (res === null) break;
			items.push(...res);
		}
		if ((items.length <= max || max < 0) && (items.length >= min || min < 0)) {
			uncopy(tokens, sub);
			return items;
		} else return null;
	};
}
function rule(name) {
	if (typeof name != 'string') {
		throw new Error('Invalid rule argument.');
	}
	return function(tokens) {
		const sub = copy(tokens);
		const res = this(name, sub);
		if (res === null) return null;
		uncopy(tokens, sub);
		return [res];
	};
}
function token(name) {
	if (typeof name != 'string') {
		throw new Error('Invalid token argument.');
	}
	return function(tokens) {
		if (!tokens.length) return null;
		const token = tokens[0];
		if (token.key == name) {
			return [tokens.shift().val];
		} else return null;
	};
}
function hide(arg) {
	if (typeof arg != 'function') {
		throw new Error('Invalid hide argument.');
	}
	return function(tokens) {
		const sub = copy(tokens);
		const res = this(arg, sub);
		if (res === null) return null;
		uncopy(tokens, sub);
		return [];
	};
}
function wrap(arg, key) {
	if (typeof arg != 'function' || typeof key != 'string') {
		throw new Error('Invalid wrap arguments.');
	}
	return function(tokens) {
		const sub = copy(tokens);
		const res = this(arg, sub);
		if (res === null) return null;
		uncopy(tokens, sub);
		return [{
			key, val: res
		}];
	};
}
function combine(arg) {
	if (typeof arg != 'function') {
		throw new Error('Invalid combine argument.');
	}
	function stringify(items) {
		let res = '';
		for (var i = 0; i < items.length; i++) {
			const item = items[i];
			if (typeof item == 'string') {
				res += item;
			} else res += stringify(item.val);
		}
		return res;
	}
	return function(tokens) {
		let text = '';
		const sub = copy(tokens);
		const res = this(arg, sub);
		if (res === null) return null;
		uncopy(tokens, sub);
		return [stringify(res)];
	};
}
function convert(arg, fn) {
	return function(tokens) {
		const sub = copy(tokens);
		const res = this(arg, sub);
		if (res === null) return null;
		uncopy(tokens, sub);
		return fn(res);
	};
}
function insert(...args) {
	return function(tokens) {
		return args;
	};
}

function error(error) {
	if (error.type == 'eof') {
		return 'SyntaxError: Unexpected end of script.';
	} else if (error.type == 'lex') {
		let line = '';
		for (var i = 0; i < error.col - 1; i++) {
			line += ' ';
		}
		line += '^';
		return `${error.content}\n${line}\nSyntaxError: Unknown token at ${error.line}:${error.col}`;
	} else if (error.type == 'parse') {
		let line = '';
		for (var i = 0; i < error.col - 1; i++) {
			line += ' ';
		}
		for (var i = error.token.start; i < error.token.stop; i++) line += '^';
		return `${error.content}\n${line}\nSyntaxError: Unexpected token '${error.token.val}' at ${error.line}:${error.col}`;
	}
}

const presets = {
	ws: /\s+/,
	number: /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/,
	string: /(?:"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*")|(?:'(?:[^\\']|\\(?:[bfnrtv'\\/]|u[0-9a-fA-F]{4}))*')/,
	rawstring: /(?:"(?:[^\\"]|\\(?:["\\/]))*")|(?:'(?:[^\\']|\\(?:['\\/]))*')/
};

module.exports = {
	lexer, parser,
	error, runner,
	presets, wrap,
	and, or, one,
	zero, opt, hide,
	range, combine,
	insert, convert,
	rule, token,
	copy, uncopy
};