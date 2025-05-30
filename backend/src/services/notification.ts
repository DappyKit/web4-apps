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
  private chatIds: number[]
  private readonly MAX_FEEDBACK_LENGTH = 2000

  /**
   * Creates a new TelegramNotificationService
   * @param {string} botToken - The Telegram bot token
   * @param {number[]} chatIds - Array of Telegram chat IDs to send messages to
   */
  constructor(botToken: string, chatIds: number[]) {
    this.botToken = botToken
    this.chatIds = chatIds
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
    return this.sendTelegramMessageToAll(message)
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
    return this.sendTelegramMessageToAll(message)
  }

  /**
   * Sends a notification for new user registration
   * @param {string} address - The wallet address of the new user
   * @param {number} totalUsers - Total number of registered users
   * @returns {Promise<boolean>} - Whether the notification was sent successfully
   */
  async sendUserRegistrationNotification(address: string, totalUsers: number): Promise<boolean> {
    const message = `👤 *New User Registered!*\n\n💰 *Address:* ${address}\n\n📊 *Total Users:* ${totalUsers}`
    return this.sendTelegramMessageToAll(message)
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
    return this.sendTelegramMessageToAll(message)
  }

  /**
   * Sends a message to all configured Telegram chat IDs
   * @param {string} text - The message text
   * @returns {Promise<boolean>} - Whether all messages were sent successfully
   * @private
   */
  private async sendTelegramMessageToAll(text: string): Promise<boolean> {
    const results = await Promise.allSettled(this.chatIds.map(chatId => this.sendTelegramMessage(text, chatId)))

    // Return true if at least one message was sent successfully
    return results.some(result => result.status === 'fulfilled' && result.value)
  }

  /**
   * Sends a message to a specific Telegram chat
   * @param {string} text - The message text
   * @param {number} chatId - The chat ID to send the message to
   * @returns {Promise<boolean>} - Whether the message was sent successfully
   * @private
   */
  private async sendTelegramMessage(text: string, chatId: number): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      })

      if (!response.ok) {
        console.error(`Failed to send Telegram message to chat ${chatId}:`, await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error(`Error sending Telegram message to chat ${chatId}:`, error)
      return false
    }
  }
}

/**
 * Parses the TELEGRAM_CHAT_ID environment variable to support multiple chat IDs
 * @param {string | undefined} chatIdEnv - The TELEGRAM_CHAT_ID environment variable
 * @returns {number[]} Array of chat IDs
 */
function parseChatIds(chatIdEnv: string | undefined): number[] {
  if (!chatIdEnv) {
    return []
  }

  return chatIdEnv
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .map(id => Number(id))
    .filter(id => !isNaN(id))
}

/**
 * Creates a notification service based on environment configuration
 * @returns {INotificationService} The configured notification service
 */
export function createNotificationService(): INotificationService {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const chatIds = parseChatIds(TELEGRAM_CHAT_ID)
    if (chatIds.length > 0) {
      return new TelegramNotificationService(TELEGRAM_BOT_TOKEN, chatIds)
    }
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
