import wtfork from './../lib';
// you only need to require wtfork on the child, it will automatically setup
// the `process.parent` functionality for you

/**
 * Call this to set all the methods available to the parent process
 */
process.parent.setChildMethods({
  simples(someVal) {
    return new Promise((resolve) => {
      return resolve(someVal);
    });
  },
});

// subscribe the the `helloBackAtYou` event to be received from the parent
process.parent.on('helloBackAtYou', function (data) {
  console.log(`I am the child and I received data for parent event 'helloBackAtYou': ${JSON.stringify(data)}`);
});

// send a `hello` event to the parent process
process.parent.send('hello', { foo: 'bar' });

// lets call the parent processes hello method - it should always resolve with no error
process.parent.methods.hello('test string').then((result) => {
  console.log(`The parent method 'hello' resolved back to the child with: ${JSON.stringify(result)}`);
}).catch((error) => {
  console.error('The parent method \'hello\' error back to the client.');
  console.error(error);
});


// lets call the parent processes goodbye method - it should always error
process.parent.methods.goodbye('test string', 'wtfork').then((result) => {
  console.log(`The parent method 'goodbye' resolved back to the child with: ${result}`);
}).catch((error) => {
  console.error('The parent method \'goodbye\' errored back to the client:');
  console.error(error);
});
