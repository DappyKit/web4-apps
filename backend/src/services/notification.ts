/**
 * Interface for notification services
 */
export interface INotificationService {
  /**
   * Sends a notification about a newly created app
   * @param {string} title - The full title of the app
   * @param {string} description - The shortened description of the app
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendAppCreationNotification(title: string, description: string): Promise<boolean>

  /**
   * Sends a notification about a newly created template
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendTemplateCreationNotification(title: string, description: string): Promise<boolean>
}

/**
 * Telegram notification service
 */
export class TelegramNotificationService implements INotificationService {
  private botToken: string
  private chatId: string

  /**
   * Creates a new TelegramNotificationService
   * @param {string} botToken - The Telegram bot token
   * @param {string} chatId - The Telegram chat ID to send messages to
   */
  constructor(botToken: string, chatId: string) {
    this.botToken = botToken
    this.chatId = chatId
  }

  /**
   * Sends a notification about a newly created app
   * @param {string} title - The full title of the app
   * @param {string} description - The shortened description of the app
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendAppCreationNotification(title: string, description: string): Promise<boolean> {
    const message = `🆕 New App Created!\n\n📱 *${title}*\n\n${description}`
    return this.sendTelegramMessage(message)
  }

  /**
   * Sends a notification about a newly created template
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendTemplateCreationNotification(title: string, description: string): Promise<boolean> {
    const message = `🆕 New Template Created!\n\n📋 *${title}*\n\n${description}`
    return this.sendTelegramMessage(message)
  }

  /**
   * Sends a message to Telegram
   * @param {string} text - The message text
   * @returns {Promise<boolean>} - Whether the message was sent successfully
   * @private
   */
  private async sendTelegramMessage(text: string): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      })

      if (!response.ok) {
        console.error('Failed to send Telegram message:', await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      return false
    }
  }
}

/**
 * Creates a notification service based on environment configuration
 * @returns {INotificationService} The configured notification service
 */
export function createNotificationService(): INotificationService {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    return new TelegramNotificationService(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
  }

  // If no configuration is available, use a mock service that logs to console
  console.warn('Telegram notification service not configured. Using console logging instead.')
  return {
    async sendAppCreationNotification(title: string, description: string): Promise<boolean> {
      console.log(`[NOTIFICATION] New App Created: ${title} - ${description}`)
      return true
    },
    async sendTemplateCreationNotification(title: string, description: string): Promise<boolean> {
      console.log(`[NOTIFICATION] New Template Created: ${title} - ${description}`)
      return true
    },
  }
}
