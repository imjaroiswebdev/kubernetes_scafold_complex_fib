const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const sub = redisClient.duplicate();
const redisPublisher = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

sub.on('message', (channel, message) => {
  const result = fib(parseInt(message));
  redisClient.hset('values', message, String(result), publishResult);

  function publishResult () {
    console.log('\n')
    console.log('WORKER PID:', process.pid)
    console.log('\n')

    redisPublisher.publish('calc_complete', JSON.stringify({
      index: message,
      result
    }));
  }
});
sub.subscribe('insert');
