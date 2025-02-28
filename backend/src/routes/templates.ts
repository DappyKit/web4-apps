import { Router, Request, Response } from 'express'
import { Knex } from 'knex'
import { verifySignature, requireAuth } from '../utils/auth'
import { validateTemplate, ValidationError } from '../utils/templateValidation'
import { Template, CreateTemplateDTO } from '../types/template'

/**
 * Extended request interface for template creation
 * @extends Request
 */
interface CreateTemplateRequest extends Request {
  body: {
    title: string
    description?: string
    url: string
    json_data: string
    address: string
    signature: string
  }
}

/**
 * Extended request interface for template deletion
 * @extends Request
 */
interface DeleteTemplateRequest extends Request {
  body: {
    address: string
    signature: string
  }
}

/**
 * Creates and configures the templates router
 * @param {Knex} db - The database connection instance
 * @returns {Router} Express router configured with template routes
 */
export function createTemplatesRouter(db: Knex): Router {
  const router = Router()

  // Create template
  router.post('/', requireAuth, async (req: CreateTemplateRequest, res: Response) => {
    try {
      const { address, signature } = req.body
      const templateData: CreateTemplateDTO = {
        title: req.body.title,
        description: req.body.description,
        url: req.body.url,
        json_data: req.body.json_data,
      }

      // Verify signature
      const message = `Create template: ${templateData.title}`
      const isValidSignature = await verifySignature(message, signature, address)
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // Validate template data
      validateTemplate(templateData)

      // Insert template and get the id
      const [insertId] = await db('templates').insert({
        ...templateData,
        owner_address: address,
      })

      res.status(201).json({
        id: insertId,
        ...templateData,
        owner_address: address,
        created_at: new Date(),
        updated_at: new Date(),
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message })
      } else {
        console.error('Error creating template:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })

  // Get templates by owner
  router.get('/my', requireAuth, async (req: Request, res: Response) => {
    try {
      const { address } = req.query

      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address parameter is required' })
      }

      const templates: Template[] = await db('templates')
        .whereRaw('LOWER(owner_address) = ?', [address.toLowerCase()])
        .whereNull('deleted_at')
        .orderBy('id', 'desc')

      res.json(templates)
    } catch (error) {
      console.error('Error fetching templates:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Delete template
  router.delete('/:id', requireAuth, async (req: DeleteTemplateRequest, res: Response) => {
    try {
      const { signature } = req.body
      const address = req.body.address || (req.headers['x-wallet-address'] as string)
      const templateId = Number(req.params.id)

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' })
      }

      // Validate address
      if (!address) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Check if template exists and belongs to the user
      const template = await db<Template>('templates').where({ id: templateId }).whereNull('deleted_at').first()

      if (!template) {
        return res.status(404).json({ error: 'Template not found' })
      }

      if (template.owner_address.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized to delete this template' })
      }

      // Verify signature
      const message = `Delete template #${templateId}`
      const isValidSignature = await verifySignature(message, signature, address)
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      // Soft delete the template
      await db('templates').where({ id: templateId }).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      })

      res.status(200).json({ message: 'Template deleted successfully' })
    } catch (error) {
      console.error('Error deleting template:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Get template by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const templateId = Number(req.params.id)

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' })
      }

      const template = await db<Template>('templates').where({ id: templateId }).whereNull('deleted_at').first()

      if (!template) {
        return res.status(404).json({ error: 'Template not found' })
      }

      res.json(template)
    } catch (error) {
      console.error('Error fetching template:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // Get all templates with pagination (public endpoint, only moderated templates)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const page = Number((req.query.page as string) || '1')
      const limit = Number((req.query.limit as string) || '12')

      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: 'Invalid page parameter' })
      }

      if (isNaN(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 50' })
      }

      const offset = (page - 1) * limit

      // Get moderated templates with pagination
      const templates = await db<Template>('templates')
        .where('moderated', true)
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .limit(limit)
        .offset(offset)

      // Get total count for pagination info
      const result = await db('templates')
        .where('moderated', true)
        .whereNull('deleted_at')
        .count({ count: 'id' })
        .first()

      // Knex count returns the count in a format that may vary by database
      const count = result?.count
      const totalCount = typeof count === 'number' ? count : Number(count)
      const totalPages = Math.ceil(totalCount / limit)

      res.json({
        data: templates,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    } catch (err: unknown) {
      console.error('Error fetching all templates:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
