import request from 'supertest'
import { Knex } from 'knex'
import knex from 'knex'
import * as dotenv from 'dotenv'
import knexConfig from '../knexfile'
import express from 'express'
import { createUsersRouter } from '../routes/users'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

dotenv.config()

describe('Users API', () => {
  let app: express.Application
  let db: Knex
  let testAccount: PrivateKeyAccount
  let walletClient: ReturnType<typeof createWalletClient>

  beforeAll(async () => {
    db = knex(knexConfig['development'])
  })

  beforeEach(async () => {
    const privateKey = generatePrivateKey()
    testAccount = privateKeyToAccount(privateKey)
    walletClient = createWalletClient({
      account: testAccount,
      chain: mainnet,
      transport: http(),
    })

    try {
      await db.migrate.rollback()
      await db.migrate.latest()

      app = express()
      app.use(express.json())
      app.use('/api', createUsersRouter(db))
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
    await db.destroy()
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
  })
})
