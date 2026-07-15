import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { downloadFile } from '../../utils/httpUtils.js';
import { isWindows } from '../../utils/osUtils.js';

export default class NeoForgeInstaller {
    constructor(jarsDir, javaInstaller) {
        this.jarsDir = jarsDir;
        this.javaInstaller = javaInstaller;
    }

    async resolveVersion(fullVersion) {
        if (fullVersion.includes('-')) {
            const splitIdx = fullVersion.indexOf('-');
            return { mcVer: fullVersion.substring(0, splitIdx), neoVer: fullVersion.substring(splitIdx + 1) };
        }
        
        const res = await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
        const text = await res.text();
        const parts = fullVersion.split('.');
        const neoPrefix = `${parts[1]}.${parts[2] || '0'}`;
        const matches = [...text.matchAll(new RegExp(`<version>(${neoPrefix}\\.[\\d\\.]+)</version>`, 'g'))];
        
        if (matches.length === 0) throw new Error(`No NeoForge builds found for Minecraft ${fullVersion}`);
        
        return { mcVer: fullVersion, neoVer: matches[matches.length - 1][1] };
    }

    async install(fullVersion, dataDir, config) {
        const { mcVer, neoVer } = await this.resolveVersion(fullVersion);
        const resolvedFullVersion = `${mcVer}-${neoVer}`;
        const neoDir = path.join(this.jarsDir, `NeoForge-${resolvedFullVersion}`);
        const librariesDir = path.join(neoDir, 'libraries');
        const argsFileName = isWindows ? 'win_args.txt' : 'unix_args.txt';
        const argsFile = path.join(neoDir, 'libraries', 'net', 'neoforged', 'neoforge', neoVer, argsFileName);

        await this.ensureNeoForgeIsDownloaded(mcVer, neoVer, resolvedFullVersion, neoDir, librariesDir);
        this.linkLibraries(librariesDir, path.join(dataDir, 'libraries'), config.compatibilityMode);
        this.linkJars(neoDir, dataDir);

        return { type: 'args', args: ['@user_jvm_args.txt', `@libraries/net/neoforged/neoforge/${neoVer}/${argsFileName}`] };
    }

    async ensureNeoForgeIsDownloaded(mcVer, neoVer, fullVersion, neoDir, librariesDir) {
        if (fs.existsSync(librariesDir)) return;

        const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVer}/neoforge-${neoVer}-installer.jar`;
        const installerPath = path.join(this.jarsDir, `neoforge-installer-${fullVersion}.jar`);
        
        await downloadFile(installerUrl, installerPath);
        
        if (!fs.existsSync(neoDir)) fs.mkdirSync(neoDir, { recursive: true });
        
        const javaExe = await this.javaInstaller.ensureJavaIsInstalled(mcVer);
        execSync(`"${javaExe}" -jar "${installerPath}" --installServer`, { cwd: neoDir, stdio: 'ignore' });
        
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

    linkJars(neoDir, dataDir) {
        const neoFiles = fs.readdirSync(neoDir);
        for (const file of neoFiles) {
            if (!file.endsWith('.jar')) continue;
            
            const sourceJar = path.join(neoDir, file);
            const targetJar = path.join(dataDir, file);
            
            if (fs.existsSync(targetJar)) continue;
            fs.symlinkSync(sourceJar, targetJar);
        }
    }
}
