import { Router, Request, Response, RequestHandler } from 'express'
import { Knex } from 'knex'
import { requireAuth } from '../utils/auth'
import { verifySignature } from '../utils/auth'
import { CreateAppDTO, App } from '../types'

/**
 * Extended Request type that includes the authenticated wallet address
 */
type AuthRequest = Request & {
  address: string
}

/**
 * Maximum length allowed for app name
 */
const MAX_NAME_LENGTH = 255

/**
 * Maximum length allowed for app description
 */
const MAX_DESCRIPTION_LENGTH = 1000

/**
 * Creates and configures the apps router
 * @param {Knex} db - The database connection instance
 * @returns {Router} Express router configured with app routes
 */
export function createAppsRouter(db: Knex): Router {
  const router = Router()

  // Get apps by owner
  router.get('/my-apps', requireAuth, (async (req: Request, res: Response) => {
    try {
      const userAddress = (req as AuthRequest).address.toLowerCase()
      const apps = await db<App>('apps').where({ owner_address: userAddress }).orderBy('created_at', 'desc')

      res.json(apps)
    } catch (err: unknown) {
      console.error('Error fetching apps:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }) as RequestHandler)

  // Create new app
  router.post('/my-apps', requireAuth, (async (req: Request, res: Response) => {
    try {
      const body = req.body
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' })
      }

      const { name, description, signature, template_id, json_data } = body as CreateAppDTO

      // First check if name exists and is not empty
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' })
      }

      // Then check other required fields
      if (!signature || typeof signature !== 'string' || !template_id || typeof template_id !== 'number') {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Validate name length
      if (name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: 'Name must be less than 255 characters' })
      }

      // Validate description length if provided
      if (description && (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)) {
        return res.status(400).json({ error: 'Description must be less than 1000 characters' })
      }

      const userAddress = (req as AuthRequest).address.toLowerCase()
      const trimmedName = name.trim()

      // Construct message and verify signature
      const message = `Create app: ${trimmedName}`
      try {
        if (!verifySignature(message, signature, userAddress)) {
          return res.status(401).json({ error: 'Invalid signature' })
        }
      } catch (error) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // Check if template exists
      const template = await db('templates').where({ id: template_id }).first()
      if (!template) {
        return res.status(404).json({ error: `Template with ID ${String(template_id)} not found` })
      }

      // Create new app
      const newApp: Partial<App> = {
        name: trimmedName,
        description: description && typeof description === 'string' ? description : undefined,
        owner_address: userAddress,
        template_id,
        json_data: json_data && typeof json_data === 'string' ? json_data : undefined,
      }

      const [appId] = await db<App>('apps').insert(newApp)
      const app = await db<App>('apps').where({ id: appId }).first()

      res.status(201).json(app)
    } catch (error: unknown) {
      console.error('Error creating app:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }) as RequestHandler)

  // Delete app
  router.delete('/my-apps/:id', requireAuth, (async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { signature } = req.body

      const appId = parseInt(id, 10)
      if (isNaN(appId)) {
        return res.status(400).json({ error: 'Invalid app ID' })
      }

      if (!signature || typeof signature !== 'string') {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const userAddress = (req as AuthRequest).address.toLowerCase()

      // Check if app exists and belongs to user
      const app = await db<App>('apps')
        .where({
          id: appId,
          owner_address: userAddress,
        })
        .first()

      if (!app) {
        return res.status(404).json({ error: 'App not found or unauthorized' })
      }

      const deleteMessage = `Delete application #${String(appId)}`
      if (!verifySignature(deleteMessage, signature, userAddress)) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      await db<App>('apps').where({ id: appId }).delete()
      res.status(200).json({ message: 'App deleted successfully' })
    } catch (err: unknown) {
      console.error('Error deleting app:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  }) as RequestHandler)

  // Get app by ID (public endpoint)
  router.get('/apps/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const appId = Number(id)

      if (isNaN(appId)) {
        return res.status(400).json({ error: 'Invalid app ID' })
      }

      const app = await db<App>('apps').where({ id: appId }).first()

      if (!app) {
        return res.status(404).json({ error: 'App not found' })
      }

      res.json(app)
    } catch (err: unknown) {
      console.error('Error fetching app:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
