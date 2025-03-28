import type { Knex } from 'knex'
import * as dotenv from 'dotenv'
import path from 'path'

// Determine if we're running from dist or directly from src
const isDist = __dirname.includes('dist')
const envPath = isDist ? path.resolve(__dirname, '../../.env') : path.resolve(__dirname, '../.env')

// Load environment variables with path that works in both dev and production
dotenv.config({ path: envPath })

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dappykit_apps',
    },
    migrations: {
      directory: isDist ? path.join(__dirname, '../../migrations') : path.join(__dirname, '../migrations'),
      extension: 'ts',
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: isDist ? path.join(__dirname, '../../migrations') : path.join(__dirname, '../migrations'),
      extension: 'ts',
    },
  },
}

export default config
