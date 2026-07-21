module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ['@semantic-release/npm', {
      npmPublish: false,
    }],
    ['@semantic-release/exec', {
      prepareCmd: 'cd Minecraft-Server-Manager-Api && npm version ${nextRelease.version} --no-git-tag-version && cd ../Minecraft-Server-Manager-Web && npm version ${nextRelease.version} --no-git-tag-version && cd ../Minecraft-Server-Manager-LocalAgent && npm version ${nextRelease.version} --no-git-tag-version'
    }],
    ['@semantic-release/git', {
      assets: [
        'CHANGELOG.md',
        'package.json',
        'package-lock.json',
        'Minecraft-Server-Manager-Api/package.json',
        'Minecraft-Server-Manager-Api/package-lock.json',
        'Minecraft-Server-Manager-Web/package.json',
        'Minecraft-Server-Manager-Web/package-lock.json',
        'Minecraft-Server-Manager-LocalAgent/package.json',
        'Minecraft-Server-Manager-LocalAgent/package-lock.json'
      ],
      message: 'chore(release): set version to ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }],
    '@semantic-release/github'
  ]
};
