import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { request } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { writeCoreDeploymentAssets } from "../src/init/deployment-assets.js";
import type { InitInput } from "../src/init/input.js";

const execFile = promisify(execFileCallback);
const TEST_NETWORK = "simploy-integration-test-ingress";
const CADDY_IMAGE = "caddy:2.10.2-alpine";
const APPLICATION_IMAGE = "nginx:1.27-alpine";

const testInput: InitInput = {
  name: "integration-test",
  app: "none",
  ci: "github",
  services: [],
  domain: "localhost",
  port: 80,
  appDefault: false,
};

const integrationDescribe =
  process.env.SIMPLOY_RUN_INTEGRATION_TESTS === "1" ? describe : describe.skip;

integrationDescribe("generated Compose and Caddy assets", () => {
  it("validates and routes an isolated test application without exposing its port", async () => {
    const root = await mkdtemp(join(tmpdir(), "simploy-compose-caddy-"));
    const projectName = `simployintegration${Date.now()}`;
    const caddyName = `${projectName}caddy`;
    const deployDirectory = join(root, "simploy");
    const composeFile = join(deployDirectory, "compose.yml");
    const caddyfile = join(deployDirectory, "Caddyfile");
    const composeArguments = [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      "deploy.env",
      "-f",
      "compose.yml",
    ];
    const composeEnvironment = {
      ...process.env,
      APP_IMAGE: APPLICATION_IMAGE,
      SIMPLOY_INGRESS_NETWORK: TEST_NETWORK,
    };

    try {
      await writeCoreDeploymentAssets(root, testInput, false);
      await docker(["network", "create", TEST_NETWORK]);

      const renderedCompose = await dockerText(
        [...composeArguments, "config"],
        {
          cwd: deployDirectory,
          env: composeEnvironment,
        },
      );
      await docker([...composeArguments, "up", "--detach"], {
        cwd: deployDirectory,
        env: composeEnvironment,
      });

      const applicationId = await dockerText(
        [...composeArguments, "ps", "--quiet", "app"],
        {
          cwd: deployDirectory,
          env: composeEnvironment,
        },
      );
      const portBindings = await dockerText([
        "inspect",
        "--format",
        "{{json .NetworkSettings.Ports}}",
        applicationId,
      ]);
      expect(portBindings).not.toContain("HostPort");

      await docker([
        "run",
        "--rm",
        "--env",
        "DOMAIN=localhost",
        "--env",
        "APP_PORT=80",
        "--volume",
        `${caddyfile}:/etc/caddy/Caddyfile:ro`,
        CADDY_IMAGE,
        "caddy",
        "validate",
        "--config",
        "/etc/caddy/Caddyfile",
        "--adapter",
        "caddyfile",
      ]);

      await docker([
        "run",
        "--detach",
        "--name",
        caddyName,
        "--network",
        TEST_NETWORK,
        "--env",
        "DOMAIN=localhost",
        "--env",
        "APP_PORT=80",
        "--volume",
        `${caddyfile}:/etc/caddy/Caddyfile:ro`,
        "--publish",
        "127.0.0.1::443",
        CADDY_IMAGE,
        "caddy",
        "run",
        "--config",
        "/etc/caddy/Caddyfile",
        "--adapter",
        "caddyfile",
      ]);

      const publishedPort = await dockerText(["port", caddyName, "443/tcp"]);
      const port = publishedPort.split(":").at(-1);
      if (port === undefined) throw new Error("Caddy did not publish HTTPS.");

      await expect(waitForCaddy(Number(port))).resolves.toContain(
        "Welcome to nginx!",
      );
      const compose = await readFile(composeFile, "utf8");
      expect(renderedCompose).toContain(TEST_NETWORK);
      expect(compose).not.toContain("ports:");
    } finally {
      await dockerQuietly(["rm", "--force", caddyName]);
      await dockerQuietly(
        [...composeArguments, "down", "--volumes", "--remove-orphans"],
        {
          cwd: deployDirectory,
          env: composeEnvironment,
        },
      );
      await dockerQuietly(["network", "rm", TEST_NETWORK]);
      await rm(root, { recursive: true, force: true });
    }
  }, 120_000);
});

async function docker(
  arguments_: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
  await execFile("docker", arguments_, options);
}

async function dockerText(
  arguments_: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  const { stdout } = await execFile("docker", arguments_, options);
  return stdout.trim();
}

async function dockerQuietly(
  arguments_: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
  try {
    await docker(arguments_, options);
  } catch {
    // Cleanup must continue when an earlier resource was never created.
  }
}

async function waitForCaddy(port: number): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await requestCaddy(port);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

function requestCaddy(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const request_ = request(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        servername: "localhost",
        rejectUnauthorized: false,
        headers: { host: "localhost" },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks).toString()));
      },
    );
    request_.once("error", reject);
    request_.end();
  });
}
