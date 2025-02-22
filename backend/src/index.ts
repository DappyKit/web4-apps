import express from 'express';
import knex from 'knex';
import * as dotenv from 'dotenv';
import knexConfig from './knexfile';
import { createAppsRouter } from './routes/apps';
import { createUsersRouter } from './routes/users';

// Load environment variables
dotenv.config();

// Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error('Missing required environment variables');
}

const app = express();
const db = knex(knexConfig[process.env.NODE_ENV || 'development']);

app.use(express.json());

// Routes
app.use('/api', createAppsRouter(db));
app.use('/api', createUsersRouter(db));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 