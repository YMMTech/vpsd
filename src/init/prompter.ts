import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import type { InitPrompter } from "./input.js";

export class TerminalPrompter implements InitPrompter {
  readonly #reader = createInterface({ input: stdin, output: stdout });

  public async ask(
    message: string,
    defaultValue?: string,
  ): Promise<string | undefined> {
    const suffix = defaultValue === undefined ? "" : ` [${defaultValue}]`;
    try {
      return await this.#reader.question(`${message}${suffix}: `);
    } catch {
      return undefined;
    }
  }

  public showError(message: string): void {
    stdout.write(`${message}\n`);
  }

  public close(): void {
    this.#reader.close();
  }
}
