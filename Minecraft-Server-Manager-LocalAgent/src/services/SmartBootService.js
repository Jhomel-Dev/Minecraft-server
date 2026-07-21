import killPort from 'kill-port';

export default class SmartBootService {
  static async checkPortAndKillIfImposter(port) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`http://127.0.0.1:${port}/identity`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (data && data.identity === 'CraftControlAgent') {
        console.log(`\n[System] El agente de CraftControl ya está corriendo en el puerto ${port}.`);
        console.log('[System] Reconectando de manera transparente (Smart Boot).');
        process.exit(0);
      } else {
        console.log(`\n[Warning] El puerto ${port} está ocupado por un proceso desconocido.`);
        console.log('[System] Procediendo a exterminar el proceso usurpador...');
        await killPort(port);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.name === 'AbortError' || e.cause?.code === 'ECONNREFUSED') {
      } else {
        console.log(`\n[Warning] El puerto ${port} está ocupado y no responde correctamente.`);
        console.log('[System] Procediendo a exterminar el proceso usurpador...');
        try { 
          await killPort(port); 
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch(killErr) {}
      }
    }
  }
}
