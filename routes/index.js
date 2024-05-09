import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

function routes(app) {
  const router = express.Router();
  app.use('/', router);

  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  router.post('/users', (req, res) => {
    UsersController.postUser(req, res);
  });
}

export default routes;
