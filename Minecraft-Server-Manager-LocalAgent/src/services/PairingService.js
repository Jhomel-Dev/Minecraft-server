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

    const finalToken = await this._waitForSocketPairing(apiUrl, pin);
    
    console.error('¡Vinculación Exitosa! Guardando credenciales...');
    return finalToken;
  }

  static async _requestPairingPin(apiUrl) {
    const response = await fetch(`${apiUrl}/api/agent/pairing/request`, { method: 'POST' });
    if (!response.ok) throw new Error('PairingRequestFailed');
    return response.json();
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
