# What the Fork

![Build Status](https://img.shields.io/travis/salakar/wtfork.svg)
![Coverage](https://img.shields.io/coveralls/salakar/wtfork.svg)
![Downloads](https://img.shields.io/npm/dm/wtfork.svg)
![Downloads](https://img.shields.io/npm/dt/wtfork.svg)
![npm version](https://img.shields.io/npm/v/wtfork.svg)
![dependencies](https://img.shields.io/david/salakar/wtfork.svg)
![dev dependencies](https://img.shields.io/david/dev/salakar/wtfork.svg)
![License](https://img.shields.io/npm/l/wtfork.svg)

Strip away the complexity of handling interprocess communication of your forked child processes.

This module will allow you to subscribe/publish events between parent and child processes using the
standard node event emitter api.

Instead of doing:
```javascript
process.on('message', function (msg) {
  if (msg && msg.isThisTheMessageForMe) {
    // ok i want this message
  }
});
```

You can simply just do in your child process:

```javascript
process.parent.on('thisIsTheMessageForMe', function (data) {
  console.log(data);
});
```



## Getting Started

Install it via npm:

```shell
npm install wtfork --save
```

And include in your project:

### Parent process:
```javascript
import { fork } from 'wtfork';

// create a forked process as normal using standard node fork api
const myDispatcherProcess = fork('./path/to/child.js', [], {});

// subscribe to the child's `hello` event
myDispatcherProcess.child.on('hello', function (data) {
  console.log(`I am the parent and I received data for child event 'hello': ${JSON.stringify(data)}`);
  // send a `helloBackAtYou` event to the child process
  myDispatcherProcess.child.send('helloBackAtYou', { bar: 'foo' });
});

```

### Child process:
```javascript
import wtfork from 'wtfork;
// you only need to require wtfork on the child, it will automatically setup
// the `process.parent` functionality

// subscribe the the `helloBackAtYou` event to be received from the parent
process.parent.on('helloBackAtYou', function (data) {
  console.log(`I am the child and I received data for parent event 'helloBackAtYou': ${JSON.stringify(data)}`);
});

// send a `hello` event to the parent process
process.parent.send('hello', { foo: 'bar' });

```

## License

MIT
