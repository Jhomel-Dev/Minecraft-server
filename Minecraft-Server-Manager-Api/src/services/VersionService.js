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
        fetch('https://api.papermc.io/v2/projects/paper'),
        fetch('https://meta.fabricmc.net/v2/versions/game'),
        fetch('https://meta.fabricmc.net/v2/versions/loader')
      ]);

      const paperData = await paperRes.json();
      const fabricGameData = await fabricGameRes.json();
      const fabricLoaderData = await fabricLoaderRes.json();

      this.cache = {
        paper: paperData.versions.reverse(),
        fabric: {
          game: fabricGameData.filter(v => v.stable).map(v => v.version),
          loaders: fabricLoaderData.map(v => v.version)
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(error);
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
