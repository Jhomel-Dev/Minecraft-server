import fs from 'fs';

import path from 'path';

const DEFAULT_API_URL = 'https://minecraft-server-pl80.onrender.com';
const ENV_PATH = process.pkg 
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(process.cwd(), '.env');

export default class EnvManager {
  static getApiUrl() {
    const argUrl = process.argv.find(arg => arg.startsWith('--api='));
    if (argUrl) return argUrl.split('=')[1];
    return process.env.API_URL || DEFAULT_API_URL;
  }

  static getAgentToken() {
    const argToken = process.argv.find(arg => arg.startsWith('--token='));
    if (argToken) return argToken.split('=')[1];
    return process.env.AGENT_SECRET_TOKEN || process.env.AGENT_TOKEN;
  }

  static getAgentStatus() {
    return process.env.AGENT_STATUS || 'ACTIVE';
  }

  static saveTokenToEnv(token) {
    this._updateEnvVar('AGENT_SECRET_TOKEN', token);
  }

  static saveStatusToEnv(status) {
    this._updateEnvVar('AGENT_STATUS', status);
  }

  static updateApiUrl(url) {
    this._updateEnvVar('API_URL', url);
  }

  static _updateEnvVar(key, value) {
    let envContent = '';
    
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    if (envContent.includes(`${key}=`)) {
      const regex = new RegExp(`${key}=.*`);
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}\n`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');
  }
}
