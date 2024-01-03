import { PluginApi } from "../../base-agent/baseAgent";
import * as readline from "readline";

export const basePlugin = (pluginApi: PluginApi) => {
  async function input(prompt: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  return {
    input,
  };
};
