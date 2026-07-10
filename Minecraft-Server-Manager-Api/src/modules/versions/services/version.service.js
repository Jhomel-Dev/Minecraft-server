class VersionService {
  constructor() {
    this.cache = {
      paper: [],
      fabric: { game: [], loaders: [] },
      lastUpdated: null
    };
    this.isUpdating = false;

    setInterval(() => this.updateCache(), 12 * 60 * 60 * 1000);
    this.updateCache();
  }

  async updateCache() {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      const [paperRes, fabricGameRes, fabricLoaderRes] = await Promise.all([
        fetch('https://fill.papermc.io/v3/projects/paper', {
          headers: { 'User-Agent': 'MinecraftServerManager/1.0 (contact@example.com)' }
        }),
        fetch('https://meta.fabricmc.net/v2/versions/game'),
        fetch('https://meta.fabricmc.net/v2/versions/loader')
      ]);

      if (!paperRes.ok) console.warn(`Paper API Error: ${paperRes.status}`);
      if (!fabricGameRes.ok) console.warn(`Fabric Game API Error: ${fabricGameRes.status}`);
      if (!fabricLoaderRes.ok) console.warn(`Fabric Loader API Error: ${fabricLoaderRes.status}`);

      const paperData = paperRes.ok ? await paperRes.json().catch(() => ({})) : {};
      const fabricGameData = fabricGameRes.ok ? await fabricGameRes.json().catch(() => []) : [];
      const fabricLoaderData = fabricLoaderRes.ok ? await fabricLoaderRes.json().catch(() => []) : [];

      let paperVersions = [];
      if (paperData && paperData.versions && typeof paperData.versions === 'object') {
        paperVersions = Object.values(paperData.versions).flat();
      }

      this.cache = {
        paper: paperVersions,
        fabric: {
          game: Array.isArray(fabricGameData) ? fabricGameData.filter(v => v.stable).map(v => v.version) : [],
          loaders: Array.isArray(fabricLoaderData) ? fabricLoaderData.map(v => v.version) : []
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error updating version cache:", error);
    } finally {
      this.isUpdating = false;
    }
  }

  async getVersions() {
    if (!this.cache.lastUpdated) {
      await this.updateCache();
    }
    return this.cache;
  }
}

export default new VersionService();
