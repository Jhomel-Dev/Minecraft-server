import { io } from 'socket.io-client';

export default class PairingService {
  static async performDeviceFlow(apiUrl) {
    console.error('\n=================================================');
    console.error('   Starting New Agent Pairing');
    console.error('=================================================\n');

    const { pin } = await this._requestPairingPin(apiUrl);
    
    console.error(`Step 1: Go to your web panel in the "Link PC" section`);
    console.error(`Step 2: Enter the following security PIN: ${pin}`);
    console.error(`Waiting for cloud confirmation...\n`);

    global.currentPairingPin = pin;

    const finalToken = await this._waitForSocketPairing(apiUrl, pin);
    
    global.currentPairingPin = null;
    console.error('Pairing Successful! Saving credentials...');
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
      
      console.error(`[WARN] Cloud sleeping or unreachable. Retrying in ${Math.round(delayMs / 1000)}s...`);
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
