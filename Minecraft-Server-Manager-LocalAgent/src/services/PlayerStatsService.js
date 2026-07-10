import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import nbt from 'prismarine-nbt';

export default class PlayerStatsService {
    constructor(config) {
        this.config = config;
    }

    async getPlayers(serverId, onlineNames = []) {
        const managerDir = path.join(os.homedir(), '.minecraft-manager');
        const baseDir = path.resolve(managerDir, 'servers', serverId);
        
        const uuidToName = await this.buildUuidToNameMap(baseDir);
        const { playersDir, files } = await this.getPlayerDataFiles(baseDir);
        
        const players = [];
        for (const file of files) {
            if (!file.endsWith('.dat')) continue;
            
            const uuid = file.replace('.dat', '');
            const name = uuidToName[uuid] || "Unknown Player";
            
            try {
                const playerData = await this.parsePlayerData(playersDir, file, baseDir, uuid, name, onlineNames);
                players.push(playerData);
            } catch (err) {}
        }
        
        return players;
    }

    async buildUuidToNameMap(baseDir) {
        const uuidToName = {};
        try {
            const cacheStr = await fs.readFile(path.join(baseDir, 'usercache.json'), 'utf-8');
            const usercache = JSON.parse(cacheStr);
            usercache.forEach(u => uuidToName[u.uuid] = u.name);
        } catch (e) {}
        return uuidToName;
    }

    async getPlayerDataFiles(baseDir) {
        const playerdataDir = path.join(baseDir, 'world', 'playerdata');
        const playersDataAltDir = path.join(baseDir, 'world', 'players', 'data');
        
        try {
            const files = await fs.readdir(playerdataDir);
            return { playersDir: playerdataDir, files };
        } catch(e) {
            try {
                const files = await fs.readdir(playersDataAltDir);
                return { playersDir: playersDataAltDir, files };
            } catch (err2) {
                return { playersDir: null, files: [] };
            }
        }
    }

    async parsePlayerData(playersDir, file, baseDir, uuid, name, onlineNames) {
        const filePath = path.join(playersDir, file);
        const buffer = await fs.readFile(filePath);
        const { parsed } = await nbt.parse(buffer);
        
        const basicStats = this.extractBasicStats(parsed);
        const inventory = this.extractInventory(parsed);
        const location = this.extractLocation(parsed);
        const gameStats = await this.extractGameStats(baseDir, uuid);
        
        return {
            uuid,
            name,
            ...basicStats,
            inventory,
            ...location,
            stats: gameStats,
            lastSeen: Date.now(),
            isOnline: onlineNames.includes(name)
        };
    }

    extractBasicStats(parsed) {
        const health = parsed.value.Health?.value ?? 20;
        const food = parsed.value.foodLevel?.value ?? 20;
        const xpLevel = parsed.value.XpLevel?.value ?? 0;
        return { health, food, xpLevel };
    }

    extractLocation(parsed) {
        let pos = [0, 0, 0];
        let dimension = "minecraft:overworld";
        
        if (parsed.value.Pos?.value?.value) {
            pos = parsed.value.Pos.value.value.map(p => Math.floor(p));
        }
        if (parsed.value.Dimension?.value) {
            dimension = parsed.value.Dimension.value;
        }
        return { pos, dimension };
    }

    extractInventory(parsed) {
        const inventory = [];
        const items = parsed.value.Inventory?.value?.value;
        if (!items) return inventory;

        items.forEach(item => {
            const parsedItem = this.parseInventoryItem(item);
            if (parsedItem) inventory.push(parsedItem);
        });

        return inventory;
    }

    parseInventoryItem(item) {
        const slotObj = item.Slot || item.slot;
        const idObj = item.id || item.Id;
        const countObj = item.Count || item.count;
        
        if (!slotObj || !idObj) return null;

        const customName = this.extractCustomName(item.tag);
        const enchantments = this.extractEnchantments(item.tag);

        return {
            slot: slotObj.value,
            id: idObj.value,
            count: countObj ? countObj.value : 1,
            customName,
            enchantments
        };
    }

    extractCustomName(tagObj) {
        const nameValue = tagObj?.value?.display?.value?.Name?.value;
        if (!nameValue) return null;

        try {
            const nameData = JSON.parse(nameValue);
            return nameData.text || nameData.translate || nameData.extra?.[0]?.text || nameValue;
        } catch (e) {
            return nameValue.replace(/§[0-9a-fk-or]/ig, '');
        }
    }

    extractEnchantments(tagObj) {
        const enchantments = [];
        
        const standardEnchs = tagObj?.value?.Enchantments?.value?.value;
        if (standardEnchs) {
            standardEnchs.forEach(e => {
                if (e.id && e.lvl) enchantments.push({ id: e.id.value.replace('minecraft:', ''), lvl: e.lvl.value });
            });
        }
        
        const storedEnchs = tagObj?.value?.StoredEnchantments?.value?.value;
        if (storedEnchs) {
            storedEnchs.forEach(e => {
                if (e.id && e.lvl) enchantments.push({ id: e.id.value.replace('minecraft:', ''), lvl: e.lvl.value });
            });
        }

        return enchantments;
    }

    async extractGameStats(baseDir, uuid) {
        let deaths = 0;
        let playTime = 0;
        let walkDistance = 0;
        
        try {
            const statsPath = path.join(baseDir, 'world', 'stats', `${uuid}.json`);
            const statsStr = await fs.readFile(statsPath, 'utf-8');
            const statsObj = JSON.parse(statsStr);
            const custom = statsObj.stats?.['minecraft:custom'];
            
            if (custom) {
                deaths = custom['minecraft:deaths'] || 0;
                playTime = custom['minecraft:play_time'] || 0; 
                walkDistance = custom['minecraft:walk_one_cm'] || 0; 
            }
        } catch (e) {}
        
        return { deaths, playTime, walkDistance };
    }
}
