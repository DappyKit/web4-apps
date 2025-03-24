import express from 'express'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from './knexfile'
import { createAppsRouter } from './routes/apps'
import { createUsersRouter } from './routes/users'
import { createTemplatesRouter } from './routes/templates'
import { createAiRouter } from './routes/ai'
import { createGitHubRouter } from './routes/github'
import cors from 'cors'
import { Request, Response, NextFunction } from 'express'

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
  .catch((error: unknown) => {
    console.error('Database connection failed:', error)
    process.exit(1)
  })

// Enable CORS
app.use(cors())
app.use(express.json())

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// Add error handling middleware
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error)
  return res.status(500).json({ error: 'Internal server error' })
})

// Routes
app.use('/api', createAppsRouter(db))
app.use('/api', createUsersRouter(db))
app.use('/api/templates', createTemplatesRouter(db))
app.use('/api/ai', createAiRouter(db))
app.use('/api/github', createGitHubRouter(db))

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server started on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Export for testing
export default app
