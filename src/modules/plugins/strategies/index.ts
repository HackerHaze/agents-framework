// pluginStrategies.ts

import { browseStrategies } from "./browse";

export const pluginStrategies = {
  browse: {
    takeScreenshotAndAnalyze: browseStrategies.takeScreenshotAndAnalyze,
  },
  base: {
    summarizeContent: async (content: any) => {
      console.log(
        "🚀 ~ file: index.ts:12 ~ summarizeContent: ~ content:",
        content
      );
    },
  },
};
