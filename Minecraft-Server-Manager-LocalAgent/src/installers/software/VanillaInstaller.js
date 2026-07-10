import fs from 'fs';
import path from 'path';
import { downloadFile } from '../../utils/httpUtils.js';

export default class VanillaInstaller {
    constructor(jarsDir) {
        this.jarsDir = jarsDir;
    }

    async install(version, dataDir) {
        const manifestRes = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
        const manifest = await manifestRes.json();
        const vInfo = manifest.versions.find(v => v.id === version);
        
        if (!vInfo) throw new Error(`Vanilla version ${version} not found`);
        
        const detailsRes = await fetch(vInfo.url);
        const details = await detailsRes.json();
        const downloadUrl = details.downloads?.server?.url;
        
        if (!downloadUrl) throw new Error(`No server download for Vanilla ${version}`);

        const jarName = `vanilla-${version}.jar`;
        const jarPath = path.join(this.jarsDir, jarName);

        if (!fs.existsSync(jarPath)) {
            await downloadFile(downloadUrl, jarPath);
        }
        
        return { type: 'jar', path: jarPath };
    }
}
