import { Router, Request, Response, RequestHandler } from 'express'
import { Knex } from 'knex'
import * as dotenv from 'dotenv'
import path from 'path'

// Type definition for telegram update
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      first_name: string
      username?: string
      type: string
    }
    date: number
    text?: string
  }
}

/**
 * Creates and configures the telegram webhook router
 * @param {Knex} db - The database connection instance
 * @returns {Router} Express router configured with telegram webhook route
 */
export function createTelegramRouter(db: Knex): Router {
  const router = Router()

  // Load environment variables
  const isDist = __dirname.includes('dist')
  const envPath = isDist ? path.resolve(__dirname, '../../../.env') : path.resolve(__dirname, '../../.env')
  dotenv.config({ path: envPath })

  // Webhook endpoint for Telegram
  router.post('/webhook', (async (req: Request, res: Response) => {
    try {
      const update = req.body as TelegramUpdate

      // Check if the message exists
      if (!update.message || !update.message.text) {
        return res.sendStatus(200) // Acknowledge the request but do nothing
      }

      const chatId = update.message.chat.id
      const message = update.message.text.trim()
      const authorizedChatId = process.env.TELEGRAM_CHAT_ID

      // Check if the chat is authorized
      if (!authorizedChatId || chatId.toString() !== authorizedChatId) {
        return res.status(200).json({
          method: 'sendMessage',
          chat_id: chatId,
          text: 'You have no access to this bot.',
        })
      }

      // Process the message
      const lowerCaseMessage = message.toLowerCase()

      // Command for making apps public (moderated = true)
      if (lowerCaseMessage.startsWith('public apps:')) {
        const idsText = message.substring('public apps:'.length).trim()
        const ids = parseIds(idsText)

        if (ids.length === 0) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'No valid app IDs provided. Format should be "public apps: 1, 2, 3" or "public apps: 1-10"',
          })
        }

        try {
          // Update apps to be moderated
          await db('apps').whereIn('id', ids).update({ moderated: true })

          // Get count of updated apps
          const updatedCount = await db('apps')
            .whereIn('id', ids)
            .where('moderated', true)
            .count({ count: 'id' })
            .first()

          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `Successfully made ${updatedCount?.count || 0} app(s) public`,
          })
        } catch (error) {
          console.error('Error updating app moderation status:', error)
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'Error updating app moderation status',
          })
        }
      }

      // Command for making templates public (moderated = true)
      if (lowerCaseMessage.startsWith('public templates:')) {
        const idsText = message.substring('public templates:'.length).trim()
        const ids = parseIds(idsText)

        if (ids.length === 0) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'No valid template IDs provided. Format should be "public templates: 1, 2, 3" or "public templates: 1-10"',
          })
        }

        try {
          // Update templates to be moderated
          await db('templates').whereIn('id', ids).update({ moderated: true })

          // Get count of updated templates
          const updatedCount = await db('templates')
            .whereIn('id', ids)
            .where('moderated', true)
            .count({ count: 'id' })
            .first()

          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `Successfully made ${updatedCount?.count || 0} template(s) public`,
          })
        } catch (error) {
          console.error('Error updating template moderation status:', error)
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'Error updating template moderation status',
          })
        }
      }

      // Command for making apps private (moderated = false)
      if (lowerCaseMessage.startsWith('private apps:')) {
        const idsText = message.substring('private apps:'.length).trim()
        const ids = parseIds(idsText)

        if (ids.length === 0) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'No valid app IDs provided. Format should be "private apps: 1, 2, 3" or "private apps: 1-10"',
          })
        }

        try {
          // Update apps to be unmoderated
          await db('apps').whereIn('id', ids).update({ moderated: false })

          // Get count of updated apps
          const updatedCount = await db('apps')
            .whereIn('id', ids)
            .where('moderated', false)
            .count({ count: 'id' })
            .first()

          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `Successfully made ${updatedCount?.count || 0} app(s) private`,
          })
        } catch (error) {
          console.error('Error updating app moderation status:', error)
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'Error updating app moderation status',
          })
        }
      }

      // Command for making templates private (moderated = false)
      if (lowerCaseMessage.startsWith('private templates:')) {
        const idsText = message.substring('private templates:'.length).trim()
        const ids = parseIds(idsText)

        if (ids.length === 0) {
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'No valid template IDs provided. Format should be "private templates: 1, 2, 3" or "private templates: 1-10"',
          })
        }

        try {
          // Update templates to be unmoderated
          await db('templates').whereIn('id', ids).update({ moderated: false })

          // Get count of updated templates
          const updatedCount = await db('templates')
            .whereIn('id', ids)
            .where('moderated', false)
            .count({ count: 'id' })
            .first()

          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `Successfully made ${updatedCount?.count || 0} template(s) private`,
          })
        } catch (error) {
          console.error('Error updating template moderation status:', error)
          return res.status(200).json({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'Error updating template moderation status',
          })
        }
      }

      // If none of the commands matched, send help message
      return res.status(200).json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          'Supported commands:\n' +
          '- "public apps: 1, 2, 3" or "public apps: 1-10" - Make specified apps public\n' +
          '- "public templates: 1, 2, 3" or "public templates: 1-10" - Make specified templates public\n' +
          '- "private apps: 1, 2, 3" or "private apps: 1-10" - Make specified apps private\n' +
          '- "private templates: 1, 2, 3" or "private templates: 1-10" - Make specified templates private',
      })
    } catch (error) {
      console.error('Error processing telegram webhook:', error)
      res.sendStatus(200) // Always respond with 200 to Telegram
    }
  }) as RequestHandler)

  return router
}

/**
 * Parse a comma-separated string of IDs into an array of numbers
 * @param {string} text - The comma-separated string of IDs, can also include ranges like "1-5"
 * @returns {number[]} Array of valid numeric IDs
 */
function parseIds(text: string): number[] {
  if (!text) return []

  // Split by commas and process each part
  return text
    .split(',')
    .flatMap(part => {
      part = part.trim()

      // Check if it's a range (contains hyphen)
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(x => x.trim())
        const start = Number(startStr)
        const end = Number(endStr)

        // Validate that both start and end are numbers
        if (isNaN(start) || isNaN(end)) {
          return []
        }

        // Validate that start is less than or equal to end
        if (start > end) {
          return []
        }

        // Generate array of numbers in the range
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
      }

      // Handle single number case
      return !isNaN(Number(part)) ? [Number(part)] : []
    })
    .filter(id => id > 0) // Ensure all IDs are positive numbers
}
