// File tag
const tag = 'store-api';

// Requirements
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const debug = require('debug')(tag);

// App configuration
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());

// Connect to MongoDB and SMTP Server
const dbController = require('./src/controllers/dbController')(tag);

dbController.connect();

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
