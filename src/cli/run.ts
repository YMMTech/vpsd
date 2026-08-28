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
import { writeSupabaseIntegration } from "../init/supabase-integration.js";

export type CliWriter = (message: string) => void;
export type NextJsInitializer = (
  root: string,
  appDefault: boolean,
  replaceExistingDirectory: boolean,
) => Promise<void>;

const writeToStdout: CliWriter = (message) => {
  process.stdout.write(`${message}\n`);
};

const rootHelp = `Usage: simploy <command>

Simploy v0 command-line interface.

Commands:
  init    Collect project initialization choices

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

export async function runCli(
  arguments_: readonly string[],
  write: CliWriter = writeToStdout,
  createPrompter: () => InitPrompter = () => new TerminalPrompter(),
  root = process.cwd(),
  initializeNextJs: NextJsInitializer = initializeNextJsApplication,
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
      if (input.services.includes("supabase")) {
        await writeSupabaseIntegration(
          root,
          plan.conflicts.includes("services/supabase"),
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
      write("Core Simploy deployment assets created.");
      return 0;
    } catch (error) {
      write(errorMessage(error));
      return 1;
    } finally {
      if (prompter instanceof TerminalPrompter) prompter.close();
    }
  }

  write(`Unknown command: ${command}`);
  write("Run 'simploy --help' to see available commands.");
  return 1;
}

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
