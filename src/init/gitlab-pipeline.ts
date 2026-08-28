import { copyFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_PATH = fileURLToPath(
  new URL("../templates/gitlab-ci.yml", import.meta.url),
);

export const GITLAB_PIPELINE_PATH = ".gitlab-ci.yml";

export async function renderGitLabPipeline(): Promise<string> {
  return readFile(TEMPLATE_PATH, "utf8");
}

export async function writeGitLabPipeline(
  root: string,
  replaceExistingFile: boolean,
): Promise<void> {
  const destination = join(root, GITLAB_PIPELINE_PATH);
  if (replaceExistingFile) {
    await rm(destination, { force: true });
  }
  await copyFile(TEMPLATE_PATH, destination);
}

export function getGitLabPipelineTemplatePath(): string {
  return TEMPLATE_PATH;
}
