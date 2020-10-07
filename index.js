const linecolumn = require('line-column');

function run(source, rules, {main = 'main', limit = 0} = {}) {
	const stack = [{
		type: 'run',
		error: false,
		matches: 0,
		ast: [],
		items: [rules[main]],
		text: source
	}];
	function error(data = null) {
		const index = source.length - cur.text.length;
		const {line, col} = linecolumn(source, index);
		throw {
			index, line, column: col, data
		};
	}
	let count = 0;
	while (true) {
		if (limit != 0 && ++count > limit) {
			throw new Error('Limit reached.');
		}
		if (!stack.length) break;
		let cur = stack[stack.length - 1];
		if (cur.type == 'run' && cur.error) {
			error();
		} else if (cur.type == 'and' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.error) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'or' && (cur.matches > 0 || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.matches == 0) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'none' && ((!cur.error && cur.matches > 0) || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.matches == 0 || cur.error) {
				parent.matches++;
				parent.text = cur.text;
			} else {
				parent.error = true;
			}
			continue;
		} else if (cur.type == 'zero' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.matches != 0) {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'one' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.matches == 0) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'range' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if ((cur.from !== null && cur.matches < cur.from) || (cur.to !== null && cur.matches > cur.to)) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'opt' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (!cur.error) {
				parent.matches++;
				parent.text = cur.text;
				append(parent.ast, cur.ast);
			}
			continue;
		} else if (cur.type == 'hide' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.error) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
			}
			continue;
		} else if (cur.type == 'wrap' && (cur.error || !cur.items.length)) {
			stack.pop();
			const parent = stack[stack.length - 1];
			if (cur.error) {
				parent.error = true;
			} else {
				parent.matches++;
				parent.text = cur.text;
				parent.ast.push({
					key: cur.name,
					val: cur.ast,
					list: parent.ast
				});
			}
			continue;
		} else if (cur.type == 'zero') {
			if (cur.text.length) cur.items.push(cur.items[0]);
		} else if (cur.type == 'one') {
			if (cur.text.length) cur.items.push(cur.items[0]);
		} else if (cur.type == 'range') {
			if (cur.text.length) cur.items.push(cur.items[0]);
		} else if (cur.type == 'run' && (cur.error || !cur.items.length)) {
			break;
		}
		const item = cur.items.shift();
		if (typeof item == 'string') {
			if (cur.text.startsWith(item)) {
				cur.text = cur.text.slice(item.length);
				cur.ast.push({
					text: item,
					start: source.length - cur.text.length - item.length,
					stop: source.length - cur.text.length
				});
				cur.matches++;
			} else {
				cur.error = true;
			}
		} else if (item instanceof RegExp) {
			const match = cur.text.match(item);
			if (match !== null && match.index == 0) {
				cur.text = cur.text.slice(match[0].length);
				cur.ast.push({
					text: match[0],
					start: source.length - cur.text.length - match[0].length,
					stop: source.length - cur.text.length
				});
				cur.matches++;
			} else {
				cur.error = true;
			}
		} else {
			let [name, data] = item;
			if (name == 'rule') {
				cur.items.unshift(rules[data]);
			} else if (name == 'or') {
				stack.push({
					type: 'or',
					error: false,
					matches: 0,
					text: cur.text,
					items: data.slice(),
					ast: []
				});
			} else if (name == 'and') {
				stack.push({
					type: 'and',
					error: false,
					matches: 0,
					text: cur.text,
					items: data.slice(),
					ast: []
				});
			} else if (name == 'none') {
				stack.push({
					type: 'none',
					error: false,
					matches: 0,
					text: cur.text,
					items: [data],
					ast: []
				});
			} else if (name == 'zero') {
				stack.push({
					type: 'zero',
					error: false,
					matches: 0,
					text: cur.text,
					items: [data],
					ast: []
				});
			} else if (name == 'one') {
				stack.push({
					type: 'one',
					error: false,
					matches: 0,
					text: cur.text,
					items: [data],
					ast: []
				});
			} else if (name == 'opt') {
				stack.push({
					type: 'opt',
					error: false,
					matches: 0,
					text: cur.text,
					items: [data],
					ast: []
				});
			} else if (name == 'hide') {
				stack.push({
					type: 'hide',
					error: false,
					matches: 0,
					text: cur.text,
					items: [data],
					ast: []
				});
			} else if (name == 'wrap') {
				stack.push({
					type: 'wrap',
					error: false,
					matches: 0,
					text: cur.text,
					name: data[0],
					items: data[1].slice(),
					ast: []
				});
			} else if (name == 'range') {
				stack.push({
					type: 'range',
					error: false,
					matches: 0,
					text: cur.text,
					from: data[0],
					to: data[1],
					items: data[2].slice(),
					ast: []
				});
			} else if (name == 'insert') {
				cur.ast.push(data);
			} else if (name == 'convert') {
				const token = cur.ast.pop();
				try {
					cur.ast.push(data(token));
				} catch(e) {
					error(e);
				}
			} else if (name == 'modify') {
				const token = cur.ast[cur.ast.length - 1];
				try {
					data(token);
				} catch(e) {
					error(e);
				}
			} else if (name == 'custom') {
				try {
					data({
						stack, count, source,
						rules, main, limit
					});
				} catch(e) {
					error(e);
				}
			} else if (name == 'error') {
				error(data);
			} else if (name == 'log') {
				log(data);
			} else if (name == 'meta') {
				const token = cur.ast[cur.ast.length - 1];
				if (token !== undefined) {
					token[data[0]] = data[1];
				}
			} else if (name == 'clear') {
				cur.ast.length = 0;
			}
		}
	}
	const cur = stack[stack.length - 1];
	if (cur.text.length) error();
	return cur.ast;
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

const And = (...items) => ['and', items];
const Or = (...items) => ['or', items];
const Opt = (...items) => ['opt', items.length > 1 ? And(...items) : items[0]];
const Zero = (...items) => ['zero', items.length > 1 ? And(...items) : items[0]];
const None = (...items) => ['none', items.length > 1 ? And(...items) : items[0]];
const Range = (from, to, ...items) => ['range', [from, to, items]];
const One = (...items) => ['one', items.length > 1 ? And(...items) : items[0]];
const Rule = item => ['rule', item];
const Hide = item => ['hide', item];
const Wrap = (name, ...items) => ['wrap', [name, items]];
const Insert = content => ['insert', content];
const Convert = handler => ['convert', handler];
const Custom = handler => ['custom', handler];
const Modify = handler => ['modify', handler];
const Error = data => ['error', data];
const Log = data => ['log', data];
const Meta = (key, val) => ['meta', [key, val]];
const Clear = () => ['clear'];

module.exports = {
	run,
	And, Or,
	None, Opt, Zero, One, Range,
	Rule, Hide, Wrap, Insert,
	Convert, Custom, Modify,
	Error, Log, Meta, Clear
};