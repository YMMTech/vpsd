import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { InitInput } from "../src/init/input.js";
import {
  confirmPlanConflicts,
  createInitPlan,
  findPlanConflicts,
} from "../src/init/plan.js";

const roots: string[] = [];

const input: InitInput = {
  name: "my-project",
  app: "none",
  ci: "github",
  services: ["supabase"],
  domain: "example.com",
  port: 3000,
  appDefault: false,
};

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "simploy-plan-"));
  roots.push(root);
  return root;
}

describe("initialization planning", () => {
  it("plans only the selected managed targets in an empty directory", async () => {
    const root = await makeRoot();
    const plan = await findPlanConflicts(createInitPlan(input, root));

    expect(plan.managedPaths).toEqual([
      "app",
      "simploy",
      "services",
      "services/supabase",
      "supabase",
      ".github/workflows",
    ]);
    expect(plan.conflicts).toEqual([]);
  });

  it("allows non-empty directories that do not contain managed targets", async () => {
    const root = await makeRoot();
    await writeFile(join(root, "README.md"), "existing project content\n");

    const plan = await findPlanConflicts(createInitPlan(input, root));

    expect(plan.conflicts).toEqual([]);
  });

  it("reports conflicts and requires confirmation before proceeding", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "app"));
    const plan = await findPlanConflicts(createInitPlan(input, root));
    const reports: string[] = [];
    const prompts: string[] = [];

    const accepted = await confirmPlanConflicts(
      plan,
      {
        confirm: async (message) => {
          prompts.push(message);
          return true;
        },
      },
      (message) => reports.push(message),
    );

    expect(plan.conflicts).toEqual(["app"]);
    expect(reports).toEqual(["Existing Simploy-managed targets: app"]);
    expect(prompts).toEqual(["Replace all listed targets?"]);
    expect(accepted).toBe(true);
    await expect(stat(join(root, "simploy"))).rejects.toThrow();
  });

  it("aborts declined replacement without creating partial project content", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "app"));
    const plan = await findPlanConflicts(createInitPlan(input, root));

    const accepted = await confirmPlanConflicts(
      plan,
      { confirm: async () => false },
      () => undefined,
    );

    expect(accepted).toBe(false);
    await expect(stat(join(root, "simploy"))).rejects.toThrow();
    await expect(stat(join(root, ".github", "workflows"))).rejects.toThrow();
  });
});
