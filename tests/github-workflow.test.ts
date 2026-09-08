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
  const root = await mkdtemp(join(tmpdir(), "vpsd-github-workflow-"));
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
    expect(workflow).toContain("concurrency:\n  group: vpsd-production");
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
    expect(workflow).toContain(
      `VPS_PORT: ${githubExpression} vars.VPS_PORT }}`,
    );
    expect(workflow).toContain(`VPS_PORT="\${VPS_PORT:-22}"`);
    expect(workflow).toContain(
      `VPSD_DEPLOY_PATH="\${VPSD_DEPLOY_PATH:-/home/vpsd/app}"`,
    );
    expect(workflow).toContain(
      `VPSD_CADDY_CONFIG_PATH="\${VPSD_CADDY_CONFIG_PATH:-/etc/caddy/Caddyfile}"`,
    );
    expect(workflow).toContain('ssh -p "$VPS_PORT"');
    expect(workflow).toContain("docker build --pull");
    expect(workflow).toContain("docker push");
    expect(workflow).toContain("docker login ghcr.io");
    expect(workflow).toContain(
      `IMAGE_TAG="ghcr.io/\${GITHUB_REPOSITORY,,}:\${GITHUB_SHA}"`,
    );
    expect(workflow).toContain("docker buildx imagetools inspect");
    expect(workflow).toContain(
      `IMAGE_REF=ghcr.io/${shellExpression}GITHUB_REPOSITORY,,}@$DIGEST`,
    );
    expect(workflow).toContain(
      "tar -C vpsd -cf - deploy.env compose.yml Caddyfile",
    );
    expect(workflow).toContain("vars.VPSD_DEPLOY_PATH");
    expect(workflow).toContain("vars.VPSD_CADDY_CONFIG_PATH");
    expect(workflow).toContain("VPSD_DEPLOY_PATH_B64");
    expect(workflow).toContain("VPSD_CADDY_CONFIG_PATH_B64");
    expect(workflow).toContain("sh -c 'VPSD_DEPLOY_PATH=");
    expect(workflow).not.toContain(
      'tar -C vpsd -cf - deploy.env compose.yml Caddyfile | ssh -p "$VPS_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes "$VPS_USER@$VPS_HOST" "VPSD_DEPLOY_PATH_B64=$DEPLOY_PATH_B64 sh -s" <<',
    );
    expect(workflow).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("--build-arg NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).toContain(
      "docker compose --env-file deploy.env -f compose.yml up -d",
    );
    expect(workflow).toContain("APP_IMAGE_B64");
    expect(workflow).toContain("export APP_IMAGE");
    expect(workflow).toContain("cd app\n            corepack enable");
    expect(workflow).toContain("pnpm run --if-present test");
    expect(workflow).toContain("pnpm run build");
    expect(workflow).not.toContain("pnpm --dir app");
    expect(workflow).not.toContain("build --if-present");
    expect(workflow).toContain("caddy validate");
    expect(workflow).toContain("caddy reload");
    expect(workflow).toContain("sudo -n /usr/bin/install");
    expect(workflow).toContain("sudo -n /usr/bin/env");
    expect(workflow).toContain("/usr/bin/caddy validate");
    expect(workflow).not.toContain("StrictHostKeyChecking=no");
    expect(workflow).not.toMatch(
      /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|gh[pous]_|glpat-|ssh-(?:rsa|ed25519) )/,
    );
    expect(workflow).not.toContain("pnpm vpsd");
    expect(workflow).not.toContain("npx vpsd");
    expect(workflow).not.toMatch(
      /\bvpsd(?:d| (?:daemon|server|gateway|deploy|validate|run))\b/i,
    );
    expect(workflow).not.toContain("supabase self-hosted");
    expect(workflow).not.toContain("DOCKER_HOST");
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("latest");
    expect(workflow).not.toContain("set -x");
    expect(workflow).not.toContain("~/vpsd");
    expect(workflow).not.toContain("/opt/vpsd");
    expect(workflow).not.toContain("/etc/caddy/sites/");
  });

  it("writes only the final GitHub Actions workflow location", async () => {
    const root = await makeRoot();

    await writeGitHubWorkflow(root, false);

    expect(await readdir(join(root, ".github", "workflows"))).toEqual([
      "vpsd-deploy.yml",
    ]);
    const template = await readFile(getGitHubWorkflowTemplatePath(), "utf8");
    await expect(
      readFile(join(root, GITHUB_WORKFLOW_PATH), "utf8"),
    ).resolves.toBe(template);
  });
});
