import { fork } from './../lib';

// create a forked process as normal using standard node fork api
const myDispatcherProcess = fork('./path/to/child.js', [], {});

// subscribe to the child's `hello` event
myDispatcherProcess.child.on('hello', function (data) {
  console.log(`I am the parent and I received data for child event 'hello': ${JSON.stringify(data)}`);
  // send a `helloBackAtYou` event to the child process
  myDispatcherProcess.child.send('helloBackAtYou', { bar: 'foo' });
});
