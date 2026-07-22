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
        console.log(`\n[System] The CraftControl agent is already running on port ${port}.`);
        console.log('[System] Reconnecting seamlessly (Smart Boot).');
        process.exit(0);
      } else {
        console.log(`\n[Warning] Port ${port} is occupied by an unknown process.`);
        console.log('[System] Proceeding to exterminate the usurping process...');
        await killPort(port);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (e) {
      if (e.code === 'ECONNREFUSED' || e.name === 'AbortError' || e.cause?.code === 'ECONNREFUSED') {
      } else {
        console.log(`\n[Warning] Port ${port} is occupied and not responding correctly.`);
        console.log('[System] Proceeding to exterminate the usurping process...');
        try { 
          await killPort(port); 
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch(killErr) {}
      }
    }
  }
}
