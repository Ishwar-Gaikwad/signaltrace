import { Router } from 'express';
import healthRoutes from './health.routes.js';
import claimRoutes from './claim.routes.js';
import incidentRoutes from './incident.routes.js';

const apiRouter = Router();

// Mount sub-routers
apiRouter.use(healthRoutes);
apiRouter.use(claimRoutes);
apiRouter.use(incidentRoutes);

export default apiRouter;
