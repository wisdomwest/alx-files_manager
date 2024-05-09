#!/bin/bash
import dbClient from '../utils/db';
import sha1 from 'sha1';

class UsersController {
  static async postUser(req, res) {
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
}

export default UsersController;
