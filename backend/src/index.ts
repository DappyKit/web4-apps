import express from 'express'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from './knexfile'
import { createAppsRouter } from './routes/apps'
import { createUsersRouter } from './routes/users'
import { createTemplatesRouter } from './routes/templates'
import cors from 'cors'

// Load environment variables
dotenv.config()

// Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error('Missing required environment variables')
}

const app = express()

// Initialize database
const db = knex(knexConfig[process.env.NODE_ENV || 'development'])

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connected successfully')
  })
  .catch((err: unknown) => {
    console.error('Database connection failed:', err)
    process.exit(1)
  })

// Enable CORS
app.use(cors())
app.use(express.json())

// Add error handling middleware
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', _err)
  res.status(500).json({ error: 'Internal server error' })
})

// Routes
app.use('/api', createAppsRouter(db))
app.use('/api', createUsersRouter(db))
app.use('/api/templates', createTemplatesRouter(db))

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
