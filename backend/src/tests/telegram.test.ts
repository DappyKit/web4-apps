import request from 'supertest'
import express from 'express'
import { Knex } from 'knex'
import { createTelegramRouter } from '../routes/telegram'

// Mock environment variables
process.env.TELEGRAM_CHAT_ID = '123456789'

/* eslint-disable @typescript-eslint/unbound-method */
describe('Telegram Webhook', () => {
  let app: express.Express
  let mockDb: jest.Mock
  let mockQueryBuilder: Knex.QueryBuilder

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      whereIn: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue([1]),
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ count: 1 }),
    } as unknown as Knex.QueryBuilder

    // Create mock database function
    mockDb = jest.fn().mockImplementation(() => {
      return mockQueryBuilder
    })

    // Create express app with telegram router
    app = express()
    app.use(express.json())
    app.use('/', createTelegramRouter(mockDb as unknown as Knex))
  })

  describe('POST /webhook', () => {
    it('should reject messages from unauthorized chat', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 987654321, // Different from TELEGRAM_CHAT_ID
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'public apps: 1, 2, 3',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 987654321,
        text: 'You have no access to this bot.',
      })
      expect(mockDb).not.toHaveBeenCalled()
    })

    it('should process public apps command correctly', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789, // Same as TELEGRAM_CHAT_ID
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'public apps: 1, 2, 3',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: 'Successfully made 1 app(s) public',
      })

      expect(mockDb).toHaveBeenCalledWith('apps')
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('id', [1, 2, 3])
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ moderated: true })
    })

    it('should process public templates command correctly', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789,
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'public templates: 4, 5, 6',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: 'Successfully made 1 template(s) public',
      })

      expect(mockDb).toHaveBeenCalledWith('templates')
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('id', [4, 5, 6])
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ moderated: true })
    })

    it('should process private apps command correctly', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789,
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'private apps: 1, 2, 3',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: 'Successfully made 1 app(s) private',
      })

      expect(mockDb).toHaveBeenCalledWith('apps')
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('id', [1, 2, 3])
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ moderated: false })
    })

    it('should process private templates command correctly', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789,
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'private templates: 4, 5, 6',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: 'Successfully made 1 template(s) private',
      })

      expect(mockDb).toHaveBeenCalledWith('templates')
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('id', [4, 5, 6])
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ moderated: false })
    })

    it('should handle unknown commands and return help message', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789,
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'hello bot',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: expect.stringContaining('Supported commands:'),
      })
      expect(mockDb).not.toHaveBeenCalled()
    })

    it('should handle empty command arguments', async () => {
      const response = await request(app)
        .post('/webhook')
        .send({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              is_bot: false,
              first_name: 'Test',
            },
            chat: {
              id: 123456789,
              first_name: 'Test',
              type: 'private',
            },
            date: 1631234567,
            text: 'public apps:',
          },
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        method: 'sendMessage',
        chat_id: 123456789,
        text: expect.stringContaining('No valid app IDs provided'),
      })
      expect(mockDb).not.toHaveBeenCalled()
    })
  })
})
/* eslint-enable @typescript-eslint/unbound-method */
