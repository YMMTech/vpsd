import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface SetupScriptInvocation {
  readonly command: string;
  readonly arguments: readonly string[];
}

export type SetupScriptRunner = (
  invocation: SetupScriptInvocation,
) => Promise<void>;

export class SetupScriptError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SetupScriptError";
  }
}

export function getBundledSetupScriptPath(): string {
  return fileURLToPath(new URL("./setup-vps.sh", import.meta.url));
}

export function createSetupScriptInvocation(): SetupScriptInvocation {
  return {
    command: "bash",
    arguments: [getBundledSetupScriptPath()],
  };
}

export async function runBundledSetupScript(
  runScript: SetupScriptRunner = runSetupScript,
): Promise<void> {
  try {
    await runScript(createSetupScriptInvocation());
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new SetupScriptError(`VPS setup failed: ${detail}`);
  }
}

async function runSetupScript(
  invocation: SetupScriptInvocation,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, {
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`setup script exited with code ${code ?? "unknown"}.`),
        );
    });
  });
}
