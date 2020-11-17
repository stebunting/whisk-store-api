// File tag
const tag = 'store-api';

// Requirements
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const debug = require('debug')(tag);

// App configuration
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB and SMTP Server
const dbController = require('./src/controllers/dbController');
const emailController = require('./src/controllers/emailController');

dbController.connect();
emailController.connect();

// Routing
const apiRouter = require('./src/routes/apiRoutes')();

app.use('/api', apiRouter);

// Entry Point
app.get('/wakeup', (req, res) => {
  res.send('Awake!');
});

// Start Server
app.listen(port, () => {
  debug(`Express server listening on port ${port}...`);
});
