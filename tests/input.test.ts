import { describe, expect, it } from "vitest";

import {
  collectInitInput,
  InitCancelledError,
  type InitFlagValues,
  InitInputError,
  type InitPrompter,
} from "../src/init/input.js";

class ScriptedPrompter implements InitPrompter {
  public readonly messages: string[] = [];
  public readonly errors: string[] = [];

  public constructor(private readonly answers: Array<string | undefined>) {}

  public async ask(message: string): Promise<string | undefined> {
    this.messages.push(message);
    return this.answers.shift();
  }

  public async confirm(): Promise<boolean> {
    return true;
  }

  public showError(message: string): void {
    this.errors.push(message);
  }
}

const emptyFlags: InitFlagValues = { appDefault: false };
const validFlags: InitFlagValues = {
  name: "my-project",
  app: "nextjs",
  ci: "github",
  services: "none",
  domain: "example.com",
  port: "3000",
  appDefault: false,
};

describe("initialization input collection", () => {
  it("uses documented defaults while collecting the remaining interactive choices", async () => {
    const prompter = new ScriptedPrompter(["", "nextjs", "github", "", "", ""]);

    await expect(collectInitInput(emptyFlags, prompter)).resolves.toEqual({
      name: "simplapp",
      app: "nextjs",
      ci: "github",
      services: [],
      domain: "app.localhost",
      port: 3000,
      appDefault: false,
    });
  });

  it("accepts fully supplied inputs without prompting", async () => {
    const prompter = new ScriptedPrompter([]);

    await expect(
      collectInitInput(
        {
          name: "my-project",
          app: "nextjs",
          ci: "gitlab",
          services: "supabase",
          domain: "example.com",
          port: "4321",
          appDefault: true,
        },
        prompter,
      ),
    ).resolves.toEqual({
      name: "my-project",
      app: "nextjs",
      ci: "gitlab",
      services: ["supabase"],
      domain: "example.com",
      port: 4321,
      appDefault: true,
    });
    expect(prompter.messages).toEqual([]);
  });

  it.each([
    ["application", { ...validFlags, app: "react" }],
    ["CI provider", { ...validFlags, ci: "none" }],
    ["service", { ...validFlags, services: "unknown" }],
    [
      "port",
      {
        ...validFlags,
        port: "65536",
      },
    ],
    [
      "irrelevant app default",
      {
        ...validFlags,
        app: "none",
        ci: "github",
        services: "none",
        port: "3000",
        appDefault: true,
      },
    ],
  ])("rejects an invalid %s", async (_label, flags) => {
    await expect(
      collectInitInput(flags, new ScriptedPrompter([])),
    ).rejects.toBeInstanceOf(InitInputError);
  });

  it("reports invalid interactive values and retries the prompt", async () => {
    const prompter = new ScriptedPrompter([
      "my-project",
      "react",
      "none",
      "github",
      "none",
      "example.com",
      "3000",
    ]);

    const input = await collectInitInput(emptyFlags, prompter);

    expect(input.app).toBe("none");
    expect(prompter.errors).toEqual([
      "Unsupported application: react. Use nextjs or none.",
    ]);
    expect(
      prompter.messages.filter(
        (message) => message === "Application (nextjs/none)",
      ),
    ).toHaveLength(2);
  });

  it("cancels without producing input when an interactive response is unavailable", async () => {
    await expect(
      collectInitInput(emptyFlags, new ScriptedPrompter([undefined])),
    ).rejects.toBeInstanceOf(InitCancelledError);
  });
});
