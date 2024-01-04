1. launch browser
2. create new page
3. setup initial system message
   ( - System: You are acting as a website crawler...
   )
4. setup user input
   ( - System: You are acting as a website crawler... - User: Let's go over vics posts and summarize each of them.
   )
5. create completion
   ( - System: You are acting as a website crawler... - User: Let's go over vics posts and summarize each of them. - GPT: Ok...
   )
6. first raw prompt from OA
7. processMessage > receives raw output > navigates

-- loop zone --

8. executes strategy: takeScreenshotAndAddToPrompt
   ( - System: You are acting as a website crawler...
   User: Let's go over vics posts and summarize each of them.
   GPT: Ok... - System: Screenshot url - System: This is the screenshot of current page
   )
   8.1. add another message to prompt
   ( - System: You are acting as a website crawler...
   User: Let's go over vics posts and summarize each of them.
   GPT: Ok... - System: Screenshot url - System: This is the screenshot of current page - User: "Decide the next step and continue with the task at hand. Remember to not make up links/destinations",
   )
   8.2. create completion
   ( - System: You are acting as a website crawler...
   User: Let's go over vics posts and summarize each of them.
   GPT: "Ok..." - System: Screenshot url - System: This is the screenshot of current page - System: "Decide the next step and continue with the task at hand. Remember to not make up links/destinations", - GPT: "Ok.."
   )  
    8.3. processMessage > decides next action

async function processMessage1(page, messageText, timeout) {
if (messageText.indexOf('{"click": "') !== -1) {
const linkText = messageText
.split('{"click": "')[1]
.split('"}')[0]
.replace(/[^a-zA-Z0-9 ]/g, "");

      console.log(`Extracted linkText for click: ${linkText}`);

      await clickLink(page, linkText);
      await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
      await highlightLinks(page);
      await takeScreenshot(page);
      console.log(`Screenshot taken.`);
      return true;
    } else if (messageText.indexOf('{"url": "') !== -1) {
      const url = messageText.split('{"url": "')[1].split('"}')[0];
      console.log("🚀 ~ navigating to ~ url:", url);
      await navigatePage(page, url, timeout);
      return true;
    }
    return false;

}
