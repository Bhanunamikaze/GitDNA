#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const profilesDir = path.join(repoRoot, "data", "profiles");
const outputRoot = path.join(repoRoot, "u");

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function profilePage(profile) {
  const username = escapeHtml(profile.username);
  const typeName = escapeHtml(profile.type_name);
  const aliasName = escapeHtml(profile.alias_name);
  const description = escapeHtml(
    `${username} is ${aliasName} (${typeName}) on GitDNA.`
  );
  const imageUrl = `../../data/cards/${username}.svg`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${username} | ${typeName} | GitDNA</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${username} is ${aliasName} | GitDNA" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${username} is ${aliasName} | GitDNA" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta http-equiv="refresh" content="0; url=../../index.html?user=${username}" />
  </head>
  <body>
    <p>Redirecting to GitDNA...</p>
  </body>
</html>
`;
}

function main() {
  if (!fs.existsSync(profilesDir)) {
    console.log("No demo profiles found.");
    return;
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  const files = fs
    .readdirSync(profilesDir)
    .filter((name) => name.startsWith("demo_") && name.endsWith(".json"));

  for (const file of files) {
    const profile = JSON.parse(
      fs.readFileSync(path.join(profilesDir, file), "utf8")
    );
    const dir = path.join(outputRoot, profile.username);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), profilePage(profile));
  }

  console.log(`Generated ${files.length} profile pages.`);
}

main();
