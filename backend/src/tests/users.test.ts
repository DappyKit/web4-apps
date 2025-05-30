import request from 'supertest'
import { Knex } from 'knex'
import express from 'express'
import { createUsersRouter } from '../routes/users'
import { type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import { TestDb } from './utils/testDb'
import { MockNotificationService } from './__mocks__/notification'

describe('Users API', () => {
  let app: express.Application
  let testDb: TestDb
  let db: Knex
  let testAccount: PrivateKeyAccount
  let walletClient: ReturnType<typeof createWalletClient>
  let mockNotificationService: MockNotificationService

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

      mockNotificationService = new MockNotificationService()
      app = express()
      app.use(express.json())
      app.use('/api', createUsersRouter(testDb.getDb(), mockNotificationService))
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

      // Verify notification was sent
      const notifications = mockNotificationService.getNotificationsSent()
      expect(notifications.length).toBe(1)
      expect(notifications[0].type).toBe('user')
      expect(notifications[0].address).toBe(testAccount.address.toLowerCase())
      expect(notifications[0].totalUsers).toBe(1)
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
      mockApp.use('/api', createUsersRouter(mockDb, mockNotificationService))

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
      mockApp.use('/api', createUsersRouter(mockDb, mockNotificationService))

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
      mockApp.use('/api', createUsersRouter(mockDb, mockNotificationService))

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
      mockApp.use('/api', createUsersRouter(mockDb, mockNotificationService))

      const response = await request(mockApp).get(`/api/check/${testAccount.address}`)

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })

  describe('GET /api/with-app-counts', () => {
    it('should return users with app counts', async () => {
      // Create a test user
      const address = '0x1234567890123456789012345678901234567890'
      await db('users').insert({ address })

      // Create a test template first
      const [templateId] = await db('templates').insert({
        title: 'Test Template',
        url: 'https://example.com',
        json_data: '{}',
        owner_address: address,
      })

      // Create some test apps for the user (must be moderated to be counted)
      await db('apps').insert([
        { name: 'Test App 1', owner_address: address, template_id: templateId, moderated: true },
        { name: 'Test App 2', owner_address: address, template_id: templateId, moderated: true },
      ])

      const response = await request(app).get('/api/with-app-counts')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('users')
      expect(Array.isArray(response.body.users)).toBe(true)

      // Type the response body properly
      interface UserResponse {
        trimmed_address: string
        app_count: string
      }

      // Check the response
      const responseBody = response.body.users as UserResponse[]
      expect(Array.isArray(responseBody)).toBe(true)

      // Find our test user in the response by their trimmed address
      const expectedTrimmedAddress = `${address.substring(0, 7)}...${address.substring(address.length - 5)}`
      const testUser = responseBody.find(user => user.trimmed_address === expectedTrimmedAddress)
      expect(testUser).toBeDefined()
      expect(Number(testUser?.app_count)).toBe(2) // Count is returned as string from the database
    })

    it('should only count moderated apps, not non-moderated apps', async () => {
      // Create test users
      const address1 = '0x1234567890123456789012345678901234567890'
      const address2 = '0x2345678901234567890123456789012345678901'
      await db('users').insert([{ address: address1 }, { address: address2 }])

      // Create a test template
      const [templateId] = await db('templates').insert({
        title: 'Test Template',
        url: 'https://example.com',
        json_data: '{}',
        owner_address: address1,
      })

      // User 1: 2 moderated apps, 1 non-moderated app
      await db('apps').insert([
        { name: 'Moderated App 1', owner_address: address1, template_id: templateId, moderated: true },
        { name: 'Moderated App 2', owner_address: address1, template_id: templateId, moderated: true },
        { name: 'Non-moderated App', owner_address: address1, template_id: templateId, moderated: false },
      ])

      // User 2: Only non-moderated apps (should not appear in results)
      await db('apps').insert([
        { name: 'Non-moderated App 3', owner_address: address2, template_id: templateId, moderated: false },
        { name: 'Non-moderated App 4', owner_address: address2, template_id: templateId, moderated: false },
      ])

      const response = await request(app).get('/api/with-app-counts')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('users')

      // Type the response body properly
      interface UserResponse {
        trimmed_address: string
        app_count: string
      }

      const responseBody = response.body.users as UserResponse[]

      // User 1 should appear with count of 2 (only moderated apps)
      const expectedTrimmedAddress1 = `${address1.substring(0, 7)}...${address1.substring(address1.length - 5)}`
      const testUser1 = responseBody.find(user => user.trimmed_address === expectedTrimmedAddress1)
      expect(testUser1).toBeDefined()
      expect(Number(testUser1?.app_count)).toBe(2) // Only moderated apps counted

      // User 2 should NOT appear because they have no moderated apps
      const expectedTrimmedAddress2 = `${address2.substring(0, 7)}...${address2.substring(address2.length - 5)}`
      const testUser2 = responseBody.find(user => user.trimmed_address === expectedTrimmedAddress2)
      expect(testUser2).toBeUndefined()
    })

    it('should handle database errors gracefully', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Create a mock database that throws an error
      const mockDb = testDb.createMockDbWithError('simple')

      const mockApp = express()
      mockApp.use(express.json())
      mockApp.use('/api', createUsersRouter(mockDb, mockNotificationService))

      const response = await request(mockApp).get('/api/with-app-counts')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})
