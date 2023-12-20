import { createBaseAgent } from "./src/modules/base-agent/baseAgent";
import { browsePlugin } from "./src/modules/plugins/capabilities/browse";
import { createOpenAIHelper } from "./src/modules/handlers/open-ai";

(async () => {
  // Initialize the base agent with OpenAI and logging enabled
  const agent = createBaseAgent(true, true);
  const openAIHelper = createOpenAIHelper();

  // Register the browsing plugin
  agent.use("browse", browsePlugin(agent));

  // Start the browsing session
  const browser = await agent.performAction("browse", "launchBrowser");
  const page = await agent.performAction("browse", "createNewPage", browser);

  // Define the initial system message
  const systemMessage = `You are a website crawler...`; // Truncated for brevity

  // Add the system message to the OpenAI helper
  openAIHelper.addMessage("system", systemMessage);

  // Prompt the user for input
  console.log("GPT: How can I assist you today?");
  const userInput = await input("You: ");
  openAIHelper.addMessage("user", userInput);

  let isScreenShotTaken = false;

  while (true) {
    // Get the latest messages and create a completion with OpenAI
    const messages = openAIHelper.getMessages();
    const response = await openAIHelper.createCompletion();
    const messageText = response.choices[0].message.content;

    console.log("GPT: " + messageText);

    // Process the message to navigate or click links
    const processed = await agent.performAction(
      "browse",
      "processMessage",
      page,
      messageText,
      3000
    );
    if (processed) {
      // If a screenshot is needed, take it and convert to base64
      if (!isScreenShotTaken) {
        await agent.performAction("browse", "takeScreenshot", page);
        const base64Image = agent.performAction(
          "browse",
          "imageToBase64",
          page
        );
        // const base64Image = await imageToBase64("screenshot.jpg");
        openAIHelper.addMessage("user", {
          type: "image_url",
          imageUrl: base64Image,
        });
        isScreenShotTaken = true;
      }
    } else {
      // If the message is not a command, treat it as user input
      openAIHelper.addMessage("user", messageText);
    }

    // Reset the screenshot flag after processing
    if (isScreenShotTaken) {
      isScreenShotTaken = false;
    }
  }
})();
