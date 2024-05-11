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
}

export default FilesController;
