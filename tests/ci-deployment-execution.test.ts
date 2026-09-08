import { execFile as executeFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { renderGitHubWorkflow } from "../src/init/github-workflow.js";
import { renderGitLabPipeline } from "../src/init/gitlab-pipeline.js";

const roots: string[] = [];
const execFile = promisify(executeFile);

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "vpsd-ci-deployment-"));
  roots.push(root);
  return root;
}

function transferCommand(template: string): string {
  const command = template
    .split("\n")
    .find((line) =>
      line.includes("tar -C vpsd -cf - deploy.env compose.yml Caddyfile"),
    );

  if (command === undefined)
    throw new Error("Missing deployment asset transfer.");
  return command.trim();
}

async function executeTransfer(
  template: string,
  overrides: { readonly deployPath?: string; readonly port?: string } = {},
): Promise<{ readonly arguments: string; readonly archive: string }> {
  const root = await makeRoot();
  const bin = join(root, "bin");
  const vpsd = join(root, "vpsd");
  const archive = join(root, "archive.tar");
  const argumentsFile = join(root, "ssh-arguments");
  const fakeSsh = join(bin, "ssh");

  await mkdir(bin);
  await mkdir(vpsd);
  await writeFile(join(vpsd, "deploy.env"), "DOMAIN=example.test\n");
  await writeFile(join(vpsd, "compose.yml"), "services: {}\n");
  await writeFile(join(vpsd, "Caddyfile"), "example.test\n");
  await writeFile(
    fakeSsh,
    '#!/bin/sh\nprintf \'%s\\n\' "$@" > "$VPSD_SSH_ARGUMENTS"\ncat > "$VPSD_SSH_ARCHIVE"\n',
  );
  await chmod(fakeSsh, 0o755);

  const script = [
    "set -euo pipefail",
    `VPS_PORT="\${VPS_PORT:-22}"`,
    `VPSD_DEPLOY_PATH="\${VPSD_DEPLOY_PATH:-/home/vpsd/app}"`,
    "DEPLOY_PATH_B64=\"$(printf '%s' \"$VPSD_DEPLOY_PATH\" | base64 | tr -d '\\n')\"",
    transferCommand(template),
  ].join("\n");

  await execFile("bash", ["-c", script], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH ?? ""}`,
      VPSD_DEPLOY_PATH: overrides.deployPath ?? "",
      VPSD_SSH_ARCHIVE: archive,
      VPSD_SSH_ARGUMENTS: argumentsFile,
      VPS_HOST: "vps.example.test",
      VPS_PORT: overrides.port ?? "",
      VPS_USER: "vpsd",
    },
  });

  return {
    archive,
    arguments: await readFile(argumentsFile, "utf8"),
  };
}

describe("generated CI deployment shell behavior", () => {
  it.each([
    ["GitHub Actions", renderGitHubWorkflow],
    ["GitLab CI/CD", renderGitLabPipeline],
  ])("%s streams only the tar archive to SSH and applies default or overridden values", async (_provider, render) => {
    const template = await render();
    const defaults = await executeTransfer(template);
    const customPath = "/srv/vpsd/project";
    const overrides = await executeTransfer(template, {
      deployPath: customPath,
      port: "22022",
    });

    await expect(
      execFile("tar", ["-tf", defaults.archive]),
    ).resolves.toMatchObject({
      stdout: expect.stringContaining("deploy.env"),
    });
    const defaultPath = Buffer.from("/home/vpsd/app").toString("base64");
    expect(defaults.arguments).toContain("-p\n22\n");
    expect(defaults.arguments).toContain(defaultPath);
    expect(defaults.arguments).toContain('tar -C "$VPSD_DEPLOY_PATH" -xf -');
    expect(defaults.arguments).not.toContain("sh -s");

    expect(overrides.arguments).toContain("-p\n22022\n");
    expect(overrides.arguments).toContain(
      Buffer.from(customPath).toString("base64"),
    );
  });

  it.each([
    renderGitHubWorkflow,
    renderGitLabPipeline,
  ])("resolves the application package manager and exports the immutable image before Compose", async (render) => {
    const template = await render();
    const exportIndex = template.indexOf("export APP_IMAGE");
    const composeIndex = template.indexOf(
      "docker compose --env-file deploy.env -f compose.yml up -d",
    );

    expect(template).toContain("cd app\n");
    expect(template).toContain("corepack enable");
    expect(template).toContain("pnpm install --frozen-lockfile");
    expect(template).toContain("pnpm run --if-present test");
    expect(template).toContain("pnpm run build");
    expect(template).not.toContain("pnpm@10.30.3");
    template
      .split("\n")
      .filter((line) => line.includes("ssh "))
      .forEach((line) => {
        expect(line).toContain('ssh -p "$VPS_PORT"');
      });
    expect(exportIndex).toBeGreaterThan(-1);
    expect(composeIndex).toBeGreaterThan(exportIndex);
  });
});
