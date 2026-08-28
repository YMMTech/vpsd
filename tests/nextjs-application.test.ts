import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";
import {
  createNextJsInvocation,
  initializeNextJsApplication,
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

  it("keeps post-generation work outside the application initializer", async () => {
    const root = await makeRoot();
    let invocation: NextJsInvocation | undefined;
    try {
      await initializeNextJsApplication(root, false, false, async (value) => {
        invocation = value;
        await mkdir(join(root, "app"));
      });

      await expect(stat(join(root, "app"))).resolves.toBeDefined();
      await expect(stat(join(root, "simploy"))).rejects.toThrow();
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
});
