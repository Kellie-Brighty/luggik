const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const webhookRoutes = require('./src/routes/webhook.routes');

app.use(express.json());

app.use('/api/webhooks', webhookRoutes);

app.get('/', (req, res) => {
  res.send('Luggik API is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
