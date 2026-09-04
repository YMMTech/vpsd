import { writeCoreDeploymentAssets } from "../init/deployment-assets.js";
import { writeGitHubWorkflow } from "../init/github-workflow.js";
import { writeGitLabPipeline } from "../init/gitlab-pipeline.js";
import {
  collectInitInput,
  type InitFlagValues,
  InitInputError,
  type InitPrompter,
} from "../init/input.js";
import { initializeNextJsApplication } from "../init/nextjs-application.js";
import {
  assertNoneApplicationCompatibility,
  initializeNoneApplication,
} from "../init/none-application.js";
import {
  confirmPlanConflicts,
  createInitPlan,
  findPlanConflicts,
} from "../init/plan.js";
import { TerminalPrompter } from "../init/prompter.js";
import { writeRootGitignore } from "../init/root-support-files.js";
import { initializeSupabaseIntegration } from "../init/supabase-integration.js";
import { runBundledSetupScript } from "../setup/run-setup.js";

export type CliWriter = (message: string) => void;
export type NextJsInitializer = (
  root: string,
  appDefault: boolean,
  replaceExistingDirectory: boolean,
) => Promise<void>;
export type SupabaseInitializer = (
  root: string,
  replaceExistingServiceDirectory: boolean,
  replaceExistingMigrationDirectory: boolean,
) => Promise<void>;
export type SetupCommandRunner = () => Promise<void>;

const writeToStdout: CliWriter = (message) => {
  process.stdout.write(`${message}\n`);
};

const rootHelp = `Usage: simploy <command>

Simploy v0 command-line interface.

Commands:
  init     Collect project initialization choices
  setup    Prepare a supported VPS for Simploy deployments

Options:
  -h, --help    Show this help message`;

const initHelp = `Usage: simploy init [options]

Collect Simploy project initialization choices.

Options:
  --name <name>          Project name
  --app <nextjs|none>    Application
  --ci <github|gitlab>   CI provider
  --services <services>  Comma-separated services, or none
  --domain <domain>      Application domain
  --port <port>          Application TCP port
  --app-default          Request framework defaults for Next.js
  -h, --help             Show this help message`;

const setupHelp = `Usage: simploy setup

Run Simploy's bundled Debian/Ubuntu VPS setup script.

The script installs Docker Engine, Docker Compose v2, and Caddy; prepares the
deployment user; and creates simploy-ingress. Run it with appropriate
privileges. Configure the deployment user with DEPLOY_USER (default: simploy).

Options:
  -h, --help    Show this help message`;

export async function runCli(
  arguments_: readonly string[],
  write: CliWriter = writeToStdout,
  createPrompter: () => InitPrompter = () => new TerminalPrompter(),
  root = process.cwd(),
  initializeNextJs: NextJsInitializer = initializeNextJsApplication,
  initializeSupabase: SupabaseInitializer = (
    root,
    replaceExistingServiceDirectory,
    replaceExistingMigrationDirectory,
  ) =>
    initializeSupabaseIntegration(
      root,
      replaceExistingServiceDirectory,
      undefined,
      replaceExistingMigrationDirectory,
    ),
  runSetupScript: SetupCommandRunner = runBundledSetupScript,
): Promise<number> {
  const [command, ...options] = arguments_;

  if (command === undefined || command === "--help" || command === "-h") {
    write(rootHelp);
    return 0;
  }

  if (command === "init") {
    if (options.includes("--help") || options.includes("-h")) {
      write(initHelp);
      return 0;
    }

    let flags: InitFlagValues;
    try {
      flags = parseInitFlags(options);
    } catch (error) {
      write(errorMessage(error));
      return 1;
    }

    const prompter = createPrompter();
    try {
      const input = await collectInitInput(flags, prompter);
      assertNoneApplicationCompatibility(input);
      const plan = await findPlanConflicts(createInitPlan(input, root));
      const replacementsAccepted = await confirmPlanConflicts(
        plan,
        prompter,
        write,
      );
      if (!replacementsAccepted) {
        write("Initialization aborted; no project files were created.");
        return 1;
      }
      if (input.app === "none") {
        await initializeNoneApplication(root, plan.conflicts.includes("app"));
      } else {
        await initializeNextJs(
          root,
          input.appDefault,
          plan.conflicts.includes("app"),
        );
      }
      await writeCoreDeploymentAssets(
        root,
        input,
        plan.conflicts.includes("simploy"),
      );
      if (input.ci === "github") {
        await writeGitHubWorkflow(
          root,
          plan.conflicts.includes(".github/workflows"),
        );
      } else {
        await writeGitLabPipeline(
          root,
          plan.conflicts.includes(".gitlab-ci.yml"),
        );
      }
      if (input.services.includes("supabase")) {
        await initializeSupabase(
          root,
          plan.conflicts.includes("services/supabase"),
          plan.conflicts.includes("supabase"),
        );
      }
      await writeRootGitignore(root);
      write(successMessage(input.name));
      return 0;
    } catch (error) {
      write(errorMessage(error));
      return 1;
    } finally {
      if (prompter instanceof TerminalPrompter) prompter.close();
    }
  }

  if (command === "setup") {
    if (options.includes("--help") || options.includes("-h")) {
      write(setupHelp);
      return 0;
    }
    if (options.length > 0) {
      write("Error: simploy setup does not accept options.");
      return 1;
    }

    try {
      await runSetupScript();
      return 0;
    } catch (error) {
      write(errorMessage(error));
      return 1;
    }
  }

  write(`Unknown command: ${command}`);
  write("Run 'simploy --help' to see available commands.");
  return 1;
}

const successMessage = (name: string) => `Simploy project initialized.

Project name: ${name}

Next steps:
1. Review the generated application and deployment files.
2. Configure CI secrets: VPS_HOST, VPS_USER, SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS.
3. Commit and push when ready.`;

function parseInitFlags(arguments_: readonly string[]): InitFlagValues {
  const flags: InitFlagValues = { appDefault: false };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === undefined) {
      throw new InitInputError("Unable to read an init option.");
    }
    if (argument === "--app-default") {
      if (flags.appDefault)
        throw new InitInputError("--app-default may only be supplied once.");
      flags.appDefault = true;
      continue;
    }

    const match = /^--(name|app|ci|services|domain|port)(?:=(.*))?$/.exec(
      argument,
    );
    if (match === null)
      throw new InitInputError(`Unknown option for init: ${argument}`);

    const [, option, inlineValue] = match;
    const key = option as Exclude<keyof InitFlagValues, "appDefault">;
    if (flags[key] !== undefined)
      throw new InitInputError(`--${key} may only be supplied once.`);
    const value = inlineValue ?? arguments_[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new InitInputError(`--${key} requires a value.`);
    flags[key] = value;
    if (inlineValue === undefined) index += 1;
  }

  return flags;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return `Error: ${error.message}`;
  return "Error: Unable to collect Simploy initialization choices.";
}
