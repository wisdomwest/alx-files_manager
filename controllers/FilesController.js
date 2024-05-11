import fileClient from '../utils/file';
import userClient from "../utils/user";
import { ObjectId } from 'mongodb';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const { userId } = await userClient.getToken(req);

    if (!userClient.isvalid(userId)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await userClient.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const { error: validationError, filedata } = await fileClient.validateFile(req);

    if (validationError) {
      return res.status(400).send({ error: validationError });
    }

    if (filedata.parentId !== 0 && !userClient.isvalid(filedata.parentId)) { return response.status(400).send({ error: 'Parent not found' }); }

    const { error: saveError, file } = await fileClient.saveFile(userId, filedata, FOLDER_PATH);

    if (saveError) {
      return res.status(400).send({ error: saveError });
    }

    return res.status(201).send(file);
  }

  static async getShow(req, res) {
    const fileId = req.params.id;

    const { userId } = await userClient.getToken(req);

    const user = await userClient.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    if (!userClient.isvalid(userId) || !userClient.isvalid(fileId)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const file = await fileClient.getFile({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    const result = fileClient.processFile(file);

    return res.status(200).send(result);
  }

  static async getIndex(req, res) {
    const { userId } = await userClient.getToken(req);

    const user = await userClient.getUser({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    let parentId = req.query.parentId || 0;

    if (parentId === '0') {
      parentId = 0;
    }

    let page = Number(req.query.page) || 0;

    if (Number.isNaN(page)) {
      page = 0;
    }

    if ( parentId !== 0 && parentId !== '0') {
      if (!userClient.isvalid(parentId)) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      parentId = ObjectId(parentId);

      const folder = await fileClient.getFile({ _id: parentId });

      if (!folder || folder.type !== 'folder') {
        return res.status(200).send([]);
      }
    }

    const pagination = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];

    const files = await fileClient.getFilesParent(pagination);

    const list = [];

    await files.forEach((file) => {
      const result = fileClient.processFile(file);
      list.push(result);
    });

    return res.status(200).send(list);
  }
}

export default FilesController;
