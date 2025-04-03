/**
 * Interface for notification services
 */
export interface INotificationService {
  /**
   * Sends a notification about a newly created app
   * @param {string} title - The full title of the app
   * @param {string} description - The shortened description of the app
   * @param {number} appId - The ID of the newly created app
   * @param {number} totalApps - The total count of apps
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendAppCreationNotification(title: string, description: string, appId: number, totalApps: number): Promise<boolean>

  /**
   * Sends a notification about a newly created template
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @param {number} templateId - The ID of the newly created template
   * @param {number} totalTemplates - The total count of templates
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendTemplateCreationNotification(
    title: string,
    description: string,
    templateId: number,
    totalTemplates: number,
  ): Promise<boolean>

  /**
   * Sends a notification about a newly registered user
   * @param {string} address - The ETH address of the registered user
   * @param {number} totalUsers - The total count of registered users
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendUserRegistrationNotification(address: string, totalUsers: number): Promise<boolean>

  /**
   * Sends a notification for user feedback
   * @param {string} feedback - The user feedback text
   * @param {string} email - Optional email for reply
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  sendFeedbackNotification(feedback: string, email?: string): Promise<boolean>
}

/**
 * Telegram notification service
 */
export class TelegramNotificationService implements INotificationService {
  private botToken: string
  private chatId: string
  private readonly MAX_FEEDBACK_LENGTH = 2000

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
   * @param {number} appId - The ID of the newly created app
   * @param {number} totalApps - The total count of apps
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendAppCreationNotification(
    title: string,
    description: string,
    appId: number,
    totalApps: number,
  ): Promise<boolean> {
    const message = `🆕 New App Created!\n\n📱 *${title}* (ID: ${appId})\n\n${description}\n\n📊 Total Apps: *${totalApps}*`
    return this.sendTelegramMessage(message)
  }

  /**
   * Sends a notification about a newly created template
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @param {number} templateId - The ID of the newly created template
   * @param {number} totalTemplates - The total count of templates
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendTemplateCreationNotification(
    title: string,
    description: string,
    templateId: number,
    totalTemplates: number,
  ): Promise<boolean> {
    const message = `🆕 New Template Created!\n\n📋 *${title}* (ID: ${templateId})\n\n${description}\n\n📊 Total Templates: *${totalTemplates}*`
    return this.sendTelegramMessage(message)
  }

  /**
   * Sends a notification about a newly registered user
   * @param {string} address - The ETH address of the registered user
   * @param {number} totalUsers - The total count of registered users
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendUserRegistrationNotification(address: string, totalUsers: number): Promise<boolean> {
    const message = `👤 New User Registered!\n\n🔑 *${address}*\n\n📊 Total Users: *${totalUsers}*`
    return this.sendTelegramMessage(message)
  }

  /**
   * Sends a notification for user feedback
   * @param {string} feedback - The user feedback text
   * @param {string} email - Optional email for reply
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendFeedbackNotification(feedback: string, email?: string): Promise<boolean> {
    // Truncate feedback if it exceeds maximum length
    const truncatedFeedback =
      feedback.length > this.MAX_FEEDBACK_LENGTH
        ? feedback.substring(0, this.MAX_FEEDBACK_LENGTH) + '... (truncated)'
        : feedback

    const message = `📝 *New Feedback [web4.build]*\n\n💬 *Feedback:* ${truncatedFeedback}\n\n📧 *Email:* ${email || 'Not provided'}\n\n⏰ *Date:* ${new Date().toISOString()}`
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
    async sendAppCreationNotification(
      title: string,
      description: string,
      appId: number,
      totalApps: number,
    ): Promise<boolean> {
      console.log(`[NOTIFICATION] New App Created: ${title} (ID: ${appId}) - ${description} - Total Apps: ${totalApps}`)
      return true
    },
    async sendTemplateCreationNotification(
      title: string,
      description: string,
      templateId: number,
      totalTemplates: number,
    ): Promise<boolean> {
      console.log(
        `[NOTIFICATION] New Template Created: ${title} (ID: ${templateId}) - ${description} - Total Templates: ${totalTemplates}`,
      )
      return true
    },
    async sendUserRegistrationNotification(address: string, totalUsers: number): Promise<boolean> {
      console.log(`[NOTIFICATION] New User Registered: ${address} - Total Users: ${totalUsers}`)
      return true
    },
    async sendFeedbackNotification(feedback: string, email?: string): Promise<boolean> {
      console.log(`[NOTIFICATION] New Feedback: ${feedback} - Email: ${email || 'Not provided'}`)
      return true
    },
  }
}
