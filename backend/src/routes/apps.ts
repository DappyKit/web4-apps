import { Router, Request, Response, RequestHandler } from 'express';
import { Knex } from 'knex';
import { requireAuth } from '../utils/auth';
import { verifySignature } from '../utils/auth';
import { CreateAppDTO, App } from '../types';

// Define a custom request type that includes our address property
type AuthRequest = Request & {
  address: string;
};

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

export function createAppsRouter(db: Knex) {
  const router = Router();

  // Get apps by owner
  router.get('/my-apps', requireAuth, (async (req: Request, res: Response) => {
    try {
      const apps = await db<App>('apps')
        .where({ owner_address: (req as AuthRequest).address })
        .orderBy('created_at', 'desc');

      res.json(apps);
    } catch (err: unknown) {
      console.error('Error fetching apps:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }) as RequestHandler);

  // Create new app
  router.post('/my-apps', requireAuth, (async (req: Request, res: Response) => {
    try {
      const { name, description, signature, message }: CreateAppDTO = req.body;

      // First check if name exists and is not empty
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Then check other required fields
      if (!message || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate name length
      if (name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: 'Name must be less than 255 characters' });
      }

      // Validate description length if provided
      if (description && description.length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ error: 'Description must be less than 1000 characters' });
      }

      // Verify signature
      try {
        if (!verifySignature(message, signature, (req as AuthRequest).address)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } catch (error) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Create new app
      const newApp: Partial<App> = {
        name: name.trim(),
        description,
        owner_address: (req as AuthRequest).address
      };

      const [appId] = await db<App>('apps').insert(newApp);
      const app = await db<App>('apps').where('id', appId).first();

      res.status(201).json(app);
    } catch (error: unknown) {
      console.error('Error creating app:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }) as RequestHandler);

  return router;
}
