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
}

// create a forked process as normal using standard node fork api
// but with an additional 4th param of a class or object containing methods
const myDispatcherProcess = fork('./example/child', [], {}, new Test());

// subscribe to the child's `hello` event
myDispatcherProcess.child.on('hello', (data) => {
  console.log(`I am the parent and I received data for child event 'hello': ${JSON.stringify(data)}`);
  // send a `helloBackAtYou` event to the child process
  myDispatcherProcess.child.send('helloBackAtYou', { bar: 'foo' });
});
