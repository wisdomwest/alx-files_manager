import dbClient from "../utils/db";
import redisClient from "../utils/redis";
import sha1 from "sha1";
import { v4 as uuidv4 } from "uuid";

class AuthController {
  static async getConnect(req, res) {
    const auth = req.header("Authorization");
    if (!auth) {
      return res.status(401).send({ error: "Unauthorized" });
    }
    const buff = auth.split(' ')[1];
    if (!buff) {
      return res.status(401).send({ error: "Unauthorized" });
    }
    const creds = Buffer.from(buff, "base64").toString("utf-8");
    const [email, pass] = creds.split(':');

    if (!email || !pass) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const user = await dbClient.users.findOne({ email });
    if (!user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    if (sha1(pass) !== user.password) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, email, 86400);
    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header("X-Token");
    if (!token) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const email = await redisClient.get(`auth_${token}`);
    if (!email) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
