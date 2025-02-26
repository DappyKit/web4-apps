import { Router } from 'express'
import { Knex } from 'knex'
import { verifySignature } from '../utils/auth'
import { CreateUserDTO, User } from '../types'

/**
 * Message that must be signed by the user during registration
 */
const REGISTRATION_MESSAGE = 'Web4 Apps Registration'

/**
 * Creates and configures the users router
 * @param {Knex} db - The database connection instance
 * @returns {Router} Express router configured with user routes
 */
export function createUsersRouter(db: Knex): Router {
  const router = Router()

  router.get('/check/:address', async (req, res) => {
    try {
      const { address } = req.params

      if (!address || address.length !== 42) {
        return res.status(400).json({ error: 'Invalid Ethereum address format' })
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: 'Invalid Ethereum address format' })
      }

      const user = await db<User>('users').where({ address: address.toLowerCase() }).first()

      res.json({ isRegistered: !!user, address: address.toLowerCase() })
    } catch (error: unknown) {
      console.error('Error checking user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({ error: 'Internal server error', details: errorMessage })
    }
  })

  router.post('/register', async (req, res) => {
    try {
      const { address, signature }: CreateUserDTO = req.body

      if (!address || !signature) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const message = REGISTRATION_MESSAGE
      const providedMessage = req.body.message

      // If message is provided but doesn't match expected message
      if (providedMessage !== undefined && providedMessage !== message) {
        return res.status(400).json({ error: 'Invalid registration message' })
      }

      const isValidSignature = await verifySignature(message, signature, address)
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }

      const existingUser = await db<User>('users').where({ address: address.toLowerCase() }).first()

      if (existingUser) {
        return res.status(409).json({ error: 'User already registered' })
      }

      await db<User>('users').insert({ address: address.toLowerCase() })
      const user = await db<User>('users').where({ address: address.toLowerCase() }).first()

      if (!user) {
        return res.status(500).json({ error: 'Internal server error' })
      }

      res.status(201).json({ address: user.address.toLowerCase() })
    } catch (error: unknown) {
      console.error('Error registering user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({ error: 'Internal server error', details: errorMessage })
    }
  })

  return router
}
