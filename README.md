# What the Fork

![Downloads](https://img.shields.io/npm/dm/wtfork.svg)
![Downloads](https://img.shields.io/npm/dt/wtfork.svg)
![npm version](https://img.shields.io/npm/v/wtfork.svg)
![dependencies](https://img.shields.io/david/salakar/wtfork.svg)
![dev dependencies](https://img.shields.io/david/dev/salakar/wtfork.svg)
![License](https://img.shields.io/npm/l/wtfork.svg)

Subscribe to and publish events between parent and child node processes using the
standard node event emitter api or call parent methods directly from the child process and vice versa.

- [IPC via Method Calls](#ipc-via-method-calls)
- [IPC via Event Emitter](#ipc-via-event-emitter)

See the example in `/example` for full usage.

# Getting Started

Install it via npm:

```shell
npm install wtfork --save
```

# IPC via Event Emitter

You can subscribe to and publish events between parent and child node processes using the
standard node event emitter api.

Instead of:
```javascript
process.on('message', function (msg) {
  if (msg && msg.isThisTheMessageForMe) {
    // ok i want this message
  }
});
```

You can simply do the following in your child process:

```javascript
// can also be .once()
process.parent.on('thisIsTheMessageForMe', function (data) {
  console.log(data);
});
```

## Example:

### Parent process:
```javascript
import { fork } from 'wtfork';

// create a forked process as normal using standard node fork api
const myDispatcherProcess = fork('./path/to/child.js', [], {});

// subscribe to the child's `hello` event
// can also be .once()
myDispatcherProcess.child.on('hello', function (data) {
  console.log(`I am the parent and I received data for child event 'hello': ${JSON.stringify(data)}`);
  // send a `helloBackAtYou` event to the child process
  myDispatcherProcess.child.send('helloBackAtYou', { bar: 'foo' });
});

```

### Child process:
```javascript
// you don't need to require wtfork on the child, it will automatically be required

// subscribe the the `helloBackAtYou` event to be received from the parent
// can also be .once()
process.parent.on('helloBackAtYou', function (data) {
  console.log(`I am the child and I received data for parent event 'helloBackAtYou': ${JSON.stringify(data)}`);
});

// send a `hello` event to the parent process
process.parent.send('hello', { foo: 'bar' });

```


# IPC via Method Calls
This allows you to setup some methods on the parent and child processes that can be called from either
process.

**Each method MUST return a promise** (but only if you want to receive data back)

You can pass in an ES6 class instance or an object with methods. Constructor methods are ignored.

To make child methods available to the parent you simply need to export as if you're just requiring
any old module on your child process js file.

## Example:

### Parent process:
```javascript

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
```

### Child process:
```javascript
// just export as you would any other module to setup available child methods

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
   * Unnecessary function to quit because we can
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
```

Running the parent in this example will produce the following output:
```text
Im a parent method called 'hello' and I just ran: test string
Im a parent method called 'goodbye' and I just ran: test string - wtfork
I am the child and I received data for parent event 'hello': {"bar":"foo"}
The parent method 'hello' resolved back to the child with: {"some":"data"}
I am the parent and I received data for a child event 'helloBackAtYou': {"foo":"bar"}
Im a child method called 'simples' and I just ran: meerkat
The child method 'simples' resolved back to the parent with: "meerkat"
Child process will now exit as instructed by parent...
The parent method 'goodbye' errored back to the child:
Error: Please don't leave me!
    at parent.js:29:21
    at new Promise (/Users/Mike/Documents/Personal/Projects/wtfork/node_modules/babel-polyfill/node_modules/core-js/modules/es6.promise.js:193:7)
    at Test.goodbye (parent.js:27:12)
    at EventEmitter.<anonymous> (index.js:243:89)
    at emitOne (events.js:90:13)
    at EventEmitter.emit (events.js:182:7)
    at ChildProcess.<anonymous> (index.js:199:26)
    at emitTwo (events.js:100:13)
    at ChildProcess.emit (events.js:185:7)
    at handleMessage (internal/child_process.js:718:10)

Process finished with exit code 0
```

A simpler child process could be written as:

```javascript
import MyChildHelperClassOfDoom from './childThingyClassStuff';
export default new MyChildHelperClassOfDoom();

// and then on the parent you can just call all the methods available to MyChildHelperClassOfDoom
// so you don't really need to use events this way but they're there if you need them.

// just 2 lines - simples right? \o/
```


### Notes:
- Each method call is given a unique id when called to allow multiple calls of the same methods simultaneously without event naming conflicts, this uses the [`cuid`](https://www.npmjs.com/package/cuid) npm module to produce colission resistant ids.
- Each child process is also given it's own unique id using [`cuid`](https://www.npmjs.com/package/cuid). Internally this isn't used that much except for event source verification, however, in terms of tracking child processes without knowing a PID then this is useful - the id can be found at `process.parent.child_id` on the child and on the parent it can be found at `yourForkedProcess.child.id`
- Until the child confirms it's ready any child method calls or events sent from the parent will be buffered and sent once ready.

## License

MIT
