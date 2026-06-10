import fs from 'fs';
import path from 'path';
// NOTA: Ajusté la ruta asumiendo que este archivo de test estará dentro de "src/tests"
// Si el archivo está en la raíz, cámbialo a './src/services/process-manager-service.js'
import ProcessManagerService from '../services/process-manager-service.js';
// --- CONFIGURACIÓN DEL ENTORNO DE PRUEBA ---

// 1. Definimos la ruta específica: src/tests/test_mc_server
const TEST_DIR = path.join(process.cwd(), 'src', 'tests', 'test_mc_server');
const MOCK_SERVER_SCRIPT = path.join(TEST_DIR, 'mock_server.js');

// 2. Preparamos el directorio falso
// 'recursive: true' asegura que si no existen las carpetas 'src' o 'tests', se creen también.
if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
}

// 3. Creamos un script "falso" que finge ser Minecraft
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

// 4. Creamos el run.bat que ejecuta ese script falso
const batchContent = `
@echo off
node "${MOCK_SERVER_SCRIPT}"
`;
fs.writeFileSync(path.join(TEST_DIR, 'run.bat'), batchContent);

// 5. Inyectamos la variable de entorno necesaria apuntando a la nueva ruta
process.env.MINECRAFT_PATH = TEST_DIR;

// --- INICIO DEL TEST ---

console.log(`--- INICIANDO TEST MANUAL DE PROCESS MANAGER ---`);
console.log(`--- Directorio de prueba: ${TEST_DIR} ---\n`);

const mcService = new ProcessManagerService();

// Escuchamos los eventos para ver qué pasa en consola
mcService.on('status-change', (status) => {
    console.log(`\x1b[33m[EVENTO] Status cambió a: ${status}\x1b[0m`);
});

mcService.on('log', (msg) => {
    // Solo imprimimos logs para confirmar que llegan
    // console.log(`[LOG STREAM] ${msg.trim()}`);
});

async function runTest() {
    try {
        // PASO 1: INICIAR
        console.log('1. Intentando iniciar servidor...');
        const startResult = mcService.startServer();
        console.log(`> Resultado startServer: ${startResult}`);

        if (!startResult) throw new Error('Falló el inicio');

        // Esperamos 2 segundos a que el "servidor" arranque
        await new Promise(r => setTimeout(r, 2000));

        // PASO 2: ENVIAR COMANDO
        console.log('\n2. Enviando comando "say Hola Mundo"...');
        const cmdResult = mcService.sendCommand('say Hola Mundo');
        console.log(`> Resultado sendCommand: ${cmdResult}`);

        // Esperamos 1 segundo para ver la respuesta en logs
        await new Promise(r => setTimeout(r, 1000));

        // PASO 3: DETENER
        console.log('\n3. Intentando detener servidor (stop)...');
        const stopResult = mcService.stopServer();
        console.log(`> Resultado stopServer: ${stopResult}`);

    } catch (error) {
        console.error('\x1b[31m[ERROR EN TEST]\x1b[0m', error);
    }
}

// Ejecutar
runTest();