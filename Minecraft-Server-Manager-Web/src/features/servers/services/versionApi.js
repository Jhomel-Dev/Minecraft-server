// versionApi.js

// 1. OBTENER VERSIONES DE MINECRAFT POR SOFTWARE
export async function getMinecraftVersions(softwareType) {
  try {
    switch (softwareType.toLowerCase()) {
      case "vanilla": {
        const res = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
        const data = await res.json();
        return data.versions.filter(v => v.type === "release").map(v => v.id);
      }
      case "paper":
      case "folia": {
        const res = await fetch(`https://api.papermc.io/v2/projects/${softwareType.toLowerCase()}`);
        const data = await res.json();
        return data.versions.reverse();
      }
      case "purpur": {
        const res = await fetch("https://api.purpurmc.org/v2/purpur");
        const data = await res.json();
        return data.versions.reverse();
      }
      case "fabric": {
        const res = await fetch("https://meta.fabricmc.net/v2/versions/game");
        const data = await res.json();
        return data.filter(v => v.stable).map(v => v.version);
      }
      case "forge": {
        const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"));
        const data = await res.json();
        const versions = new Set();
        for (const key of Object.keys(data.promos)) {
          const match = key.match(/^(\d+\.\d+(\.\d+)?)-/);
          if (match) versions.add(match[1]);
        }
        return Array.from(versions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      }
      case "neoforge": {
        const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml"));
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const versions = Array.from(xmlDoc.getElementsByTagName("version")).map(v => v.textContent);
        
        const mcVersions = new Set();
        versions.forEach(v => {
          const parts = v.split('.');
          if (parts.length >= 2) {
            const minor = parts[1] === "0" ? "" : `.${parts[1]}`;
            mcVersions.add(`1.${parts[0]}${minor}`);
          }
        });
        return Array.from(mcVersions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      }
      default: return [];
    }
  } catch (err) {
    console.error(`Error fetching MC versions for ${softwareType}:`, err);
    return [];
  }
}

// 2. OBTENER BUILDS ESPECÍFICOS PARA UNA VERSIÓN DE MC Y SOFTWARE
export async function getSoftwareBuilds(softwareType, mcVersion) {
  try {
    switch (softwareType.toLowerCase()) {
      case "vanilla": {
        // Vanilla no tiene "builds", la version de MC es todo lo que hay.
        return ["LATEST"];
      }
      case "paper":
      case "folia": {
        const res = await fetch(`https://api.papermc.io/v2/projects/${softwareType.toLowerCase()}/versions/${mcVersion}`);
        if (!res.ok) return ["LATEST"];
        const data = await res.json();
        return data.builds.reverse().map(b => b.toString());
      }
      case "purpur": {
        const res = await fetch(`https://api.purpurmc.org/v2/purpur/${mcVersion}`);
        if (!res.ok) return ["LATEST"];
        const data = await res.json();
        return data.builds.all.reverse();
      }
      case "fabric": {
        const res = await fetch("https://meta.fabricmc.net/v2/versions/loader");
        const data = await res.json();
        return data.filter(v => v.stable).map(v => v.version);
      }
      case "forge": {
        const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml"));
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const versions = Array.from(xmlDoc.getElementsByTagName("version")).map(v => v.textContent);
        
        // Filtrar las versiones que empiezan con mcVersion
        const forgeBuilds = versions
          .filter(v => v.startsWith(`${mcVersion}-`))
          .map(v => v.split('-')[1]) // Extraer solo la parte del build
          .reverse();
        return forgeBuilds.length > 0 ? forgeBuilds : ["LATEST"];
      }
      case "neoforge": {
        const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml"));
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const versions = Array.from(xmlDoc.getElementsByTagName("version")).map(v => v.textContent);
        
        // NeoForge usa versiones como 20.4.80. Mapear mcVersion 1.20.4 a 20.4
        const parts = mcVersion.split('.');
        const neoPrefix = `${parts[1]}.${parts[2] || '0'}`;
        
        const neoBuilds = versions
          .filter(v => v.startsWith(`${neoPrefix}.`))
          .reverse();
        return neoBuilds.length > 0 ? neoBuilds : ["LATEST"];
      }
      default: return ["LATEST"];
    }
  } catch (err) {
    console.error(`Error fetching builds for ${softwareType} ${mcVersion}:`, err);
    return ["LATEST"];
  }
}
