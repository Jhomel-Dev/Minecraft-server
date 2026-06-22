export async function searchModrinth(query, softwareType, mcVersion) {
  try {
    // Definir la categoría base según el tipo de servidor
    let loaderFacet = "";
    const type = softwareType.toLowerCase();
    
    if (["paper", "purpur", "folia", "vanilla"].includes(type)) {
      loaderFacet = "categories:paper"; // O bukkit/spigot, Modrinth usa paper y spigot. Usaremos paper
    } else if (type === "fabric") {
      loaderFacet = "categories:fabric";
    } else if (type === "forge" || type === "neoforge") {
      loaderFacet = `categories:${type}`;
    }

    // mcVersion puede venir como "1.20.1-47.2.0". Extraemos solo "1.20.1"
    const baseMcVersion = mcVersion.split('-')[0];

    // Construir facets en formato JSON stringificado
    // Ejemplo: [["categories:paper"], ["versions:1.20.1"]]
    const facets = [
      [loaderFacet],
      [`versions:${baseMcVersion}`]
    ];

    const url = new URL("https://api.modrinth.com/v2/search");
    url.searchParams.append("query", query);
    url.searchParams.append("facets", JSON.stringify(facets));
    url.searchParams.append("limit", "10");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Error fetching from Modrinth");
    
    return await res.json();
  } catch (err) {
    console.error("Modrinth search error:", err);
    return { hits: [] };
  }
}

// Obtener las versiones (archivos) específicos de un proyecto para poder descargarlo
export async function getProjectVersions(projectId, softwareType, mcVersion) {
  try {
    const type = softwareType.toLowerCase();
    let loaders = [];
    if (["paper", "purpur", "folia"].includes(type)) loaders = ["paper", "spigot", "bukkit"];
    else if (type === "fabric") loaders = ["fabric"];
    else if (type === "forge") loaders = ["forge"];
    else if (type === "neoforge") loaders = ["neoforge"];

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
