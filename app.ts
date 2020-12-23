// Requirements
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Debug from 'debug';
import dotenv from 'dotenv';

// Controllers
import log from './src/config/logger';
import { connect as dbConnect, disconnect as dbDisconnect } from './src/controllers/dbController';
import { connect as emailConnect } from './src/controllers/emailController';
import apiRouter from './src/routes/apiRoutes';

// File tag
const tag = 'store-api';
const debug = Debug(tag);
dotenv.config();

// App configuration
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB and SMTP Server
dbConnect();
emailConnect();

// Routing
app.use('/api', apiRouter);

// Entry Point
app.get('/wakeup', (_req: Request, res: Response) => {
  log.info('Waking up Heroku Server', { metadata: { tag } });
  return res.status(200).send('Awake!');
});

// Start Server
const server = app.listen(port, () => {
  log.info('Server starting', { metadata: { tag } });
  debug(`Express server listening on port ${port}...`);
});

// Shut down gracefully
process.on('SIGTERM', () => {
  server.close(() => {
    log.info('Server shutting down', { metadata: { tag } });
    debug('Server shutting down...');
    // Upload logs here
    dbDisconnect();
    log.loggers.close();
  });
});
