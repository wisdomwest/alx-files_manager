#!/bin/bash
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import userClient from '../utils/user';

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
    return res.status(201).send({ id: newUser.insertedId.toString(), email });
  }

  static async getMe(req, res) {
    const { userId } = await userClient.getToken(req);

    const user = await userClient.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const parse = { id: user._id, ...user };
    delete parse.password;
    delete parse._id;

    return res.status(200).send(parse);
  }
}

export default UsersController;
