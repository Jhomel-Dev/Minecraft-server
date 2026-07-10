import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../core/database/prisma.client.js';
import { OAuth2Client } from 'google-auth-library';

export default class AuthService {
  async register(username, email, password) {
    this.validateRegistrationInputs(username, email, password);
    await this.ensureUserDoesNotExist(email, username);
    
    const hashedPassword = await this.hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword }
    });
    
    return this.generateTokens(user);
  }

  async login(email, password) {
    this.validateLoginInputs(email, password);
    
    const user = await this.findUserByEmail(email);
    await this.verifyPassword(password, user.password);
    
    return this.generateTokens(user);
  }

  async googleLogin(credential, isAccessToken = false) {
    if (!credential) throw new Error('Credential is required');
    
    const { email, name, googleId } = await this.fetchGoogleUserInfo(credential, isAccessToken);
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      user = await this.linkGoogleIdIfMissing(user, email, googleId);
      return this.generateTokens(user);
    }
    
    user = await this.registerGoogleUser(name, email, googleId);
    return this.generateTokens(user);
  }

  async fetchGoogleUserInfo(credential, isAccessToken) {
    if (isAccessToken) return this.fetchUserInfoFromApi(credential);
    return this.verifyGoogleIdToken(credential);
  }

  async fetchUserInfoFromApi(accessToken) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!res.ok) throw new Error("Invalid Google Access Token");
    
    const payload = await res.json();
    return { email: payload.email, name: payload.name, googleId: payload.sub };
  }

  async verifyGoogleIdToken(idToken) {
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    return { email: payload.email, name: payload.name, googleId: payload.sub };
  }

  async linkGoogleIdIfMissing(user, email, googleId) {
    if (user.googleId) return user;
    
    return prisma.user.update({
      where: { email },
      data: { googleId }
    });
  }

  async registerGoogleUser(name, email, googleId) {
    let username = name.replace(/\s+/g, '').toLowerCase();
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    
    if (existingUsername) {
      username = `${username}${Math.floor(Math.random() * 10000)}`;
    }
    
    return prisma.user.create({
      data: { email, username, googleId }
    });
  }

  async refreshToken(token) {
    if (!token) throw new Error('Refresh token missing');
    
    const secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-fallback';
    const decoded = jwt.verify(token, secret);
    
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user || user.refreshToken !== token) {
      throw new Error('Invalid refresh token');
    }
    
    return this.generateTokens(user, false);
  }

  async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
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
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) throw new Error('User with this email or username already exists');
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async findUserByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');
    return user;
  }

  async verifyPassword(plainPassword, hashedPassword) {
    if (!hashedPassword) throw new Error('This account uses Google Sign-In. Please log in with Google.');
    
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isValid) throw new Error('Invalid credentials');
  }

  async generateTokens(user, rotateRefresh = true) {
    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-fallback';
    
    if (!secret) throw new Error('JWT_SECRET is not configured');
    
    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      secret,
      { expiresIn: '15m' }
    );

    let refreshToken = user.refreshToken;

    if (rotateRefresh || !refreshToken) {
      refreshToken = jwt.sign(
        { id: user.id },
        refreshSecret,
        { expiresIn: '7d' }
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });
    }
    
    return { accessToken, refreshToken, user };
  }
}
