import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";

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
}
