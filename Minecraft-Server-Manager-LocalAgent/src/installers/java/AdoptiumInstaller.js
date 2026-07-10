import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getOsInfo, extractArchive, isWindows } from '../../utils/osUtils.js';
import { downloadFile } from '../../utils/httpUtils.js';

export default class AdoptiumInstaller {
    constructor(vaultDir) {
        this.javaDir = path.join(vaultDir, 'JDKs');
        this.ensureDirExists();
    }

    ensureDirExists() {
        if (fs.existsSync(this.javaDir)) return;
        fs.mkdirSync(this.javaDir, { recursive: true });
    }

    getRequiredJavaVersion(minecraftVersion) {
        const parts = minecraftVersion.split('.');
        const major = parseInt(parts[0]);
        const minor = parseInt(parts[1]);

        if (major !== 1) return major >= 26 ? 25 : 21;
        if (minor >= 26) return 25;
        if (minor >= 20.5) return 21;
        if (minor >= 17) return 17;
        if (minor >= 16) return 16;
        if (minor >= 13) return 11;
        return 8;
    }

    async ensureJavaIsInstalled(minecraftVersion) {
        const version = this.getRequiredJavaVersion(minecraftVersion);
        const osInfo = getOsInfo();
        const javaDir = path.join(this.javaDir, version.toString());
        const expectedExe = path.join(javaDir, 'bin', `java${osInfo.executableExt}`);

        if (fs.existsSync(expectedExe)) return expectedExe;

        const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/${osInfo.platform}/x64/jdk/hotspot/normal/eclipse`;
        const archivePath = path.join(this.javaDir, `java${version}${osInfo.archiveExt}`);
        const extractPath = path.join(this.javaDir, `extract_${version}`);

        await downloadFile(downloadUrl, archivePath);
        this.createExtractDir(extractPath);
        await extractArchive(archivePath, extractPath);
        
        this.moveExtractedJdk(extractPath, javaDir);
        this.cleanup(extractPath, archivePath);
        this.setExecutionPermissions(expectedExe);

        return expectedExe;
    }

    createExtractDir(extractPath) {
        if (fs.existsSync(extractPath)) return;
        fs.mkdirSync(extractPath, { recursive: true });
    }

    moveExtractedJdk(extractPath, javaDir) {
        const extractedFolders = fs.readdirSync(extractPath);
        const jdkFolder = path.join(extractPath, extractedFolders[0]);
        fs.renameSync(jdkFolder, javaDir);
    }

    cleanup(extractPath, archivePath) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        fs.rmSync(archivePath, { force: true });
    }

    setExecutionPermissions(expectedExe) {
        if (isWindows) return;
        execSync(`chmod +x "${expectedExe}"`);
    }
}
