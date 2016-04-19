# v0.3.0

## Major Changes
- You are no longer required to call `process.parent.setChildMethods` to setup all your child methods
  for the parent to access. Just export/module.exports on your child proc file and wtfork will do
  the magic for you. You can still call `process.parent.setChildMethods` if you want but this will
  override any methods created via module exports.
  
### Example child process using exports:
```javascript
// child process file.js

// or module.exports.simples = function( ...
// or export default function simples(...
// or export default { ...object with methods }
// or export default new MyChildHelperClass();
module.exports = {
  someMethod(){},
  someOtherMethod(){},
};
```

## Minor Changes:
- No longer need to require wtfork on your child process, we handle that for you
- Any events sent to the child process prior to receiving it's ready event are now buffered and
  then sent once the child process confirms it's ready.
