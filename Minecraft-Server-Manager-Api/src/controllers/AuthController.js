import AuthService from '../services/AuthService.js';

export default class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  register = async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const user = await this.authService.register(username, email, password);
      
      return res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      const token = await this.authService.login(email, password);
      
      return res.status(200).json({ token });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  handleError(res, error) {
    if (error.message === 'User with this email or username already exists' || 
        error.message === 'Invalid credentials' ||
        error.message.includes('required') || 
        error.message.includes('characters')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
