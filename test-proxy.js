async function run() {
  try {
    const res = await fetch("https://api.papermc.io/v3/projects/paper", {
      headers: { "User-Agent": "MinecraftServerManager/1.0" }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Versions length:", json.versions?.length);
  } catch (e) {
    console.error(e);
  }
}

run();
