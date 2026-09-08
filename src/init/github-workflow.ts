import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WORKFLOW_DIRECTORY = ".github/workflows";
const TEMPLATE_PATH = fileURLToPath(
  new URL("../templates/github-deploy.yml", import.meta.url),
);

export const GITHUB_WORKFLOW_PATH = `${WORKFLOW_DIRECTORY}/vpsd-deploy.yml`;

export async function renderGitHubWorkflow(): Promise<string> {
  return readFile(TEMPLATE_PATH, "utf8");
}

export async function writeGitHubWorkflow(
  root: string,
  replaceExistingDirectory: boolean,
): Promise<void> {
  const directory = join(root, WORKFLOW_DIRECTORY);
  if (replaceExistingDirectory) {
    await rm(directory, { recursive: true, force: true });
  }
  await mkdir(directory, { recursive: true });
  await copyFile(TEMPLATE_PATH, join(root, GITHUB_WORKFLOW_PATH));
}

export function getGitHubWorkflowTemplatePath(): string {
  return TEMPLATE_PATH;
}
