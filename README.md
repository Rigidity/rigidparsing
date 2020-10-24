# RigidParsing
This library aims at converting from source to an AST an easy task. You can parse parts of a date, calculate mathematical expressions, or implement a programming language idea you have, all in a short amount of time.  

## Example
```js
const {
	run,
	And,
	Hide,
	Rule,
	Wrap
} = require('rigidparsing');

const parse = text => run(text, {
	main: And(Rule('hello'), Rule('ws'), Rule('name'), Hide('!')),
	hello: Hide(/[hH]ello/),
	ws: Hide(/\s*/),
	name: Wrap('name', /[a-zA-Z]*/)
});

const first = 'Hello world!';
const second = 'Hello Jim!';

[first, second].forEach(text => {
    console.log(parse(text));
});
```

## Documentation

### Runner
The runner function is used to iteratively execute a recursive set of rules on a chunk of text, to produce an Abstract Syntax Tree (AST), which you can walk later. If an error is found, the index, line, and column of the error will be thrown as an object.
* `run(text, {rules}, {options})` Executes a grammar synchronously.  
* `rule: combinator` What the rule should match.  
* `options.main = 'main'` The main rule that serves as an entry point when parsing tokens.  
* `options.async = false` Whether to support asynchronous combinators. Returns a promise if set to `true`.  

### Combinators
These perform the steps taken in the parser. You can use these for your rules to easily define your syntax.  
* `"string"` Matches a string token.  
* `/regex/` Matches a regex token.  
* `Rule(name)` Matches a rule.  
* `And(...items)` Matches a list in sequence in a new scope.  
* `Or(...items)` Matches any of a set of options.  
* `One(...items)` Matches one or more of a set of items.  
* `Zero(...items)` Matches zero or more of a set of items.  
* `Opt(...items)` Optionally matches a set of items.  
* `Hide(...items)` Matches a set of items but hides the result.  
* `Wrap(name, ...items)` Wraps the result of a set of items into a named rule.  
* `Group(name, ...items)` Wraps the result of a set of items into a list.  
* `Insert(token)` Inserts a token into the abstract syntax tree at the current level.  

### Extras
There are some additional helpers that you can use while extending the library.  
* `append(target, source)` Appends the source items onto the target list.  
* `prepend(target, source)` Prepends the source items onto the target list.  
* `linecolumn(index, text)` Converts an index in a string to a `line` and `column` in an object returned.  

### Context
This class manages the parser context and has the following properties.  
`new Context(text, rules, options = {})` Constructor of this class.  
`text` The original complete source text that the parser is executing upon.  
`rules` The object that defines the rules for the grammar to use while parsing.  
`options`  The passed in options object for the parser to use.  
`stack` The stack of `Scope` objects that are actively being parsed.  
`scope()` Fetches the currently executing `Scope` object from the `stack`.  

### Scope
This class defines a combinator that has it's own scope on the `stack` of the `Context`. It contains various information critical to parsing the current text piece by piece.  
`new Scope(text, ...items)` Constructor of this class.  
`error = false` Whether or not a combinator has failed thus far.  
`matches = 0` How many children have successfully matched anything.  
`text = text` The text that is remaining to be parsed.  
`items = items` This is the list of combinators to be executed.  
`tokens = []` This is the list of tokens that have been parsed on this scope so far.  
`source` The full text that has been parsed by this scope.  
`check = null` A handler for when the scope is being checked every iteration. Returns `true` if the check is passed, and `false` if the scope should exit.  
`exit = null` The handler for when the scope exits the stack either through an error or natural ending. It is parsed the `parent` scope as an argument.  

### Token
This is the result of parsing either a raw string or a regular expression.  
`new Token(text, start, stop)` Constructor of this class.  
`text` The matched text of this token.  
`start` The starting index of this token in the original source text.  
`stop` The stopping index of this token in the original source text.  

## Customization
You can define your own combinators and directives for the parser to execute by referring to the documentation above or this example.
```js
const {Scope, And, append} = require('rigidparsing');
const Two = (...items) => ctx => {
	// Create a new scope.
	const scope = new Scope(ctx.scope().text);
	// Set the items to be added onto the scope.
	append(scope.items, items.length > 1 ? [And(...items)] : items);
	// Check every iteration.
	scope.check = () => {
		// If there is an error, cancel.
		if (scope.error) return false;
		// If there is text remaining, add another.
		if (scope.text.length) scope.items.push(scope.items[0]);
		// Continue to the next iteration.
		return true;
	};
	// Whenever the scope exits.
	scope.exit = parent => {
		// If there are less than two.
		if (scope.matches < 2) {
			// This failed to match.
			parent.error = true;
		} else {
			// Assign the results to the parent.
			parent.text = scope.text;
			parent.source += scope.source;
			parent.matches++;
			append(parent.tokens, scope.tokens);
		}
	};
	// Push the scope onto the stack.
	ctx.stack.push(scope);
};
```