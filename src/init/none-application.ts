import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { type InitInput, InitInputError } from "./input.js";

export function assertNoneApplicationCompatibility(input: InitInput): void {
  if (input.app === "none" && input.services.length > 0) {
    throw new InitInputError(
      "The none application does not support selected services in v0.",
    );
  }
}

export async function initializeNoneApplication(
  root: string,
  replaceExistingDirectory: boolean,
): Promise<void> {
  const directory = join(root, "app");
  if (replaceExistingDirectory) {
    await rm(directory, { recursive: true, force: true });
  }
  await mkdir(directory, { recursive: true });
}
