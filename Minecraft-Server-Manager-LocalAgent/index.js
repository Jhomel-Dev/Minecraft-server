import 'dotenv/config';
import LocalAgentController from './src/controllers/LocalAgentController.js';
import readline from 'readline';

function bootstrap(apiUrl, agentToken) {
  const config = { apiUrl, agentToken };
  const agent = new LocalAgentController(config);
  
  agent.start();
  console.log('Local Agent initialized and attempting to connect...');

  process.on('SIGINT', async () => {
    console.log('\n[System] Deteniendo agente y limpiando procesos huerfanos...');
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

  return { apiUrl, agentToken };
}

async function main() {
  try {
    let { apiUrl, agentToken } = extractConfig();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

    if (!apiUrl || !agentToken) {
      console.log("=================================================");
      console.log("   Bienvenido al Agente de CraftControl Local    ");
      console.log("=================================================");
      console.log("");
    }

    if (!apiUrl) {
      const answer = await askQuestion("Por favor, ingresa la URL de tu panel (ej. https://tu-api.onrender.com): ");
      apiUrl = answer.trim();
    }

    if (!agentToken) {
      const answer = await askQuestion("Por favor, pega tu Comando Secreto o Token: ");
      // In case they paste the whole command: node agent.js --url="..." --token="TOKEN"
      const tokenMatch = answer.match(/--token="?([^"\s]+)"?/);
      agentToken = tokenMatch ? tokenMatch[1] : answer.trim();
    }

    rl.close();

    if (!apiUrl || !agentToken) {
      throw new Error("API URL y Token son obligatorios.");
    }

    bootstrap(apiUrl, agentToken);
  } catch (error) {
    console.error('Failed to start Local Agent:', error.message);
    process.exit(1);
  }
}

main();
