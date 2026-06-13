import express from "express"
import cors from "cors"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import authRoutes from './routes/authRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import versionRoutes from './routes/versionRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express()

app.use(express.json())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(cookieParser())
app.use(morgan('dev'))

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/users', userRoutes);

export default app;