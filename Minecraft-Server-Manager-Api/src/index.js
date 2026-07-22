import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from './modules/auth/routes/auth.routes.js';
import serverRoutes from './modules/servers/routes/server.routes.js';
import versionRoutes from './modules/versions/routes/version.routes.js';
import userRoutes from './modules/users/routes/user.routes.js';
import agentRoutes from './modules/agent/routes/agent.routes.js';
import { globalErrorHandler } from './middlewares/errorHandler.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './core/docs/swagger.js';
const app = express();

app.use(helmet());

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(morgan('dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agent', agentRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(globalErrorHandler);

export default app;