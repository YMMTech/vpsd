import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { InitInput } from "./input.js";

export interface CoreDeploymentAssets {
  readonly deployEnv: string;
  readonly compose: string;
  readonly caddyfile: string;
}

export function renderCoreDeploymentAssets(
  input: InitInput,
): CoreDeploymentAssets {
  return {
    deployEnv: `DOMAIN=${input.domain}\nAPP_PORT=${input.port}\n`,
    compose: `services:
  app:
    image: "\${APP_IMAGE:?APP_IMAGE must be an immutable image reference}"
    env_file:
      - deploy.env
    expose:
      - "\${APP_PORT}"
    networks:
      - simploy-ingress

networks:
  simploy-ingress:
    external: true
    name: simploy-ingress
`,
    caddyfile: `{$DOMAIN} {
  reverse_proxy app:{$APP_PORT}
}
`,
  };
}

export async function writeCoreDeploymentAssets(
  root: string,
  input: InitInput,
  replaceExistingDirectory: boolean,
): Promise<void> {
  const directory = join(root, "simploy");
  if (replaceExistingDirectory) {
    await rm(directory, { recursive: true, force: true });
  }
  await mkdir(directory, { recursive: true });

  const assets = renderCoreDeploymentAssets(input);
  await Promise.all([
    writeFile(join(directory, "deploy.env"), assets.deployEnv),
    writeFile(join(directory, "compose.yml"), assets.compose),
    writeFile(join(directory, "Caddyfile"), assets.caddyfile),
  ]);
}
