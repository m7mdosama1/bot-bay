#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const py = process.platform === "win32" ? "python" : "python3";
const result = spawnSync(py, ["deploy.py", ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname),
  stdio: "inherit",
});
process.exit(result.status || 0);
