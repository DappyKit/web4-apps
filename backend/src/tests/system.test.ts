import request from 'supertest'
import express from 'express'
import { createSystemRouter } from '../routes/system'
import { globalState } from '../utils/globalState'

describe('System API', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/', createSystemRouter())

    // Reset global state to default
    globalState.setSubmissionsEnabled(true)
  })

  describe('GET /submissions-status', () => {
    it('should return submissions enabled status', async () => {
      globalState.setSubmissionsEnabled(true)

      const response = await request(app).get('/submissions-status')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        areSubmissionsEnabled: true,
        message: 'Submissions are currently enabled',
      })
    })

    it('should return submissions disabled status', async () => {
      globalState.setSubmissionsEnabled(false)

      const response = await request(app).get('/submissions-status')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        areSubmissionsEnabled: false,
        message: 'Submissions are currently disabled',
      })
    })
  })
})
