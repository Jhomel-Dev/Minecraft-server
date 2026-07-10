import AuthService from '../services/auth.service.js';

export default class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  register = async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const { accessToken, refreshToken, user } = await this.authService.register(username, email, password);
      
      this.setRefreshCookie(res, refreshToken);
      return res.status(201).json({
        message: 'User registered successfully',
        token: accessToken,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await this.authService.login(email, password);
      
      this.setRefreshCookie(res, refreshToken);
      return res.status(200).json({ token: accessToken, user: { username: user.username, email: user.email } });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  googleLogin = async (req, res) => {
    try {
      const { credential, accessToken: bodyAccessToken } = req.body;
      const isAccessToken = !!bodyAccessToken;
      const tokenToVerify = bodyAccessToken || credential;
      
      const { accessToken, refreshToken, user } = await this.authService.googleLogin(tokenToVerify, isAccessToken);
      
      this.setRefreshCookie(res, refreshToken);
      return res.status(200).json({ token: accessToken, user: { username: user.username, email: user.email } });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  refresh = async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
      
      const { accessToken, refreshToken: newRefreshToken, user } = await this.authService.refreshToken(refreshToken);
      
      this.setRefreshCookie(res, newRefreshToken);
      return res.status(200).json({ token: accessToken, user: { username: user.username, email: user.email } });
    } catch (error) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  };

  logout = async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        
        res.clearCookie('refreshToken');
      }
      return res.status(200).json({ message: 'Logged out' });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  setRefreshCookie(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });
  }

  handleError(res, error) {
    console.error('\n[Auth Error]:', error);
    
    if (error.message === 'User with this email or username already exists' || 
        error.message === 'Invalid credentials' ||
        error.message.includes('required') || 
        error.message.includes('characters')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
}
