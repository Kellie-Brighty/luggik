import 'dotenv/config';
import express, { Request, Response } from 'express';
import webhookRoutes from './src/routes/webhook.routes.js';
import errandRoutes from './src/routes/errand.routes.js';
import trackingRoutes from './src/routes/tracking.routes.js';
import kycRoutes from './src/routes/kyc.routes.js';
import fleetRoutes from './src/routes/fleet.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';

const app = express();
const port = process.env.PORT || 3008;

app.use(express.json({ limit: '50mb' }));

app.use('/api/webhooks', webhookRoutes);
app.use('/api/errands', errandRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Luggik API is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
