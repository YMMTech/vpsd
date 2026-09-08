import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { InitInput } from "./input.js";

const TEMPLATE_DIRECTORY = fileURLToPath(
  new URL("../templates/", import.meta.url),
);
const DEPLOY_ENV_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "deploy.env.template",
);
const COMPOSE_TEMPLATE_PATH = join(TEMPLATE_DIRECTORY, "compose.yml");
const CADDYFILE_TEMPLATE_PATH = join(TEMPLATE_DIRECTORY, "Caddyfile");

export interface CoreDeploymentAssets {
  readonly deployEnv: string;
  readonly compose: string;
  readonly caddyfile: string;
}

export async function renderCoreDeploymentAssets(
  input: InitInput,
): Promise<CoreDeploymentAssets> {
  const [deployEnvTemplate, compose, caddyfile] = await Promise.all([
    readFile(DEPLOY_ENV_TEMPLATE_PATH, "utf8"),
    readFile(COMPOSE_TEMPLATE_PATH, "utf8"),
    readFile(CADDYFILE_TEMPLATE_PATH, "utf8"),
  ]);

  return {
    deployEnv: applyDeploymentValues(deployEnvTemplate, input),
    compose,
    caddyfile,
  };
}

export async function writeCoreDeploymentAssets(
  root: string,
  input: InitInput,
  replaceExistingDirectory: boolean,
): Promise<void> {
  const directory = join(root, "vpsd");
  if (replaceExistingDirectory) {
    await rm(directory, { recursive: true, force: true });
  }
  await mkdir(directory, { recursive: true });

  const deployEnvTemplate = await readFile(DEPLOY_ENV_TEMPLATE_PATH, "utf8");
  await Promise.all([
    writeFile(
      join(directory, "deploy.env"),
      applyDeploymentValues(deployEnvTemplate, input),
    ),
    copyFile(COMPOSE_TEMPLATE_PATH, join(directory, "compose.yml")),
    copyFile(CADDYFILE_TEMPLATE_PATH, join(directory, "Caddyfile")),
  ]);
}

export function getCoreDeploymentTemplatePaths(): {
  readonly deployEnv: string;
  readonly compose: string;
  readonly caddyfile: string;
} {
  return {
    deployEnv: DEPLOY_ENV_TEMPLATE_PATH,
    compose: COMPOSE_TEMPLATE_PATH,
    caddyfile: CADDYFILE_TEMPLATE_PATH,
  };
}

function applyDeploymentValues(template: string, input: InitInput): string {
  return template
    .replace("__DOMAIN__", input.domain)
    .replace("__APP_PORT__", String(input.port));
}
