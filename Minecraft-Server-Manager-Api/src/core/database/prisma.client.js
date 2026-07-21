import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;
import pgPkg from 'pg';
const { Pool } = pgPkg;
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error(' [DB] Error inesperado en la conexión a PostgreSQL:', err);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
