import { cp } from "node:fs/promises";

await Promise.all([
  cp("src/templates", "dist/templates", { force: true, recursive: true }),
  cp("src/setup/setup-vps.sh", "dist/setup/setup-vps.sh", { force: true }),
]);
