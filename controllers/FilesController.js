import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import { promisify } from 'util';
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
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    let user;
    try {
      user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    } catch (error) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id;

    const file = await dbClient.files.findOne({ 
      _id: ObjectId(fileId), 
      userId: user._id.toString(),
    });

    if (!file) return res.status(404).send({ error: 'Not found' });

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
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    let user;
    try {
      user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let parentId;
    try {
      parentId = req.query.parentId && req.query.parentId !== '0' ? new ObjectId(req.query.parentId) : '0';
    } catch (err) {
      return res.json([]);
    }

    const page = req.query.page ? Number(req.query.page) : 0;
    if (!(page >= 0)) {
      return res.json([]);
    }


    const collection = dbClient.files;
    const match = {
      userId: user._id,
    };

    if (parentId !== '0') {
      match.parentId = parentId;
    }

    const files = await collection.aggregate([
        { $match: match },
        { $skip: page * 20 },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: {
                if: { $eq: ['$parentId', '0'] },
                then: 0,
                else: '$parentId',
              },
            },
          },
        },
      ])
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    let user;
    try {
        user = await dbClient.users.findOne({ _id: new ObjectId(userId) });
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    
    let file;
    try {
        file = await dbClient.files.findOne({
        _id: new ObjectId(fileId),
        userId: user._id,
        });
    } catch (err) {
        return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
        return res.status(404).json({ error: 'Not found' });
    }

    dbClient.files.updateOne(
        {
        _id: new ObjectId(fileId),
        userId: user._id.toString(),
        },
        { $set: { isPublic: true } },
    );
    const updatedFile = await dbClient.files.findOne({
        _id: new ObjectId(fileId),
        userId: user._id.toString(),
    });

    return res.status(200).json({
        id: fileId,
        userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: true,
        parentId:
        updatedFile.parentId === '0'.toString() ? 0 : updatedFile.parentId.toString(),
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    let user;
    try {
        user = await dbClient.users.findOne({ _id: new ObjectId(userId) });
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    let file;
    try {
        file = await dbClient.files.findOne({
        _id: new ObjectId(fileId),
        userId: user._id,
        });
    } catch (err) {
        return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
        return res.status(404).json({ error: 'Not found' });
    }

    dbClient.files.updateOne(
        {
        _id: new ObjectId(fileId),
        userId: user._id.toString(),
        },
        { $set: { isPublic: false } },
    );
    const updatedFile = await dbClient.files.findOne({
        _id: new ObjectId(fileId),
        userId: user._id.toString(),
    });

    return res.status(200).json({
        id: fileId,
        userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: false,
        parentId:
        updatedFile.parentId === '0'.toString() ? 0 : updatedFile.parentId.toString(),
    });
  }
}


export default FilesController;
