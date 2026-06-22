import NativeServerService from './src/services/NativeServerService.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('--- INICIANDO PRUEBA NATIVA ---');
  const service = new NativeServerService();
  
  const testDataDir = path.join(process.cwd(), 'ServerNavidenoTest');
  
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log(`Carpeta creada: ${testDataDir}`);
  }

  const config = {
    name: 'server-navideno-test',
    port: 25565,
    dataDir: testDataDir,
    type: 'PAPER',
    version: '1.20.4',
    memory: '2G',
    whitelist: false,
    onlineMode: false
  };

  service.on('log', (msg) => {
    console.log('[MINECRAFT]', msg);
  });

  try {
    console.log('Iniciando proceso de bootstrap nativo...');
    const pid = await service.startMinecraftServer(config);
    console.log(`\n✅ Servidor nativo arrancado correctamente. PID: ${pid}`);
    console.log(`Revisa la carpeta "${testDataDir}" en tu escritorio.`);
    
    console.log('\nEl servidor estará encendido por 45 segundos para la prueba y luego se apagará...');
    
    setTimeout(async () => {
      console.log('\nApagando servidor de prueba nativo...');
      await service.stopMinecraftServer();
      
      // Give it 5 seconds to gracefully stop before exiting
      setTimeout(() => {
        console.log('✅ Servidor apagado. Prueba finalizada.');
        process.exit(0);
      }, 5000);
    }, 45000);
    
  } catch (err) {
    console.error('\n❌ Error durante la prueba nativa:', err);
    process.exit(1);
  }
}

runTest();
