#!/bin/bash
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }
    const userExists = await dbClient.users.findOne({ email });
    if (userExists) {
      return res.status(400).send({ error: 'Already exist' });
    }
    const newUser = await dbClient.users.insertOne({ email, password: sha1(password) });
    return res.status(201).send({ id: newUser.insertedId.toString(), email: email });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const email = await redisClient.get(`auth_${token}`);
    if (!email) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.users.findOne({ email });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    return res.status(200).send({ id: user._id, email: user.email });
  }
}

export default UsersController;
