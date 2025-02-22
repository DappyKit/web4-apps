import { ethers } from 'ethers';
import { Request, Response, NextFunction } from 'express';

// Define AuthRequest type
type AuthRequest = Request & {
  address: string;
};

export function verifySignature(message: string, signature: string, address: string): boolean {
  try {
    const signerAddr = ethers.verifyMessage(message, signature);
    return signerAddr.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const walletAddress = req.headers['x-wallet-address'];
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(401).json({ error: 'Unauthorized - Wallet address required' });
  }
  (req as AuthRequest).address = walletAddress;
  next();
} 