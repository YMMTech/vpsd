export type CliWriter = (message: string) => void;

const writeToStdout: CliWriter = (message) => {
  process.stdout.write(`${message}\n`);
};

const rootHelp = `Usage: simploy <command>

Simploy v0 command-line interface.

Commands:
  init    Initialize a Simploy project

Options:
  -h, --help    Show this help message`;

const initHelp = `Usage: simploy init

Initialize a Simploy project.

Project initialization behavior will be added in a later Simploy v0 issue.`;

export function runCli(
  arguments_: readonly string[],
  write: CliWriter = writeToStdout,
): number {
  const [command, ...options] = arguments_;

  if (command === undefined || command === "--help" || command === "-h") {
    write(rootHelp);
    return 0;
  }

  if (command === "init") {
    if (
      options.length === 0 ||
      options.includes("--help") ||
      options.includes("-h")
    ) {
      write(initHelp);
      return 0;
    }

    write(`Unknown option for init: ${options[0]}`);
    return 1;
  }

  write(`Unknown command: ${command}`);
  write("Run 'simploy --help' to see available commands.");
  return 1;
}
