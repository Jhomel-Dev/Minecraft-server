import prisma from '../../../core/database/prisma.client.js';
import jwt from 'jsonwebtoken';

export default class UserService {
  async updateUsername(userId, username) {
    this.validateUsername(username);
    await this.ensureUsernameIsAvailable(userId, username);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: username.trim() }
    });

    const accessToken = this.generateNewAccessToken(updatedUser);
    
    return { accessToken, updatedUser };
  }

  validateUsername(username) {
    if (!username || username.trim() === '') {
      throw new Error('Username is required');
    }
  }

  async ensureUsernameIsAvailable(userId, username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        id: { not: userId }
      }
    });

    if (existingUser) {
      throw new Error('Username already taken');
    }
  }

  generateNewAccessToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    return jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: '15m' }
    );
  }
}
