import os from 'os';
import { execSync } from 'child_process';
import * as tar from 'tar';
import AdmZip from 'adm-zip';

export const isWindows = os.platform() === 'win32';

export function getOsInfo() {
    if (isWindows) {
        return { platform: 'windows', executableExt: '.exe', archiveExt: '.zip' };
    }

    if (os.platform() === 'darwin') {
        return { platform: 'mac', executableExt: '', archiveExt: '.tar.gz' };
    }

    return { platform: 'linux', executableExt: '', archiveExt: '.tar.gz' };
}

export async function extractArchive(archivePath, extractPath) {
    if (archivePath.endsWith('.zip')) {
        return extractZip(archivePath, extractPath);
    }

    if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
        return extractTar(archivePath, extractPath);
    }

    throw new Error(`Unsupported archive format for extraction: ${archivePath}`);
}

function extractZip(archivePath, extractPath) {
    const zip = new AdmZip(archivePath);
    zip.extractAllTo(extractPath, true);
}

async function extractTar(archivePath, extractPath) {
    await tar.x({ file: archivePath, cwd: extractPath });
}

export function freePort(port) {
    try {
        if (isWindows) {
            freeWindowsPort(port);
            return;
        }
        freeUnixPort(port);
    } catch (e) { }
}

function freeWindowsPort(port) {
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const firstLine = output.split('\n')[0]?.trim();
    if (!firstLine) return;

    const parts = firstLine.split(/\s+/);
    const pid = parts[parts.length - 1];

    if (!pid || isNaN(parseInt(pid)) || pid === '0') return;

    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
}

function freeUnixPort(port) {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
}

export function killProcessHard(pid) {
    try {
        if (isWindows) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            return;
        }
        process.kill(pid, 'SIGKILL');
    } catch (e) { }
}
