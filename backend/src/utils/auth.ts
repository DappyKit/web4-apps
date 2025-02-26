import { verifyMessage } from 'viem'
import { Request, Response, NextFunction } from 'express'

/**
 * Extended Request type that includes the authenticated wallet address
 */
type AuthRequest = Request & {
  address: string
}

/**
 * Verifies an Ethereum signature against a message and address
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature to verify
 * @param {string} address - The Ethereum address that supposedly signed the message
 * @returns {Promise<boolean>} True if the signature is valid, false otherwise
 */
export async function verifySignature(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const recoveredAddress = await verifyMessage({
      message,
      signature: signature as `0x${string}`,
      address: address as `0x${string}`
    })
    return recoveredAddress
  } catch {
    return false
  }
}

/**
 * Express middleware to require authentication via wallet address
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Response | undefined} Returns error response or undefined if successful
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): Response | undefined {
  const walletAddress = req.headers['x-wallet-address']
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(401).json({ error: 'Unauthorized - Wallet address required' })
  }
  ;(req as AuthRequest).address = walletAddress
  next()
}
