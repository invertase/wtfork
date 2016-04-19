// just export to setup available child methods

// or module.exports.simples = function( ...
// or export default function simples(...
// or export default { ...object with methods }
// or export default new MyChildHelperClass();
module.exports = {
  /**
   * Just resolves with the same value, simples!
   * @param someVal
   * @returns {Promise}
   */
  simples(someVal) {
    return new Promise((resolve) => {
      console.log(`Im a child method called 'simples' and I just ran: ${someVal}`);
      return resolve(someVal);
    });
  },

	/**
   * Unnecessary function to quit
   * @param code
   */
  quit(code) {
    console.log('Child process will now exit as instructed by parent...');
    process.exit(code);
  },
};

// subscribe the the `hello` event to be received from the parent
process.parent.on('hello', function (data) {
  console.log(`I am the child and I received data for parent event 'hello': ${JSON.stringify(data)}`);
  // send a `helloBackAtYou` event to the parent process
  process.parent.send('helloBackAtYou', { foo: 'bar' });
});

// lets call the parent processes hello method - it should always resolve with no error
process.parent.methods.hello('test string').then((result) => {
  console.log(`The parent method 'hello' resolved back to the child with: ${JSON.stringify(result)}`);
}).catch((error) => {
  console.error('The parent method \'hello\' errored back to the child.');
  console.error(error);
});

// lets call the parent processes goodbye method - it should always error
process.parent.methods.goodbye('test string', 'wtfork').then((result) => {
  console.log(`The parent method 'goodbye' resolved back to the child with: ${result}`);
}).catch((error) => {
  console.error('The parent method \'goodbye\' errored back to the child:');
  console.error(error);
});
