import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  GITHUB_WORKFLOW_PATH,
  getGitHubWorkflowTemplatePath,
  renderGitHubWorkflow,
  writeGitHubWorkflow,
} from "../src/init/github-workflow.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "simploy-github-workflow-"));
  roots.push(root);
  return root;
}

describe("GitHub Actions workflow", () => {
  it("contains the required deployment and security contract", async () => {
    const workflow = await renderGitHubWorkflow();
    const githubExpression = "${" + "{";
    const shellExpression = "${";

    expect(workflow).toContain("runs-on: ubuntu-24.04");
    expect(workflow).toContain(
      "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
    );
    expect(workflow).toContain("concurrency:\n  group: simploy-production");
    expect(workflow).toContain(
      `VPS_HOST: ${githubExpression} secrets.VPS_HOST }}`,
    );
    expect(workflow).toContain(
      `VPS_USER: ${githubExpression} secrets.VPS_USER }}`,
    );
    expect(workflow).toContain(
      `SSH_PRIVATE_KEY: ${githubExpression} secrets.SSH_PRIVATE_KEY }}`,
    );
    expect(workflow).toContain(
      `SSH_KNOWN_HOSTS: ${githubExpression} secrets.SSH_KNOWN_HOSTS }}`,
    );
    expect(workflow).toContain("StrictHostKeyChecking=yes");
    expect(workflow).toContain("-p 22");
    expect(workflow).toContain("docker build --pull");
    expect(workflow).toContain("docker push");
    expect(workflow).toContain("docker buildx imagetools inspect");
    expect(workflow).toContain(
      `IMAGE_REF=ghcr.io/${shellExpression}GITHUB_REPOSITORY,,}@$DIGEST`,
    );
    expect(workflow).toContain(
      "tar -C simploy -cf - deploy.env compose.yml Caddyfile",
    );
    expect(workflow).toContain(
      "SIMPLOY_DEPLOY_PATH must be provided by the VPS environment",
    );
    expect(workflow).toContain(
      "SIMPLOY_CADDY_CONFIG_PATH must be provided by the VPS environment",
    );
    expect(workflow).toContain(
      "docker compose --env-file deploy.env -f compose.yml up -d",
    );
    expect(workflow).toContain("caddy validate");
    expect(workflow).toContain("caddy reload");
    expect(workflow).not.toContain("StrictHostKeyChecking=no");
    expect(workflow).not.toContain("pnpm simploy");
    expect(workflow).not.toContain("npx simploy");
    expect(workflow).not.toContain("DOCKER_HOST");
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("latest");
    expect(workflow).not.toContain("set -x");
    expect(workflow).not.toContain("~/simploy");
    expect(workflow).not.toContain("/opt/simploy");
    expect(workflow).not.toContain("/etc/caddy/sites/");
  });

  it("writes only the final GitHub Actions workflow location", async () => {
    const root = await makeRoot();

    await writeGitHubWorkflow(root, false);

    expect(await readdir(join(root, ".github", "workflows"))).toEqual([
      "simploy-deploy.yml",
    ]);
    const template = await readFile(getGitHubWorkflowTemplatePath(), "utf8");
    await expect(
      readFile(join(root, GITHUB_WORKFLOW_PATH), "utf8"),
    ).resolves.toBe(template);
  });
});
