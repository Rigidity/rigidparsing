const {
    run,
    And,
    Hide,
    Rule,
    Wrap 
} = require('.');
 
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