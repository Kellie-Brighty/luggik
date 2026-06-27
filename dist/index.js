import express from 'express';
import dotenv from 'dotenv';
import webhookRoutes from './src/routes/webhook.routes.js';
import errandRoutes from './src/routes/errand.routes.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use('/api/webhooks', webhookRoutes);
app.use('/api/errands', errandRoutes);
app.get('/', (req, res) => {
    res.send('Luggik API is running');
});
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
