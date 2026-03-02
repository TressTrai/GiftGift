import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../jwt';

export interface AuthRequest extends Request {
  userId: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = header.slice(7);
    const { userId } = verifyToken(token);
    (req as AuthRequest).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
