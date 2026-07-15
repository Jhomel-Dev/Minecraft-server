import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { downloadFile } from '../../utils/httpUtils.js';
import { isWindows } from '../../utils/osUtils.js';

export default class ForgeInstaller {
    constructor(jarsDir, javaInstaller) {
        this.jarsDir = jarsDir;
        this.javaInstaller = javaInstaller;
    }

    async resolveVersion(fullVersion) {
        if (fullVersion.includes('-')) {
            const splitIdx = fullVersion.indexOf('-');
            return { mcVer: fullVersion.substring(0, splitIdx), forgeVer: fullVersion.substring(splitIdx + 1) };
        }
        
        const res = await fetch('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml');
        const text = await res.text();
        const matches = [...text.matchAll(new RegExp(`<version>(${fullVersion}-[\\d\\.]+)</version>`, 'g'))];
        
        if (matches.length === 0) throw new Error(`No Forge builds found for Minecraft ${fullVersion}`);
        
        const resolvedFullVersion = matches[matches.length - 1][1]; 
        return { mcVer: fullVersion, forgeVer: resolvedFullVersion.split('-')[1] };
    }

    async install(fullVersion, dataDir, config) {
        const { mcVer, forgeVer } = await this.resolveVersion(fullVersion);
        const resolvedFullVersion = `${mcVer}-${forgeVer}`;
        const forgeDir = path.join(this.jarsDir, `Forge-${resolvedFullVersion}`);
        const librariesDir = path.join(forgeDir, 'libraries');
        const argsFileName = isWindows ? 'win_args.txt' : 'unix_args.txt';
        const argsFile = path.join(forgeDir, 'libraries', 'net', 'minecraftforge', 'forge', resolvedFullVersion, argsFileName);
        const legacyJar = path.join(forgeDir, `forge-${resolvedFullVersion}.jar`);

        await this.ensureForgeIsDownloaded(mcVer, resolvedFullVersion, forgeDir, librariesDir, legacyJar);
        this.linkLibraries(librariesDir, path.join(dataDir, 'libraries'), config.compatibilityMode);
        this.linkShimJar(forgeDir, resolvedFullVersion, dataDir);

        if (fs.existsSync(argsFile)) {
            return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/minecraftforge/forge/${resolvedFullVersion}/${argsFileName}`] };
        }
        return { type: 'jar', path: legacyJar };
    }

    async ensureForgeIsDownloaded(mcVer, fullVersion, forgeDir, librariesDir, legacyJar) {
        if (fs.existsSync(librariesDir) || fs.existsSync(legacyJar)) return;

        const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/forge-${fullVersion}-installer.jar`;
        const installerPath = path.join(this.jarsDir, `forge-installer-${fullVersion}.jar`);
        
        await downloadFile(installerUrl, installerPath);
        
        if (!fs.existsSync(forgeDir)) fs.mkdirSync(forgeDir, { recursive: true });
        
        const javaExe = await this.javaInstaller.ensureJavaIsInstalled(mcVer);
        execSync(`"${javaExe}" -jar "${installerPath}" --installServer`, { cwd: forgeDir, stdio: 'ignore' });
        
        fs.unlinkSync(installerPath);
    }

    linkLibraries(sourcePath, destPath, forceCopy = false) {
        if (!fs.existsSync(sourcePath)) return;
        if (fs.existsSync(destPath)) return;

        if (forceCopy) {
            this.copyRecursive(sourcePath, destPath);
            return;
        }

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
            this.linkLibraries(path.join(sourcePath, item), path.join(destPath, item), true);
        }
    }

    linkShimJar(forgeDir, fullVersion, dataDir) {
        const shimJarName = `forge-${fullVersion}-shim.jar`;
        const shimJarPath = path.join(forgeDir, shimJarName);
        const serverShimJarPath = path.join(dataDir, shimJarName);
        
        if (!fs.existsSync(shimJarPath)) return;
        if (fs.existsSync(serverShimJarPath)) return;
        
        fs.symlinkSync(shimJarPath, serverShimJarPath);
    }
}
