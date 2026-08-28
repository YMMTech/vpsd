import { lstat } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { InitInput } from "./input.js";

export interface InitPlan {
  readonly root: string;
  readonly managedPaths: readonly string[];
  readonly conflicts: readonly string[];
}

export interface ConflictPrompter {
  confirm(message: string): Promise<boolean | undefined>;
}

export type ConflictReporter = (message: string) => void;

export function createInitPlan(
  input: InitInput,
  root = process.cwd(),
): InitPlan {
  const managedPaths = ["app", "simploy"];

  if (input.services.length > 0) {
    managedPaths.push("services");
    for (const service of input.services) {
      managedPaths.push(`services/${service}`);
    }
  }

  if (input.ci === "github") {
    managedPaths.push(".github/workflows");
  } else {
    managedPaths.push(".gitlab-ci.yml");
  }

  return { root: resolve(root), managedPaths, conflicts: [] };
}

export async function findPlanConflicts(plan: InitPlan): Promise<InitPlan> {
  const conflicts: string[] = [];

  for (const managedPath of plan.managedPaths) {
    if (await pathExists(join(plan.root, managedPath))) {
      conflicts.push(managedPath);
    }
  }

  return { ...plan, conflicts };
}

export async function confirmPlanConflicts(
  plan: InitPlan,
  prompter: ConflictPrompter,
  report: ConflictReporter,
): Promise<boolean> {
  if (plan.conflicts.length === 0) return true;

  report(`Existing Simploy-managed targets: ${plan.conflicts.join(", ")}`);
  const confirmed = await prompter.confirm("Replace all listed targets?");
  return confirmed === true;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) return false;
    throw error;
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
