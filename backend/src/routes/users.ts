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

  /**
   * Get users with app counts (limited to users with at least one app)
   * Returns maximum 100 users sorted by app count in descending order
   */
  router.get('/with-app-counts', async (req, res) => {
    try {
      // Get the optional user address from query parameter
      const userAddress = req.query.address as string | undefined

      // Define the expected result type
      type RawQueryResult = Array<{
        address: string
        app_count: string | number
      }>

      const usersWithAppCounts = await db('users')
        .select('users.address')
        .count('apps.id as app_count')
        .join('apps', 'users.address', 'apps.owner_address')
        .groupBy('users.address')
        .having(db.raw('count(apps.id) >= 1'))
        .orderBy('app_count', 'desc')
        .limit(100)

      // Check if the requested user exists in the data
      let userRecord = null
      let userRank = -1

      if (userAddress) {
        // Get all users with app counts to find user's rank even if not in top 100
        const allUsersWithAppCounts = await db('users')
          .select('users.address')
          .count('apps.id as app_count')
          .join('apps', 'users.address', 'apps.owner_address')
          .groupBy('users.address')
          .having(db.raw('count(apps.id) >= 1'))
          .orderBy('app_count', 'desc')

        // Find user's record and rank
        const userIndex = (allUsersWithAppCounts as RawQueryResult).findIndex(
          user => user.address.toLowerCase() === userAddress.toLowerCase(),
        )

        if (userIndex >= 0) {
          const userData = (allUsersWithAppCounts as RawQueryResult)[userIndex]
          userRank = userIndex + 1

          const userAddress = userData.address as string
          const trimmedAddress =
            userAddress.length > 12
              ? `${userAddress.substring(0, 7)}...${userAddress.substring(userAddress.length - 5)}`
              : userAddress

          userRecord = {
            trimmed_address: trimmedAddress,
            app_count: userData.app_count,
            is_user: true,
            rank: userRank,
          }
        }
      }

      // Format addresses to show only first 7 and last 5 characters
      const formattedUsers = (usersWithAppCounts as RawQueryResult).map(user => {
        const address = user.address as string
        const trimmedAddress =
          address.length > 12 ? `${address.substring(0, 7)}...${address.substring(address.length - 5)}` : address

        // Check if this is the user's record
        const isUser = userAddress && address.toLowerCase() === userAddress.toLowerCase()

        return {
          // Don't include the full address in the response
          trimmed_address: trimmedAddress,
          app_count: user.app_count,
          is_user: isUser,
        }
      })

      // Return data with user information if available
      const response = {
        users: formattedUsers,
        user_record: userRecord,
      }

      res.json(response)
    } catch (error: unknown) {
      console.error('Error fetching users with app counts:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({ error: 'Internal server error', details: errorMessage })
    }
  })

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
