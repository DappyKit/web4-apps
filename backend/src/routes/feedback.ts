import express from 'express'
import { Knex } from 'knex'
import { INotificationService } from '../services/notification'

interface FeedbackRequest {
  feedback: string
  email?: string
}

// Maximum allowed length for feedback
const MAX_FEEDBACK_LENGTH = 2000

/**
 * Creates a router for feedback-related endpoints
 * @param db - Database connection
 * @param notificationService - Service for sending notifications
 * @returns Express router with feedback endpoints
 */
export function createFeedbackRouter(db: Knex, notificationService: INotificationService): express.Router {
  const router = express.Router()

  /**
   * Submit user feedback
   * POST /api/feedback
   */
  router.post('/', async (req, res) => {
    try {
      const { feedback, email } = req.body as FeedbackRequest

      // Validate required fields
      if (!feedback || !feedback.trim()) {
        return res.status(400).json({
          error: 'Feedback is required',
        })
      }

      // Validate feedback length
      if (feedback.length > MAX_FEEDBACK_LENGTH) {
        return res.status(400).json({
          error: `Feedback exceeds maximum allowed length of ${MAX_FEEDBACK_LENGTH} characters`,
        })
      }

      // Send notification via Telegram
      try {
        const success = await notificationService.sendFeedbackNotification(feedback.trim(), email?.trim())

        if (!success) {
          throw new Error('Failed to send notification')
        }
      } catch (notificationError) {
        console.error('Error sending feedback notification:', notificationError)
        return res.status(500).json({
          error: 'Failed to send feedback notification',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  })

  return router
}
