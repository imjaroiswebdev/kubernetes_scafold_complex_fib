const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();
const sub = redisClient.duplicate();

// TODO: Move this event history to Redis
const eventHistory = [];

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');

  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.get('/notify', async (req, res) => {
  res.status(200).set({
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*"
  });

  sendNotifications(req, res);
})

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening');
});

// Subcription to completed calculation from worker
sub.on('message', (channel, message) => {
  const payload = JSON.parse(message);

  const newNotification = {
    id: eventHistory.length,
    index: payload.index,
    result: payload.result
  }
  eventHistory.push(newNotification);
})
sub.subscribe('calc_complete');

function sendNotifications (req, res) {
  const eventString = event => (
    'id:' + event.id +
    '\n' +
    'event: calc_complete' +
    '\n' +
    'data: ' +
    JSON.stringify({ index: event.index, result: event.result }) +
    '\n\n'
  );

  const notifications = eventHistory
    .filter(onlySend(req))
    .reduce((resultString, event) => {
      return resultString + eventString(event)
    }, '');

  res.send(notifications);
}

const onlySend = req => notification => {
  const lastNotificationId = req.headers
    && req.headers['last-event-id'] || 0; // Only notifies for new result based on the last notification sent

  return notification.id > lastNotificationId;
}
