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
	name: Wrap('name', /[A-Z][a-z]*/)
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
* `run(text, {rules}, {options})` Builds a parser.  
* `rule: combinator` What the rule should match.  
* `options.main = 'main'` The main rule that serves as an entry point when parsing tokens.  
* `options.limit = 0` The limit to the number of steps that the executor can take, or 0 if no limit should be enforced.

### Combinators
These perform the steps taken in the parser. You can use these for your rules to easily define your syntax.  
* `"string"` Matches a string token.  
* `/regex/` Matches a regex token.  
* `Rule(name)` Matches a rule.  
* `And(...items)` Matches a list in sequence.  
* `Or(...items)` Matches any of a set of options.  
* `One(...items)` Matches one or more of a set of items.  
* `Zero(...items)` Matches zero or more of a set of items.  
* `Opt(...items)` Optionally matches a set of items.  
* `Hide(...items)` Matches a set of items but hides the result.  
* `Wrap(name, ...items)` Wraps the result of a set of items into a named rule.  