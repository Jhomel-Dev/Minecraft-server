# Mods and Plugins Management

CraftControl makes it easy to expand your Minecraft servers by allowing you to manage `Mods` and `Plugins` directly from the Web Dashboard without needing to deal with FTP clients.

## Plugins (Paper and Purpur)

If you selected "Paper" or "Purpur" during server creation, the "Plugins" tab will be available on your dashboard.

1. **Direct Installation:** Go to the **Plugins > Store** tab to instantly search and install plugins from Modrinth (e.g., `EssentialsX`, `WorldEdit`).
2. **Manual Upload:** You can also use the **File Manager** to drag and drop `.jar` files into your server's `/plugins` folder.
3. **Mandatory Restart:** Remember that for a new plugin to be detected and start generating its configuration files (`config.yml`), you must stop and start the server again.

## Mods (Fabric, Forge, and NeoForge)

If you installed a Fabric or Forge based server, you will see the "Mods" tab.

1. **Installation:** Similar to plugins, the **Store** allows you to search for mods compatible with your exact game version.
2. **Dependencies:** Always make sure to install necessary libraries (e.g., `Fabric API` for Fabric servers) or the game might crash on startup.
3. **Same Mod on Client:** Remember that unlike Paper plugins (which are Server-Side), Fabric/Forge mods usually require **all players** to also have the exact same `.jar` files installed in their Minecraft client in order to join.

## Troubleshooting

- **Crash on startup:** If the server shuts down suddenly after installing a mod or plugin, check the **Console**. The Java log will indicate if a dependency is missing (e.g., `java.lang.NoClassDefFoundError`).
- **Incompatible Version:** CraftControl automatically filters the store based on your server version, but if you upload a file manually, ensure it matches your version (e.g., 1.20.1).
