import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import nbt from 'prismarine-nbt';

export default class PlayerStatsService {
  constructor(config) {
    this.config = config;
  }

  async getPlayers(serverId) {
    const managerDir = path.join(os.homedir(), '.minecraft-manager');
    const baseDir = path.resolve(managerDir, 'servers', serverId);
    
    // 1. Read usercache.json to map UUIDs to Names
    let usercache = [];
    try {
      const cacheStr = await fs.readFile(path.join(baseDir, 'usercache.json'), 'utf-8');
      usercache = JSON.parse(cacheStr);
    } catch(e) {
      // It's normal if usercache doesn't exist yet
    }
    
    const uuidToName = {};
    usercache.forEach(u => uuidToName[u.uuid] = u.name);
    
    // 2. Read playerdata directory
    // Note: Forge/Vanilla use world/playerdata. Some setups might use worldName/playerdata.
    const playersDir = path.join(baseDir, 'world', 'playerdata');
    let files = [];
    try {
      files = await fs.readdir(playersDir);
    } catch(e) {
      // If folder doesn't exist, no players have joined yet
      return [];
    }
    
    const players = [];
    for (const file of files) {
      if (!file.endsWith('.dat')) continue;
      
      const uuid = file.replace('.dat', '');
      const name = uuidToName[uuid] || "Unknown Player";
      
      try {
        const filePath = path.join(playersDir, file);
        const buffer = await fs.readFile(filePath);
        const { parsed } = await nbt.parse(buffer);
        
        // Extract basic data
        const health = parsed.value.Health ? parsed.value.Health.value : 20;
        const food = parsed.value.foodLevel ? parsed.value.foodLevel.value : 20;
        const xpLevel = parsed.value.XpLevel ? parsed.value.XpLevel.value : 0;
        
        // Format inventory
        const inventory = [];
        if (parsed.value.Inventory && parsed.value.Inventory.value && parsed.value.Inventory.value.value) {
          const items = parsed.value.Inventory.value.value;
          items.forEach(item => {
            inventory.push({
              slot: item.Slot.value,
              id: item.id.value,
              count: item.Count.value
            });
          });
        }
        
        players.push({
          uuid,
          name,
          health,
          food,
          xpLevel,
          inventory,
          lastSeen: Date.now() // Ideally we'd stat the file
        });
      } catch (err) {
        console.error(`Error parsing NBT for player ${uuid}:`, err);
      }
    }
    
    return players;
  }
}
