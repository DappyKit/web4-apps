import request from 'supertest';
import { Knex } from 'knex';
import knex from 'knex';
import * as dotenv from 'dotenv';
import knexConfig from '../knexfile';
import express from 'express';
import { createUsersRouter } from '../routes/users';
import { ethers } from 'ethers';

dotenv.config();

describe('Users API', () => {
  let app: express.Application;
  let db: Knex;
  let testWallet: ethers.HDNodeWallet;
  
  beforeAll(async () => {
    db = knex(knexConfig['development']);
  });

  beforeEach(async () => {
    testWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
    
    try {
      await db.migrate.rollback();
      await db.migrate.latest();
      
      app = express();
      app.use(express.json());
      app.use('/api', createUsersRouter(db));
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });
  
  afterEach(async () => {
    try {
      await db.migrate.rollback();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });
  
  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/register', () => {
    const REGISTRATION_MESSAGE = "Web4 Apps Registration";

    it('should register new user with valid signature', async () => {
      const signature = await testWallet.signMessage(REGISTRATION_MESSAGE);
      
      const response = await request(app)
        .post('/api/register')
        .send({
          address: testWallet.address,
          message: REGISTRATION_MESSAGE,
          signature
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        address: testWallet.address
      });

      // Verify user was created
      const user = await db('users')
        .where('address', testWallet.address)
        .first();
      expect(user).toBeTruthy();
    });

    it('should prevent duplicate registration', async () => {
      const signature = await testWallet.signMessage(REGISTRATION_MESSAGE);
      
      // Register first time
      await request(app)
        .post('/api/register')
        .send({
          address: testWallet.address,
          message: REGISTRATION_MESSAGE,
          signature
        });

      // Try to register again
      const response = await request(app)
        .post('/api/register')
        .send({
          address: testWallet.address,
          message: REGISTRATION_MESSAGE,
          signature
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('User already registered');
    });

    describe('validation', () => {
      it('should reject invalid message', async () => {
        const signature = await testWallet.signMessage('Wrong message');
        
        const response = await request(app)
          .post('/api/register')
          .send({
            address: testWallet.address,
            message: 'Wrong message',
            signature
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid registration message');
      });

      it('should reject missing fields', async () => {
        const response = await request(app)
          .post('/api/register')
          .send({
            address: testWallet.address
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing required fields');
      });

      it('should reject invalid signature', async () => {
        const response = await request(app)
          .post('/api/register')
          .send({
            address: testWallet.address,
            message: REGISTRATION_MESSAGE,
            signature: 'invalid_signature'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid signature');
      });
    });
  });
}); 