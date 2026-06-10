import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export default class AuthService {
  async register(username, email, password) {
    this.validateRegistrationInputs(username, email, password);
    
    await this.ensureUserDoesNotExist(email, username);
    
    const hashedPassword = await this.hashPassword(password);
    
    return prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });
  }

  async login(email, password) {
    this.validateLoginInputs(email, password);
    
    const user = await this.findUserByEmail(email);
    await this.verifyPassword(password, user.password);
    
    return this.generateToken(user);
  }

  validateRegistrationInputs(username, email, password) {
    if (!username) throw new Error('Username is required');
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
  }

  validateLoginInputs(email, password) {
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
  }

  async ensureUserDoesNotExist(email, username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async findUserByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return user;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
  }

  generateToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    
    return jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: '24h' }
    );
  }
}
