const keys = require('./keys');
const redis = require('redis');
const amqp = require('amqplib');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

const subToQueue = queueSub('insert');

subToQueue();

function fib (index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// Queue message consumer
function queueSub (queue) {
  const rabbitConnOptions = {
    protocol: 'amqp',
    hostname: keys.rabbitHost,
    port: keys.rabbitPort,
    username: keys.rabbitUser,
    password: keys.rabbitPassword,
  };

  return async function () {
    const connection = await amqp.connect(rabbitConnOptions);
    const ch = await connection.createChannel();
    ch.prefetch(1);
    const ok = await ch.assertQueue(queue, { durable: true }); // For true apps exchanges must be used
		console.log("​queueSub -> ok", ok)

    const processIndexFromCh = processIndex(ch)
    ch.consume(queue, processIndexFromCh);
  }
}

function processIndex (ch) {
  return function (message) {
    if (message !== null) {
      const stringifiedIndex = message.content.toString();
      const index = parseInt(stringifiedIndex);

      const result = fib(index);
      redisClient.hset(
        'values',
        stringifiedIndex,
        String(result),
        publishResult(index, result, ackMessage(ch, message))
      );
    }
  }
}

function publishResult (index, result, cb) {
  console.log('\n')
  console.log('WORKER PID:', process.pid)
  console.log('\n')

  const payload = {
    index,
    result
  };

  redisPublisher.publish('calc_complete', JSON.stringify(payload), cb);
}

function ackMessage (ch, message) {
  ch.ack(message)
}
