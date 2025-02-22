import request from 'supertest';
import { Knex } from 'knex';
import knex from 'knex';
import * as dotenv from 'dotenv';
import knexConfig from '../knexfile';
import express from 'express';
import { createAppsRouter } from '../routes/apps';
import { ethers } from 'ethers';

dotenv.config();

describe('Apps API', () => {
  let app: express.Application;
  let db: Knex;
  let testWallet: ethers.HDNodeWallet;
  let otherWallet: ethers.HDNodeWallet;
  
  beforeEach(async () => {
    // Setup fresh database
    db = knex(knexConfig['development']);
    testWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
    otherWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
    
    try {
      // Rollback and migrate
      await db.migrate.rollback();
      await db.migrate.latest();
      
      // Create test users
      await db('users').insert([
        {
          address: testWallet.address,
          username: 'test_user'
        },
        {
          address: otherWallet.address,
          username: 'other_user'
        }
      ]);
      
      // Setup express app
      app = express();
      app.use(express.json());
      app.use('/api', createAppsRouter(db));
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

  describe('GET /api/my-apps', () => {
    it('should return empty array when no apps exist', async () => {
      const response = await request(app)
        .get('/api/my-apps')
        .set('x-wallet-address', testWallet.address);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return only apps owned by the user', async () => {
      // Create test apps
      await db('apps').insert([
        {
          name: 'Test App 1',
          description: 'Description 1',
          owner_address: testWallet.address
        },
        {
          name: 'Test App 2',
          description: 'Description 2',
          owner_address: otherWallet.address
        }
      ]);

      const response = await request(app)
        .get('/api/my-apps')
        .set('x-wallet-address', testWallet.address);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Test App 1');
    });
  });

  describe('POST /api/my-apps', () => {
    it('should create new app with valid signature', async () => {
      const message = 'Create app: Test App';
      const signature = await testWallet.signMessage(message);
      
      const response = await request(app)
        .post('/api/my-apps')
        .set('x-wallet-address', testWallet.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          message,
          signature
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Test App',
        description: 'Test Description',
        owner_address: testWallet.address
      });

      // Verify app was created in database
      const apps = await db('apps')
        .where('owner_address', testWallet.address);
      expect(apps).toHaveLength(1);
    });

    it('should reject invalid signature', async () => {
      const message = 'Create app: Test App';
      const signature = await otherWallet.signMessage(message);
      
      const response = await request(app)
        .post('/api/my-apps')
        .set('x-wallet-address', testWallet.address)
        .send({
          name: 'Test App',
          description: 'Test Description',
          message,
          signature
        });

      expect(response.status).toBe(401);
      
      // Verify no app was created
      const apps = await db('apps')
        .where('owner_address', testWallet.address);
      expect(apps).toHaveLength(0);
    });
  });
}); 