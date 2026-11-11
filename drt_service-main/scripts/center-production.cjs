const { spawnSync } = require("node:child_process");
const path = require("node:path");

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  throw new Error("Use build or start.");
}

const args = [require.resolve("next/dist/bin/next"), command];
if (command === "build") {
  args.push("--webpack");
}
if (command === "start") {
  args.push("--hostname", process.env.CENTER_HOST || "127.0.0.1", "--port", process.env.PORT || "3000");
}

const result = spawnSync(process.execPath, args, {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: ".next-production" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
