import fs from 'fs';
import path from 'path';
import { downloadFile } from '../../utils/httpUtils.js';

export default class PurpurInstaller {
    constructor(jarsDir) {
        this.jarsDir = jarsDir;
    }

    async resolveVersion(fullVersion) {
        const res = await fetch('https://api.purpurmc.org/v2/purpur');
        if (!res.ok) throw new Error('Failed to fetch Purpur metadata');
        const data = await res.json();
        
        let mcVer = fullVersion;
        let buildVer = null;
        
        if (data.versions.includes(fullVersion)) return { mcVer, buildVer };

        const versionsArr = data.versions.sort((a, b) => b.length - a.length);
        for (const v of versionsArr) {
            if (fullVersion.startsWith(v + '-')) {
                return { mcVer: v, buildVer: fullVersion.substring(v.length + 1) };
            }
        }
        
        return { mcVer, buildVer };
    }

    async install(fullVersion, dataDir) {
        const { mcVer, buildVer } = await this.resolveVersion(fullVersion);
        const res = await fetch(`https://api.purpurmc.org/v2/purpur/${mcVer}`);
        if (!res.ok) throw new Error(`Failed to fetch Purpur metadata: ${res.status}`);
        const data = await res.json();
        
        let latestBuild;
        if (buildVer) {
            if (!data.builds.all.includes(buildVer)) throw new Error(`Build ${buildVer} not found for Purpur ${mcVer}`);
            latestBuild = buildVer;
        } else {
            latestBuild = data.builds.latest;
        }

        const jarName = `purpur-${mcVer}-b${latestBuild}.jar`;
        const jarPath = path.join(this.jarsDir, jarName);

        if (!fs.existsSync(jarPath)) {
            const downloadUrl = `https://api.purpurmc.org/v2/purpur/${mcVer}/${latestBuild}/download`;
            await downloadFile(downloadUrl, jarPath);
        }
        
        return { type: 'jar', path: jarPath };
    }
}
