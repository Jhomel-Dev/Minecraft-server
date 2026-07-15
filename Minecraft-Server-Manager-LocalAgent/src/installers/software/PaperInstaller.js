import fs from 'fs';
import path from 'path';
import { downloadFile } from '../../utils/httpUtils.js';

export default class PaperInstaller {
    constructor(jarsDir) {
        this.jarsDir = jarsDir;
    }

    async resolveVersion(software, fullVersion) {
        const res = await fetch(`https://fill.papermc.io/v3/projects/${software}`, { 
            headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0' } 
        });
        
        if (!res.ok) throw new Error(`Failed to fetch ${software} metadata`);
        const data = await res.json();
        
        const versionsArr = Array.isArray(data.versions) ? data.versions : Object.values(data.versions).flat();
        let mcVer = fullVersion;
        let buildVer = null;
        
        if (versionsArr.includes(fullVersion)) return { mcVer, buildVer };

        versionsArr.sort((a, b) => b.length - a.length);
        for (const v of versionsArr) {
            if (fullVersion.startsWith(v + '-')) {
                return { mcVer: v, buildVer: fullVersion.substring(v.length + 1) };
            }
        }
        
        return { mcVer, buildVer };
    }

    async install(fullVersion, dataDir, software = 'paper') {
        const { mcVer, buildVer } = await this.resolveVersion(software, fullVersion);
        const res = await fetch(`https://fill.papermc.io/v3/projects/${software}/versions/${mcVer}`, { 
            headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0' } 
        });
        
        if (!res.ok) throw new Error(`Failed to fetch ${software} version metadata`);
        const data = await res.json();
        
        let latestBuild;
        if (buildVer) {
            if (!data.builds.includes(parseInt(buildVer))) throw new Error(`Build ${buildVer} not found for ${software} ${mcVer}`);
            latestBuild = parseInt(buildVer);
        } else {
            latestBuild = data.builds[data.builds.length - 1];
        }

        const jarName = `${software}-${mcVer}-b${latestBuild}.jar`;
        const jarPath = path.join(this.jarsDir, jarName);

        if (!fs.existsSync(jarPath)) {
            const buildRes = await fetch(`https://fill.papermc.io/v3/projects/${software}/versions/${mcVer}/builds/${latestBuild}`, { 
                headers: { 'User-Agent': 'Minecraft-Server-Manager/1.0' } 
            });
            const buildData = await buildRes.json();
            const downloadUrl = buildData.downloads['server:default']?.url || buildData.downloads.application?.url || Object.values(buildData.downloads)[0].url;
            await downloadFile(downloadUrl, jarPath);
        }

        this.cleanupOldJars(mcVer, jarName, software);
        return { type: 'jar', path: jarPath };
    }

    cleanupOldJars(version, currentJarName, software) {
        try {
            const files = fs.readdirSync(this.jarsDir);
            for (const file of files) {
                if (file.startsWith(`${software}-${version}-b`) && file !== currentJarName) {
                    try { fs.unlinkSync(path.join(this.jarsDir, file)); } catch (e) {}
                }
            }
        } catch (err) {}
    }
}
