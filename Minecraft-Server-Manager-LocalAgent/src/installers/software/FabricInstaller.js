import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { downloadFile } from '../../utils/httpUtils.js';

export default class FabricInstaller {
    constructor(jarsDir, javaInstaller) {
        this.jarsDir = jarsDir;
        this.javaInstaller = javaInstaller;
    }

    async resolveVersion(fullVersion) {
        const res = await fetch("https://meta.fabricmc.net/v2/versions/game");
        if (!res.ok) throw new Error('Failed to fetch Fabric metadata');
        
        const data = await res.json();
        const versionsArr = data.map(v => v.version);
        
        if (versionsArr.includes(fullVersion)) return { mcVer: fullVersion, loaderVer: null };

        versionsArr.sort((a, b) => b.length - a.length);
        for (const v of versionsArr) {
            if (fullVersion.startsWith(v + '-')) {
                return { mcVer: v, loaderVer: fullVersion.substring(v.length + 1) };
            }
        }
        
        return { mcVer: fullVersion, loaderVer: null };
    }

    async install(fullVersion, dataDir) {
        const { mcVer, loaderVer } = await this.resolveVersion(fullVersion);
        const fabricDir = path.join(this.jarsDir, `Fabric-${fullVersion}`);
        const launchJar = path.join(fabricDir, 'fabric-server-launch.jar');
        const librariesDir = path.join(fabricDir, 'libraries');

        await this.ensureFabricIsDownloaded(mcVer, loaderVer, fullVersion, fabricDir, launchJar);
        
        this.linkLibraries(librariesDir, path.join(dataDir, 'libraries'));
        this.linkLibraries(path.join(fabricDir, 'server.jar'), path.join(dataDir, 'server.jar'));

        return { type: 'jar', path: launchJar };
    }

    async ensureFabricIsDownloaded(mcVer, loaderVer, fullVersion, fabricDir, launchJar) {
        if (fs.existsSync(launchJar)) return;

        const res = await fetch('https://meta.fabricmc.net/v2/versions/installer');
        if (!res.ok) throw new Error('Failed to fetch Fabric installer');
        
        const data = await res.json();
        const installerVersion = data.find(i => i.stable).version;
        const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;
        const installerPath = path.join(this.jarsDir, `fabric-installer-${fullVersion}.jar`);
        
        await downloadFile(installerUrl, installerPath);
        
        if (!fs.existsSync(fabricDir)) fs.mkdirSync(fabricDir, { recursive: true });
        
        const javaExe = await this.javaInstaller.ensureJavaIsInstalled(mcVer);
        const loaderArg = loaderVer ? `-loader ${loaderVer}` : '';
        execSync(`"${javaExe}" -jar "${installerPath}" server -mcversion ${mcVer} ${loaderArg} -downloadMinecraft`, { cwd: fabricDir });
        
        fs.unlinkSync(installerPath);
    }

    linkLibraries(sourcePath, destPath) {
        if (!fs.existsSync(sourcePath)) return;
        if (fs.existsSync(destPath)) return;

        try {
            fs.symlinkSync(sourcePath, destPath);
        } catch (err) {
            this.copyRecursive(sourcePath, destPath);
        }
    }

    copyRecursive(sourcePath, destPath) {
        const stat = fs.statSync(sourcePath);
        if (!stat.isDirectory()) {
            fs.copyFileSync(sourcePath, destPath);
            return;
        }

        fs.mkdirSync(destPath, { recursive: true });
        const items = fs.readdirSync(sourcePath);
        for (const item of items) {
            this.linkLibraries(path.join(sourcePath, item), path.join(destPath, item));
        }
    }
}
