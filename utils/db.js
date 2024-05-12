import { MongoClient } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

class DBClient {
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (err) {
        console.log(err);
        this.connected = false;
      } else {
        this.client = client.db(DB_DATABASE);
        this.users = this.client.collection('users');
        this.files = this.client.collection('files');
        this.connected = true;
      }
    });
  }

  isAlive() {
    return Boolean(this.connected);
  }

  async nbUsers() {
    const count = this.users.countDocuments();
    return count;
  }

  async nbFiles() {
    const count = this.files.countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
export default dbClient;
