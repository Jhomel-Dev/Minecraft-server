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
    // Note: Forge/Vanilla use world/playerdata. Some implementations use world/players/data.
    const playerdataDir = path.join(baseDir, 'world', 'playerdata');
    const playersDataAltDir = path.join(baseDir, 'world', 'players', 'data');
    
    let playersDir = playerdataDir;
    let files = [];
    try {
      files = await fs.readdir(playerdataDir);
    } catch(e) {
      try {
        files = await fs.readdir(playersDataAltDir);
        playersDir = playersDataAltDir;
      } catch (err2) {
        return [];
      }
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
            const slotObj = item.Slot || item.slot;
            const idObj = item.id || item.Id;
            const countObj = item.Count || item.count;
            
            if (slotObj && idObj) {
              let customName = null;
              let enchantments = [];
              const tagObj = item.tag;
              
              if (tagObj && tagObj.value) {
                // Parse Custom Name
                if (tagObj.value.display && tagObj.value.display.value && tagObj.value.display.value.Name) {
                  try {
                    const nameData = JSON.parse(tagObj.value.display.value.Name.value);
                    customName = nameData.text || nameData.translate || nameData.extra?.[0]?.text || tagObj.value.display.value.Name.value;
                  } catch (e) {
                    customName = tagObj.value.display.value.Name.value.replace(/§[0-9a-fk-or]/ig, '');
                  }
                }
                
                // Parse Enchantments (1.20.4 and below)
                if (tagObj.value.Enchantments && tagObj.value.Enchantments.value && tagObj.value.Enchantments.value.value) {
                  const enchs = tagObj.value.Enchantments.value.value;
                  enchs.forEach(e => {
                    if (e.id && e.lvl) {
                      enchantments.push({
                        id: e.id.value.replace('minecraft:', ''),
                        lvl: e.lvl.value
                      });
                    }
                  });
                }
                // Parse StoredEnchantments (Books)
                if (tagObj.value.StoredEnchantments && tagObj.value.StoredEnchantments.value && tagObj.value.StoredEnchantments.value.value) {
                  const enchs = tagObj.value.StoredEnchantments.value.value;
                  enchs.forEach(e => {
                    if (e.id && e.lvl) {
                      enchantments.push({
                        id: e.id.value.replace('minecraft:', ''),
                        lvl: e.lvl.value
                      });
                    }
                  });
                }
              }
              
              inventory.push({
                slot: slotObj.value,
                id: idObj.value,
                count: countObj ? countObj.value : 1,
                customName,
                enchantments
              });
            }
          });
        }
        
        // Extract Position
        let pos = [0, 0, 0];
        let dimension = "minecraft:overworld";
        if (parsed.value.Pos && parsed.value.Pos.value && parsed.value.Pos.value.value) {
          pos = parsed.value.Pos.value.value.map(p => Math.floor(p));
        }
        if (parsed.value.Dimension && parsed.value.Dimension.value) {
          dimension = parsed.value.Dimension.value;
        }
        
        // Read Stats (world/stats/uuid.json)
        let deaths = 0;
        let playTime = 0;
        let walkDistance = 0;
        try {
          const statsPath = path.join(baseDir, 'world', 'stats', `${uuid}.json`);
          const statsStr = await fs.readFile(statsPath, 'utf-8');
          const statsObj = JSON.parse(statsStr);
          if (statsObj.stats && statsObj.stats['minecraft:custom']) {
            const custom = statsObj.stats['minecraft:custom'];
            deaths = custom['minecraft:deaths'] || 0;
            playTime = custom['minecraft:play_time'] || 0; // ticks
            walkDistance = custom['minecraft:walk_one_cm'] || 0; // cm
          }
        } catch (e) {
          // Stats file might not exist yet
        }
        
        players.push({
          uuid,
          name,
          health,
          food,
          xpLevel,
          inventory,
          pos,
          dimension,
          stats: { deaths, playTime, walkDistance },
          lastSeen: Date.now(), // Ideally we'd stat the file
          isOnline: onlineNames.includes(name)
        });
      } catch (err) {
        console.error(`Error parsing NBT for player ${uuid}:`, err);
      }
    }
    
    return players;
  }
}
