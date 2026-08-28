import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli/run.js";

describe("simploy command surface", () => {
  it("lists init in the root help output", () => {
    const output: string[] = [];

    const exitCode = runCli(["--help"], (message) => output.push(message));

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("init");
  });

  it("exposes help for init without initializing a project", () => {
    const output: string[] = [];

    const exitCode = runCli(["init", "--help"], (message) =>
      output.push(message),
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Usage: simploy init");
  });
});
