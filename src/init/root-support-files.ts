import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GITIGNORE_TEMPLATE_PATH = fileURLToPath(
  new URL("../templates/gitignore.template", import.meta.url),
);

export const GITIGNORE_PATH = ".gitignore";

export async function writeRootGitignore(root: string): Promise<void> {
  const destination = join(root, GITIGNORE_PATH);
  const template = await readFile(GITIGNORE_TEMPLATE_PATH, "utf8");

  try {
    const existing = await readFile(destination, "utf8");
    if (existing.includes(template)) return;
    await writeFile(
      destination,
      `${existing}${existing.endsWith("\n") || existing.length === 0 ? "" : "\n"}${template}`,
    );
  } catch (error) {
    if (isMissingPathError(error)) {
      await copyFile(GITIGNORE_TEMPLATE_PATH, destination);
      return;
    }
    throw error;
  }
}

export function getRootGitignoreTemplatePath(): string {
  return GITIGNORE_TEMPLATE_PATH;
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
