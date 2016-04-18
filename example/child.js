import wtfork from './../lib';

process.parent.on('helloBackAtYou', function (data) {
  console.log(`I am the child and I received data for parent event 'helloBackAtYou': ${JSON.stringify(data)}`);
});

process.parent.send('hello', { foo: 'bar' });
