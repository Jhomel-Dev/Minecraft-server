// versionApi.js

// 1. OBTENER VERSIONES DE MINECRAFT POR SOFTWARE
export async function getMinecraftVersions(softwareType) {
  try {
    switch (softwareType.toLowerCase()) {
      case "vanilla": {
        try {
          const res = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
          const data = await res.json();
          return data.versions.filter(v => v.type === "release").map(v => v.id);
        } catch (e) {
          return [];
        }
      }
      case "paper":
      case "folia": {
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent(`https://fill.papermc.io/v3/projects/${softwareType.toLowerCase()}`));
          const data = await res.json();
          if (data && data.versions) {
            let versionsArr = [];
            if (Array.isArray(data.versions)) {
              versionsArr = data.versions;
            } else if (typeof data.versions === 'object') {
              versionsArr = Object.values(data.versions).flat();
            }
            return versionsArr.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
          }
          return [];
        } catch (e) {
          console.error(`Failed to fetch ${softwareType} versions:`, e);
          return [];
        }
      }
      case "purpur": {
        try {
          const res = await fetch("https://api.purpurmc.org/v2/purpur");
          const data = await res.json();
          if (data && Array.isArray(data.versions)) return data.versions.reverse();
          return [];
        } catch (e) {
          return [];
        }
      }
      case "fabric": {
        try {
          const res = await fetch("https://meta.fabricmc.net/v2/versions/game");
          const data = await res.json();
          if (Array.isArray(data)) return data.filter(v => v.stable).map(v => v.version);
          return [];
        } catch (e) {
          return [];
        }
      }
      case "forge": {
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"));
          const data = await res.json();
          const versions = new Set();
          if (data && data.promos) {
            for (const key of Object.keys(data.promos)) {
              const match = key.match(/^(\d+\.\d+(\.\d+)?)-/);
              if (match) versions.add(match[1]);
            }
          }
          return Array.from(versions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        } catch (e) {
          console.error("Failed to fetch forge versions:", e);
          return [];
        }
      }
      case "neoforge": {
        try {
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
        } catch (e) {
          console.error("Failed to fetch neoforge versions:", e);
          return [];
        }
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
      case "vanilla": return ["LATEST"]; // Vanilla no usa builds aquí
      case "paper":
      case "folia": {
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent(`https://fill.papermc.io/v3/projects/${softwareType.toLowerCase()}/versions/${mcVersion}`));
          if (!res.ok) return ["LATEST"];
          const data = await res.json();
          if (data && data.builds && Array.isArray(data.builds)) {
            const builds = data.builds;
            if (builds.length > 1 && builds[0] < builds[builds.length - 1]) {
              builds.reverse();
            }
            return builds.map(b => b.toString());
          }
          return ["LATEST"];
        } catch (e) {
          return ["LATEST"];
        }
      }
      case "purpur": {
        try {
          const res = await fetch(`https://api.purpurmc.org/v2/purpur/${mcVersion}`);
          if (!res.ok) return ["LATEST"];
          const data = await res.json();
          if (data && data.builds && data.builds.all) {
            return data.builds.all.reverse();
          }
          return ["LATEST"];
        } catch (e) {
          return ["LATEST"];
        }
      }
      case "fabric": {
        try {
          const res = await fetch("https://meta.fabricmc.net/v2/versions/loader");
          if (!res.ok) return ["LATEST"];
          const data = await res.json();
          return data.filter(v => v.stable).map(v => v.version);
        } catch (e) {
          return ["LATEST"];
        }
      }
      case "forge": {
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml"));
          if (!res.ok) return ["LATEST"];
          const text = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          const versions = Array.from(xmlDoc.getElementsByTagName("version")).map(v => v.textContent);
          
          const forgeBuilds = versions
            .filter(v => v.startsWith(`${mcVersion}-`))
            .map(v => v.split('-')[1])
            .reverse();
          return forgeBuilds.length > 0 ? forgeBuilds : ["LATEST"];
        } catch (e) {
          return ["LATEST"];
        }
      }
      case "neoforge": {
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml"));
          if (!res.ok) return ["LATEST"];
          const text = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          const versions = Array.from(xmlDoc.getElementsByTagName("version")).map(v => v.textContent);
          
          const parts = mcVersion.split('.');
          const neoPrefix = `${parts[1]}.${parts[2] || '0'}`;
          
          const neoBuilds = versions
            .filter(v => v.startsWith(`${neoPrefix}.`))
            .reverse();
          return neoBuilds.length > 0 ? neoBuilds : ["LATEST"];
        } catch (e) {
          return ["LATEST"];
        }
      }
      default: return ["LATEST"];
    }
  } catch (err) {
    console.error(`Error fetching builds for ${softwareType} ${mcVersion}:`, err);
    return ["LATEST"];
  }
}
