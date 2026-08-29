import { spawn } from "node:child_process";
import { copyFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIRECTORY = fileURLToPath(
  new URL("../templates/nextjs/", import.meta.url),
);
const DOCKERFILE_TEMPLATE_PATH = join(TEMPLATE_DIRECTORY, "Dockerfile");
const NEXT_CONFIG_TEMPLATE_PATH = join(TEMPLATE_DIRECTORY, "next.config.mjs");
const GENERATED_NEXT_CONFIG_PATHS = [
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
] as const;

export const NEXTJS_DOCKERFILE_PATH = "app/Dockerfile";
export const NEXTJS_CONFIG_PATH = "app/next.config.mjs";

export interface NextJsInvocation {
  command: string;
  arguments: readonly string[];
  cwd: string;
}

export type NextJsCommandRunner = (
  invocation: NextJsInvocation,
) => Promise<void>;

export class NextJsInitializationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "NextJsInitializationError";
  }
}

export function createNextJsInvocation(
  root: string,
  appDefault: boolean,
): NextJsInvocation {
  return {
    command: "pnpm",
    arguments: [
      "dlx",
      "create-next-app@latest",
      "app",
      ...(appDefault ? ["--yes"] : []),
    ],
    cwd: root,
  };
}

export async function runNextJsCommand(
  invocation: NextJsInvocation,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, {
      cwd: invocation.cwd,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`create-next-app exited with code ${code ?? "unknown"}.`),
        );
    });
  });
}

export async function initializeNextJsApplication(
  root: string,
  appDefault: boolean,
  replaceExistingDirectory: boolean,
  runCommand: NextJsCommandRunner = runNextJsCommand,
): Promise<void> {
  if (replaceExistingDirectory) {
    await rm(join(root, "app"), { recursive: true, force: true });
  }

  try {
    await runCommand(createNextJsInvocation(root, appDefault));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new NextJsInitializationError(`create-next-app failed: ${detail}`);
  }

  try {
    await writeNextJsDockerBuildAssets(root);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new NextJsInitializationError(
      `Unable to configure the generated Next.js application: ${detail}`,
    );
  }
}

export async function writeNextJsDockerBuildAssets(
  root: string,
): Promise<void> {
  const applicationDirectory = join(root, "app");
  await Promise.all(
    GENERATED_NEXT_CONFIG_PATHS.map((path) =>
      rm(join(applicationDirectory, path), { force: true }),
    ),
  );
  await Promise.all([
    copyFile(DOCKERFILE_TEMPLATE_PATH, join(root, NEXTJS_DOCKERFILE_PATH)),
    copyFile(NEXT_CONFIG_TEMPLATE_PATH, join(root, NEXTJS_CONFIG_PATH)),
  ]);
}

export function getNextJsDockerBuildTemplatePaths(): {
  readonly dockerfile: string;
  readonly nextConfig: string;
} {
  return {
    dockerfile: DOCKERFILE_TEMPLATE_PATH,
    nextConfig: NEXT_CONFIG_TEMPLATE_PATH,
  };
}
