import { ObjectId } from 'mongodb';
import redisClient from './redis';
import dbClient from './db';

const userClient = {
  isvalid(id) {
    try {
      ObjectId(id);
    } catch (error) {
      return false;
    }
    return true;
  },

  async getToken(request) {
    const data = { userId: null, token: null };

    const token = request.header('X-Token');

    if (!token) {
      return data;
    }

    data.token = `auth_${token}`;

    data.userId = await redisClient.get(data.token);

    return data;
  },

  async getUser(request) {
    const user = await dbClient.users.findOne(request);
    return user;
  },
};

export default userClient;
