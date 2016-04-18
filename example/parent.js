import { fork } from './../lib';

const myDispatcherProcess = fork('./example/child', [], {});

myDispatcherProcess.child.on('hello', function (data) {
  console.log(`I am the parent and I received data for child event 'hello': ${JSON.stringify(data)}`);
  myDispatcherProcess.child.send('helloBackAtYou', { bar: 'foo' });
});
