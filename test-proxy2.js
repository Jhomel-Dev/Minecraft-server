async function run() {
  try {
    const res = await fetch("https://api.papermc.io/v2/projects/paper");
    console.log("v2 Status:", res.status);
    const res3 = await fetch("https://api.papermc.io/v3/projects/paper", {
      headers: { "User-Agent": "MinecraftServerManager/1.0 (contact@example.com)" }
    });
    console.log("v3 Status:", res3.status);
  } catch (e) {
    console.error(e);
  }
}

run();
