const {
	run,
	Hide,
	And,
	Rule,
	Or,
	Zero,
	Wrap,
	One,
	Opt
} = require('.');

function Apply(...handlers) {
	return ctx => {
		let scope = ctx.scope();
		handlers.forEach(handler => {
			scope.tokens = handler(scope.tokens);
		});
	};
}

const tokens = run(`

int x = 5;
int y = 9;
int z = x;

`, {
	ws: /\s+/,
	singleComment: /\/\/[^\n\r]*/,
	multiComment: /\/\*[^]*?\*\//,
	skip: Hide(Zero(Or(
		Rule('ws'),
		Rule('singleComment'),
		Rule('multiComment')
	))),
	id: Wrap('id',
		/[a-zA-Z$_][a-zA-Z0-9$_]*/,
		Apply(tokens => [tokens[0].text])
	),
	float: Wrap('float',
		Or(
			/\d+\.[0-9]+(?:[eE][+-]?[0-9]+)?/,
			/\.[0-9]+(?:[eE][+-]?[0-9]+)?/
		),
		Apply(tokens => [tokens[0].text])
	),
	int: Wrap('int',
		/[0-9]+(?:[eE][+-]?[0-9]+)?/,
		Apply(tokens => [tokens[0].text])
	),
	hex: Wrap('hex',
		/0[xX][0-9a-fA-F]+/,
		Apply(tokens => [tokens[0].text.slice(2)])
	),
	oct: Wrap('oct',
		/0[oO][0-7]+/,
		Apply(tokens => [tokens[0].text.slice(2)])
	),
	bin: Wrap('bin',
		/0[bB][01]+/,
		Apply(tokens => [tokens[0].text.slice(2)])
	),
	bool: Wrap('bool',
		Or('true', 'false'),
		Apply(tokens => [tokens[0].text == 'true'])
	),
	str: Wrap('str', Or(
		And(
			Hide('`'),
			Zero(Rule('multiChar')),
			Hide('`')
		),
		And(
			Hide('"'),
			Zero(Rule('doubleChar')),
			Hide('"')
		),
		And(
			Hide("'"),
			Zero(Rule('singleChar')),
			Hide("'")
		)
	)),
	singleChar: Or(
		And(
			/[^'\\\r\n]/,
			Apply(tokens => [tokens[0].text])
		),
		And(Hide('\\'), Rule('escape')),
		Rule('continuation')
	),
	doubleChar: Or(
		And(
			/[^"\\\r\n]/,
			Apply(tokens => [tokens[0].text])
		),
		And(Hide('\\'), Rule('escape')),
		Rule('continuation')
	),
	multiChar: Or(
		And(
			/[^`\\]/,
			Apply(tokens => [tokens[0].text])
		),
		And('\\', Rule('escape'))
	),
	escape: Or(
		Rule('codeEscape'),
		Rule('charEscape'),
		Rule('nullEscape'),
		Rule('hexEscape'),
		Rule('unicodeEscape'),
		Rule('templateEscape')
	),
	templateEscape: Wrap('template',
		/(?:[1-9]|\([1-9][0-9]*\))/,
		Apply(tokens => {
			const source = tokens[0].text;
			const text = source.startsWith('(') ? source.slice(1, -1) : source;
			const number = parseInt(text);
			return [number];
		})
	),
	codeEscape: Wrap('code',
		Hide('{'),
		Rule('item'),
		Hide('}')
	),
	nullEscape: And(
		/0(?![0-9])/,
		Apply(tokens => ['\0'])
	),
	hexEscape: And(
		/x[0-9a-fA-F]{2}/,
		Apply(tokens => {
			const text = tokens[0].text.slice(1);
			const number = parseInt(text, 16);
			const char = String.fromCharCode(number);
			return [char];
		})
	),
	unicodeEscape: And(
		/u(?:[0-9a-fA-F]{4}|\{[0-9a-fA-F]+\})/,
		Apply(tokens => {
			const source = tokens[0].text.slice(1);
			const text = source.startsWith('{') ? source.slice(1, -1) : source;
			const number = parseInt(text, 16);
			const char = String.fromCharCode(number);
			return [char];
		})
	),
	charEscape: And(
		/['"\\bfnrtv]/,
		Apply(tokens => {
			const {text} = tokens[0];
			let char;
			if (text == "'") char = "'";
			else if (text == '"') char = '"';
			else if (text == '\\') char = '\\';
			else if (text == 'b') char = '\b';
			else if (text == 'f') char = '\f';
			else if (text == 'n') char = '\n';
			else if (text == 'r') char = '\r';
			else if (text == 't') char = '\t';
			else if (text == 'v') char = '\v';
			return [char];
		})
	),
	continuation: And(
		/\\[\r\n]/,
		Apply(tokens => {
			const text = tokens[0].text.slice(1);
			return [text];
		})
	),
	literal: Or(
		Rule('str'),
		Rule('float'),
		Rule('hex'),
		Rule('oct'),
		Rule('bin'),
		Rule('int'),
		Rule('bool')
	),
	declaration: Wrap('declaration',
		Rule('id'),
		Rule('skip'),
		Rule('id'),
		Rule('skip'),
		Hide('='),
		Rule('skip'),
		Rule('item')
	),
	reference: Wrap('reference',
		Or(
			Rule('literal'),
			Rule('id'),
			And(
				Hide('('),
				Rule('skip'),
				Rule('item'),
				Rule('skip'),
				Hide(')')
			)
		),
		Zero(
			Rule('skip'),
			Or(
				Rule('property'),
				Rule('call'),
				Rule('index')
			)
		)
	),
	property: Wrap('property',
		Hide('.'),
		Rule('id')
	),
	call: Wrap('call',
		Hide('('),
		Rule('skip'),
		Opt(
			Rule('item'),
			Zero(
				Rule('skip'),
				Hide(','),
				Rule('skip'),
				Rule('item')
			)
		),
		Rule('skip'),
		Hide(')')
	),
	index: Wrap('index',
		Hide('['),
		Rule('skip'),
		Opt(
			Rule('item'),
			Zero(
				Rule('skip'),
				Hide(':'),
				Rule('skip'),
				Rule('item')
			)
		),
		Rule('skip'),
		Hide(']')
	),
	item: Or(
		Rule('declaration'),
		Rule('reference')
	),
	terminator: One(
		Rule('skip'),
		Hide(';')
	),
	main: And(
		Rule('skip'),
		Zero(
			Rule('item'),
			Rule('terminator'),
			Rule('skip')
		)
	)
});

console.log(JSON.stringify(tokens, null, 2));