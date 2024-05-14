import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import { promisify } from 'util';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const { name } = req.body;
    if (!name) return res.status(400).send({ error: 'Missing name' });

    const { type } = req.body;
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }

    const { data } = req.body;
    if (!data && type !== 'folder') {
      return res.status(400).send({ error: 'Missing data' });
    }

    const parentId = req.body.parentId ? req.body.parentId : 0;
    if (parentId !== 0) {
      const parent = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    const isPublic = req.body.isPublic ? req.body.isPublic : false;

    if (type === 'folder') {
      const newFolder = {
        userId,
        name,
        type,
        isPublic,
        parentId,
      };

      await dbClient.files.insertOne(newFolder);

      return res.status(201).json({
        id: newFolder._id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    await promisify(fs.mkdir)(path, { recursive: true });

    const localPath = `${path}/${uuidv4()}`;
    await promisify(fs.writeFile)(
      localPath,
      Buffer.from(data, 'base64').toString('utf-8'),
    );

    const file = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    };

    await dbClient.files.insertOne(file);

    return res.status(201).json({
      id: file._id,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.files.findOne({ _id: ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await dbClient.files
      .find({ parentId })
      .skip(page * 20)
      .limit(20)
      .toArray();

    if (!files) {
      return res.status(200).json([]);
    }

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.files
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId },
        { $set: { isPublic: true } },
        { returnOriginal: false },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.files
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId },
        { $set: { isPublic: false } },
        { returnOriginal: false },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    const file = await dbClient.files.findOne({ _id: ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
      if (!user || user._id.toString() !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    const read = promisify(fs.readFile);

    try {
      const data = await read(file.localPath);
      console.log(data);

      return res
        .set('Content-Type', mime.lookup(file.name))
        .send(data);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
