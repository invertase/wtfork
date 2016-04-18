import wtfork from './../lib';
// you only need to require wtfork on the child, it will automatically setup
// the `process.parent` functionality for you

// subscribe the the `helloBackAtYou` event to be received from the parent
process.parent.on('helloBackAtYou', function (data) {
  console.log(`I am the child and I received data for parent event 'helloBackAtYou': ${JSON.stringify(data)}`);
});

// send a `hello` event to the parent process
process.parent.send('hello', { foo: 'bar' });
