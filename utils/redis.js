import { promisify } from 'util';
import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.connected = true;
    this.client.on('error', (error) => {
      console.error(`Redis client not connected to the server: ${error.message}`);
      this.connected = false;
    });
    this.client.on('connect', () => {
      this.connected = true;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  async set(key, value, duration) {
    await promisify(this.client.SETEX).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
