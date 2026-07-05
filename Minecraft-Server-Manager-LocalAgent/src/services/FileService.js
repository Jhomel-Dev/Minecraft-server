import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export default class FileService {
  
  async execute(payload) {
    const { serverId, action, filePath, content } = payload;
    this.validateInputs(serverId, filePath);
    
    const managerDir = path.join(os.homedir(), '.minecraft-manager');
    const baseDir = path.resolve(managerDir, 'servers', serverId);
    await this.ensureDirectory(baseDir);
    
    const targetPath = this.getSafePath(baseDir, filePath || '/');

    switch (action) {
      case 'list':
        return this.listFiles(targetPath);
      case 'read':
        return this.readFile(targetPath);
      case 'write':
        return this.writeFile(targetPath, content, payload.isBase64);
      case 'append':
        return this.appendFile(targetPath, content, payload.isBase64);
      case 'delete':
        return this.deleteFile(targetPath);
      case 'unzip':
        return this.unzipFile(targetPath, payload.destPath ? this.getSafePath(baseDir, payload.destPath) : baseDir);
      case 'download':
        return this.downloadFile(targetPath, payload.url);
      default:
        throw new Error('Invalid FS action');
    }
  }

  validateInputs(serverId, filePath) {
    if (!serverId) throw new Error('Server ID is required');
  }

  async ensureDirectory(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  getSafePath(baseDir, relativePath) {
    const targetPath = path.join(baseDir, relativePath);
    if (!targetPath.startsWith(baseDir)) {
      throw new Error('Path traversal detected');
    }
    return targetPath;
  }

  async listFiles(targetPath) {
    let items = [];
    try {
      items = await fs.readdir(targetPath, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    
    const list = await Promise.all(items.map(async (item) => {
      const isDir = item.isDirectory();
      let size = 0;
      
      if (!isDir) {
        const stats = await fs.stat(path.join(targetPath, item.name));
        size = stats.size;
      }
      
      return {
        name: item.name,
        isDir,
        size
      };
    }));
    
    return list.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(targetPath) {
    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      return { content };
    } catch (err) {
      if (err.code === 'ENOENT') return { content: '' };
      throw err;
    }
  }

  async writeFile(targetPath, content, isBase64 = false) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (isBase64) {
      await fs.writeFile(targetPath, Buffer.from(content, 'base64'));
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }
    return { success: true };
  }

  async appendFile(targetPath, content, isBase64 = false) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (isBase64) {
      await fs.appendFile(targetPath, Buffer.from(content, 'base64'));
    } else {
      await fs.appendFile(targetPath, content, 'utf-8');
    }
    return { success: true };
  }
  
  async downloadFile(targetPath, url) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
    return { success: true };
  }

  async deleteFile(targetPath) {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
    return { success: true };
  }

  async unzipFile(zipPath, destPath) {
    try {
      await fs.access(zipPath);
      await this.ensureDirectory(destPath);
      await execPromise(`unzip -o "${zipPath}" -d "${destPath}"`);
      return { success: true };
    } catch (err) {
      console.error('Error al descomprimir:', err);
      throw new Error(`Fallo al descomprimir: ${err.message}`);
    }
  }
}
