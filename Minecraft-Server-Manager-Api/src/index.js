import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from './modules/auth/routes/auth.routes.js';
import serverRoutes from './modules/servers/routes/server.routes.js';
import versionRoutes from './modules/versions/routes/version.routes.js';
import userRoutes from './modules/users/routes/user.routes.js';

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cors({
  origin: function (origin, callback) {
    callback(null, origin || true);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/users', userRoutes);

export default app;