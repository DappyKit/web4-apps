import request from 'supertest';
import express from 'express';
import { Knex } from 'knex';
import knex from 'knex';
import { createTemplatesRouter } from '../routes/templates';
import { TEMPLATE_VALIDATION } from '../types/template';
import * as dotenv from 'dotenv';
import knexConfig from '../knexfile';
import { ethers } from 'ethers';

dotenv.config();

describe('Templates API', () => {
  let app: express.Application;
  let db: Knex;
  let testWallet: ethers.HDNodeWallet;
  let otherWallet: ethers.HDNodeWallet;

  beforeAll(async () => {
    // Initialize database connection once
    db = knex(knexConfig['development']);
  });

  beforeEach(async () => {
    testWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
    otherWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;

    try {
      // Rollback and migrate
      await db.migrate.rollback();
      await db.migrate.latest();

      // Create test users
      await db('users').insert([
        {
          address: testWallet.address
        },
        {
          address: otherWallet.address
        }
      ]);

      // Setup express app
      app = express();
      app.use(express.json());
      app.use('/api/templates', createTemplatesRouter(db));
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
    // Close database connection
    await db.destroy();
  });

  describe('POST /', () => {
    const validTemplate = {
      title: 'Test Template',
      description: 'Test Description',
      url: 'https://example.com',
      json_data: JSON.stringify({ key: 'value' }),
    };

    it('should create a template with valid data', async () => {
      const message = `Create template: ${validTemplate.title}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .post('/api/templates')
        .set('x-wallet-address', testWallet.address)
        .send({
          ...validTemplate,
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(201);
      
      // Get the created template from the database
      const templates = await db('templates')
        .whereRaw('LOWER(owner_address) = ?', [testWallet.address.toLowerCase()])
        .select();
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        ...validTemplate,
        owner_address: expect.any(String)
      });
      expect(templates[0].owner_address.toLowerCase()).toBe(testWallet.address.toLowerCase());
    }, 30000);

    it('should fail with invalid signature', async () => {
      const message = `Create template: ${validTemplate.title}`;
      const signature = await otherWallet.signMessage(message);

      const response = await request(app)
        .post('/api/templates')
        .set('x-wallet-address', testWallet.address)
        .send({
          ...validTemplate,
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    }, 30000);

    it('should fail with invalid URL', async () => {
      const message = `Create template: ${validTemplate.title}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .post('/api/templates')
        .set('x-wallet-address', testWallet.address)
        .send({
          ...validTemplate,
          url: 'not-a-url',
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.INVALID_URL);
    }, 30000);

    it('should fail with invalid JSON data', async () => {
      const message = `Create template: ${validTemplate.title}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .post('/api/templates')
        .set('x-wallet-address', testWallet.address)
        .send({
          ...validTemplate,
          json_data: 'not-json',
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.INVALID_JSON);
    }, 30000);

    it('should fail with too long JSON data', async () => {
      const message = `Create template: ${validTemplate.title}`;
      const signature = await testWallet.signMessage(message);

      const longData = { data: 'x'.repeat(10001) };
      const response = await request(app)
        .post('/api/templates')
        .set('x-wallet-address', testWallet.address)
        .send({
          ...validTemplate,
          json_data: JSON.stringify(longData),
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(TEMPLATE_VALIDATION.JSON_TOO_LONG);
    }, 30000);
  });

  describe('GET /my', () => {
    beforeEach(async () => {
      // Insert test templates
      await db('templates').insert([
        {
          title: 'Template 1',
          url: 'https://example.com/1',
          json_data: '{"key": "value1"}',
          owner_address: testWallet.address,
        },
        {
          title: 'Template 2',
          url: 'https://example.com/2',
          json_data: '{"key": "value2"}',
          owner_address: testWallet.address,
        },
        {
          title: 'Other Template',
          url: 'https://example.com/3',
          json_data: '{"key": "value3"}',
          owner_address: otherWallet.address,
        },
      ]);
    });

    it('should return templates for the owner', async () => {
      const response = await request(app)
        .get('/api/templates/my')
        .set('x-wallet-address', testWallet.address)
        .query({ address: testWallet.address });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body.every((t: any) => 
        t.owner_address.toLowerCase() === testWallet.address.toLowerCase()
      )).toBe(true);
    }, 30000);

    it('should return empty array for address with no templates', async () => {
      const emptyWallet = ethers.Wallet.createRandom() as ethers.HDNodeWallet;
      const response = await request(app)
        .get('/api/templates/my')
        .set('x-wallet-address', emptyWallet.address)
        .query({ address: emptyWallet.address });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    }, 30000);

    it('should fail without address parameter', async () => {
      const response = await request(app)
        .get('/api/templates/my')
        .set('x-wallet-address', testWallet.address);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Address parameter is required');
    }, 30000);
  });

  describe('DELETE /:id', () => {
    let templateId: number;

    beforeEach(async () => {
      // Insert a test template
      await db('templates')
        .insert({
          title: 'Test Template',
          url: 'https://example.com',
          json_data: '{"key": "value"}',
          owner_address: testWallet.address,
        });

      // Get the inserted template ID
      const template = await db('templates')
        .where({
          owner_address: testWallet.address,
          title: 'Test Template'
        })
        .first();
      templateId = template.id;
    });

    it('should delete template with valid signature', async () => {
      const message = `Delete template #${templateId}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('x-wallet-address', testWallet.address)
        .send({
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(204);

      // Verify template was deleted
      const deletedTemplate = await db('templates').where({ id: templateId }).first();
      expect(deletedTemplate).toBeUndefined();
    }, 30000);

    it('should fail with invalid signature', async () => {
      const message = `Delete template #${templateId}`;
      const signature = await otherWallet.signMessage(message);

      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('x-wallet-address', testWallet.address)
        .send({
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    }, 30000);

    it('should fail when deleting non-existent template', async () => {
      const nonExistentId = 99999;
      const message = `Delete template #${nonExistentId}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .delete(`/api/templates/${nonExistentId}`)
        .set('x-wallet-address', testWallet.address)
        .send({
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Template not found');
    }, 30000);

    it('should fail when deleting template owned by another user', async () => {
      // Create template owned by different address
      await db('templates')
        .insert({
          title: 'Test Template',
          description: 'Test Description',
          url: 'https://example.com',
          json_data: JSON.stringify({ key: 'value' }),
          owner_address: otherWallet.address,
        });

      // Get the inserted template ID
      const otherTemplate = await db('templates')
        .where({
          owner_address: otherWallet.address,
          title: 'Test Template'
        })
        .first();

      const message = `Delete template #${otherTemplate.id}`;
      const signature = await testWallet.signMessage(message);

      const response = await request(app)
        .delete(`/api/templates/${otherTemplate.id}`)
        .set('x-wallet-address', testWallet.address)
        .send({
          address: testWallet.address,
          signature,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to delete this template');
    }, 30000);
  });
});
