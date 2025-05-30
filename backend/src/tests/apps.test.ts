import request from 'supertest'
import { Knex } from 'knex'
import express from 'express'
import { createAppsRouter } from '../routes/apps'
import { type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'
import { TestDb } from './utils/testDb'
import { MockNotificationService } from './__mocks__/notification'
import { globalState } from '../utils/globalState'

const quizSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 3,
      maxLength: 20,
    },
    description: {
      type: 'string',
      minLength: 3,
      maxLength: 20,
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
          },
          options: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 3,
              maxLength: 20,
            },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ['text', 'options'],
      },
    },
  },
  required: ['name', 'description', 'questions'],
}

const quizData = JSON.stringify({
  name: 'Animal Quiz',
  description: 'About animals',
  questions: [
    {
      text: 'Who is barking?',
      options: ['dog', 'cat', 'mouse', 'rabbit'],
    },
    {
      text: 'Who is jumping?',
      options: ['rabbit', 'elephant', 'rhino', 'hippo'],
    },
  ],
})

describe('Apps API', () => {
  let expressApp: express.Application
  let testDb: TestDb
  let db: Knex
  let testAccount: PrivateKeyAccount
  let otherAccount: PrivateKeyAccount
  let walletClient: ReturnType<typeof createWalletClient>
  let otherWalletClient: ReturnType<typeof createWalletClient>
  let templateId: number

  beforeAll(async () => {
    // Initialize test database and accounts
    testDb = new TestDb()
    const accounts = testDb.initTestAccounts()
    testAccount = accounts.testAccount
    otherAccount = accounts.otherAccount
    walletClient = accounts.walletClient
    otherWalletClient = accounts.otherWalletClient
    db = testDb.getDb()
  })

  beforeEach(async () => {
    try {
      // Apply migrations before each test (creates users automatically)
      await testDb.setupTestDb()

      // Create a test template
      const [id] = await db('templates').insert({
        title: 'Test Template',
        description: 'A template for testing',
        url: 'https://example.com/template',
        json_data: quizSchema,
        owner_address: testAccount.address,
      })
      templateId = id

      // Setup express app
      expressApp = express()
      expressApp.use(express.json())
      expressApp.use('/api', createAppsRouter(testDb.getDb(), new MockNotificationService()))
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

  describe('GET /api/my-apps', () => {
    it('should return empty array when no apps exist', async () => {
      const response = await request(expressApp).get('/api/my-apps').set('x-wallet-address', testAccount.address)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return only apps owned by the user', async () => {
      // Create test apps
      await db('apps').insert([
        {
          name: 'Test App 1',
          description: 'Description 1',
          owner_address: testAccount.address,
          template_id: templateId,
        },
        {
          name: 'Test App 2',
          description: 'Description 2',
          owner_address: otherAccount.address,
          template_id: templateId,
        },
      ])

      const response = await request(expressApp).get('/api/my-apps').set('x-wallet-address', testAccount.address)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].name).toBe('Test App 1')
      expect(response.body[0].template_id).toBe(templateId)
    })
  })

  describe('POST /api/my-apps', () => {
    it('should create new app with valid signature', async () => {
      const name = 'Test App'
      const message = `Create app: ${name}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount,
      })

      const response = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: name,
          description: 'Test Description',
          signature,
          template_id: templateId,
          json_data: quizData,
        })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        name: name,
        description: 'Test Description',
        owner_address: testAccount.address.toLowerCase(),
        template_id: templateId,
        json_data: quizData,
      })

      // Verify app was created in database
      const apps = await db('apps').where('owner_address', testAccount.address)
      expect(apps).toHaveLength(1)
      expect(apps[0]).toMatchObject({
        template_id: templateId,
        json_data: quizData,
      })
    })

    it('should reject request without template_id', async () => {
      const name = 'Test App'
      const message = `Create app: ${name}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount,
      })

      const response = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: name,
          description: 'Test Description',
          signature,
          // Missing template_id
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Missing required fields')

      // Verify no app was created
      const apps = await db('apps').where('owner_address', testAccount.address)
      expect(apps).toHaveLength(0)
    })

    it('should reject invalid signature', async () => {
      const name = 'Test App'
      const message = `Create app: ${name}`
      const signature = await otherWalletClient.signMessage({
        message,
        account: otherAccount,
      })

      const response = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: name,
          description: 'Test Description',
          signature,
          template_id: templateId,
          json_data: quizData,
        })

      expect(response.status).toBe(401)

      // Verify no app was created
      const apps = await db('apps').where('owner_address', testAccount.address)
      expect(apps).toHaveLength(0)
    })

    describe('signature validation', () => {
      it('should reject signature from different wallet', async () => {
        const name = 'Test App'
        const message = `Create app: ${name}`
        const signature = await otherWalletClient.signMessage({
          message,
          account: otherAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name,
            description: 'Test Description',
            signature,
            template_id: templateId,
            json_data: quizData,
          })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })

      it('should reject tampered name', async () => {
        const name = 'Test App'
        const message = `Create app: Different App` // Sign for a different name
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name, // Send original name
            description: 'Test Description',
            signature,
            template_id: templateId,
            json_data: quizData,
          })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })

      it('should reject invalid signature format', async () => {
        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: 'Test App',
            description: 'Test Description',
            signature: 'invalid_signature',
            template_id: templateId,
            json_data: quizData,
          })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })
    })

    describe('data validation', () => {
      it('should reject empty name', async () => {
        const name = ''
        const message = `Create app: ${name}`
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name,
            description: 'Test Description',
            signature,
            template_id: templateId,
            json_data: quizData,
          })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Name is required')
      })

      it('should reject too long name', async () => {
        const name = 'A'.repeat(256)
        const message = `Create app: ${name}`
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name,
            description: 'Test Description',
            signature,
            template_id: templateId,
          })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Name must be less than 255 characters')
      })

      it('should reject too long description', async () => {
        const name = 'Test App'
        const message = `Create app: ${name}`
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name,
            description: 'A'.repeat(1001),
            signature,
            template_id: templateId,
          })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Description must be less than 1000 characters')
      })

      it('should reject missing required fields', async () => {
        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: 'Test App',
            // Missing other required fields
          })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Missing required fields')
      })

      it('should reject app creation when submissions are disabled', async () => {
        // Disable submissions
        globalState.setSubmissionsEnabled(false)

        const name = 'Test App'
        const message = `Create app: ${name}`
        const signature = await walletClient.signMessage({
          message,
          account: testAccount,
        })

        const response = await request(expressApp)
          .post('/api/my-apps')
          .set('x-wallet-address', testAccount.address)
          .send({
            name: name,
            description: 'Test Description',
            signature,
            template_id: templateId,
            json_data: quizData,
          })

        expect(response.status).toBe(403)
        expect(response.body.error).toBe(
          'Submissions are currently disabled. Thank you for your participation in the hackathon!',
        )

        // Verify no app was created
        const apps = await db('apps').where('owner_address', testAccount.address)
        expect(apps).toHaveLength(0)

        // Re-enable submissions for other tests
        globalState.setSubmissionsEnabled(true)
      })
    })
  })

  describe('DELETE /api/my-apps/:id', () => {
    it('should delete app with valid signature', async () => {
      // Create an app first
      const createMessage = 'Create app: Test App'
      const createSignature = await walletClient.signMessage({
        message: createMessage,
        account: testAccount,
      })

      const createAppResponse = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          signature: createSignature,
          template_id: templateId,
          json_data: quizData,
        })

      const appId = (createAppResponse.body as { id: number }).id

      // Now delete the app
      const deleteMessage = `Delete application #${String(appId)}`
      const deleteSignature = await walletClient.signMessage({
        message: deleteMessage,
        account: testAccount,
      })

      const deleteResponse = await request(expressApp)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature: deleteSignature })

      expect(deleteResponse.status).toBe(200)

      // Verify app was deleted
      const appRecord = await db('apps').where('id', appId).first()
      expect(appRecord).toBeUndefined()
    })

    it('should reject invalid signature', async () => {
      // Create an app first
      const createMessage = 'Create app: Test App'
      const createSignature = await walletClient.signMessage({
        message: createMessage,
        account: testAccount,
      })

      const createAppResponse = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          signature: createSignature,
          template_id: templateId,
          json_data: quizData,
        })

      const appId = (createAppResponse.body as { id: number }).id

      // Try to delete with wrong signature
      const wrongSignature = await otherWalletClient.signMessage({
        message: `Delete application #${String(appId)}`,
        account: otherAccount,
      })

      const deleteResponse = await request(expressApp)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature: wrongSignature })

      expect(deleteResponse.status).toBe(401)
      expect(deleteResponse.body.error).toBe('Invalid signature')

      // Verify app still exists
      const appRecord = await db('apps').where('id', appId).first()
      expect(appRecord).toBeTruthy()
    })

    it('should reject non-existent app id', async () => {
      const nonExistentId = 99999
      const deleteMessage = `Delete application #${String(nonExistentId)}`
      const deleteSignature = await walletClient.signMessage({
        message: deleteMessage,
        account: testAccount,
      })

      const response = await request(expressApp)
        .delete(`/api/my-apps/${String(nonExistentId)}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature: deleteSignature })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('App not found')
    })

    it('should reject unauthorized deletion', async () => {
      // Create an app with the first wallet
      const createMessage = 'Create app: Test App'
      const createSignature = await walletClient.signMessage({
        message: createMessage,
        account: testAccount,
      })

      const createResponse = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          signature: createSignature,
          template_id: templateId,
          json_data: quizData,
        })

      const appId = (createResponse.body as { id: number }).id

      // Try to delete with different wallet
      const deleteMessage = `Delete application #${String(appId)}`
      const deleteSignature = await otherWalletClient.signMessage({
        message: deleteMessage,
        account: otherAccount,
      })

      const deleteResponse = await request(expressApp)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', otherAccount.address)
        .send({ signature: deleteSignature })

      expect(deleteResponse.status).toBe(403)
      expect(deleteResponse.body.error).toBe('Not authorized to delete this app')

      // Verify app still exists
      const app = await db('apps').where('id', appId).first()
      expect(app).toBeTruthy()
    })

    it('should reject invalid app id format', async () => {
      const invalidId = 'not-a-number'
      const deleteMessage = `Delete application #${String(invalidId)}`
      const deleteSignature = await walletClient.signMessage({
        message: deleteMessage,
        account: testAccount,
      })

      const response = await request(expressApp)
        .delete(`/api/my-apps/${String(invalidId)}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature: deleteSignature })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid app ID')
    })
  })

  describe('GET /api/apps/:id', () => {
    it('should return app by ID', async () => {
      // Create a test app first
      const createMessage = 'Create app: Test App'
      const createSignature = await walletClient.signMessage({
        message: createMessage,
        account: testAccount,
      })

      const createResponse = await request(expressApp)
        .post('/api/my-apps')
        .set('x-wallet-address', testAccount.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          signature: createSignature,
          template_id: templateId,
          json_data: quizData,
        })

      const appId = (createResponse.body as { id: number }).id

      // Get the app by ID
      const response = await request(expressApp).get(`/api/apps/${String(appId)}`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        name: 'Test App',
        description: 'Test Description',
        owner_address: testAccount.address.toLowerCase(),
        template_id: templateId,
      })
    })

    it('should return 404 for non-existent app', async () => {
      const nonExistentId = 99999
      const response = await request(expressApp).get(`/api/apps/${String(nonExistentId)}`)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('App not found')
    })

    it('should return 400 for invalid app ID', async () => {
      const response = await request(expressApp).get('/api/apps/invalid-id')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid app ID')
    })

    it('should handle errors gracefully', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Use the TestDb utility to create a mock database that throws errors
      const mockDb = testDb.createMockDbWithError('simple')

      // Create app with the mocked db
      const errorApp = express()
      errorApp.use(express.json())
      errorApp.use('/api', createAppsRouter(mockDb, new MockNotificationService()))

      const response = await request(errorApp).get('/api/apps/1')
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })

  describe('GET /api/apps', () => {
    it('should return paginated moderated apps', async () => {
      // Create several test apps, some moderated, some not
      await db('apps').insert([
        {
          name: 'Moderated App 1',
          description: 'Moderated 1',
          owner_address: testAccount.address,
          template_id: templateId,
          moderated: true,
        },
        {
          name: 'Moderated App 2',
          description: 'Moderated 2',
          owner_address: testAccount.address,
          template_id: templateId,
          moderated: true,
        },
        {
          name: 'Non-moderated App',
          description: 'Not moderated',
          owner_address: testAccount.address,
          template_id: templateId,
          moderated: false,
        },
      ])

      const response = await request(expressApp).get('/api/apps?page=1&limit=10')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(2) // Only the moderated apps
      expect(response.body.pagination).toMatchObject({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      })

      // Verify only moderated apps are returned
      interface AppData {
        name: string
      }

      interface AppResponse {
        data: AppData[]
      }

      const responseBody = response.body as AppResponse
      const appNames = responseBody.data.map(app => app.name)
      expect(appNames).toContain('Moderated App 1')
      expect(appNames).toContain('Moderated App 2')
      expect(appNames).not.toContain('Non-moderated App')
    })

    it('should respect pagination parameters', async () => {
      // Create several test apps
      const appsToCreate = []
      for (let i = 1; i <= 15; i++) {
        appsToCreate.push({
          name: `Moderated App ${String(i)}`,
          description: `Description ${String(i)}`,
          owner_address: testAccount.address,
          template_id: templateId,
          moderated: true,
        })
      }
      await db('apps').insert(appsToCreate)

      // Test first page
      const firstPageResponse = await request(expressApp).get('/api/apps?page=1&limit=5')
      expect(firstPageResponse.status).toBe(200)
      expect(firstPageResponse.body.data).toHaveLength(5)
      expect(firstPageResponse.body.pagination).toMatchObject({
        total: 15,
        page: 1,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      })

      // Test second page
      const secondPageResponse = await request(expressApp).get('/api/apps?page=2&limit=5')
      expect(secondPageResponse.status).toBe(200)
      expect(secondPageResponse.body.data).toHaveLength(5)
      expect(secondPageResponse.body.pagination).toMatchObject({
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      })

      // Test last page
      const lastPageResponse = await request(expressApp).get('/api/apps?page=3&limit=5')
      expect(lastPageResponse.status).toBe(200)
      expect(lastPageResponse.body.data).toHaveLength(5)
      expect(lastPageResponse.body.pagination).toMatchObject({
        total: 15,
        page: 3,
        limit: 5,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      })
    })

    it('should return 400 for invalid page parameter', async () => {
      const invalidPageResponse = await request(expressApp).get('/api/apps?page=invalid')
      expect(invalidPageResponse.status).toBe(400)
      expect(invalidPageResponse.body.error).toBe('Invalid page parameter')
    })

    it('should return 400 for invalid limit parameter', async () => {
      // Test too low limit
      const tooLowLimitResponse = await request(expressApp).get('/api/apps?limit=0')
      expect(tooLowLimitResponse.status).toBe(400)
      expect(tooLowLimitResponse.body.error).toBe('Invalid limit parameter. Must be between 1 and 50')

      // Test too high limit
      const tooHighLimitResponse = await request(expressApp).get('/api/apps?limit=100')
      expect(tooHighLimitResponse.status).toBe(400)
      expect(tooHighLimitResponse.body.error).toBe('Invalid limit parameter. Must be between 1 and 50')

      // Test invalid limit
      const invalidLimitResponse = await request(expressApp).get('/api/apps?limit=invalid')
      expect(invalidLimitResponse.status).toBe(400)
      expect(invalidLimitResponse.body.error).toBe('Invalid limit parameter. Must be between 1 and 50')
    })

    it('should handle errors gracefully', async () => {
      // Silence console.error during this test
      console.error = jest.fn()

      // Use the TestDb utility to create a mock database that throws errors
      const mockDb = testDb.createMockDbWithError('complex')

      // Create app with the mocked db
      const errorApp = express()
      errorApp.use(express.json())
      errorApp.use('/api', createAppsRouter(mockDb, new MockNotificationService()))

      const response = await request(errorApp).get('/api/apps')
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})
