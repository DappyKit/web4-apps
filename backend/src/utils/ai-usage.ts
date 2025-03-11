/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { v4 as uuidv4 } from 'uuid'
import { Knex } from 'knex'
import { verifySignature } from './auth'
import { User } from '../types'

/**
 * Maximum number of AI requests allowed per day for each user
 */
const MAX_AI_REQUESTS_PER_DAY = 10

/**
 * AiUsageService handles user AI usage tracking, challenges, and limits
 */
export class AiUsageService {
  private db: Knex

  /**
   * Creates a new AiUsageService
   * @param db - Knex database connection
   */
  constructor(db: Knex) {
    this.db = db
  }

  /**
   * Generates a new cryptographic challenge for the specified user
   * @param address - User's wallet address
   * @returns Promise with challenge UUID and user data
   */
  async generateChallenge(address: string): Promise<{
    challenge: string
    user: User
    remainingAttempts: number
  }> {
    // Normalize the address
    const normalizedAddress = address.toLowerCase()

    // Generate a new UUID for the challenge
    const challengeUuid = uuidv4()

    // Get the current date in UTC
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Find or create the user and update their challenge
    let user = await this.db<User>('users').where({ address: normalizedAddress }).first()

    if (!user) {
      // Handle error safely
      console.error('User not found')
      throw new Error('User not found')
    }

    // Reset counter if it's a new day
    const resetDate = user.ai_usage_reset_date ? new Date(user.ai_usage_reset_date) : null
    if (!resetDate || resetDate.getTime() < today.getTime()) {
      await this.db<User>('users').where({ address: normalizedAddress }).update({
        ai_usage_count: 0,
        ai_usage_reset_date: today,
      })
    }

    // Update the user's challenge
    await this.db<User>('users').where({ address: normalizedAddress }).update({
      ai_challenge_uuid: challengeUuid,
      ai_challenge_created_at: now,
    })

    // Get the updated user
    user = await this.db<User>('users').where({ address: normalizedAddress }).first()

    if (!user) {
      // Handle error safely
      console.error('User not found after update')
      throw new Error('User not found after update')
    }

    const remainingAttempts = MAX_AI_REQUESTS_PER_DAY - (user.ai_usage_count || 0)

    return {
      challenge: challengeUuid,
      user,
      remainingAttempts: Math.max(0, remainingAttempts),
    }
  }

  /**
   * Verifies a challenge signature and increments usage if valid
   * @param address - User's wallet address
   * @param challenge - The challenge UUID to verify
   * @param signature - The cryptographic signature of the challenge
   * @returns Promise with verification result
   */
  async verifyChallenge(
    address: string,
    challenge: string,
    signature: string,
  ): Promise<{
    success: boolean
    remainingAttempts: number
  }> {
    // Normalize the address
    const normalizedAddress = address.toLowerCase()

    // Find the user
    const user = await this.db<User>('users').where({ address: normalizedAddress }).first()

    if (!user) {
      // Handle error safely
      console.error('User not found')
      throw new Error('User not found')
    }

    // Check if the user has a valid challenge
    if (!user.ai_challenge_uuid || user.ai_challenge_uuid !== challenge) {
      return {
        success: false,
        remainingAttempts: 0,
      }
    }

    // Check if the challenge is too old (expire after 5 minutes)
    const challengeTime = user.ai_challenge_created_at ? new Date(user.ai_challenge_created_at) : null
    const now = new Date()
    if (!challengeTime || now.getTime() - challengeTime.getTime() > 5 * 60 * 1000) {
      return {
        success: false,
        remainingAttempts: 0,
      }
    }

    // Get the current date in UTC
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Reset counter if it's a new day
    const resetDate = user.ai_usage_reset_date ? new Date(user.ai_usage_reset_date) : null
    if (!resetDate || resetDate.getTime() < today.getTime()) {
      await this.db<User>('users').where({ address: normalizedAddress }).update({
        ai_usage_count: 0,
        ai_usage_reset_date: today,
      })

      // Refetch the user
      const updatedUser = await this.db<User>('users').where({ address: normalizedAddress }).first()
      if (updatedUser) {
        user.ai_usage_count = updatedUser.ai_usage_count
        user.ai_usage_reset_date = updatedUser.ai_usage_reset_date
      }
    }

    // Check if the user has exceeded their daily limit
    const usageCount = user.ai_usage_count || 0
    if (usageCount >= MAX_AI_REQUESTS_PER_DAY) {
      return {
        success: false,
        remainingAttempts: 0,
      }
    }

    // Verify the signature
    const isValid = await verifySignature(challenge, signature, normalizedAddress)

    if (!isValid) {
      return {
        success: false,
        remainingAttempts: MAX_AI_REQUESTS_PER_DAY - usageCount,
      }
    }

    // Increment the usage count
    const newUsageCount = usageCount + 1
    await this.db<User>('users').where({ address: normalizedAddress }).update({
      ai_usage_count: newUsageCount,
      ai_challenge_uuid: null, // Clear the challenge after use
      ai_challenge_created_at: null,
    })

    const remainingAttempts = MAX_AI_REQUESTS_PER_DAY - newUsageCount

    return {
      success: true,
      remainingAttempts: Math.max(0, remainingAttempts),
    }
  }

  /**
   * Gets the remaining AI requests for a user
   * @param address - User's wallet address
   * @returns Promise with remaining attempts and reset date
   */
  async getRemainingRequests(address: string): Promise<{
    remainingAttempts: number
    resetDate: Date
  }> {
    // Normalize the address
    const normalizedAddress = address.toLowerCase()

    // Find the user
    const user = await this.db<User>('users').where({ address: normalizedAddress }).first()

    if (!user) {
      // Handle error safely
      console.error('User not found')
      throw new Error('User not found')
    }

    // Get the current date in UTC
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Reset counter if it's a new day
    const resetDate = user.ai_usage_reset_date ? new Date(user.ai_usage_reset_date) : null
    if (!resetDate || resetDate.getTime() < today.getTime()) {
      await this.db<User>('users').where({ address: normalizedAddress }).update({
        ai_usage_count: 0,
        ai_usage_reset_date: today,
      })

      return {
        remainingAttempts: MAX_AI_REQUESTS_PER_DAY,
        resetDate: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)),
      }
    }

    const remainingAttempts = MAX_AI_REQUESTS_PER_DAY - (user.ai_usage_count || 0)
    const resetDate2 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))

    return {
      remainingAttempts: Math.max(0, remainingAttempts),
      resetDate: resetDate2,
    }
  }
}
