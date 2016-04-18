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
import wtfork from 'wtfork';
// you only need to require wtfork on the child, it will automatically setup
// the `process.parent` functionality for you

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

**Each method MUST return a promise.**

You can pass in an ES6 class instance or an object with methods. Constructor methods are ignored.

## Example:

### Parent process:
```javascript
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


  // lets call the parent processes hello method - it should always resolve with no error
  myDispatcherProcess.child.methods.simples('meerkat').then((result) => {
    console.log(`The child method 'simples' resolved back to the parent with: ${JSON.stringify(result)}`);
  }).catch((error) => {
    console.error('The child method \'simples\' errored back to the parent.');
    console.error(error);
  });

});
```

### Child process:
```javascript
import wtfork from './../lib';
// you only need to require wtfork on the child, it will automatically setup
// the `process.parent` functionality for you

/**
 * Call this to set all the methods available to the parent process
 */
process.parent.setChildMethods({
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
I am the parent and I received data for child event 'hello': {"foo":"bar"}
Im a parent method called 'hello' and I just ran: test string
Im a parent method called 'goodbye' and I just ran: test string - wtfork
I am the child and I received data for parent event 'helloBackAtYou': {"bar":"foo"}
Im a child method called 'simples' and I just ran: meerkat
The parent method 'hello' resolved back to the child with: {"some":"data"}
The child method 'simples' resolved back to the parent with: "meerkat"
The parent method 'goodbye' errored back to the child:
{}
```

### Notes:
- Each method call is given a unique id when called to allow multiple calls of the same methods simultaneously without event naming conflicts, this uses the [`cuid`](https://www.npmjs.com/package/cuid) npm module to produce colission resistant ids.
- Each child process is also given it's own unique id using [`cuid`](https://www.npmjs.com/package/cuid). Internally this isn't used that much except for event source verification, however, in terms of tracking child processes without knowing a PID then this is useful - the id can be found at `process.parent.child_id` on the child and on the parent it can be found at `yourForkedProcess.child.id`

## License

MIT
