import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import {
  renderCoreDeploymentAssets,
  writeCoreDeploymentAssets,
} from "../src/init/deployment-assets.js";
import type { InitInput } from "../src/init/input.js";

const roots: string[] = [];

const defaults: InitInput = {
  name: "simplapp",
  app: "none",
  ci: "github",
  services: [],
  domain: "app.localhost",
  port: 3000,
  appDefault: false,
};

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "simploy-assets-"));
  roots.push(root);
  return root;
}

describe("core deployment assets", () => {
  it("renders deterministic default assets with deploy.env as the only stable configuration source", () => {
    const first = renderCoreDeploymentAssets(defaults);
    const second = renderCoreDeploymentAssets(defaults);

    expect(first).toEqual(second);
    expect(first.deployEnv).toBe("DOMAIN=app.localhost\nAPP_PORT=3000\n");
    expect(first.deployEnv.split("\n").filter(Boolean)).toEqual([
      "DOMAIN=app.localhost",
      "APP_PORT=3000",
    ]);
    expect(first.compose).toContain("env_file:\n      - deploy.env");
    expect(first.compose).toContain(
      `image: "${"${"}APP_IMAGE:?APP_IMAGE must be an immutable image reference}"`,
    );
    expect(first.compose).toContain(`expose:\n      - "${"${"}APP_PORT}"`);
    expect(first.compose).not.toContain("ports:");
    expect(first.compose).toContain("simploy-ingress");
    expect(first.compose).not.toContain("caddy");
    expect(first.caddyfile).toBe(
      "{$DOMAIN} {\n  reverse_proxy app:{$APP_PORT}\n}\n",
    );
  });

  it("propagates custom domain and port without adding secrets", () => {
    const assets = renderCoreDeploymentAssets({
      ...defaults,
      domain: "example.com",
      port: 8080,
    });

    expect(assets.deployEnv).toBe("DOMAIN=example.com\nAPP_PORT=8080\n");
    expect(assets.deployEnv).not.toMatch(
      /SECRET|TOKEN|PASSWORD|KEY|SSH|IMAGE/i,
    );
    expect(assets.caddyfile).toContain("{$DOMAIN}");
    expect(assets.compose).toContain(`${"${"}APP_PORT}`);
  });

  it("writes exactly the core assets and replaces an accepted existing simploy directory", async () => {
    const root = await makeRoot();
    await mkdir(join(root, "simploy"));
    await writeFile(join(root, "simploy", "stale.txt"), "stale");

    await writeCoreDeploymentAssets(root, defaults, true);

    expect(await readdir(join(root, "simploy"))).toEqual([
      "Caddyfile",
      "compose.yml",
      "deploy.env",
    ]);
    await expect(
      readFile(join(root, "simploy", "deploy.env"), "utf8"),
    ).resolves.toBe("DOMAIN=app.localhost\nAPP_PORT=3000\n");
  });
});
