// File tag
const tag = 'store-api';

// Requirements
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const debug = require('debug')(tag);
const log = require('./src/config/logger');

// App configuration
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB and SMTP Server
const db = require('./src/controllers/dbController');
const email = require('./src/controllers/emailController');

db.connect();
email.connect();

// Routing
const apiRouter = require('./src/routes/apiRoutes')();

app.use('/api', apiRouter);

// Entry Point
app.get('/wakeup', (req, res) => {
  res.send('Awake!');
});

// Start Server
const server = app.listen(port, () => {
  debug(`Express server listening on port ${port}...`);
});

// Shut down gracefully
process.on('SIGTERM', () => {
  server.close(() => {
    debug('Server shutting down...');
    // Upload logs here
    db.disconnect();
    log.loggers.close();
  });
});
