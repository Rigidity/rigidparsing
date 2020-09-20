# RigidParsing
> This library aims at making lexing and parsing an easy task. You can parse parts of a date, calculate mathematical expressions, or implement a programming language idea you have in a short amount of time.  

## Example
```js
const {
    lexer,
    parser,
    presets,
    and,
    hide,
    token,
    rule,
    error
} = require('rigidparsing');

const lex = lexer({
    ws: presets.ws,
    hello: 'Hello',
    exclaim: '!',
    id: /[a-zA-Z]+/
}, {
    hide: ['ws']
});

const parse = parser({
    helloworld: and(
        hide(token('hello')),
        rule('name'),
        hide(token('exclaim'))
    ),
    name: token('id')
}, {
    main: 'helloworld'
});

const first = 'Hello world!';
const second = 'Hello Jim!';

[first, second].forEach(text => {
    try {
        console.log(parse(lex(text)));
    } catch(e) {
        error(e);
    }
});
```

## Documentation

### Lexer
> A lexer is used to split text into a set of tokens, either with regular expressions, or simple string values. The result is a token array, with each token containing a key, val, start, and stop property.  
`lexer({tokens}, {options})` Builds a lexer.  
`token: string|regex` What the token should match.  
`options.hide = []` A list of tokens to exclude from the result.  
`lex(text)` The result of the lexer is an object containing a list of `tokens`, the `source` text, and the `time` it took to finish.  

### Parser
> A parser is used to recursively walk a set of rules to produce an Abstract Syntax Tree from the token list. Essentially, this takes a flat list of tokens, and turns it into a more usable format, which can then be walked later. The rules define the structure of your language.  
`parser({rules}, {options})` Builds a parser.  
`rule: combinator` What the rule should match.  
`options.main = 'main'` The main rule that serves as an entry point when parsing tokens.  
`options.exact = true` Whether or not an error should be produced when there are unparsed tokens.  
`parse(data)` The result of the parser (which takes the lexer result as an argument) is an object containing an abstract syntax `tree`, the `source` text, and the `time` it took to finish. As well as this, some debugging properties are present as well. The number of `calls`, `rules`, and `items` that were used in the process of executing the parser.  

### Combinators
> These perform the steps taken in the parser. You can use these for your rules to easily define your syntax.  
`rule(name)` Matches a parser rule.  
`token(name)` Matches a lexer token.  
`and(...items)` Matches a list in sequence.  
`or(...items)` Matches any of a set of options.  
`one(item)` Matches one or more of an item.  
`zero(item)` Matches zero or more of an item.  
`range(item, min, max)` Matches a number of items in a range, with negative one being no limit.  
`opt(item)` Optionally matches an item.  
`hide(item)` Matches an item but hides it in the result.  
`convert(item, fn)` Matches an item but maps the result.  
`insert(data)` Matches nothing, but inserts a result.  
`combine(item)` Stringifies the result of an item.  
`wrap(item, name)` Wraps the result of an item into a named object like a rule.  

### Helpers
> These are simple functions that can be used in tandem with the main utilities or separately if needed. They are used internally, but exposed for utility purposes.  
`copy(array)` Makes a copy of an array.  
`uncopy(array, other)` Replaces the content of the array with the content of the other one.  
`error(e)` A simple error object stringifier. Meant for debugging purposes, but it's a decent handler in general.  
`presets` Some simple regexes for common things. Currently includes `ws` for whitespace, `number` for json style numbers, `string` for json style strings or single quoted strings, and `rawstring` for strings without escapes other than backslashes and the quote.  

### Errors
> Various errors are thrown when the lexing or parsing fails due to invalid syntax. The type property of the errors are listed here. The exposed properties are also on the error object itself.  
`lex` This error happens when unknown tokens were fed to the lexer. It exposes the `source` text, the `char` index, `line` number, and `col` on the line. It also provides the line `content` and the `time` it took to lex.  
`eof` This error exposes the `source` text, and is triggered when the parser failed to match anything.  
`parse` This error happens when unmatched tokens were remaining after parsing, if exact mode is enabled. It exposes the `source` text, `char` index, `line` number`, and `col` on the line. It also provided the line `content` and the `time` it took to parse. Finally, the remaining `tokens` and the first unmatched `token` are properties as well.  