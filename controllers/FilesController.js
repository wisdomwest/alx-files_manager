import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getMongoInstance,  ObjectId } from 'mongodb';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import mime from 'mime-types';

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

    const data = req.body.data;
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

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
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

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await dbClient.files
      .find({ userId, parentId })
      .skip(page * 20)
      .limit(20)
      .toArray();

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
    try {
      const fileId = req.params.id;
      const { userId } = req;
      const file = await getMongoInstance().dbClient.files.findOne({ _id: ObjectId(fileId) });

      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      if (!file.isPublic && (!userId || file.userId !== userId.toString())) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      if (file.type === 'folder') {
        res.status(400).json({ error: "A folder doesn't have content" });
        return;
      }

      const filePath = path.join(__dirname, '..', 'uploads', file.id.toString());
      console.log(filePath);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const mimeType = mime.lookup(file.name);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('open', () => {
        res.set('Content-Type', mimeType);
        fileStream.pipe(res);
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
