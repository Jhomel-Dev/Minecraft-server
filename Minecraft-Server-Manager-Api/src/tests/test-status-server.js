import fs from 'fs';
import path from 'path';


import ProcessManagerService from '../services/process-manager-service.js';



const TEST_DIR = path.join(process.cwd(), 'src', 'tests', 'test_mc_server');
const MOCK_SERVER_SCRIPT = path.join(TEST_DIR, 'mock_server.js');



if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
}


const mockServerCode = `
    console.log('[Server] Iniciando servidor falso en src/tests...');
    setTimeout(() => console.log('[Server] Done! For help, type "help"'), 1000);
    
    process.stdin.on('data', (data) => {
        const cmd = data.toString().trim();
        console.log('[Server] Recibido comando: ' + cmd);
        if (cmd === 'stop') {
            console.log('[Server] Stopping server...');
            process.exit(0);
        }
    });
    // Mantiene el proceso vivo
    setInterval(() => {}, 1000); 
`;
fs.writeFileSync(MOCK_SERVER_SCRIPT, mockServerCode);


const batchContent = `
@echo off
node "${MOCK_SERVER_SCRIPT}"
`;
fs.writeFileSync(path.join(TEST_DIR, 'run.bat'), batchContent);


process.env.MINECRAFT_PATH = TEST_DIR;



console.log(`--- INICIANDO TEST MANUAL DE PROCESS MANAGER ---`);
console.log(`--- Directorio de prueba: ${TEST_DIR} ---\n`);

const mcService = new ProcessManagerService();


mcService.on('status-change', (status) => {
    console.log(`\x1b[33m[EVENTO] Status cambió a: ${status}\x1b[0m`);
});

mcService.on('log', (msg) => {
    
    
});

async function runTest() {
    try {
        
        console.log('1. Intentando iniciar servidor...');
        const startResult = mcService.startServer();
        console.log(`> Resultado startServer: ${startResult}`);

        if (!startResult) throw new Error('Falló el inicio');

        
        await new Promise(r => setTimeout(r, 2000));

        
        console.log('\n2. Enviando comando "say Hola Mundo"...');
        const cmdResult = mcService.sendCommand('say Hola Mundo');
        console.log(`> Resultado sendCommand: ${cmdResult}`);

        
        await new Promise(r => setTimeout(r, 1000));

        
        console.log('\n3. Intentando detener servidor (stop)...');
        const stopResult = mcService.stopServer();
        console.log(`> Resultado stopServer: ${stopResult}`);

    } catch (error) {
        console.error('\x1b[31m[ERROR EN TEST]\x1b[0m', error);
    }
}


runTest();