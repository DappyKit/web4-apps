import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import githubRoutes from './routes/github'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/github', githubRoutes)

export default app
