/**
 * Global state manager for application-wide settings
 */
class GlobalState {
  private areSubmissionsEnabled: boolean = true

  /**
   * Sets the submissions enabled status
   * @param enabled - Whether submissions are enabled
   */
  setSubmissionsEnabled(enabled: boolean): void {
    this.areSubmissionsEnabled = enabled
  }

  /**
   * Gets the submissions enabled status
   * @returns Whether submissions are enabled
   */
  getSubmissionsEnabled(): boolean {
    return this.areSubmissionsEnabled
  }
}

// Export a singleton instance
export const globalState = new GlobalState()
