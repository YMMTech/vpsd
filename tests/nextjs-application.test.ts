import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import {
  createNextJsInvocation,
  getNextJsDockerBuildTemplatePaths,
  initializeNextJsApplication,
  NEXTJS_CONFIG_PATH,
  NEXTJS_DOCKERFILE_PATH,
  NEXTJS_DOCKERIGNORE_PATH,
  NextJsInitializationError,
  type NextJsInvocation,
} from "../src/init/nextjs-application.js";

class NonInteractivePrompter implements InitPrompter {
  public async ask(): Promise<string | undefined> {
    throw new Error("No Simploy prompts expected.");
  }

  public showError(): void {}

  public async confirm(): Promise<boolean | undefined> {
    throw new Error("No conflict confirmation expected.");
  }
}

async function makeRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "simploy-nextjs-"));
}

describe("Next.js application initialization", () => {
  it("uses official create-next-app in app with framework prompts available", () => {
    expect(createNextJsInvocation("/project", false)).toEqual({
      command: "pnpm",
      arguments: ["dlx", "create-next-app@latest", "app"],
      cwd: "/project",
    });
  });

  it("uses create-next-app's default non-interactive path with --app-default", () => {
    expect(createNextJsInvocation("/project", true).arguments).toEqual([
      "dlx",
      "create-next-app@latest",
      "app",
      "--yes",
    ]);
  });

  it("copies the bundled Docker build templates after Next.js generation", async () => {
    const root = await makeRoot();
    let invocation: NextJsInvocation | undefined;
    try {
      await initializeNextJsApplication(root, false, false, async (value) => {
        invocation = value;
        await mkdir(join(root, "app"));
        await writeFile(join(root, "app", "next.config.ts"), "stale config");
      });

      await expect(stat(join(root, "app"))).resolves.toBeDefined();
      await expect(stat(join(root, "simploy"))).rejects.toThrow();
      const templates = getNextJsDockerBuildTemplatePaths();
      await expect(
        readFile(join(root, NEXTJS_DOCKERFILE_PATH), "utf8"),
      ).resolves.toBe(await readFile(templates.dockerfile, "utf8"));
      await expect(
        readFile(join(root, NEXTJS_DOCKERIGNORE_PATH), "utf8"),
      ).resolves.toBe(await readFile(templates.dockerignore, "utf8"));
      await expect(
        readFile(join(root, NEXTJS_CONFIG_PATH), "utf8"),
      ).resolves.toBe(await readFile(templates.nextConfig, "utf8"));
      await expect(stat(join(root, "app", "next.config.ts"))).rejects.toThrow();
      const dockerfile = await readFile(
        join(root, NEXTJS_DOCKERFILE_PATH),
        "utf8",
      );
      expect(dockerfile).toContain("/app/.next/standalone");
      expect(dockerfile).toContain("exec env HOSTNAME=0.0.0.0");
      await expect(
        readFile(join(root, NEXTJS_DOCKERIGNORE_PATH), "utf8"),
      ).resolves.toContain("node_modules");
      await expect(
        readFile(join(root, NEXTJS_CONFIG_PATH), "utf8"),
      ).resolves.toContain('output: "standalone"');
      expect(invocation?.arguments).toEqual([
        "dlx",
        "create-next-app@latest",
        "app",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("surfaces a generator failure and does not report initialization success", async () => {
    const root = await makeRoot();
    const output: string[] = [];
    try {
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
          "none",
          "--domain",
          "example.com",
          "--port",
          "3000",
        ],
        (message) => output.push(message),
        () => new NonInteractivePrompter(),
        root,
        async () => {
          throw new Error("generator exited with code 1");
        },
      );

      expect(exitCode).toBe(1);
      expect(output).toEqual(["Error: generator exited with code 1"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("wraps direct generator failures clearly", async () => {
    await expect(
      initializeNextJsApplication("/project", false, false, async () => {
        throw new Error("network unavailable");
      }),
    ).rejects.toEqual(
      new NextJsInitializationError(
        "create-next-app failed: network unavailable",
      ),
    );
  });

  it("contains no Supabase integration logic", async () => {
    const source = await readFile(
      new URL("../src/init/nextjs-application.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/supabase/i);
  });

  it("includes Docker build assets in a Next.js/GitHub project without services", async () => {
    const root = await makeRoot();
    try {
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
          "none",
          "--domain",
          "example.com",
          "--port",
          "3000",
        ],
        () => undefined,
        () => new NonInteractivePrompter(),
        root,
        async (applicationRoot, appDefault, replaceExistingDirectory) =>
          initializeNextJsApplication(
            applicationRoot,
            appDefault,
            replaceExistingDirectory,
            async () => {
              await mkdir(join(applicationRoot, "app"));
            },
          ),
      );

      expect(exitCode).toBe(0);
      await expect(
        stat(join(root, NEXTJS_DOCKERFILE_PATH)),
      ).resolves.toBeDefined();
      await expect(stat(join(root, NEXTJS_CONFIG_PATH))).resolves.toBeDefined();
      await expect(
        stat(join(root, NEXTJS_DOCKERIGNORE_PATH)),
      ).resolves.toBeDefined();
      await expect(
        stat(join(root, ".github", "workflows", "simploy-deploy.yml")),
      ).resolves.toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
