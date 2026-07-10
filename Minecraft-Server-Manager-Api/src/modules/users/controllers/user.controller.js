import UserService from '../services/user.service.js';

export default class UserController {
  constructor() {
    this.userService = new UserService();
  }

  updateProfile = async (req, res) => {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      const { accessToken, updatedUser } = await this.userService.updateUsername(userId, username);

      return res.status(200).json({ 
        token: accessToken,
        user: { 
          id: updatedUser.id, 
          username: updatedUser.username, 
          email: updatedUser.email 
        } 
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  handleError(res, error) {
    if (error.message === 'Username is required' || error.message === 'Username already taken') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
