import fs from 'fs/promises';
import path from 'path';

export default class FileService {
  
  async execute(payload) {
    const { serverId, action, filePath, content } = payload;
    this.validateInputs(serverId, filePath);
    
    const baseDir = path.resolve(process.cwd(), 'servers', serverId);
    await this.ensureDirectory(baseDir);
    
    const targetPath = this.getSafePath(baseDir, filePath || '/');

    switch (action) {
      case 'list':
        return this.listFiles(targetPath);
      case 'read':
        return this.readFile(targetPath);
      case 'write':
        return this.writeFile(targetPath, content, payload.isBase64);
      case 'delete':
        return this.deleteFile(targetPath);
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
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    
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
    const content = await fs.readFile(targetPath, 'utf-8');
    return { content };
  }

  async writeFile(targetPath, content, isBase64 = false) {
    if (isBase64) {
      await fs.writeFile(targetPath, Buffer.from(content, 'base64'));
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }
    return { success: true };
  }
  
  async downloadFile(targetPath, url) {
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
}
