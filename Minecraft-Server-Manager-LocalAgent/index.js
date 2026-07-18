import 'dotenv/config';
import { enforceSingleInstance } from './src/utils/SingleInstanceLock.js';
import EnvManager from './src/config/EnvManager.js';
import PairingService from './src/services/PairingService.js';
import LocalAgentController from './src/controllers/LocalAgentController.js';

const handleSetupModeExit = (message) => {
  console.log(`\n[SUCCESS] ${message}`);
  console.log('El instalador continuará con la configuración de segundo plano...\n');
  process.exit(0);
};

const start = async () => {
  try {
    await enforceSingleInstance();
    const apiUrl = EnvManager.getApiUrl();
    const isSetupMode = process.argv.includes('--setup');
    let agentToken = EnvManager.getAgentToken();

    if (!agentToken) {
      agentToken = await PairingService.performDeviceFlow(apiUrl);
      EnvManager.saveTokenToEnv(agentToken);
      
      if (isSetupMode) return handleSetupModeExit('Vinculación completada exitosamente.');
    }

    if (isSetupMode) {
      return handleSetupModeExit('El Agente ya se encontraba vinculado con la nube.');
    }

    const agent = new LocalAgentController({ 
      apiUrl, 
      agentToken, 
      agentStatus: EnvManager.getAgentStatus(), 
      saveStatusToEnv: (status) => EnvManager.saveStatusToEnv(status) 
    });
    
    agent.start();
    console.log('\n[SUCCESS] Local Agent inicializado y conectado exitosamente.\n');

    process.on('SIGINT', async () => {
      console.log('\n[System] Deteniendo agente...');
      if (agent.tunnelService) agent.tunnelService.stopTunnel();
      if (agent.nativeServerService) await agent.nativeServerService.stopMinecraftServer();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n[ERROR] Failed to start Local Agent:', error.message);
    process.exit(1);
  }
};

start();
