import { Router, Request, Response } from 'express'
import { globalState } from '../utils/globalState'

/**
 * Creates and configures the system router
 * @returns {Router} Express router configured with system routes
 */
export function createSystemRouter(): Router {
  const router = Router()

  // Get current submissions status
  router.get('/submissions-status', (req: Request, res: Response) => {
    try {
      const areSubmissionsEnabled = globalState.getSubmissionsEnabled()
      res.json({
        areSubmissionsEnabled,
        message: areSubmissionsEnabled ? 'Submissions are currently enabled' : 'Submissions are currently disabled',
      })
    } catch (error) {
      console.error('Error getting submissions status:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
