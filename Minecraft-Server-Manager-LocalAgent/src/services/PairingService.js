import { io } from 'socket.io-client';

export default class PairingService {
  static async performDeviceFlow(apiUrl) {
    console.error('\n=================================================');
    console.error('   Iniciando Vinculación de Nuevo Agente');
    console.error('=================================================\n');

    const { pin } = await this._requestPairingPin(apiUrl);
    
    console.error(`Paso 1: Ve a tu panel web en la sección "Vincular PC"`);
    console.error(`Paso 2: Ingresa el siguiente PIN de seguridad: ${pin}`);
    console.error(`Esperando confirmación en la nube...\n`);

    global.currentPairingPin = pin;

    const finalToken = await this._waitForSocketPairing(apiUrl, pin);
    
    global.currentPairingPin = null;
    console.error('¡Vinculación Exitosa! Guardando credenciales...');
    return finalToken;
  }

  static async _requestPairingPin(apiUrl, retries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${apiUrl}/api/agent/pairing/request`, { method: 'POST' });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {}
      
      if (attempt === retries) {
        throw new Error('PairingRequestFailed');
      }
      
      console.error(`[WARN] Nube dormida o inaccesible. Reintentando en ${Math.round(delayMs / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 1.5;
    }
  }

  static _waitForSocketPairing(apiUrl, pin) {
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
  }
}
