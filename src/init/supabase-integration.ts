import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIRECTORY = fileURLToPath(
  new URL("../templates/", import.meta.url),
);
const SUPABASE_CONTRACT_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "services/supabase/README.md",
);
const NEXTJS_CLIENT_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/client.ts.template",
);
const NEXTJS_SERVER_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/server.ts.template",
);
const NEXTJS_AUTH_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/auth.ts.template",
);
const NEXTJS_STORAGE_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/storage.ts.template",
);
const NEXTJS_ADMIN_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/admin.ts.template",
);
const NEXTJS_PROXY_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/proxy.ts.template",
);
const NEXTJS_PROXY_ENTRY_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "nextjs/supabase/proxy-entry.ts.template",
);
const SUPABASE_INITIAL_MIGRATION_TEMPLATE_PATH = join(
  TEMPLATE_DIRECTORY,
  "supabase/migrations/20250101000000_initial_schema.sql",
);

export const SUPABASE_SERVICE_DIRECTORY = "services/supabase";
export const SUPABASE_MIGRATION_DIRECTORY = "supabase/migrations";
export const NEXTJS_SUPABASE_DIRECTORY = "app/lib/supabase";
export const NEXTJS_SUPABASE_PACKAGES = [
  "@supabase/supabase-js",
  "@supabase/ssr",
] as const;

export interface SupabaseDependencyInvocation {
  readonly command: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
}

export type SupabaseDependencyRunner = (
  invocation: SupabaseDependencyInvocation,
) => Promise<void>;

export class SupabaseDependencyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SupabaseDependencyError";
  }
}

export interface SupabaseIntegrationAssets {
  readonly contract: string;
  readonly clientHelper: string;
  readonly serverHelper: string;
  readonly authHelper: string;
  readonly storageHelper: string;
  readonly adminHelper: string;
  readonly proxyHelper: string;
  readonly proxyEntry: string;
  readonly initialMigration: string;
}

export function createNextJsSupabaseDependencyInvocation(
  root: string,
): SupabaseDependencyInvocation {
  return {
    command: "pnpm",
    arguments: ["--dir", "app", "add", ...NEXTJS_SUPABASE_PACKAGES],
    cwd: root,
  };
}

export async function installNextJsSupabaseDependencies(
  root: string,
  runCommand: SupabaseDependencyRunner = runSupabaseDependencyCommand,
): Promise<void> {
  try {
    await runCommand(createNextJsSupabaseDependencyInvocation(root));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new SupabaseDependencyError(
      `Unable to add required Supabase client dependencies: ${detail}`,
    );
  }
}

export async function renderSupabaseIntegrationAssets(): Promise<SupabaseIntegrationAssets> {
  const [
    contract,
    clientHelper,
    serverHelper,
    authHelper,
    storageHelper,
    adminHelper,
    proxyHelper,
    proxyEntry,
    initialMigration,
  ] = await Promise.all([
    readFile(SUPABASE_CONTRACT_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_CLIENT_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_SERVER_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_AUTH_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_STORAGE_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_ADMIN_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_PROXY_TEMPLATE_PATH, "utf8"),
    readFile(NEXTJS_PROXY_ENTRY_TEMPLATE_PATH, "utf8"),
    readFile(SUPABASE_INITIAL_MIGRATION_TEMPLATE_PATH, "utf8"),
  ]);

  return {
    contract,
    clientHelper,
    serverHelper,
    authHelper,
    storageHelper,
    adminHelper,
    proxyHelper,
    proxyEntry,
    initialMigration,
  };
}

export async function initializeSupabaseIntegration(
  root: string,
  replaceExistingServiceDirectory: boolean,
  runCommand: SupabaseDependencyRunner = runSupabaseDependencyCommand,
  replaceExistingMigrationDirectory = replaceExistingServiceDirectory,
): Promise<void> {
  await installNextJsSupabaseDependencies(root, runCommand);
  await writeSupabaseIntegration(
    root,
    replaceExistingServiceDirectory,
    replaceExistingMigrationDirectory,
  );
}

export async function writeSupabaseIntegration(
  root: string,
  replaceExistingServiceDirectory: boolean,
  replaceExistingMigrationDirectory = replaceExistingServiceDirectory,
): Promise<void> {
  const serviceDirectory = join(root, SUPABASE_SERVICE_DIRECTORY);
  const applicationDirectory = join(root, NEXTJS_SUPABASE_DIRECTORY);
  const migrationDirectory = join(root, SUPABASE_MIGRATION_DIRECTORY);

  if (replaceExistingServiceDirectory) {
    await rm(serviceDirectory, { recursive: true, force: true });
  }
  if (replaceExistingMigrationDirectory) {
    await rm(join(root, "supabase"), { recursive: true, force: true });
  }

  await Promise.all([
    mkdir(serviceDirectory, { recursive: true }),
    mkdir(applicationDirectory, { recursive: true }),
    mkdir(migrationDirectory, { recursive: true }),
  ]);
  await Promise.all([
    copyFile(
      SUPABASE_CONTRACT_TEMPLATE_PATH,
      join(serviceDirectory, "README.md"),
    ),
    copyFile(
      NEXTJS_CLIENT_TEMPLATE_PATH,
      join(applicationDirectory, "client.ts"),
    ),
    copyFile(
      NEXTJS_SERVER_TEMPLATE_PATH,
      join(applicationDirectory, "server.ts"),
    ),
    copyFile(NEXTJS_AUTH_TEMPLATE_PATH, join(applicationDirectory, "auth.ts")),
    copyFile(
      NEXTJS_STORAGE_TEMPLATE_PATH,
      join(applicationDirectory, "storage.ts"),
    ),
    copyFile(
      NEXTJS_ADMIN_TEMPLATE_PATH,
      join(applicationDirectory, "admin.ts"),
    ),
    copyFile(
      NEXTJS_PROXY_TEMPLATE_PATH,
      join(applicationDirectory, "proxy.ts"),
    ),
    copyFile(NEXTJS_PROXY_ENTRY_TEMPLATE_PATH, join(root, "app", "proxy.ts")),
    copyFile(
      SUPABASE_INITIAL_MIGRATION_TEMPLATE_PATH,
      join(migrationDirectory, "20250101000000_initial_schema.sql"),
    ),
  ]);
}

export function getSupabaseIntegrationTemplatePaths(): {
  readonly contract: string;
  readonly clientHelper: string;
  readonly serverHelper: string;
  readonly authHelper: string;
  readonly storageHelper: string;
  readonly adminHelper: string;
  readonly proxyHelper: string;
  readonly proxyEntry: string;
  readonly initialMigration: string;
} {
  return {
    contract: SUPABASE_CONTRACT_TEMPLATE_PATH,
    clientHelper: NEXTJS_CLIENT_TEMPLATE_PATH,
    serverHelper: NEXTJS_SERVER_TEMPLATE_PATH,
    authHelper: NEXTJS_AUTH_TEMPLATE_PATH,
    storageHelper: NEXTJS_STORAGE_TEMPLATE_PATH,
    adminHelper: NEXTJS_ADMIN_TEMPLATE_PATH,
    proxyHelper: NEXTJS_PROXY_TEMPLATE_PATH,
    proxyEntry: NEXTJS_PROXY_ENTRY_TEMPLATE_PATH,
    initialMigration: SUPABASE_INITIAL_MIGRATION_TEMPLATE_PATH,
  };
}

async function runSupabaseDependencyCommand(
  invocation: SupabaseDependencyInvocation,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, {
      cwd: invocation.cwd,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm exited with code ${code ?? "unknown"}.`));
    });
  });
}
