import { Router } from 'express'
import { Knex } from 'knex'
import { verifySignature } from '../utils/auth'
import { CreateUserDTO, User } from '../types'
import { INotificationService } from '../services/notification'

/**
 * Message that must be signed by the user during registration
 */
const REGISTRATION_MESSAGE = 'Web4 Apps Registration'

/**
 * Addresses to exclude from top creators listing
 */
const EXCLUDED_ADDRESSES = ['0x980F5aC0Fe183479B87f78E7892f8002fB9D5401']

/**
 * Creates and configures the users router
 * @param {Knex} db - The database connection instance
 * @param {INotificationService} notificationService - The notification service to use
 * @returns {Router} Express router configured with user routes
 */
export function createUsersRouter(db: Knex, notificationService: INotificationService): Router {
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
        win_1_amount?: string
      }>

      const lowercasedExcludedAddresses = EXCLUDED_ADDRESSES.map(addr => addr.toLowerCase())

      let query = db('users')
        .select('users.address', 'users.win_1_amount')
        .count('apps.id as app_count')
        .join('apps', 'users.address', 'apps.owner_address')
        .groupBy('users.address', 'users.win_1_amount')
        .having(db.raw('count(apps.id) >= 1'))
        .orderBy('users.win_1_amount', 'desc')
        .orderBy('app_count', 'desc')
        .limit(100)

      // Add an exclusion for each address
      lowercasedExcludedAddresses.forEach(address => {
        query = query.whereRaw('LOWER(users.address) != ?', [address])
      })

      const usersWithAppCounts = await query

      // Check if the requested user exists in the data
      let userRecord = null
      let userRank = -1

      if (userAddress) {
        // Get all users with app counts to find user's rank even if not in top 100
        let rankQuery = db('users')
          .select('users.address', 'users.win_1_amount')
          .count('apps.id as app_count')
          .join('apps', 'users.address', 'apps.owner_address')
          .groupBy('users.address', 'users.win_1_amount')
          .having(db.raw('count(apps.id) >= 1'))
          .orderBy('users.win_1_amount', 'desc')
          .orderBy('app_count', 'desc')

        // Add an exclusion for each address
        lowercasedExcludedAddresses.forEach(address => {
          rankQuery = rankQuery.whereRaw('LOWER(users.address) != ?', [address])
        })

        const allUsersWithAppCounts = await rankQuery

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
            win_1_amount: userData.win_1_amount,
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
          trimmed_address: trimmedAddress,
          app_count: user.app_count,
          is_user: isUser,
          win_1_amount: user.win_1_amount,
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

  router.get('/winners', async (req, res) => {
    try {
      // Get all winners (users with win_1_amount)
      const winners = await db('users')
        .select('users.address', 'users.win_1_amount')
        .count('apps.id as app_count')
        .join('apps', 'users.address', 'apps.owner_address')
        .whereNotNull('users.win_1_amount')
        .where('users.win_1_amount', '>', '0') // Only get users with positive win amount
        .groupBy('users.address', 'users.win_1_amount')
        .orderBy('users.win_1_amount', 'desc')
        .limit(300)

      // Format the response
      const formattedWinners = winners.map(user => ({
        address: user.address,
        app_count: Number(user.app_count),
        win_1_amount: user.win_1_amount,
      }))

      res.json({
        winners: formattedWinners,
      })
    } catch (error) {
      console.error('Error fetching winners:', error)
      res.status(500).json({ error: 'Failed to fetch winners' })
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

      // Get total users count
      const [totalUsersResult] = await db('users').count({ count: '*' })
      const totalUsers = Number(totalUsersResult.count || 0)

      // Send notification about new user registration
      try {
        await notificationService.sendUserRegistrationNotification(user.address.toLowerCase(), totalUsers)
      } catch (error) {
        console.error('Failed to send user registration notification:', error)
        // Non-critical error, don't fail the request
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
