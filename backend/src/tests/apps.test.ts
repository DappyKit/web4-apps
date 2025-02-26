import request from 'supertest'
import { Knex } from 'knex'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from '../knexfile'
import express from 'express'
import { createAppsRouter } from '../routes/apps'
import { ethers } from 'ethers'

dotenv.config()

describe('Apps API', () => {
  let app: express.Application
  let db: Knex
  let testWallet: ethers.HDNodeWallet
  let otherWallet: ethers.HDNodeWallet
  let templateId: number

  beforeAll(async () => {
    // Initialize database connection once
    db = knex(knexConfig['development'])
  })

  beforeEach(async () => {
    testWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet
    otherWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet

    try {
      // Rollback and migrate
      await db.migrate.rollback()
      await db.migrate.latest()

      // Create test users
      await db('users').insert([
        {
          address: testWallet.address,
        },
        {
          address: otherWallet.address,
        },
      ])

      // Create a test template
      const [id] = await db('templates').insert({
        title: 'Test Template',
        description: 'A template for testing',
        url: 'https://example.com/template',
        json_data: JSON.stringify({ schema: { type: 'object' } }),
        owner_address: testWallet.address,
      })
      templateId = id

      // Setup express app
      app = express()
      app.use(express.json())
      app.use('/api', createAppsRouter(db))
    } catch (error) {
      console.error('Setup failed:', error)
      throw error
    }
  })

  afterEach(async () => {
    try {
      await db.migrate.rollback()
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  })

  afterAll(async () => {
    // Close database connection
    await db.destroy()
  })

  describe('GET /api/my-apps', () => {
    it('should return empty array when no apps exist', async () => {
      const response = await request(app).get('/api/my-apps').set('x-wallet-address', testWallet.address)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return only apps owned by the user', async () => {
      // Create test apps
      await db('apps').insert([
        {
          name: 'Test App 1',
          description: 'Description 1',
          owner_address: testWallet.address,
          template_id: templateId,
        },
        {
          name: 'Test App 2',
          description: 'Description 2',
          owner_address: otherWallet.address,
          template_id: templateId,
        },
      ])

      const response = await request(app).get('/api/my-apps').set('x-wallet-address', testWallet.address)

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
      const signature = await testWallet.signMessage(message)
      const jsonData = '{"key":"value"}'

      const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: name,
        description: 'Test Description',
        signature,
        template_id: templateId,
        json_data: jsonData,
      })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        name: name,
        description: 'Test Description',
        owner_address: testWallet.address.toLowerCase(),
        template_id: templateId,
        json_data: jsonData,
      })

      // Verify app was created in database
      const apps = await db('apps').where('owner_address', testWallet.address)
      expect(apps).toHaveLength(1)
      expect(apps[0]).toMatchObject({
        template_id: templateId,
        json_data: jsonData,
      })
    })

    it('should reject request without template_id', async () => {
      const name = 'Test App'
      const message = `Create app: ${name}`
      const signature = await testWallet.signMessage(message)

      const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: name,
        description: 'Test Description',
        signature,
        // Missing template_id
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Missing required fields')

      // Verify no app was created
      const apps = await db('apps').where('owner_address', testWallet.address)
      expect(apps).toHaveLength(0)
    })

    it('should reject invalid signature', async () => {
      const name = 'Test App'
      const message = `Create app: ${name}`
      const signature = await otherWallet.signMessage(message)

      const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: name,
        description: 'Test Description',
        signature,
        template_id: templateId,
      })

      expect(response.status).toBe(401)

      // Verify no app was created
      const apps = await db('apps').where('owner_address', testWallet.address)
      expect(apps).toHaveLength(0)
    })

    describe('signature validation', () => {
      it('should reject signature from different wallet', async () => {
        const name = 'Test App'
        const message = `Create app: ${name}`
        const signature = await otherWallet.signMessage(message)

        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
          name: name,
          description: 'Test Description',
          signature,
          template_id: templateId,
        })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })

      it('should reject tampered name', async () => {
        const name = 'Test App'
        const message = `Create app: Different App` // Sign for a different name
        const signature = await testWallet.signMessage(message)

        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
          name: name, // Send original name
          description: 'Test Description',
          signature,
          template_id: templateId,
        })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })

      it('should reject invalid signature format', async () => {
        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
          name: 'Test App',
          description: 'Test Description',
          signature: 'invalid_signature',
          template_id: templateId,
        })

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Invalid signature')
      })
    })

    describe('data validation', () => {
      it('should reject empty name', async () => {
        const name = ''
        const message = `Create app: ${name}`
        const signature = await testWallet.signMessage(message)

        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
          name: name,
          description: 'Test Description',
          signature,
          template_id: templateId,
        })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Name is required')
      })

      it('should reject too long name', async () => {
        const name = 'A'.repeat(256)
        const message = `Create app: ${name}`
        const signature = await testWallet.signMessage(message)

        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
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
        const signature = await testWallet.signMessage(message)

        const response = await request(app)
          .post('/api/my-apps')
          .set('x-wallet-address', testWallet.address)
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
        const response = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
          name: 'Test App',
          // Missing other required fields
        })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Missing required fields')
      })
    })
  })

  describe('DELETE /api/my-apps/:id', () => {
    it('should delete app with valid signature', async () => {
      // Create an app first
      const createMessage = 'Create app: Test App'
      const createSignature = await testWallet.signMessage(createMessage)

      const createResponse = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: 'Test App',
        description: 'Test Description',
        signature: createSignature,
        template_id: templateId,
      })

      expect(createResponse.status).toBe(201)
      const appId = createResponse.body.id

      // Now delete the app
      const deleteMessage = `Delete application #${String(appId)}`
      const deleteSignature = await testWallet.signMessage(deleteMessage)

      const deleteResponse = await request(app)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', testWallet.address)
        .send({ signature: deleteSignature })

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.message).toBe('App deleted successfully')

      // Verify app was deleted
      const apps = await db('apps').where({ id: appId }).select()
      expect(apps).toHaveLength(0)
    })

    it('should reject deletion with invalid signature', async () => {
      // Create an app first
      const createMessage = 'Create app: Test App'
      const createSignature = await testWallet.signMessage(createMessage)

      const createResponse = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: 'Test App',
        description: 'Test Description',
        signature: createSignature,
        template_id: templateId,
      })

      const appId = createResponse.body.id

      // Try to delete with wrong signature
      const wrongSignature = await otherWallet.signMessage(`Delete application #${String(appId)}`)

      const deleteResponse = await request(app)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', testWallet.address)
        .send({ signature: wrongSignature })

      expect(deleteResponse.status).toBe(401)
      expect(deleteResponse.body.error).toBe('Invalid signature')

      // Verify app was not deleted
      const apps = await db('apps').where({ id: appId }).select()
      expect(apps).toHaveLength(1)
    })

    it('should reject deletion of non-existent app', async () => {
      const nonExistentId = 99999
      const deleteMessage = `Delete application #${String(nonExistentId)}`
      const deleteSignature = await testWallet.signMessage(deleteMessage)

      const response = await request(app)
        .delete(`/api/my-apps/${String(nonExistentId)}`)
        .set('x-wallet-address', testWallet.address)
        .send({ signature: deleteSignature })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('App not found or unauthorized')
    })

    it('should reject deletion of app owned by different user', async () => {
      // Create an app with the first wallet
      const createMessage = 'Create app: Test App'
      const createSignature = await testWallet.signMessage(createMessage)

      const createResponse = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: 'Test App',
        description: 'Test Description',
        signature: createSignature,
        template_id: templateId,
      })

      const appId = createResponse.body.id

      // Try to delete with different wallet
      const deleteMessage = `Delete application #${String(appId)}`
      const deleteSignature = await otherWallet.signMessage(deleteMessage)

      const deleteResponse = await request(app)
        .delete(`/api/my-apps/${String(appId)}`)
        .set('x-wallet-address', otherWallet.address)
        .send({ signature: deleteSignature })

      expect(deleteResponse.status).toBe(404)
      expect(deleteResponse.body.error).toBe('App not found or unauthorized')

      // Verify app was not deleted
      const apps = await db('apps').where({ id: appId }).select()
      expect(apps).toHaveLength(1)
    })

    it('should reject deletion with invalid app ID format', async () => {
      const invalidId = 'not-a-number'
      const deleteMessage = `Delete application #${String(invalidId)}`
      const deleteSignature = await testWallet.signMessage(deleteMessage)

      const response = await request(app)
        .delete(`/api/my-apps/${String(invalidId)}`)
        .set('x-wallet-address', testWallet.address)
        .send({ signature: deleteSignature })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid app ID')
    })
  })

  describe('GET /api/apps/:id', () => {
    it('should return app by ID', async () => {
      // Create a test app first
      const createMessage = 'Create app: Test App'
      const createSignature = await testWallet.signMessage(createMessage)

      const createResponse = await request(app).post('/api/my-apps').set('x-wallet-address', testWallet.address).send({
        name: 'Test App',
        description: 'Test Description',
        signature: createSignature,
        template_id: templateId,
      })

      expect(createResponse.status).toBe(201)
      const appId = createResponse.body.id

      // Get the app by ID
      const response = await request(app).get(`/api/apps/${String(appId)}`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: appId,
        name: 'Test App',
        description: 'Test Description',
        owner_address: testWallet.address.toLowerCase(),
        template_id: templateId,
      })
    })

    it('should return 404 for non-existent app', async () => {
      const nonExistentId = 99999
      const response = await request(app).get(`/api/apps/${String(nonExistentId)}`)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('App not found')
    })

    it('should return 400 for invalid app ID', async () => {
      const response = await request(app).get('/api/apps/invalid-id')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid app ID')
    })
  })
})
