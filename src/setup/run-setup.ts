import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface SetupScriptInvocation {
  readonly command: string;
  readonly arguments: readonly string[];
}

export type SetupScriptRunner = (
  invocation: SetupScriptInvocation,
) => Promise<void>;

export interface SetupPrivilegeChecker {
  readonly isRoot: () => boolean;
  readonly findSudo: () => string | undefined;
}

export class SetupScriptError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SetupScriptError";
  }
}

export function getBundledSetupScriptPath(): string {
  return fileURLToPath(new URL("./setup-vps.sh", import.meta.url));
}

export function createSetupScriptInvocation(
  scriptArguments: readonly string[] = [],
  privileges: SetupPrivilegeChecker = systemPrivileges,
): SetupScriptInvocation {
  const scriptPath = getBundledSetupScriptPath();
  if (privileges.isRoot()) {
    return {
      command: "bash",
      arguments: [scriptPath, ...scriptArguments],
    };
  }

  const sudo = privileges.findSudo();
  if (sudo === undefined) {
    throw new SetupScriptError(
      "Root privileges are required for VPS setup. Install sudo or run the bundled setup script as root.",
    );
  }

  return {
    command: sudo,
    arguments: [
      "--preserve-env=DEPLOY_USER,SIMPLOY_DEPLOY_PATH,SIMPLOY_CADDY_CONFIG_PATH",
      "bash",
      scriptPath,
      ...scriptArguments,
    ],
  };
}

export async function runBundledSetupScript(
  scriptArguments: readonly string[] = [],
  runScript: SetupScriptRunner = runSetupScript,
  privileges: SetupPrivilegeChecker = systemPrivileges,
): Promise<void> {
  try {
    await runScript(createSetupScriptInvocation(scriptArguments, privileges));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new SetupScriptError(`VPS setup failed: ${detail}`);
  }
}

const systemPrivileges: SetupPrivilegeChecker = {
  isRoot: () => process.getuid?.() === 0,
  findSudo: () => {
    const result = spawnSync("sudo", ["--version"], { stdio: "ignore" });
    const error = result.error as NodeJS.ErrnoException | undefined;
    return error?.code === "ENOENT" ? undefined : "sudo";
  },
};

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
