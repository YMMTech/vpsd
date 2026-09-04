import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  GITLAB_PIPELINE_PATH,
  getGitLabPipelineTemplatePath,
  renderGitLabPipeline,
  writeGitLabPipeline,
} from "../src/init/gitlab-pipeline.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "simploy-gitlab-pipeline-"));
  roots.push(root);
  return root;
}

describe("GitLab CI/CD pipeline", () => {
  it("contains the required deployment and security contract", async () => {
    const pipeline = await renderGitLabPipeline();
    const shellExpression = "${";

    expect(pipeline).toContain("resource_group: production");
    expect(pipeline).toContain("VPS_HOST");
    expect(pipeline).toContain("VPS_USER");
    expect(pipeline).toContain("SSH_PRIVATE_KEY");
    expect(pipeline).toContain("SSH_KNOWN_HOSTS");
    expect(pipeline).toContain("StrictHostKeyChecking=yes");
    expect(pipeline).toContain("-p 22");
    expect(pipeline).toContain("buildah bud --format oci");
    expect(pipeline).toContain("CI_REGISTRY_IMAGE:$CI_COMMIT_SHA");
    expect(pipeline).toContain('buildah login --username "$CI_REGISTRY_USER"');
    expect(pipeline).toContain("buildah push --digestfile image-digest");
    expect(pipeline).toContain(
      'printf \'IMAGE_REF=%s@%s\\n\' "$CI_REGISTRY_IMAGE" "$DIGEST" > image.env',
    );
    expect(pipeline).toContain(
      "tar -C simploy -cf - deploy.env compose.yml Caddyfile",
    );
    expect(pipeline).toContain(
      "docker compose --env-file deploy.env -f compose.yml up -d",
    );
    expect(pipeline).toContain("APP_IMAGE_B64");
    expect(pipeline).toContain("caddy validate");
    expect(pipeline).toContain("caddy reload");
    expect(pipeline).toContain(`${shellExpression}SIMPLOY_DEPLOY_PATH`);
    expect(pipeline).toContain(`${shellExpression}SIMPLOY_CADDY_CONFIG_PATH`);
    expect(pipeline).toContain("CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH");
    expect(pipeline).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(pipeline).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(pipeline).toContain("sudo -n");
    expect(pipeline).not.toContain("StrictHostKeyChecking=no");
    expect(pipeline).not.toMatch(
      /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|gh[pous]_|glpat-|ssh-(?:rsa|ed25519) )/,
    );
    expect(pipeline).not.toContain("DOCKER_HOST");
    expect(pipeline).not.toContain("self-hosted");
    expect(pipeline).not.toContain("latest");
    expect(pipeline).not.toContain("pnpm simploy");
    expect(pipeline).not.toContain("simploy deploy");
    expect(pipeline).not.toMatch(
      /\bsimploy(?:d| (?:daemon|server|gateway|deploy|validate|run))\b/i,
    );
    expect(pipeline).not.toContain("supabase self-hosted");
    expect(pipeline).not.toContain("set -x");
  });

  it("copies the fixed bundled pipeline to the GitLab-required location", async () => {
    const root = await makeRoot();

    await writeGitLabPipeline(root, false);

    const template = await readFile(getGitLabPipelineTemplatePath(), "utf8");
    await expect(
      readFile(join(root, GITLAB_PIPELINE_PATH), "utf8"),
    ).resolves.toBe(template);
  });
});
