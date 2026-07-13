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
  const args = process.argv.slice(2);
  let apiUrl = process.env.API_URL;
  let agentToken = process.env.AGENT_SECRET_TOKEN || process.env.AGENT_TOKEN;

  args.forEach(arg => {
    if (arg.startsWith('--url=')) apiUrl = arg.split('=')[1];
    if (arg.startsWith('--token=')) agentToken = arg.split('=')[1];
  });

  if (!apiUrl) throw new Error("API URL is required. Use --url=http://...");
  if (!agentToken) throw new Error("Agent token is required. Use --token=YOUR_TOKEN");

  return { apiUrl, agentToken };
}

try {
  bootstrap();
} catch (error) {
  console.error('Failed to start Local Agent:', error.message);
  process.exit(1);
}
