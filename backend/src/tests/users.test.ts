import request from 'supertest'
import { Knex } from 'knex'
import express from 'express'
import { createUsersRouter } from '../routes/users'
import { type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import { TestDb } from './utils/testDb'

describe('Users API', () => {
  let app: express.Application
  let testDb: TestDb
  let db: Knex
  let testAccount: PrivateKeyAccount
  let walletClient: ReturnType<typeof createWalletClient>

  beforeAll(async () => {
    // Initialize test database and accounts
    testDb = new TestDb()
    const accounts = testDb.initTestAccounts()
    testAccount = accounts.testAccount
    walletClient = accounts.walletClient
    db = testDb.getDb()
  })

  beforeEach(async () => {
    try {
      // Apply migrations before each test (creates users automatically)
      await testDb.setupTestDb(false) // Don't create users automatically for user tests

      app = express()
      app.use(express.json())
      app.use('/api', createUsersRouter(testDb.getDb()))
    } catch (error) {
      console.error('Setup failed:', error)
      throw error
    }
  })

  afterEach(async () => {
    // Rollback migrations after each test
    await testDb.teardownTestDb()
  })

  afterAll(async () => {
    // Close database connection
    await testDb.closeConnection()
  })

  // Silence expected console errors during error tests
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Store the original console.error
    originalConsoleError = console.error
  })

  afterEach(() => {
    // Restore the original console.error
    console.error = originalConsoleError
  })

  describe('POST /api/register', () => {
    const REGISTRATION_MESSAGE = 'Web4 Apps Registration'

    it('should register new user with valid signature', async () => {
      const signature = await walletClient.signMessage({
        message: REGISTRATION_MESSAGE,
        account: testAccount,
      })

      const response = await request(app).post('/api/register').send({
        address: testAccount.address,
        message: REGISTRATION_MESSAGE,
        signature,
      })

      expect(response.status).toBe(201)
      expect(response.body.address).toBe(testAccount.address.toLowerCase())

      // Verify user was created
      const user = await db('users').where('address', testAccount.address.toLowerCase()).first()
      expect(user).toBeTruthy()
    })

    it('should prevent duplicate registration', async () => {
      const signature = await walletClient.signMessage({
        message: REGISTRATION_MESSAGE,
        account: testAccount,
      })

      // Register first time
      await request(app).post('/api/register').send({
        address: testAccount.address,
        message: REGISTRATION_MESSAGE,
        signature,
      })

      // Try to register again
      const response = await request(app).post('/api/register').send({
        address: testAccount.address,
        message: REGISTRATION_MESSAGE,
        signature,
      })

      expect(response.status).toBe(409)
      expect(response.body.error).toBe('User already registered')
    })

    describe('validation', () => {
      it('should reject invalid message', async () => {
        const signature = await walletClient.signMessage({
          message: 'Wrong message',
          account: testAccount,
        })

        const response = await request(app).post('/api/register').send({
          address: testAccount.address,
          message: 'Wrong message',
          signature,
        })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Invalid registration message')
      })

      it('should reject missing fields', async () => {
        const response = await request(app).post('/api/register').send({
          address: testAccount.address,
        })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Missing required fields')
      })

      it('should reject invalid signature', async () => {
        const message = 'Wrong message'
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(app).post('/api/register').send({
          address: testAccount.address,
          signature,
        })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })
    })

    it('should handle database errors during user check', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Create a mock database that throws an error
      const mockDb = testDb.createMockDbWithError('simple')

      const mockApp = express()
      mockApp.use(express.json())
      mockApp.use('/api', createUsersRouter(mockDb))

      const response = await request(mockApp).get(`/api/check/${testAccount.address}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })

    it('should handle database errors during user insertion', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Create a mock where the first where returns a user doesn't exist but insert throws an error
      const mockDb = testDb.createMockDbWithError('nested')

      const message = 'Web4 Apps Registration'
      const signature = await walletClient.signMessage({
        message,
        account: testAccount,
      })

      const mockApp = express()
      mockApp.use(express.json())
      mockApp.use('/api', createUsersRouter(mockDb))

      const response = await request(mockApp).post('/api/register').send({
        address: testAccount.address,
        message,
        signature,
      })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })

    it('should handle database errors after user insertion', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Create a custom mock for this specific case
      const mockDb = {
        ...db,
      } as Knex

      // First where call returns null (user doesn't exist)
      let whereCallCount = 0
      mockDb.where = jest.fn().mockImplementation(() => {
        whereCallCount++
        if (whereCallCount === 1) {
          return {
            first: jest.fn().mockResolvedValue(null),
          }
        } else {
          // Second where call (after insert) throws error
          throw new Error('Database error fetching user after insert')
        }
      })

      // Mock insert to succeed
      mockDb.insert = jest.fn().mockResolvedValue([1])

      const message = 'Web4 Apps Registration'
      const signature = await walletClient.signMessage({
        message,
        account: testAccount,
      })

      const mockApp = express()
      mockApp.use(express.json())
      mockApp.use('/api', createUsersRouter(mockDb))

      const response = await request(mockApp).post('/api/register').send({
        address: testAccount.address,
        message,
        signature,
      })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })

  describe('GET /api/check/:address', () => {
    it('should return true for registered user', async () => {
      // Register a user first
      const message = 'Web4 Apps Registration'
      const signature = await walletClient.signMessage({
        message,
        account: testAccount,
      })

      await request(app).post('/api/register').send({
        address: testAccount.address,
        message,
        signature,
      })

      // Check registration status
      const response = await request(app).get(`/api/check/${testAccount.address}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        isRegistered: true,
        address: testAccount.address.toLowerCase(),
      })
    })

    it('should return false for unregistered user', async () => {
      const response = await request(app).get(`/api/check/${testAccount.address}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        isRegistered: false,
        address: testAccount.address.toLowerCase(),
      })
    })

    it('should reject invalid address format', async () => {
      const response = await request(app).get('/api/check/invalid-address')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid Ethereum address format')
    })

    it('should handle empty address', async () => {
      const response = await request(app).get('/api/check/')

      expect(response.status).toBe(404)
    })

    it('should handle database errors gracefully', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Create a mock database that throws an error
      const mockDb = testDb.createMockDbWithError('simple')

      const mockApp = express()
      mockApp.use(express.json())
      mockApp.use('/api', createUsersRouter(mockDb))

      const response = await request(mockApp).get(`/api/check/${testAccount.address}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})
