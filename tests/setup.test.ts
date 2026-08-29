import { access, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createSetupScriptInvocation,
  getBundledSetupScriptPath,
  runBundledSetupScript,
  SetupScriptError,
  type SetupScriptInvocation,
} from "../src/setup/run-setup.js";

describe("VPS setup script", () => {
  it("locates the bundled script and invokes it with Bash", async () => {
    const invocation = createSetupScriptInvocation();
    let received: SetupScriptInvocation | undefined;

    await access(getBundledSetupScriptPath());
    await runBundledSetupScript(async (value) => {
      received = value;
    });

    expect(invocation).toEqual({
      command: "bash",
      arguments: [getBundledSetupScriptPath()],
    });
    expect(received).toEqual(invocation);
  });

  it("propagates setup-script failures", async () => {
    await expect(
      runBundledSetupScript(async () => {
        throw new Error("setup script exited with code 23.");
      }),
    ).rejects.toEqual(
      new SetupScriptError(
        "VPS setup failed: setup script exited with code 23.",
      ),
    );
  });

  it("uses the official APT repositories and preserves operator-owned state", async () => {
    const script = await readFile(getBundledSetupScriptPath(), "utf8");

    expect(script).toContain("download.docker.com/linux/$" + "{ID}/gpg");
    expect(script).toContain("docker-ce");
    expect(script).toContain("docker-compose-plugin");
    expect(script).toContain("openssh-server");
    expect(script).toContain("dl.cloudsmith.io/public/caddy/stable");
    expect(script).toContain("systemctl enable --now docker");
    expect(script).toContain("systemctl enable --now caddy");
    expect(script).toContain("docker network inspect simploy-ingress");
    expect(script).toContain("docker network create simploy-ingress");
    expect(script).toContain("install -d -m 0700");
    expect(script).not.toContain("ssh-keygen");
    expect(script).not.toContain("StrictHostKeyChecking=no");
    expect(script).not.toContain("ufw disable");
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
