# [2.4.0](https://github.com/Jhomel-Dev/Minecraft-server/compare/v2.3.0...v2.4.0) (2026-07-21)


### Bug Fixes

* **agent:** support dynamic daemon port and fix e2e teardown process ([9d36d67](https://github.com/Jhomel-Dev/Minecraft-server/commit/9d36d679e203e11fed46048f3d2f5c378f395c3e))
* **api:** fix prisma esm import syntax and force client generation in CI ([c91ab86](https://github.com/Jhomel-Dev/Minecraft-server/commit/c91ab86e3e6301e3656d135c83e2a662d0f9b523))
* **api:** propagate serverId in SEND_COMMAND to LocalAgent ([0074990](https://github.com/Jhomel-Dev/Minecraft-server/commit/00749905072fe8e493281c64949a1d42f13c3a43))
* **ci:** fix E2E api startup and patch high severity npm vulnerabilities ([2bdf31f](https://github.com/Jhomel-Dev/Minecraft-server/commit/2bdf31ffef63ec15ab061908d5101ded53cd0489))
* **ci:** fix postgres health check and disable strict react-hooks lint rules ([94d0afb](https://github.com/Jhomel-Dev/Minecraft-server/commit/94d0afb0bc9a9dd24785a626691cd2192ffa88ff))
* **ci:** fix postgres health check, update dependencies, and resolve TS types ([91b261b](https://github.com/Jhomel-Dev/Minecraft-server/commit/91b261b592aa4c85014a77c94a31203b3b620538))
* **ci:** point wait-on to health endpoint and initialize db in e2e ([458799a](https://github.com/Jhomel-Dev/Minecraft-server/commit/458799ab66034c9d46fcb7d72af02a082fb28ec5))
* **ci:** prevent port collision by explicitly setting PORT 4000 for api and PORT 3000 for web ([6b8e946](https://github.com/Jhomel-Dev/Minecraft-server/commit/6b8e946a71b4f68a6b00e76b71b39b4e13601b78))
* **release:** include AgentGUI and Tauri files in automated versioning ([8e8db75](https://github.com/Jhomel-Dev/Minecraft-server/commit/8e8db75155af723334abd7b7fcfa5d0b9e93394d))
* **web:** hardcode 1GB RAM default limit and fix jsconfig TS parsing ([1b4dc04](https://github.com/Jhomel-Dev/Minecraft-server/commit/1b4dc0432f7464c72089ec80f74b51482215a1c9))


### Features

* **agent:** implement smart boot and refactor controller logic into services ([112ca9e](https://github.com/Jhomel-Dev/Minecraft-server/commit/112ca9eb0b3b36582c212bb16b0f457b10be4954))
* **release:** automate monorepo version bumping and changelog generation ([36b01ca](https://github.com/Jhomel-Dev/Minecraft-server/commit/36b01caf68f4ae71523648e14ffb384f9e85a2d5))
