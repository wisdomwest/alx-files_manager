import dbClient from "../utils/db";
import fileClient from '../utils/file';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const { user } = req;
    const { error, filedata } = await fileClient.validateFile(req);
    console.log(filedata);
    console.log(error);
    if (error) {
      return res.status(400).json({ error });
    }

    const { name, type, isPublic, parentId, data } = filedata;

    const file = {
      userId: user.id,
      name,
      type,
      isPublic,
      parentId,
    };

    const newFile = await dbClient.files.insertOne(file);
    console.log(newFile);

    if (type !== 'folder') {
      const path = `${FOLDER_PATH}/${newFile.id}`;
      await fileClient.saveFile(path, data);
    }

    return res.status(201).json(newFile);
  }
}

export default FilesController;
