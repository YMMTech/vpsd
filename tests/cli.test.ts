import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";
import type { InitPrompter } from "../src/init/input.js";

class ScriptedPrompter implements InitPrompter {
  public readonly messages: string[] = [];
  public readonly errors: string[] = [];
  public readonly confirmations: string[] = [];

  public constructor(
    private readonly answers: Array<string | undefined>,
    private readonly confirmation = true,
  ) {}

  public async ask(message: string): Promise<string | undefined> {
    this.messages.push(message);
    return this.answers.shift();
  }

  public showError(message: string): void {
    this.errors.push(message);
  }

  public async confirm(message: string): Promise<boolean | undefined> {
    this.confirmations.push(message);
    return this.confirmation;
  }
}

async function makeRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "simploy-cli-"));
}

describe("simploy command surface", () => {
  it("lists init in the root help output", async () => {
    const output: string[] = [];
    const exitCode = await runCli(["--help"], (message) =>
      output.push(message),
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("init");
  });

  it("exposes help for init", async () => {
    const output: string[] = [];
    const exitCode = await runCli(["init", "--help"], (message) =>
      output.push(message),
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Usage: simploy init");
  });

  it("collects all six choices interactively", async () => {
    const output: string[] = [];
    const prompter = new ScriptedPrompter([
      "my-project",
      "nextjs",
      "github",
      "supabase",
      "example.com",
      "3001",
    ]);
    const root = await makeRoot();
    try {
      const exitCode = await runCli(
        ["init"],
        (message) => output.push(message),
        () => prompter,
        root,
        async () => undefined,
      );

      expect(exitCode).toBe(0);
      expect(prompter.messages).toHaveLength(6);
      expect(output).toHaveLength(1);
      expect(output[0]).toContain("Simploy project initialized.");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prompts only for choices missing from partial flags", async () => {
    const prompter = new ScriptedPrompter([
      "gitlab",
      "none",
      "example.com",
      "4000",
    ]);
    const root = await makeRoot();
    try {
      const exitCode = await runCli(
        ["init", "--name", "my-project", "--app", "none"],
        () => undefined,
        () => prompter,
        root,
      );

      expect(exitCode).toBe(0);
      expect(prompter.messages).toEqual([
        "CI provider (github/gitlab)",
        "Services (comma-separated: supabase; none for none)",
        "Domain",
        "Application port",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts fully specified choices without prompting or confirmation", async () => {
    const prompter = new ScriptedPrompter([]);
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
          "--app-default",
        ],
        () => undefined,
        () => prompter,
        root,
        async () => undefined,
      );

      expect(exitCode).toBe(0);
      expect(prompter.messages).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid identifiers, ports, and irrelevant app defaults", async () => {
    const scenarios = [
      [
        "--app",
        "react",
        "--ci",
        "github",
        "--services",
        "none",
        "--port",
        "3000",
      ],
      [
        "--app",
        "nextjs",
        "--ci",
        "none",
        "--services",
        "none",
        "--port",
        "3000",
      ],
      [
        "--app",
        "nextjs",
        "--ci",
        "github",
        "--services",
        "unknown",
        "--port",
        "3000",
      ],
      [
        "--app",
        "nextjs",
        "--ci",
        "github",
        "--services",
        "none",
        "--port",
        "70000",
      ],
      [
        "--app",
        "none",
        "--ci",
        "github",
        "--services",
        "none",
        "--port",
        "3000",
        "--app-default",
      ],
    ];

    for (const scenario of scenarios) {
      const output: string[] = [];
      const exitCode = await runCli(
        [
          "init",
          "--name",
          "my-project",
          "--domain",
          "example.com",
          ...scenario,
        ],
        (message) => output.push(message),
        () => new ScriptedPrompter([]),
      );

      expect(exitCode).toBe(1);
      expect(output[0]).toMatch(/^Error:/);
    }
  });
});
