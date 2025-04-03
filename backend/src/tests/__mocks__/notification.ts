/**
 * Mock notification service for testing
 */
import { INotificationService } from '../../services/notification'

export class MockNotificationService implements INotificationService {
  private notificationsSent: Array<{
    type: string
    title?: string
    description?: string
    appId?: number
    templateId?: number
    totalApps?: number
    totalTemplates?: number
    address?: string
    totalUsers?: number
    feedback?: string
    email?: string
  }> = []

  /**
   * Sends a notification about a newly created app (mock implementation)
   * @param {string} title - The full title of the app
   * @param {string} description - The shortened description of the app
   * @param {number} appId - The ID of the newly created app
   * @param {number} totalApps - The total count of apps
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendAppCreationNotification(
    title: string,
    description: string,
    appId: number,
    totalApps: number,
  ): Promise<boolean> {
    this.notificationsSent.push({ type: 'app', title, description, appId, totalApps })
    return true
  }

  /**
   * Sends a notification about a newly created template (mock implementation)
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @param {number} templateId - The ID of the newly created template
   * @param {number} totalTemplates - The total count of templates
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendTemplateCreationNotification(
    title: string,
    description: string,
    templateId: number,
    totalTemplates: number,
  ): Promise<boolean> {
    this.notificationsSent.push({ type: 'template', title, description, templateId, totalTemplates })
    return true
  }

  /**
   * Sends a notification about a newly registered user (mock implementation)
   * @param {string} address - The ETH address of the registered user
   * @param {number} totalUsers - The total count of registered users
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendUserRegistrationNotification(address: string, totalUsers: number): Promise<boolean> {
    this.notificationsSent.push({ type: 'user', address, totalUsers })
    return true
  }

  /**
   * Sends a notification for user feedback (mock implementation)
   * @param {string} feedback - The user feedback text
   * @param {string} email - Optional email for reply
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendFeedbackNotification(feedback: string, email?: string): Promise<boolean> {
    this.notificationsSent.push({ type: 'feedback', feedback, email })
    return true
  }

  /**
   * Gets all notifications sent (for testing)
   * @returns {Array<{
   *   type: string
   *   title?: string
   *   description?: string
   *   appId?: number
   *   templateId?: number
   *   totalApps?: number
   *   totalTemplates?: number
   *   address?: string
   *   totalUsers?: number
   *   feedback?: string
   *   email?: string
   * }>} The notifications sent
   */
  getNotificationsSent(): Array<{
    type: string
    title?: string
    description?: string
    appId?: number
    templateId?: number
    totalApps?: number
    totalTemplates?: number
    address?: string
    totalUsers?: number
    feedback?: string
    email?: string
  }> {
    return [...this.notificationsSent]
  }

  /**
   * Clears all notifications sent (for testing)
   */
  clearNotifications(): void {
    this.notificationsSent = []
  }
}
