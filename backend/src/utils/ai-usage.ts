/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { v4 as uuidv4 } from 'uuid'
import { Knex } from 'knex'
import { verifySignature } from './auth'
import { User } from '../types'

/**
 * Maximum number of AI requests allowed per day per user
 */
const MAX_AI_REQUESTS_PER_DAY = 10

/**
 * Extended User interface with AI-related fields
 */
interface UserWithAi extends User {
  ai_usage_count?: number
  ai_usage_reset_date?: Date | string | null
  ai_challenge_uuid?: string | null
  ai_challenge_created_at?: Date | string | null
}

/**
 * Service for managing AI usage limits
 */
export class AiUsageService {
  private db: Knex

  /**
   * Creates a new AiUsageService instance
   * @param db - Knex database instance
   */
  constructor(db: Knex) {
    this.db = db
  }

  /**
   * Generates a challenge for AI usage verification
   * @param address - User's wallet address
   * @returns The generated challenge UUID
   */
  async generateChallenge(address: string): Promise<string> {
    // Get user from database
    const user = await this.db<UserWithAi>('users').where({ address }).first()

    if (!user) {
      throw new Error('User not found')
    }

    // Generate a new challenge
    const challenge = uuidv4()
    const now = new Date()

    // Update user with new challenge
    await this.db('users').where({ address }).update({
      ai_challenge_uuid: challenge,
      ai_challenge_created_at: now,
    })

    return challenge
  }

  /**
   * Verifies a challenge signature and increments usage if valid
   * @param address - User's wallet address
   * @param challenge - Challenge UUID to verify
   * @param signature - Signature to verify
   * @returns Object with success status and remaining attempts
   */
  async verifyChallenge(
    address: string,
    challenge: string,
    signature: string,
  ): Promise<{ success: boolean; remaining_attempts: number; max_attempts: number }> {
    // Get user from database
    const user = await this.db<UserWithAi>('users').where({ address }).first()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if challenge exists and is valid
    if (!user.ai_challenge_uuid || user.ai_challenge_uuid !== challenge) {
      return {
        success: false,
        remaining_attempts: 0,
        max_attempts: MAX_AI_REQUESTS_PER_DAY,
      }
    }

    // Verify signature
    const isValid = verifySignature(challenge, signature, address)

    if (!isValid) {
      return {
        success: false,
        remaining_attempts: this.calculateRemainingAttempts(user),
        max_attempts: MAX_AI_REQUESTS_PER_DAY,
      }
    }

    // Check if user has reached daily limit
    const now = new Date()
    let resetDate: Date | null = null

    if (user.ai_usage_reset_date) {
      resetDate = new Date(user.ai_usage_reset_date)
    }

    const usageCount = user.ai_usage_count || 0

    // If reset date has passed, reset usage count
    const shouldResetUsage = resetDate !== null && resetDate < now

    // Calculate new usage count and reset date
    const newUsageCount = shouldResetUsage ? 1 : usageCount + 1

    // Determine if we need a new reset date
    let newResetDate: Date | null = resetDate

    // Create a new reset date if needed
    if (shouldResetUsage) {
      // Reset date has passed, create a new one
      newResetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    } else if (resetDate === null) {
      // No reset date exists, create one
      newResetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
    }

    // Check if user has reached daily limit
    if (!shouldResetUsage && usageCount >= MAX_AI_REQUESTS_PER_DAY) {
      return {
        success: false,
        remaining_attempts: 0,
        max_attempts: MAX_AI_REQUESTS_PER_DAY,
      }
    }

    // Update user with new usage count and reset date
    await this.db('users').where({ address }).update({
      ai_usage_count: newUsageCount,
      ai_usage_reset_date: newResetDate,
      ai_challenge_uuid: null,
      ai_challenge_created_at: null,
    })

    // Calculate remaining attempts
    const remainingAttempts = MAX_AI_REQUESTS_PER_DAY - newUsageCount

    return {
      success: true,
      remaining_attempts: remainingAttempts,
      max_attempts: MAX_AI_REQUESTS_PER_DAY,
    }
  }

  /**
   * Gets the remaining AI requests for a user
   * @param address - User's wallet address
   * @returns Object with remaining attempts and max attempts
   */
  async getRemainingRequests(address: string): Promise<{ remaining_attempts: number; max_attempts: number }> {
    // Get user from database
    const user = await this.db<UserWithAi>('users').where({ address }).first()

    if (!user) {
      throw new Error('User not found')
    }

    // Calculate remaining attempts
    const remainingAttempts = this.calculateRemainingAttempts(user)

    return {
      remaining_attempts: remainingAttempts,
      max_attempts: MAX_AI_REQUESTS_PER_DAY,
    }
  }

  /**
   * Calculates the remaining attempts for a user
   * @param user - User object with AI usage data
   * @returns Number of remaining attempts
   */
  private calculateRemainingAttempts(user: UserWithAi): number {
    const now = new Date()
    let resetDate: Date | null = null

    if (user.ai_usage_reset_date) {
      resetDate = new Date(user.ai_usage_reset_date)
    }

    const usageCount = user.ai_usage_count || 0

    // If reset date has passed, user has max attempts
    if (resetDate !== null && resetDate < now) {
      return MAX_AI_REQUESTS_PER_DAY
    }

    // Calculate remaining attempts
    const remainingAttempts = MAX_AI_REQUESTS_PER_DAY - usageCount

    return Math.max(0, remainingAttempts)
  }
}
