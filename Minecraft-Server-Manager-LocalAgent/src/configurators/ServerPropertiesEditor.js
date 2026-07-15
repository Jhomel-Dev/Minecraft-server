import fs from 'fs';
import path from 'path';

export default class ServerPropertiesEditor {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.propsPath = path.join(this.dataDir, 'server.properties');
    }

    acceptEula() {
        const eulaPath = path.join(this.dataDir, 'eula.txt');
        fs.writeFileSync(eulaPath, 'eula=true\n');
    }

    createOrUpdateProperties(config) {
        let props = this.readExistingProperties();
        const settings = this.getSettingsMap(config);

        for (const [key, value] of Object.entries(settings)) {
            props = this.applySetting(props, key, value);
        }

        fs.writeFileSync(this.propsPath, props.trim());
    }

    readExistingProperties() {
        if (!fs.existsSync(this.propsPath)) return '';
        return fs.readFileSync(this.propsPath, 'utf8');
    }

    getSettingsMap(config) {
        return {
            'server-port': config.port || 25565,
            'max-players': config.maxPlayers || 20,
            'white-list': config.whitelist ? 'true' : 'false',
            'online-mode': config.onlineMode ? 'true' : 'false'
        };
    }

    applySetting(props, key, value) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(props)) return props.replace(regex, `${key}=${value}`);
        return `${props}\n${key}=${value}`;
    }

    formatJvmArgs(config, softwareConfig) {
        const memString = this.getMemoryString(config.memory);
        const memoryArgXmx = `-Xmx${memString}`;
        const memoryArgXms = `-Xms${memString}`;
        
        let spawnArgs = [memoryArgXms, memoryArgXmx, '-XX:+AlwaysPreTouch'];

        if (softwareConfig.type === 'jar') {
            spawnArgs.push('-jar', softwareConfig.path, 'nogui');
            return spawnArgs;
        } 
        
        this.writeUserJvmArgs(memoryArgXms, memoryArgXmx);
        spawnArgs.push(...softwareConfig.args, 'nogui');
        return spawnArgs;
    }

    getMemoryString(memory) {
        if (!memory) return '2G';
        if (memory.endsWith('G') || memory.endsWith('M')) return memory;
        return `${memory}M`;
    }

    writeUserJvmArgs(xms, xmx) {
        const userJvmArgsFile = path.join(this.dataDir, 'user_jvm_args.txt');
        if (fs.existsSync(userJvmArgsFile)) return;
        fs.writeFileSync(userJvmArgsFile, `${xms}\n${xmx}\n-XX:+AlwaysPreTouch\n`);
    }
}
