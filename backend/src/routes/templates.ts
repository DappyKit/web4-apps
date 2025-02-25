import { Router, Request, Response } from 'express';
import { Knex } from 'knex';
import { verifySignature, requireAuth } from '../utils/auth';
import { validateTemplate, ValidationError } from '../utils/templateValidation';
import { Template, CreateTemplateDTO } from '../types/template';

interface CreateTemplateRequest extends Request {
  body: {
    title: string;
    description?: string;
    url: string;
    json_data: string;
    address: string;
    signature: string;
  }
}

interface DeleteTemplateRequest extends Request {
  body: {
    address: string;
    signature: string;
  }
}

export function createTemplatesRouter(db: Knex) {
  const router = Router();

  // Create template
  router.post('/', requireAuth, async (req: CreateTemplateRequest, res: Response) => {
    try {
      const { address, signature } = req.body;
      const templateData: CreateTemplateDTO = {
        title: req.body.title,
        description: req.body.description,
        url: req.body.url,
        json_data: req.body.json_data,
      };

      // Verify signature
      const message = `Create template: ${templateData.title}`;
      if (!verifySignature(message, signature, address)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Validate template data
      validateTemplate(templateData);

      // Insert template and get the id
      const [insertedId] = await db('templates')
        .insert({
          ...templateData,
          owner_address: address,
        })
        .returning('id');

      // Get the inserted template
      const template = await db('templates')
        .where({ id: insertedId })
        .first();

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
      }
    }
  });

  // Get templates by owner
  router.get('/my', requireAuth, async (req: Request, res: Response) => {
    try {
      const { address } = req.query;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address parameter is required' });
      }

      const templates: Template[] = await db('templates')
        .whereRaw('LOWER(owner_address) = ?', [address.toLowerCase()])
        .orderBy('created_at', 'desc');

      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Delete template
  router.delete('/:id', requireAuth, async (req: DeleteTemplateRequest, res: Response) => {
    try {
      const { address, signature } = req.body;
      const templateId = Number(req.params.id);

      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      // Check if template exists and belongs to the user
      const template = await db<Template>('templates')
        .where({ id: templateId })
        .first();

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (template.owner_address.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized to delete this template' });
      }

      // Verify signature
      const message = `Delete template #${templateId}`;
      if (!verifySignature(message, signature, address)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      await db('templates')
        .where({ id: templateId })
        .delete();

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  return router;
} 