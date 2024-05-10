import dbClient from "./db";
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';

const fileClient = {
  async validateFile(request) {
    const {
      name, type, isPublic=false, data,
    } = request.body;

    let { parentId = 0 } = request.body;

    const allowedTypes = ['folder', 'file', 'image'];

    let errorMessage = null;

    let parentFile;

    if (!name) {
      errorMessage = 'Missing name';
    } else if (!type || !allowedTypes.includes(type)) {
      errorMessage = 'Missing type';
    } else if (!data && type !== 'folder') {
      errorMessage = 'Missing data';
    } else if ( parentId && parentId !== 0) {
      parentFile = await dbClient.files.findOne({ _id: ObjectId(parentId) });
    }

    console.log(parentFile);
    if (!parentFile) {
      errorMessage = 'Parent not found';
    } else if (parentFile.type !== 'folder') {
      errorMessage = 'Parent is not a folder';
    }

    const info = {
      error: errorMessage,
      filedata: {
        name, type, isPublic, parentId, data,
      },
    };

    return info;
  },

  async saveFile(userId, fileData, FOLODER_PATH) {
    const { name, type, isPublic, data } = fileData;
    let { parentId } = fileData;

    if (parentId) {
      parentId = ObjectId(parentId);
    }

    const file = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (fileData.data != 'folder') {
      const fileuuid = uuidv4();
      const decode = Buffer.from(data, 'base64');
      const path = `${FOLODER_PATH}/${fileuuid}`;

      file.localpath = path;

      try {
        await fs.mkdir(FOLODER_PATH, { recursive: true });
        await fs.writeFile(path, decode);
      } catch (error) {
        return { error: error.message, code: 400 };
      }
    }

    const result = await dbClient.files.insertOne(file);

    const process = this.processFile(file);

    const newFile = { id: result.insertedId, ...process };

    return { error: null, newFile };
  },

  async processFile(file) {
    const process = { id: file._id, ...file };

    delete process.localpath;
    delete process._id;

    return process;
  }
};

export default fileClient;

