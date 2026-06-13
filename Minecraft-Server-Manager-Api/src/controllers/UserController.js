import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

export default class UserController {
  updateProfile = async (req, res) => {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      if (!username || username.trim() === '') {
        return res.status(400).json({ error: 'Username is required' });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { username: username.trim() }
      });

      // Regenerate token to include new username
      const secret = process.env.JWT_SECRET;
      const accessToken = jwt.sign(
        { id: updatedUser.id, username: updatedUser.username },
        secret,
        { expiresIn: '15m' }
      );

      return res.status(200).json({ 
        token: accessToken,
        user: { 
          id: updatedUser.id, 
          username: updatedUser.username, 
          email: updatedUser.email 
        } 
      });
    } catch (error) {
      console.error('[User Error]:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
