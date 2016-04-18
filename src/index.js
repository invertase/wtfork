import { EventEmitter } from 'events';
import { fork as childProcFork } from 'child_process';
import cuid from 'cuid';

// import { generateParentStub } from './helpers';

if (process.env.WTFORK_CHILD) {
  // create a new emitter to be used as an internal messaging router from the parent process
  process.parent = new EventEmitter();

  // for later usage
  process.parent.child_id = process.env.WTFORK_CHILD;

  // keep a ref to the original emitter
  process.parent._originalEmit = process.parent.emit;

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

  // tell the parent we're ready
  process.parent.send('wtfork:child_ready', process.parent.child_id);
}

/* eslint no-param-reassign:0 */
/**
 * Fork a child process, internally calls node child_process fork.
 * @param path
 * @param args
 * @param options
 */
export function fork(path, args, options) {
  const childId = cuid();
  if (!options) options = {};
  if (!options.env) options.env = {};

  // assign the child id to a env variable
  Object.assign(options.env, { WTFORK_CHILD: childId });

  // create the child process
  const childProcess = childProcFork(path, args, options);

  // create the helper emitter and send method
  childProcess.child = new EventEmitter();
  childProcess.child.id = childId;
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

  childProcess.child.on('wtfork:child_ready', (id) => {
    childProcess.child.ready = true;
  });

  return childProcess;
}

export default {
  fork,
};

