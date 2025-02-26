import request from 'supertest'
import express from 'express'
import { Knex } from 'knex'
import knex from 'knex'
import { createTemplatesRouter } from '../routes/templates'
import { TEMPLATE_VALIDATION } from '../types/template'
import * as dotenv from 'dotenv'
import knexConfig from '../knexfile'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

interface DbUser {
  address: string
}

interface DbTemplate {
  id: number
  title: string
  description?: string
  url: string
  json_data: string
  owner_address: string
}

dotenv.config()

describe('Templates API', () => {
  let expressApp: express.Application
  let db: Knex
  let testAccount: PrivateKeyAccount
  let otherAccount: PrivateKeyAccount
  let walletClient: ReturnType<typeof createWalletClient>
  let otherWalletClient: ReturnType<typeof createWalletClient>

  beforeAll(async () => {
    // Initialize database connection once
    db = knex(knexConfig['development'])
  })

  beforeEach(async () => {
    const testPrivateKey = generatePrivateKey()
    const otherPrivateKey = generatePrivateKey()
    testAccount = privateKeyToAccount(testPrivateKey)
    otherAccount = privateKeyToAccount(otherPrivateKey)
    
    walletClient = createWalletClient({
      account: testAccount,
      chain: mainnet,
      transport: http()
    })
    
    otherWalletClient = createWalletClient({
      account: otherAccount,
      chain: mainnet,
      transport: http()
    })

    try {
      // Rollback and migrate
      await db.migrate.rollback()
      await db.migrate.latest()

      // Create test users
      await db<DbUser>('users').insert([
        {
          address: testAccount.address,
        },
        {
          address: otherAccount.address,
        },
      ])

      // Setup express app
      expressApp = express()
      expressApp.use(express.json())
      expressApp.use('/api/templates', createTemplatesRouter(db))
    } catch (error: unknown) {
      console.error('Setup failed:', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  })

  afterEach(async () => {
    try {
      await db.migrate.rollback()
    } catch (error: unknown) {
      console.error('Cleanup failed:', error instanceof Error ? error.message : 'Unknown error')
    }
  })

  afterAll(async () => {
    // Close database connection
    await db.destroy()
  })

  describe('POST /', () => {
    const validTemplate = {
      title: 'Test Template',
      description: 'Test Description',
      url: 'https://example.com',
      json_data: JSON.stringify({ key: 'value' }),
    }

    it('should create a template with valid data', async () => {
      const message = `Create template: ${validTemplate.title}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const response = await request(expressApp)
        .post('/api/templates')
        .set('x-wallet-address', testAccount.address)
        .send({
          ...validTemplate,
          address: testAccount.address,
          signature,
        })

      expect(response.status).toBe(201)

      // Get the created template from the database
      const templates = await db<DbTemplate>('templates')
        .whereRaw('LOWER(owner_address) = ?', [testAccount.address.toLowerCase()])
        .select()
      expect(templates).toHaveLength(1)
      expect(templates[0]).toMatchObject({
        ...validTemplate,
        owner_address: expect.any(String) as string,
      })
      expect(templates[0].owner_address.toLowerCase()).toBe(testAccount.address.toLowerCase())
    }, 30000)

    it('should fail with invalid signature', async () => {
      const message = `Create template: ${validTemplate.title}`
      const signature = await otherWalletClient.signMessage({
        message,
        account: otherAccount
      })

      const response = await request(expressApp)
        .post('/api/templates')
        .set('x-wallet-address', testAccount.address)
        .send({
          ...validTemplate,
          address: testAccount.address,
          signature,
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Invalid signature')
    }, 30000)

    it('should fail with invalid URL', async () => {
      const message = `Create template: ${validTemplate.title}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const response = await request(expressApp)
        .post('/api/templates')
        .set('x-wallet-address', testAccount.address)
        .send({
          ...validTemplate,
          url: 'not-a-url',
          address: testAccount.address,
          signature,
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.INVALID_URL)
    }, 30000)

    it('should fail with invalid JSON data', async () => {
      const message = `Create template: ${validTemplate.title}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const response = await request(expressApp)
        .post('/api/templates')
        .set('x-wallet-address', testAccount.address)
        .send({
          ...validTemplate,
          json_data: 'not-json',
          address: testAccount.address,
          signature,
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.INVALID_JSON)
    }, 30000)

    it('should fail with too long JSON data', async () => {
      const message = `Create template: ${validTemplate.title}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const longData = { data: 'x'.repeat(10001) }
      const response = await request(expressApp)
        .post('/api/templates')
        .set('x-wallet-address', testAccount.address)
        .send({
          ...validTemplate,
          json_data: JSON.stringify(longData),
          address: testAccount.address,
          signature,
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.JSON_TOO_LONG)
    }, 30000)
  })

  describe('GET /my', () => {
    beforeEach(async () => {
      // Insert test templates
      await db<DbTemplate>('templates').insert([
        {
          title: 'Template 1',
          url: 'https://example.com/1',
          json_data: '{"key": "value1"}',
          owner_address: testAccount.address,
        },
        {
          title: 'Template 2',
          url: 'https://example.com/2',
          json_data: '{"key": "value2"}',
          owner_address: testAccount.address,
        },
        {
          title: 'Other Template',
          url: 'https://example.com/3',
          json_data: '{"key": "value3"}',
          owner_address: otherAccount.address,
        },
      ])
    })

    it('should return templates for the owner', async () => {
      const response = await request(expressApp)
        .get('/api/templates/my')
        .set('x-wallet-address', testAccount.address)
        .query({ address: testAccount.address })

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(2)
      const templates = response.body as DbTemplate[]
      expect(
        templates.every(template => template.owner_address.toLowerCase() === testAccount.address.toLowerCase()),
      ).toBe(true)
    }, 30000)

    it('should return empty array for address with no templates', async () => {
      const emptyPrivateKey = generatePrivateKey()
      const emptyAccount = privateKeyToAccount(emptyPrivateKey)
      const response = await request(expressApp)
        .get('/api/templates/my')
        .set('x-wallet-address', emptyAccount.address)
        .query({ address: emptyAccount.address })

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    }, 30000)

    it('should fail without address parameter', async () => {
      const response = await request(expressApp).get('/api/templates/my').set('x-wallet-address', testAccount.address)

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Address parameter is required')
    }, 30000)
  })

  describe('DELETE /:id', () => {
    let templateId: number

    beforeEach(async () => {
      // Insert a test template
      const [id] = await db<DbTemplate>('templates').insert({
        title: 'Test Template',
        url: 'https://example.com',
        json_data: '{"key": "value"}',
        owner_address: testAccount.address,
      })
      templateId = id
    })

    it('should delete template with valid signature', async () => {
      const message = `Delete template #${templateId}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const response = await request(expressApp)
        .delete(`/api/templates/${templateId}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature })

      expect(response.status).toBe(200)

      // Verify template was deleted
      const template = await db<DbTemplate>('templates').where('id', templateId).first()
      expect(template).toBeUndefined()
    }, 30000)

    it('should fail with invalid signature', async () => {
      const message = `Delete template #${templateId}`
      const signature = await otherWalletClient.signMessage({
        message,
        account: otherAccount
      })

      const response = await request(expressApp)
        .delete(`/api/templates/${templateId}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Invalid signature')

      // Verify template still exists
      const template = await db<DbTemplate>('templates').where('id', templateId).first()
      expect(template).toBeTruthy()
    }, 30000)

    it('should fail with non-existent template', async () => {
      const nonExistentId = 99999
      const message = `Delete template #${nonExistentId}`
      const signature = await walletClient.signMessage({
        message,
        account: testAccount
      })

      const response = await request(expressApp)
        .delete(`/api/templates/${nonExistentId}`)
        .set('x-wallet-address', testAccount.address)
        .send({ signature })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Template not found')
    }, 30000)

    it('should fail with unauthorized deletion', async () => {
      const message = `Delete template #${templateId}`
      const signature = await otherWalletClient.signMessage({
        message,
        account: otherAccount
      })

      const response = await request(expressApp)
        .delete(`/api/templates/${templateId}`)
        .set('x-wallet-address', otherAccount.address)
        .send({ signature })

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Not authorized to delete this template')

      // Verify template still exists
      const template = await db<DbTemplate>('templates').where('id', templateId).first()
      expect(template).toBeTruthy()
    }, 30000)
  })
})
