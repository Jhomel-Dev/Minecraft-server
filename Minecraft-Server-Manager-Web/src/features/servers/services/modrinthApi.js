export async function searchModrinth(query, softwareType, mcVersion, mode = "mods") {
  try {
    let loaderFacets = [];
    const type = softwareType.toLowerCase();
    
    if (mode === "plugins") {
      loaderFacets = ["categories:paper", "categories:spigot", "categories:bukkit"];
    } else {
      if (type === "fabric") {
        loaderFacets = ["categories:fabric"];
      } else if (type === "forge" || type === "neoforge") {
        loaderFacets = [`categories:${type}`];
      } else {
        loaderFacets = ["categories:forge", "categories:fabric", "categories:neoforge"];
      }
    }

    const baseMcVersion = mcVersion.split('-')[0];

    const facets = [
      loaderFacets,
      [`versions:${baseMcVersion}`]
    ];

    const url = new URL("https://api.modrinth.com/v2/search");
    url.searchParams.append("query", query);
    url.searchParams.append("facets", JSON.stringify(facets));
    url.searchParams.append("limit", "20");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Error fetching from Modrinth");
    
    return await res.json();
  } catch (err) {
    console.error("Modrinth search error:", err);
    return { hits: [] };
  }
}

export async function getProjectVersions(projectId, softwareType, mcVersion, mode = "mods") {
  try {
    const type = softwareType.toLowerCase();
    let loaders = [];
    
    if (mode === "plugins") {
      loaders = ["paper", "spigot", "bukkit"];
    } else {
      if (type === "fabric") loaders = ["fabric"];
      else if (type === "forge") loaders = ["forge"];
      else if (type === "neoforge") loaders = ["neoforge"];
    }

    const baseMcVersion = mcVersion.split('-')[0];

    const url = new URL(`https://api.modrinth.com/v2/project/${projectId}/version`);
    url.searchParams.append("game_versions", JSON.stringify([baseMcVersion]));
    url.searchParams.append("loaders", JSON.stringify(loaders));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Error fetching project versions");
    
    return await res.json();
  } catch (err) {
    console.error("Modrinth versions error:", err);
    return [];
  }
}

export async function getProject(projectId) {
  try {
    const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
    if (!res.ok) throw new Error("Error fetching project");
    return await res.json();
  } catch (err) {
    console.error("Modrinth project error:", err);
    return null;
  }
}
