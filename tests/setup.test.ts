import { execFile as executeFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  createSetupScriptInvocation,
  getBundledSetupScriptPath,
  runBundledSetupScript,
  type SetupPrivilegeChecker,
  SetupScriptError,
  type SetupScriptInvocation,
} from "../src/setup/run-setup.js";

const rootPrivileges: SetupPrivilegeChecker = {
  isRoot: () => true,
  findSudo: () => undefined,
};

const execFile = promisify(executeFile);

async function runSetupFunctions(harness: string): Promise<string> {
  const script = await readFile(getBundledSetupScriptPath(), "utf8");
  const functions = script.split('if [ "$#" -ne 0 ];')[0];
  if (functions === undefined)
    throw new Error("Unable to isolate setup functions.");
  const { stdout } = await execFile("bash", ["-c", `${functions}\n${harness}`]);
  return stdout;
}

describe("VPS setup script", () => {
  it("locates the bundled script and invokes it with Bash as root", async () => {
    const invocation = createSetupScriptInvocation([], rootPrivileges);
    let received: SetupScriptInvocation | undefined;

    await access(getBundledSetupScriptPath());
    await runBundledSetupScript(
      [],
      async (value) => {
        received = value;
      },
      rootPrivileges,
    );

    expect(invocation).toEqual({
      command: "bash",
      arguments: [getBundledSetupScriptPath()],
    });
    expect(received).toEqual(invocation);
  });

  it("propagates setup-script failures", async () => {
    await expect(
      runBundledSetupScript(
        [],
        async () => {
          throw new Error("setup script exited with code 23.");
        },
        rootPrivileges,
      ),
    ).rejects.toEqual(
      new SetupScriptError(
        "VPS setup failed: setup script exited with code 23.",
      ),
    );
  });

  it("re-executes the exact bundled script through sudo for a normal user", () => {
    const invocation = createSetupScriptInvocation(["--script-argument"], {
      isRoot: () => false,
      findSudo: () => "/usr/bin/sudo",
    });

    expect(invocation).toEqual({
      command: "/usr/bin/sudo",
      arguments: [
        "--preserve-env=DEPLOY_USER,VPSD_DEPLOY_PATH,VPSD_CADDY_CONFIG_PATH",
        "bash",
        getBundledSetupScriptPath(),
        "--script-argument",
      ],
    });
  });

  it("fails clearly when a normal user has no sudo", async () => {
    await expect(
      runBundledSetupScript([], undefined, {
        isRoot: () => false,
        findSudo: () => undefined,
      }),
    ).rejects.toEqual(
      new SetupScriptError(
        "VPS setup failed: Root privileges are required for VPS setup. Install sudo or run the bundled setup script as root.",
      ),
    );
  });

  it("reuses compatible Docker and Compose installations without migration", async () => {
    const script = await readFile(getBundledSetupScriptPath(), "utf8");

    expect(script).toContain("docker_command_works");
    expect(script).toContain("docker_compose_works");
    expect(script).toContain("docker_daemon_is_active");
    expect(script).toContain("if docker_compose_works; then");
    expect(script).toContain("package_is_installed docker.io");
    expect(script).toContain("apt-get install -y docker-compose-v2");
    expect(script).toContain("apt-get remove -y docker-compose-v2");
    expect(script).toContain("download.docker.com/linux/$" + "{ID}/gpg");
    expect(script).toContain("docker-ce");
    expect(script).toContain("docker-compose-plugin");
    expect(script).toContain("openssh-server");
    expect(script).toContain("dl.cloudsmith.io/public/caddy/stable");
    expect(script).toContain("systemctl enable --now docker");
    expect(script).toContain("systemctl enable --now caddy");
    expect(script).toContain("docker network inspect vpsd-ingress");
    expect(script).toContain("docker network create vpsd-ingress");
    expect(script).toContain("install -d -m 0700");
    expect(script).toContain("/etc/sudoers.d/vpsd-caddy");
    expect(script).toContain(
      `VPSD_DEPLOY_PATH="\${VPSD_DEPLOY_PATH:-/home/vpsd/app}"`,
    );
    expect(script).toContain(
      `VPSD_CADDY_CONFIG_PATH="\${VPSD_CADDY_CONFIG_PATH:-/etc/caddy/Caddyfile}"`,
    );
    expect(script).toContain("NOPASSWD: /usr/bin/install -D -m 0644");
    expect(script).not.toContain("ssh-keygen");
    expect(script).not.toContain("StrictHostKeyChecking=no");
    expect(script).not.toContain("ufw disable");
  });

  it("installs official Docker only when Docker is missing", async () => {
    const script = await readFile(getBundledSetupScriptPath(), "utf8");

    expect(script).toContain("if ! docker_command_works; then");
    expect(script).toContain("install_official_docker");
    expect(script).toContain("docker-ce-cli");
    expect(script).toContain("containerd.io");
    expect(script).toContain("docker-buildx-plugin");
  });

  it("installs only the matching missing Compose implementation and Caddy", async () => {
    const script = await readFile(getBundledSetupScriptPath(), "utf8");

    expect(script).toContain("if package_is_installed docker.io; then");
    expect(script).toContain("apt-get install -y docker-compose-v2");
    expect(script).toContain("apt-get install -y docker-compose-plugin");
    expect(script).toContain("if ! command -v caddy >/dev/null 2>&1; then");
    expect(script).toContain("apt-get install -y caddy");
    expect(script).toContain("if docker_compose_works; then\n    return");
  });

  it("preserves Ubuntu docker.io plus docker-compose-v2 without an APT migration", async () => {
    const output = await runSetupFunctions(`
      docker() {
        if [ "$1" = "--version" ]; then return 0; fi
        if [ "$1" = "compose" ] && [ "$2" = "version" ]; then return 0; fi
        return 1
      }
      systemctl() { return 0; }
      dpkg-query() {
        case "$3" in docker.io|docker-compose-v2) printf installed;; esac
      }
      apt-get() { printf 'apt:%s\\n' "$*"; }
      ensure_docker
      ensure_docker_compose
      ensure_docker
      ensure_docker_compose
    `);

    expect(output).toBe("");
  });

  it("installs Ubuntu's matching Compose package when docker.io lacks Compose", async () => {
    const output = await runSetupFunctions(`
      compose_ready=false
      docker() {
        if [ "$1" = "--version" ]; then return 0; fi
        if [ "$1" = "compose" ] && [ "$2" = "version" ]; then
          [ "$compose_ready" = true ]
          return
        fi
        return 1
      }
      systemctl() { return 0; }
      dpkg-query() {
        if [ "$3" = docker.io ]; then printf installed; fi
      }
      apt-get() {
        printf 'apt:%s\\n' "$*"
        case " $* " in *" docker-compose-v2 "*) compose_ready=true;; esac
      }
      ensure_docker
      ensure_docker_compose
    `);

    expect(output).toBe("apt:install -y docker-compose-v2\n");
  });

  it("configures packaging to copy the setup script into dist", async () => {
    const buildScript = await readFile(
      new URL("../scripts/copy-templates.mjs", import.meta.url),
      "utf8",
    );
    const packageJson = await readFile(
      new URL("../package.json", import.meta.url),
      "utf8",
    );

    expect(buildScript).toContain("src/setup/setup-vps.sh");
    expect(buildScript).toContain("dist/setup/setup-vps.sh");
    expect(packageJson).toContain('"files": [');
    expect(packageJson).toContain('"dist"');
  });
});
