import 'dotenv/config';
import LocalAgentController from './src/controllers/LocalAgentController.js';

function bootstrap() {
  const config = extractConfig();
  const agent = new LocalAgentController(config);
  
  agent.start();
  console.log('Local Agent initialized and attempting to connect...');

  process.on('SIGINT', async () => {
    console.log('\\n[System] Deteniendo agente y limpiando procesos huerfanos...');
    if (agent.tunnelService) agent.tunnelService.stopTunnel();
    if (agent.nativeServerService) await agent.nativeServerService.stopMinecraftServer();
    process.exit(0);
  });
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
