const redis = require('redis');
const client = redis.createClient({url: 'redis://localhost:6379'});

async function run() {
  await client.connect();
  await client.flushAll();
  console.log('Redis Flushed');
  await client.disconnect();
}
run();
