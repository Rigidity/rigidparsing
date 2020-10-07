const {
	run,
	And, Or,
	None, Opt, Zero, One, Range,
	Rule, Hide, Wrap, Insert,
	Convert, Custom, Modify,
	Err, Log, Meta, Clear
} = require('.');

function test(name, text, grammar) {
	const pre = Date.now();
	let error = null;
	let errored = false;
	try {
		run(text, grammar);
	} catch(err) {
		error = err;
		errored = true;
	}
	const post = Date.now();
	console.log(name, '|', post - pre, 'milliseconds', ...(errored ? ['|', error] : []));
	if (errored && error.data === null) process.exit(1);
}

test('hello-world', 'Hello, world!', {
	main: And(
		'Hello',
		Hide(/\s*/, ',', /\s*/),
		'world',
		Hide(/!|\./)
	)
});
test('nested-parens', '('.repeat(100) + ')'.repeat(100), {
	main: Zero(Rule('item')),
	item: Wrap('item',
		Hide('('),
		Zero(Rule('item')),
		Hide(')')
	)
});
test('complicated-grammar', 'uiwfjqgiqgyrtqwiueyeriotioyepyituobmcbhjgahfhgdfazdsfcvxbzncvxjjklajuiwtdgqgiqwertyuioplkjhgfdsazxcvbnm'.repeat(10), {
	main: Zero(Rule('a')),
	a: Or(Rule('b'), 'a'),
	b: Or(Rule('c'), 'b'),
	c: Or(Rule('d'), 'c'),
	d: Or(Rule('e'), 'd'),
	e: Or(Rule('f'), 'e'),
	f: Or(Rule('g'), 'f'),
	g: Or(Rule('h'), 'g'),
	h: Or(Rule('i'), 'h'),
	i: Or(Rule('j'), 'i'),
	j: Or(Rule('k'), 'j'),
	k: Or(Rule('l'), 'k'),
	l: Or(Rule('m'), 'l'),
	m: Or(Rule('n'), 'm'),
	n: Or(Rule('o'), 'n'),
	o: Or(Rule('p'), 'o'),
	p: Or(Rule('q'), 'p'),
	q: Or(Rule('r'), 'q'),
	r: Or(Rule('s'), 'r'),
	s: Or(Rule('t'), 's'),
	t: Or(Rule('u'), 't'),
	u: Or(Rule('v'), 'u'),
	v: Or(Rule('w'), 'v'),
	w: Or(Rule('x'), 'w'),
	x: Or(Rule('y'), 'x'),
	y: Or(Rule('z'), 'y'),
	z: 'z',
});
test('more-ranges', 'aaabbd', {
	main: And(
		One('a'),
		Range(1, 2, 'b'),
		None('c'),
		Opt('d')
	)
});
test('modify-ast', 'hello', {
	main: And(
		'hello',
		Clear(),
		Insert('hi'),
		Convert(item => item + '!')
	)
});
test('custom-features', 'another one', {
	main: And(
		'another one',
		Modify(token => token.something = 5),
		Meta('another', 8),
		Custom(data => {
			data.stack.pop();
			data.stack.pop();
			data.stack.push({
				type: 'run',
				error: false,
				items: [],
				text: ''
			})
		}),
		'haha'
	)
});
test('logging-test', 'abc', {
	main: And(
		Zero(Rule('item')),
		Err('Triggered an error!')
	),
	item: And(
		/[abc]/,
		Log('Found a match!')
	)
});

console.log('All tests completed.');