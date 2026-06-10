import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/prisma.js';
import AuthService from '../src/services/AuthService.js';

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('../src/config/prisma.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    }
  }
}));

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('validateRegistrationInputs throws if missing fields', () => {
    expect(() => authService.validateRegistrationInputs('', 'a@b.com', '123456')).toThrow('Username is required');
    expect(() => authService.validateRegistrationInputs('user', '', '123456')).toThrow('Email is required');
    expect(() => authService.validateRegistrationInputs('user', 'a@b.com', '123')).toThrow('Password must be at least 6 characters');
  });

  test('register creates a new user and hashes password', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed_pw');
    prisma.user.create.mockResolvedValue({ id: '1', username: 'test' });

    const result = await authService.register('test', 'test@test.com', 'password123');

    expect(prisma.user.findFirst).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'test',
        email: 'test@test.com',
        password: 'hashed_pw'
      }
    });
    expect(result.id).toBe('1');
  });

  test('register throws if user exists', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: '1' });
    
    await expect(authService.register('test', 'test@test.com', 'password123')).rejects.toThrow('User with this email or username already exists');
  });

  test('login generates token for valid credentials', async () => {
    const mockUser = { id: '1', username: 'test', password: 'hashed_pw' };
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mocked_token');

    const token = await authService.login('test@test.com', 'password123');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_pw');
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: mockUser.id, username: mockUser.username },
      'test-secret',
      { expiresIn: '24h' }
    );
    expect(token).toBe('mocked_token');
  });

  test('login throws for invalid email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.login('wrong@test.com', 'password123')).rejects.toThrow('Invalid credentials');
  });

  test('login throws for invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({ password: 'hashed_pw' });
    bcrypt.compare.mockResolvedValue(false);
    await expect(authService.login('test@test.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
  });
});
