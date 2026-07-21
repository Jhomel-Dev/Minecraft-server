const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];
if (!version) {
  console.error('No version provided');
  process.exit(1);
}

const updateNpmPackage = (dir) => {
  try {
    console.log(`Bumping npm version in ${dir}...`);
    execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'inherit', cwd: dir });
  } catch (e) {
    console.error(`Error bumping npm version in ${dir}:`, e);
  }
};

const updateFileRegex = (filePath, regex, replaceStr) => {
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.replace(regex, replaceStr);
    fs.writeFileSync(fullPath, newContent);
    console.log(`Updated version in ${filePath}`);
  } catch (e) {
    console.error(`Error updating ${filePath}:`, e);
  }
};

const root = path.resolve(__dirname, '..');

['Minecraft-Server-Manager-Api', 'Minecraft-Server-Manager-Web', 'Minecraft-Server-Manager-LocalAgent', 'Minecraft-Server-Manager-AgentGUI'].forEach(dir => {
  updateNpmPackage(path.join(root, dir));
});

updateFileRegex(
  'Minecraft-Server-Manager-AgentGUI/src-tauri/tauri.conf.json',
  /"version": ".*"/,
  `"version": "${version}"`
);

updateFileRegex(
  'Minecraft-Server-Manager-AgentGUI/src-tauri/Cargo.toml',
  /version = ".*"/,
  `version = "${version}"`
);
