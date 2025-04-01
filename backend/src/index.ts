import express from 'express'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from './knexfile'
import { createAppsRouter } from './routes/apps'
import { createUsersRouter } from './routes/users'
import { createTemplatesRouter } from './routes/templates'
import { createAiRouter } from './routes/ai'
import { createTelegramRouter } from './routes/telegram'
import { createFeedbackRouter } from './routes/feedback'
import { createNotificationService } from './services/notification'
import cors from 'cors'
import path from 'path'

// Determine if we're running from dist or directly from src
const isDist = __dirname.includes('dist')
const envPath = isDist ? path.resolve(__dirname, '../../.env') : path.resolve(__dirname, '../.env')

// Load environment variables with path that works in both dev and production
dotenv.config({ path: envPath })

// Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error('Missing required environment variables')
}

const app = express()

// Initialize database
const db = knex(knexConfig[process.env.NODE_ENV || 'development'])

// Initialize notification service
const notificationService = createNotificationService()

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

// Add error handling middleware
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', _err)
  res.status(500).json({ error: 'Internal server error' })
})

// Routes
app.use('/api', createAppsRouter(db, notificationService))
app.use('/api', createUsersRouter(db, notificationService))
app.use('/api/templates', createTemplatesRouter(db, notificationService))
app.use('/api/ai', createAiRouter(db))
app.use('/api/telegram', createTelegramRouter(db))
app.use('/api/feedback', createFeedbackRouter(db, notificationService))

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Export for testing
export default app
