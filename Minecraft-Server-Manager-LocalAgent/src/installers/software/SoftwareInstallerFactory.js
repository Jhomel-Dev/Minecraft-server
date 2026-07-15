import VanillaInstaller from './VanillaInstaller.js';
import PaperInstaller from './PaperInstaller.js';
import PurpurInstaller from './PurpurInstaller.js';
import ForgeInstaller from './ForgeInstaller.js';
import FabricInstaller from './FabricInstaller.js';
import NeoForgeInstaller from './NeoForgeInstaller.js';

export default class SoftwareInstallerFactory {
    constructor(jarsDir, javaInstaller) {
        this.jarsDir = jarsDir;
        this.javaInstaller = javaInstaller;
    }

    getInstaller(type) {
        switch (type) {
            case 'VANILLA': return new VanillaInstaller(this.jarsDir);
            case 'PAPER': return new PaperInstaller(this.jarsDir);
            case 'FOLIA': 
                const foliaInstaller = new PaperInstaller(this.jarsDir);
                foliaInstaller.install = (version, dir) => PaperInstaller.prototype.install.call(foliaInstaller, version, dir, 'folia');
                return foliaInstaller;
            case 'PURPUR': return new PurpurInstaller(this.jarsDir);
            case 'FORGE': return new ForgeInstaller(this.jarsDir, this.javaInstaller);
            case 'FABRIC': return new FabricInstaller(this.jarsDir, this.javaInstaller);
            case 'NEOFORGE': return new NeoForgeInstaller(this.jarsDir, this.javaInstaller);
            default:
                throw new Error(`Software type ${type} is not supported or implemented yet.`);
        }
    }
}
