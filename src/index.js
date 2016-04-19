import { EventEmitter } from 'events';
import { fork as childProcessFork } from 'child_process';
import cuid from 'cuid';

/**
 * Returns all the method names from a provided class/object.
 * @param classOrObject
 * @returns {Array.<*>}
 */
export function getMethods(classOrObject) {
  const methods = Object.getOwnPropertyNames(classOrObject).filter((p) => {
    return !p.startsWith('_') && typeof classOrObject[p] === 'function';
  });

  if (!methods.length) {
    // try getProtoTypeOf as it's potentially a class
    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(classOrObject))) {
      const method = classOrObject[name];
      if (!method instanceof Function) continue;
      if (method === classOrObject) continue;
      if (name === 'constructor') continue;
      if (name.startsWith('_')) continue; // exclude private methods
      methods.push(name);
    }
  }
  return methods;
}

/**
 * Converts an Error into an IPC emitable object
 * @param error
 * @returns {{message: *, type: *, stack: *}}
 * @private
 */
function _extractError(error) {
  return {
    message: error.message,
    type: error.constructor.name,
    stack: error.stack,
  };
}

/**
 * Converts an transmitted object back into an Error
 * Only preserves global error types.
 * @param obj
 * @returns Error
 * @private
 */
function _convertToError(obj) {
  const error = global[obj.type] ? new global[obj.type](obj.message) : new Error(obj.message);
  error.stack = obj.stack;
  return error;
}

/**
 * Creates a stub function to allow method calls via ipc.
 * @param target
 * @param method
 * @param emitter
 * @returns Function
 * @private
 */
function _ipcMethodWrapper(target, method, emitter) {
  return function stubbyMcStubFace(...args) { // boatyMcBoatFace for pres
    // we create a new id per function call so we can track that specific methods invocation
    // to allow multiple calls of the same function
    const callId = cuid();
    return new Promise((resolve, reject) => {
      const type = `${target === 'parent' ? 'child_to_parent' : 'parent_to_child'}`;
      const data = {
        func_name: method,
        call_id: callId,
        args,
      };

      // subscribe to responder event
      emitter.once(`wtfork:${data.func_name}:${data.call_id}`, (result) => {
        if (result.reject) {
          return reject(_convertToError(result.reject));
        }

        return resolve(result.resolve);
      });

      // send the event to initiate the call
      emitter.send(`wtfork:${type}:method_call`, data);
    });
  };
}

/**
 * Notifies the parent of the child process methods based on
 * a provided class or object of methods.
 * @param classOrObject
 * @private
 */
function _setChildMethods(classOrObject) {
  process.parent._childMethods = classOrObject;
  process.parent.send('wtfork:set_child_methods', {
    wtfork: {
      methods: getMethods(classOrObject),
    },
  });
}

/* eslint no-param-reassign:0 */
/**
 * Fork a child process, internally calls node child_process fork.
 * @param path
 * @param args
 * @param options
 * @param classOrObject
 */
export function fork(path, args, options, classOrObject) {
  const childId = cuid();
  if (!options) options = {};
  if (!options.env) options.env = {};

  if (classOrObject) {
    // set the parent methods available to the child
    Object.assign(options.env, {
      WTFORK_CHILD: childId,
      WTFORK_PARENT_METHODS: getMethods(classOrObject),
    });
  } else {
    Object.assign(options.env, {
      WTFORK_CHILD: childId,
    });
  }

  // create the child process
  const childProcess = childProcessFork(path, args, options);

  // create the helper emitter and send method
  childProcess.child = new EventEmitter();

  // where the child method stubs get created
  childProcess.child.methods = {};

  // internal ref to the provided classOrObject
  childProcess.child._parentMethods = classOrObject || {};

  // not really used much but I have plans
  childProcess.child.id = childId;

  // send wrapper method
  childProcess.child.send = function send(channel, data) {
    // forward to child process
    return childProcess.send({
      wtfork: {
        child_id: childProcess.child.id,
        channel,
        data,
      },
    });
  };

  // setup internal routing of process messages sent via wtfork
  childProcess.on('message', (msg) => {
    // only route wtfork messages that are bound to this child's id
    if (msg && msg.wtfork && msg.wtfork.child_id === childProcess.child.id) {
      childProcess.child.emit(msg.wtfork.channel, msg.wtfork.data || {});
    }
  });

  // again, not really used yet
  childProcess.child.on('wtfork:child_ready', () => {
    childProcess.child.ready = true;
  });

  // set stub methods when the child call set methods.
  childProcess.child.on('wtfork:set_child_methods', (data) => {
    data.wtfork.methods.forEach((name) => {
      childProcess.child.methods[name] = _ipcMethodWrapper('child', name, childProcess.child);
    });
  });

  // relay method calls
  childProcess.child.on('wtfork:child_to_parent:method_call', (methodData) => {
    if (childProcess.child._parentMethods[methodData.func_name]) {
      childProcess.child._parentMethods[methodData.func_name](...methodData.args)
        .then((response) => {
          childProcess
            .child.send(
            `wtfork:${methodData.func_name}:${methodData.call_id}`,
            { resolve: response }
          );
        })
        .catch((error) => {
          childProcess
            .child.send(
            `wtfork:${methodData.func_name}:${methodData.call_id}`,
            { reject: _extractError(error) }
          );
        });
    }
  });

  return childProcess;
}

export default {
  fork,
  getMethods,
};

// TODO babel add exports plugin not working at the moment for some reason ??
module.exports = exports.default;

// Below code sets up the child process.parent functionality
// only if the env variable is present - automatically added by the internal fork
if (process.env.WTFORK_CHILD) {
  // create a new emitter to be used as an internal messaging router from the parent process
  process.parent = new EventEmitter();

  // internal ref to the provided classOrObject
  process.parent._childMethods = {};

  // where the parent method stubs get created
  process.parent.methods = {};

  process.parent.setChildMethods = _setChildMethods;

  // the parent provided it's methods so lets create some stubs
  if (process.env.WTFORK_PARENT_METHODS) {
    process.env.WTFORK_PARENT_METHODS.split(',').forEach((name) => {
      process.parent.methods[name] = _ipcMethodWrapper('parent', name, process.parent);
    });
  }

  // for usage later
  process.parent.child_id = process.env.WTFORK_CHILD;

  // override the emitter so we can intercept and forward relevant messages
  // onto the parent process via process.send
  process.parent.send = function send(channel, data) {
    // forward to parent process
    return process.send({
      wtfork: {
        child_id: process.parent.child_id,
        channel,
        data,
      },
    });
  };

  // setup internal routing of process messages sent via wtfork
  process.on('message', (msg) => {
    // only route wtfork messages that are bound to this child's id
    if (msg && msg.wtfork && msg.wtfork.child_id === process.parent.child_id) {
      process.parent.emit(msg.wtfork.channel, msg.wtfork.data || {});
    }
  });

  // tell the parent we're ready - not really used at the moment though
  process.parent.send('wtfork:child_ready', process.parent.child_id);

  // relay method calls
  process.parent.on('wtfork:parent_to_child:method_call', (methodData) => {
    if (process.parent._childMethods[methodData.func_name]) {
      process.parent._childMethods[methodData.func_name](...methodData.args)
        .then((response) => {
          process
            .parent.send(
            `wtfork:${methodData.func_name}:${methodData.call_id}`,
            { resolve: response }
          );
        })
        .catch((error) => {
          process
            .parent.send(
            `wtfork:${methodData.func_name}:${methodData.call_id}`,
            { reject: _extractError(error) }
          );
        });
    }
  });
}
