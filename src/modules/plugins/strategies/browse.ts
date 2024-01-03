import { PluginApi } from "../../base-agent/baseAgent";
import { OpenAIHelper, createOpenAIHelper } from "../../handlers/open-ai";
import { browsePlugin } from "../actions/browse";

type InteractableElements = {
  text: string;
};
type ScreenShotAnalysis = {
  interactableElements: InteractableElements[];
};

export const browseStrategies = {
  takeScreenshotAndAnalyze: async (
    pluginApi: PluginApi,
    params: {
      openAIHelper: OpenAIHelper;
      page: any;
    }
  ) => {
    console.log("performing take ss strat...");
    // Highlight links
    await browsePlugin(pluginApi).highlightLinks(params.page);
    // Take a screenshot
    const screenshot = await browsePlugin(pluginApi).takeScreenshot(
      params.page
    );
    // Create base64 image
    const base64Image = await browsePlugin(pluginApi).imageToBase64(screenshot);

    const response = await params.openAIHelper.createStandaloneVisionCompletion(
      {
        chatMessages: [
          {
            role: "assistant",
            // @ts-ignore
            content: [
              {
                type: "text",
                text: `
                Here's the screenshot of the current page you are on right now in the next message. 
                You should output all the interactable elements contained in the screenshot that are outlined by a red border.
                You should do so in the following JSON
                IMPORTANT: 
                1. You are a part of a system so NEVER output anything in natural language or in a codeblock,
                2. output EVERYTHING as JSON like below, otherwise you will crash the system.
                3. output ALL interactable elements as you can, this is a test on your performance.
                {
                  "interactableElements: [
                    {
                      text: 'textInTheElement', // text that the inner html element displays
                    }
                  ]
                }
                `,
              },
              {
                type: "image_url",
                // @ts-ignore
                image_url: base64Image,
              },
            ],
          },
        ],
      }
    );
    try {
      const res = JSON.parse(response.choices[0].message.content);
      // console.log(response.choices[0].message.content);

      if (res) {
        return res;
      }
    } catch (error) {}
  },
  handleLinkClick: async (page: any) => {},
};
