/**
 * Mock notification service for testing
 */
import { INotificationService } from '../../services/notification'

export class MockNotificationService implements INotificationService {
  private notificationsSent: Array<{ type: string; title: string; description: string }> = []

  /**
   * Sends a notification about a newly created app (mock implementation)
   * @param {string} title - The full title of the app
   * @param {string} description - The shortened description of the app
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendAppCreationNotification(title: string, description: string): Promise<boolean> {
    this.notificationsSent.push({ type: 'app', title, description })
    return true
  }

  /**
   * Sends a notification about a newly created template (mock implementation)
   * @param {string} title - The full title of the template
   * @param {string} description - The shortened description of the template
   * @returns {Promise<boolean>} - Always returns true
   */
  async sendTemplateCreationNotification(title: string, description: string): Promise<boolean> {
    this.notificationsSent.push({ type: 'template', title, description })
    return true
  }

  /**
   * Gets all notifications sent (for testing)
   * @returns {Array<{ type: string; title: string; description: string }>} - The notifications sent
   */
  getNotificationsSent(): Array<{ type: string; title: string; description: string }> {
    return [...this.notificationsSent]
  }

  /**
   * Clears all notifications sent (for testing)
   */
  clearNotifications(): void {
    this.notificationsSent = []
  }
}
