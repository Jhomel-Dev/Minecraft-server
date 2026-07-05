
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
    
    setInterval(() => {}, 1000); 
