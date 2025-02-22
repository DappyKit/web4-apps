import { Router, Request, Response, RequestHandler } from 'express';
import { Knex } from 'knex';
import { requireAuth } from '../utils/auth';
import { verifySignature } from '../utils/auth';
import { CreateAppDTO, App, User } from '../types';

// Define a custom request type that includes our address property
type AuthRequest = Request & {
  address: string;
};

export function createAppsRouter(db: Knex) {
  const router = Router();

  // Get apps by owner
  router.get('/my-apps', requireAuth, (async (req, res) => {
    try {
      const apps = await db<App>('apps')
        .where({ owner_address: (req as AuthRequest).address })
        .orderBy('created_at', 'desc');
      
      res.json(apps);
    } catch (error) {
      console.error('Error fetching apps:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }) as RequestHandler);

  // Create new app
  router.post('/my-apps', requireAuth, (async (req, res) => {
    try {
      const { name, description, signature, message }: CreateAppDTO = req.body;

      // Verify signature
      if (!verifySignature(message, signature, (req as AuthRequest).address)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Create new app
      const newApp: Partial<App> = {
        name,
        description,
        owner_address: (req as AuthRequest).address
      };

      // Insert app
      const [appId] = await db<App>('apps')
        .insert(newApp);

      const app = await db<App>('apps')
        .where('id', appId)
        .first();

      res.status(201).json(app);
    } catch (error) {
      console.error('Error creating app:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }) as RequestHandler);

  return router;
} 