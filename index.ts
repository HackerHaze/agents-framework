import { createBaseAgent } from "./src/modules/base-agent/baseAgent";
import { browsePlugin } from "./src/modules/plugins/actions/browse";
import { createOpenAIHelper } from "./src/modules/handlers/open-ai";
import { basePlugin } from "./src/modules/plugins/actions/base";

(async () => {
  // Initialize the base agent with OpenAI and logging enabled
  const agent = createBaseAgent(true, true);
  const openAIHelper = createOpenAIHelper();

  // Register the browsing plugin
  agent.use("browse", browsePlugin);
  agent.use("base", basePlugin);

  // Start the browsing session
  const browser = await agent.performAction("browse", "launchBrowser");
  let page = await agent.performAction("browse", "createNewPage", browser);

  // Define the initial system message
  const systemMessage = `You are an autonomous website crawler. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot.
  
  You can either navigate to a specific URL by answering with the following JSON format:
  {"url": "url goes here"}

  Or to click a certain button or element on the website, you can do so by referencing the text inside of the link/button, in the following JSON format:
  {"click": "Text in link"}

  Important: At every step and message you reply, you should state the original task at hand and the current progress. Never guess/invent links or informations that are not in the screenshot. You shall never ask for guidance.
  
  Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.

  Go to 'https://lo-victoria.com' from a base point. `;

  // Add the system message to the OpenAI helper
  openAIHelper.addMessage({
    role: "assistant",
    content: systemMessage,
  });

  console.log("GPT: How can I assist you today?");
  console.log("Let's go over vics posts and summarize each of them");

  // const userInput = await agent.performAction("base", "input", "You: ");

  openAIHelper.addMessage({
    content:
      "Let's go over vics posts, read them one by one, and create a summary for each, please never repeat the same post",
    role: "assistant",
  });

  const response = await openAIHelper.createCompletion();

  const messageText = response.choices[0].message.content;
  console.log(
    "🚀 ~ file: index.ts:51 ~ response:",
    response.choices[0].message
  );

  if (response.choices[0].finish_reason === "function_call") {
    try {
      const params = JSON.parse(
        response.choices[0].message.function_call.arguments
      );
      await agent.performAction(
        "browse",
        "navigatePage",
        page,
        params.url,
        3000
      );
    } catch (error) {}
  }

  let isScreenShotTaken = false;
  let iterationCount = 0;
  const maxIterations = 1;

  //
  //
  // LOOP ZONE
  //
  //

  console.log("Entering loop zone...");
  while (true) {
    if (iterationCount >= maxIterations) {
      console.log("GPT: Maximum number of iterations reached. Exiting.");
      break;
    }

    if (!isScreenShotTaken) {
      // 1. take screenshot and add it to the prompt
      const res = await agent.performStrategy(
        "browse",
        "takeScreenshotAndAnalyze",
        {
          openAIHelper,
          page,
        }
      );
      console.log("🚀 ~ file: index.ts:108 ~ res:", res.interactableElements);

      openAIHelper.clearSeriesMessages();

      isScreenShotTaken = true;
    }

    if (isScreenShotTaken) {
      isScreenShotTaken = false;
    }
    iterationCount++;
  }
})();
