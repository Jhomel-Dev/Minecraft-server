import 'dotenv/config';
import LocalAgentController from './src/controllers/LocalAgentController.js';

function bootstrap() {
  const config = extractConfig();
  const agent = new LocalAgentController(config);
  
  agent.start();
  console.log('Local Agent initialized and attempting to connect...');
}

function extractConfig() {
  return {
    apiUrl: process.env.API_URL,
    agentToken: process.env.AGENT_TOKEN
  };
}

try {
  bootstrap();
} catch (error) {
  console.error('Failed to start Local Agent:', error.message);
  process.exit(1);
}
