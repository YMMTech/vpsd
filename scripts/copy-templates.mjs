import { cp, rm } from "node:fs/promises";

await rm("dist/templates", { force: true, recursive: true });
await Promise.all([
  cp("src/templates", "dist/templates", { force: true, recursive: true }),
  cp("src/setup/setup-vps.sh", "dist/setup/setup-vps.sh", { force: true }),
]);
