import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// =============================================================================
// Security & Core Middleware
// =============================================================================

// CORS configuration driven by CLIENT_ORIGIN environment variable
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Support single origin or comma-separated origins
    const allowedOrigins = config.clientOrigin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// JSON Body Parser
app.use(express.json());

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// =============================================================================
// API Routes
// =============================================================================

// Mount REST API endpoints under /api
app.use('/api', apiRouter);

// Root route friendly welcome
app.get('/', (req, res) => {
  res.json({
    name: 'SignalTrace — VeriAlert API',
    description: 'Disaster Information Verification Agent API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// =============================================================================
// Error Handling Middleware
// =============================================================================

// 404 JSON Handler for unmatched routes
app.use(notFoundHandler);

// Centralized JSON Error Handler
app.use(errorHandler);

export default app;
