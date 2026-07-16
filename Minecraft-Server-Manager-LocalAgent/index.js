import 'dotenv/config';
import fs from 'fs';
import { io } from 'socket.io-client';
import LocalAgentController from './src/controllers/LocalAgentController.js';

const DEFAULT_API_URL = 'https://minecraft-server-pl80.onrender.com';

const getApiUrl = () => {
  const argUrl = process.argv.find(arg => arg.startsWith('--api='));
  if (argUrl) return argUrl.split('=')[1];
  return process.env.API_URL || DEFAULT_API_URL;
};

const getAgentToken = () => {
  const argToken = process.argv.find(arg => arg.startsWith('--token='));
  if (argToken) return argToken.split('=')[1];
  return process.env.AGENT_SECRET_TOKEN || process.env.AGENT_TOKEN;
};

const getAgentStatus = () => {
  return process.env.AGENT_STATUS || 'ACTIVE';
};

const saveTokenToEnv = (token) => {
  const envPath = '.env';
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  if (envContent.includes('AGENT_SECRET_TOKEN=')) {
    envContent = envContent.replace(/AGENT_SECRET_TOKEN=.*/, `AGENT_SECRET_TOKEN=${token}`);
  } else {
    envContent += `\nAGENT_SECRET_TOKEN=${token}\n`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
};

const saveStatusToEnv = (status) => {
  const envPath = '.env';
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  if (envContent.includes('AGENT_STATUS=')) {
    envContent = envContent.replace(/AGENT_STATUS=.*/, `AGENT_STATUS=${status}`);
  } else {
    envContent += `\nAGENT_STATUS=${status}\n`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
};

const requestPairingPin = async (apiUrl) => {
  const response = await fetch(`${apiUrl}/api/agent/pairing/request`, { method: 'POST' });
  if (!response.ok) throw new Error('PairingRequestFailed');
  return response.json();
};

const waitForSocketPairing = (apiUrl, pin) => {
  return new Promise((resolve, reject) => {
    const socket = io(apiUrl, {
      auth: { pairingPin: pin },
      transports: ['websocket', 'polling']
    });

    socket.on('paired', (data) => {
      if (!data || !data.token) return;
      socket.disconnect();
      resolve(data.token);
    });

    socket.on('connect_error', (err) => {
      reject(new Error(`WebSocketConnectionFailed: ${err.message}`));
    });
  });
};

const performDeviceFlowPairing = async (apiUrl) => {
  console.log('\n=================================================');
  console.log('   Iniciando Vinculación de Nuevo Agente');
  console.log('=================================================\n');

  const { pin } = await requestPairingPin(apiUrl);
  
  console.log(`Paso 1: Ve a tu panel web en la sección "Vincular PC"`);
  console.log(`Paso 2: Ingresa el siguiente PIN de seguridad:\n`);
  console.log(`      --->  ${pin}  <--- \n`);
  console.log(`Esperando confirmación en la nube...\n`);

  const finalToken = await waitForSocketPairing(apiUrl, pin);
  
  console.log('¡Vinculación Exitosa! Guardando credenciales...');
  saveTokenToEnv(finalToken);
  
  return finalToken;
};

const bootstrapAgent = (apiUrl, agentToken, agentStatus) => {
  const agent = new LocalAgentController({ apiUrl, agentToken, agentStatus, saveStatusToEnv });
  agent.start();
  
  console.log('\n✅ Local Agent inicializado y conectado exitosamente.\n');

  process.on('SIGINT', async () => {
    console.log('\n[System] Deteniendo agente...');
    if (agent.tunnelService) agent.tunnelService.stopTunnel();
    if (agent.nativeServerService) await agent.nativeServerService.stopMinecraftServer();
    process.exit(0);
  });
};

const start = async () => {
  try {
    const apiUrl = getApiUrl();
    let agentToken = getAgentToken();
    const isSetupMode = process.argv.includes('--setup');

    if (!agentToken) {
      agentToken = await performDeviceFlowPairing(apiUrl);
      if (isSetupMode) {
        console.log('\n✅ Vinculación completada exitosamente.');
        console.log('El instalador continuará con la configuración de segundo plano...\n');
        process.exit(0);
      }
    } else if (isSetupMode) {
      console.log('\n✅ El Agente ya se encontraba vinculado con la nube.');
      console.log('El instalador continuará con la configuración de segundo plano...\n');
      process.exit(0);
    }

    const agentStatus = getAgentStatus();
    bootstrapAgent(apiUrl, agentToken, agentStatus);
  } catch (error) {
    console.error('\n❌ Failed to start Local Agent:', error.message);
    process.exit(1);
  }
};

start();
