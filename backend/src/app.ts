import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createGitHubRouter } from './routes/github'
import { Knex } from 'knex'

dotenv.config()

// Define properly typed db import
const db = {} as Knex

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/github', createGitHubRouter(db))

export default app
