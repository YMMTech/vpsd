export const DEFAULT_INIT_INPUTS = {
  name: "simplapp",
  domain: "app.localhost",
  port: 3000,
} as const;

export const APPLICATIONS = ["nextjs", "none"] as const;
export const CI_PROVIDERS = ["github", "gitlab"] as const;
export const SERVICES = ["supabase"] as const;

export type Application = (typeof APPLICATIONS)[number];
export type CiProvider = (typeof CI_PROVIDERS)[number];
export type Service = (typeof SERVICES)[number];

export interface InitInput {
  readonly name: string;
  readonly app: Application;
  readonly ci: CiProvider;
  readonly services: readonly Service[];
  readonly domain: string;
  readonly port: number;
  readonly appDefault: boolean;
}

export interface InitFlagValues {
  name?: string;
  app?: string;
  ci?: string;
  services?: string;
  domain?: string;
  port?: string;
  appDefault: boolean;
}

export interface InitPrompter {
  ask(message: string, defaultValue?: string): Promise<string | undefined>;
  confirm(message: string): Promise<boolean | undefined>;
  showError(message: string): void;
}

export class InitInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InitInputError";
  }
}

export class InitCancelledError extends Error {
  public constructor() {
    super("Initialization input collection was cancelled.");
    this.name = "InitCancelledError";
  }
}

export async function collectInitInput(
  flags: InitFlagValues,
  prompter: InitPrompter,
): Promise<InitInput> {
  const name = await getValue(
    flags.name,
    "Project name",
    DEFAULT_INIT_INPUTS.name,
    validateProjectName,
    prompter,
  );
  const app = await getValue(
    flags.app,
    "Application (nextjs/none)",
    undefined,
    validateApplication,
    prompter,
  );
  const ci = await getValue(
    flags.ci,
    "CI provider (github/gitlab)",
    undefined,
    validateCiProvider,
    prompter,
  );
  const services = await getValue(
    flags.services,
    "Services (comma-separated: supabase; none for none)",
    "none",
    validateServices,
    prompter,
  );
  const domain = await getValue(
    flags.domain,
    "Domain",
    DEFAULT_INIT_INPUTS.domain,
    validateDomain,
    prompter,
  );
  const port = await getValue(
    flags.port,
    "Application port",
    String(DEFAULT_INIT_INPUTS.port),
    validatePort,
    prompter,
  );

  if (flags.appDefault && app !== "nextjs") {
    throw new InitInputError("--app-default is only valid with --app nextjs.");
  }

  return {
    name,
    app,
    ci,
    services: parseServices(services),
    domain,
    port: Number(port),
    appDefault: flags.appDefault,
  };
}

async function getValue<T extends string>(
  suppliedValue: string | undefined,
  message: string,
  defaultValue: string | undefined,
  validate: (value: string) => T,
  prompter: InitPrompter,
): Promise<T> {
  if (suppliedValue !== undefined) return validate(suppliedValue);
  while (true) {
    const response = await prompter.ask(message, defaultValue);
    if (response === undefined) throw new InitCancelledError();
    const value =
      response === "" && defaultValue !== undefined ? defaultValue : response;
    try {
      return validate(value);
    } catch (error) {
      if (!(error instanceof InitInputError)) throw error;
      prompter.showError(error.message);
    }
  }
}

function validateProjectName(value: string): string {
  if (value.length === 0 || value.trim() !== value)
    throw new InitInputError(
      "Project name must not be empty or start/end with whitespace.",
    );
  if (value === "." || value === ".." || /[\\/\0]/.test(value))
    throw new InitInputError(
      "Project name must not contain path separators or be . or ..",
    );
  return value;
}

function validateApplication(value: string): Application {
  if ((APPLICATIONS as readonly string[]).includes(value))
    return value as Application;
  throw new InitInputError(
    `Unsupported application: ${value}. Use nextjs or none.`,
  );
}

function validateCiProvider(value: string): CiProvider {
  if ((CI_PROVIDERS as readonly string[]).includes(value))
    return value as CiProvider;
  throw new InitInputError(
    `Unsupported CI provider: ${value}. Use github or gitlab.`,
  );
}

function validateServices(value: string): string {
  const selections = value.split(",");
  if (
    selections.some(
      (selection) => selection.length === 0 || selection.trim() !== selection,
    )
  )
    throw new InitInputError(
      "Services must be a comma-separated list without empty values.",
    );
  if (selections.includes("none")) {
    if (selections.length !== 1)
      throw new InitInputError("none cannot be combined with another service.");
    return value;
  }
  if (new Set(selections).size !== selections.length)
    throw new InitInputError("Each service may be selected only once.");
  for (const service of selections) {
    if (!(SERVICES as readonly string[]).includes(service))
      throw new InitInputError(
        `Unsupported service: ${service}. Use supabase or none.`,
      );
  }
  return value;
}

function parseServices(value: string): readonly Service[] {
  return value === "none" ? [] : (value.split(",") as Service[]);
}

function validateDomain(value: string): string {
  const hostnamePattern =
    /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
  if (!hostnamePattern.test(value))
    throw new InitInputError(
      "Domain must be a non-empty hostname without a protocol, path, or port.",
    );
  return value;
}

function validatePort(value: string): string {
  if (!/^[0-9]+$/.test(value))
    throw new InitInputError("Application port must be a TCP port number.");
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
    throw new InitInputError("Application port must be between 1 and 65535.");
  return value;
}
