import { defineConfig } from "cypress";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let agentProcess;

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      on('task', {
        startAgent() {
          return new Promise(async (resolve, reject) => {
            try {
              const tmpDir = path.join(__dirname, 'cypress', 'tmp-agent');
              if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
              fs.mkdirSync(tmpDir, { recursive: true });
              // The agent needs API_URL pointing to local API
              fs.writeFileSync(path.join(tmpDir, '.env'), 'API_URL=http://127.0.0.1:4000\nSENTRY_DSN=""\nDAEMON_PORT=0\n');

              const agentPath = path.resolve(__dirname, '../Minecraft-Server-Manager-LocalAgent/index.js');
              
              agentProcess = spawn('node', [agentPath], { cwd: tmpDir });

              const handleOutput = (data) => {
                const str = data.toString();
                console.log(str); // log in cypress terminal
                const match = str.match(/PIN de seguridad:\s*([A-Z0-9]+)/);
                if (match) {
                  resolve(match[1]); // Resolve task with PIN
                }
              };

              agentProcess.stdout.on('data', handleOutput);
              agentProcess.stderr.on('data', handleOutput);

              // Also resolve if it fails or times out so Cypress doesn't hang forever
              setTimeout(() => resolve(null), 30000); 

            } catch (err) {
              resolve(null);
            }
          });
        },
        stopAgent() {
          return new Promise((resolve) => {
            if (agentProcess) {
              agentProcess.on('exit', () => {
                agentProcess = null;
                resolve(null);
              });
              agentProcess.kill();
            } else {
              resolve(null);
            }
          });
        }
      });
      return config;
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
  },
});
