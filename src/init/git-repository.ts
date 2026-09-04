import { spawn } from "node:child_process";
import { lstat } from "node:fs/promises";
import { join } from "node:path";

export interface GitInvocation {
  readonly command: "git";
  readonly arguments: readonly ["init"];
  readonly cwd: string;
}

export type GitCommandRunner = (invocation: GitInvocation) => Promise<void>;

export class GitRepositoryInitializationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GitRepositoryInitializationError";
  }
}

export function createGitInitializationInvocation(root: string): GitInvocation {
  return { command: "git", arguments: ["init"], cwd: root };
}

export async function assertRootGitRepositoryAbsent(
  root: string,
): Promise<void> {
  try {
    await lstat(join(root, ".git"));
  } catch (error) {
    if (isMissingPathError(error)) return;
    throw error;
  }

  throw new GitRepositoryInitializationError(
    "An existing Git repository at the project root is not supported by simploy init.",
  );
}

export async function initializeRootGitRepository(
  root: string,
  runCommand: GitCommandRunner = runGitCommand,
): Promise<void> {
  try {
    await runCommand(createGitInitializationInvocation(root));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new GitRepositoryInitializationError(`git init failed: ${detail}`);
  }
}

async function runGitCommand(invocation: GitInvocation): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, {
      cwd: invocation.cwd,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git init exited with code ${code ?? "unknown"}.`));
    });
  });
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
