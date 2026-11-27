const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const roots = [
  "server.js",
  "firebase",
  "middleware",
  "routes",
  "services",
  "tests",
  "scripts",
];

const collectJavaScriptFiles = (path) => {
  if (path.endsWith(".js")) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const childPath = join(path, entry.name);

    if (entry.isDirectory()) return collectJavaScriptFiles(childPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [childPath] : [];
  });
};

for (const file of roots.flatMap(collectJavaScriptFiles)) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status || 1);
}
