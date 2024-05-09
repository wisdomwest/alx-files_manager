import { MongoClient } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'file_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;


class DBClient {
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (err) {
        console.log(err);
        this.connected = false;
      } else {
        this.client = client.db(DB_DATABASE);
        this.connected = true;
      }
    });
  }

  isAlive() {
    return Boolean(this.connected);
  }

  async nbUsers() {
    const users = this.client.collection('users');
    return users.countDocuments();
  }

  async nbFiles() {
    const files = this.client.collection('files');
    return files.countDocuments();
  }
}

export const dbClient = new DBClient();
export default dbClient;
