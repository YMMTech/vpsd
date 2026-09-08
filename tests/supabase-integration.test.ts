import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import {
  createNextJsSupabaseDependencyInvocation,
  getSupabaseIntegrationTemplatePaths,
  initializeSupabaseIntegration,
  installNextJsSupabaseDependencies,
  NEXTJS_SUPABASE_PACKAGES,
  renderSupabaseIntegrationAssets,
  type SupabaseDependencyInvocation,
  writeSupabaseIntegration,
} from "../src/init/supabase-integration.js";

const roots: string[] = [];

class NonInteractivePrompter implements InitPrompter {
  public async ask(): Promise<undefined> {
    return undefined;
  }

  public async confirm(): Promise<boolean> {
    return true;
  }

  public showError(): void {}
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "vpsd-supabase-"));
  roots.push(root);
  return root;
}

describe("Supabase external-service integration", () => {
  it("copies the bundled external-service contract and Next.js helpers", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "app"));
    await mkdir(join(root, "services", "supabase"), { recursive: true });
    await writeFile(join(root, "services", "supabase", "stale.txt"), "stale");

    await writeSupabaseIntegration(root, true);

    expect(await readdir(join(root, "services", "supabase"))).toEqual([
      "README.md",
    ]);
    const templates = getSupabaseIntegrationTemplatePaths();
    await expect(
      readFile(join(root, "services", "supabase", "README.md"), "utf8"),
    ).resolves.toBe(await readFile(templates.contract, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "client.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.clientHelper, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "server.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.serverHelper, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "admin.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.adminHelper, "utf8"));
    await expect(readFile(join(root, "app", "proxy.ts"), "utf8")).resolves.toBe(
      await readFile(templates.proxyEntry, "utf8"),
    );
    await expect(
      readFile(join(root, "app", "lib", "supabase", "auth.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.authHelper, "utf8"));
    await expect(
      readFile(join(root, "app", "lib", "supabase", "storage.ts"), "utf8"),
    ).resolves.toBe(await readFile(templates.storageHelper, "utf8"));
    await expect(
      readFile(
        join(
          root,
          "supabase",
          "migrations",
          "20250101000000_initial_schema.sql",
        ),
        "utf8",
      ),
    ).resolves.toBe(await readFile(templates.initialMigration, "utf8"));
  });

  it("documents runtime-only credentials without writing credential values", async () => {
    const assets = await renderSupabaseIntegrationAssets();
    const generatedContent = Object.values(assets).join("\n");

    expect(generatedContent).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(generatedContent).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(generatedContent).not.toMatch(
      /(?:eyJ|sb_publishable_|service_role=)/,
    );
    expect(generatedContent).toContain(
      "Never expose it through `NEXT_PUBLIC_`",
    );
  });

  it("adds the required official Supabase client dependencies with pnpm", async () => {
    let invocation: SupabaseDependencyInvocation | undefined;

    await installNextJsSupabaseDependencies("/project", async (value) => {
      invocation = value;
    });

    expect(createNextJsSupabaseDependencyInvocation("/project")).toEqual({
      command: "pnpm",
      arguments: ["--dir", "app", "add", ...NEXTJS_SUPABASE_PACKAGES],
      cwd: "/project",
    });
    expect(invocation).toEqual(
      createNextJsSupabaseDependencyInvocation("/project"),
    );
  });

  it("makes the service own its dependencies and generated boilerplate", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "app"));
    await writeFile(join(root, "app", "package.json"), "{}");
    let invocation: SupabaseDependencyInvocation | undefined;

    await initializeSupabaseIntegration(root, false, async (value) => {
      invocation = value;
    });

    expect(invocation).toEqual(createNextJsSupabaseDependencyInvocation(root));
    await expect(
      stat(join(root, "app", "lib", "supabase", "auth.ts")),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, "app", "lib", "supabase", "storage.ts")),
    ).resolves.toBeDefined();
    await expect(
      stat(
        join(
          root,
          "supabase",
          "migrations",
          "20250101000000_initial_schema.sql",
        ),
      ),
    ).resolves.toBeDefined();
  });

  it("provides authentication, storage, and application-owned migration material", async () => {
    const assets = await renderSupabaseIntegrationAssets();
    const generatedContent = Object.values(assets).join("\n");

    expect(assets.authHelper).toContain("signInWithPassword");
    expect(assets.authHelper).toContain("signOut");
    expect(assets.storageHelper).toContain("uploadStorageObject");
    expect(assets.storageHelper).toContain("createSignedStorageUrl");
    expect(assets.clientHelper).toContain(
      "process.env.NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(assets.clientHelper).not.toContain("process.env[name]");
    expect(assets.proxyHelper).toContain("auth.getUser()");
    expect(assets.initialMigration).toContain(
      "create table if not exists public.todos",
    );
    expect(assets.initialMigration).toContain("storage.objects");
    expect(assets.initialMigration).not.toContain(
      "create policy if not exists",
    );
    expect(generatedContent).not.toMatch(
      /(?:eyJ|sb_publishable_|service_role=)/,
    );
  });

  it("integrates Supabase only for the generated Next.js application", async () => {
    const root = await makeRoot();
    const output: string[] = [];
    let dependenciesInstalled = false;

    const exitCode = await runCli(
      [
        "init",
        "--name",
        "my-project",
        "--app",
        "nextjs",
        "--ci",
        "github",
        "--services",
        "supabase",
        "--domain",
        "example.com",
        "--port",
        "3000",
      ],
      (message) => output.push(message),
      () => new NonInteractivePrompter(),
      root,
      async (applicationRoot) => {
        await mkdir(join(applicationRoot, "app"));
        await writeFile(
          join(applicationRoot, "app", "package.json"),
          JSON.stringify({ name: "generated-next-app", dependencies: {} }),
        );
      },
      async (projectRoot, replaceExistingServiceDirectory) => {
        await initializeSupabaseIntegration(
          projectRoot,
          replaceExistingServiceDirectory,
          async () => {
            const packagePath = join(projectRoot, "app", "package.json");
            const packageJson = JSON.parse(
              await readFile(packagePath, "utf8"),
            ) as {
              dependencies: Record<string, string>;
            };
            packageJson.dependencies["@supabase/supabase-js"] = "installed";
            packageJson.dependencies["@supabase/ssr"] = "installed";
            await writeFile(packagePath, JSON.stringify(packageJson));
            dependenciesInstalled = true;
          },
        );
      },
    );

    expect(exitCode).toBe(0);
    await expect(
      stat(join(root, "services", "supabase", "README.md")),
    ).resolves.toBeDefined();
    await expect(
      stat(join(root, "app", "lib", "supabase", "client.ts")),
    ).resolves.toBeDefined();
    await expect(
      stat(
        join(
          root,
          "supabase",
          "migrations",
          "20250101000000_initial_schema.sql",
        ),
      ),
    ).resolves.toBeDefined();
    const packageJson = JSON.parse(
      await readFile(join(root, "app", "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(dependenciesInstalled).toBe(true);
    expect(packageJson.dependencies).toMatchObject({
      "@supabase/supabase-js": "installed",
      "@supabase/ssr": "installed",
    });
    await expect(
      stat(join(root, "vpsd", "compose.yml")),
    ).resolves.toBeDefined();
    const compose = await readFile(join(root, "vpsd", "compose.yml"), "utf8");
    expect(compose.toLowerCase()).not.toContain("supabase");
    expect(output).toHaveLength(1);
    expect(output[0]).toContain("VPSD project initialized.");
  });
});
