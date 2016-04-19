import { fork } from './../lib';

/*
 Some random class of methods you might want to IPC method call
 Doesn't have to be a class, can also be an object with methods
 */
class Test {
  /**
   *
   * @param str
   * @returns {Promise}
   */
  hello(str) {
    return new Promise((resolve) => {
      console.log(`Im a parent method called 'hello' and I just ran: ${str}`);
      return resolve({ some: 'data' });
    });
  }

  /**
   *
   * @param str
   * @param something
   * @returns {Promise}
   */
  goodbye(str, something) {
    return new Promise((resolve, reject) => {
      console.log(`Im a parent method called 'goodbye' and I just ran: ${str} - ${something}`);
      return reject(new Error('Please don\'t leave me!'));
    });
  }

  /**
   * Some private method - private methods are excluded by default
   * @param secrets
   * @private
   */
  _somePrivateMethod(secrets) {
    return new Promise((resolve) => {
      console.log('You can\'t see me child process.');
      return resolve(secrets);
    });
  }
}

// create a forked process as normal using standard node fork api
// but with an additional 4th param of a class or object containing methods
const myDispatcherProcess = fork('./example/child', [], {}, new Test());

// subscribe to the child's `helloBackAtYou` event
myDispatcherProcess.child.on('helloBackAtYou', (data) => {
  console.log(`I am the parent and I received data for a child event 'helloBackAtYou': ${JSON.stringify(data)}`);

  // lets call the child processes hello method - it should always resolve with no error
  myDispatcherProcess.child.methods.simples('meerkat').then((result) => {
    console.log(`The child method 'simples' resolved back to the parent with: ${JSON.stringify(result)}`);
    // now quit maybe?
    myDispatcherProcess.child.methods.quit(0); // doesn't need to be a promise
  }).catch((error) => {
    console.error('The child method \'simples\' errored back to the parent.');
    console.error(error);
  });
});

// send a hello event to the child, the child in turn responds with a helloBackAtYou event.
myDispatcherProcess.child.send('hello', { bar: 'foo' });
