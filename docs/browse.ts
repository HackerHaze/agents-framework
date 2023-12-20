import OpenAI from "openai";
import { sleep } from "openai/core";
import { ChatCompletionMessageParam } from "openai/resources";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as readline from "readline";
puppeteer.use(StealthPlugin());

const openai = new OpenAI({
  apiKey: "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",
});
const timeout = 5000;
type Message = {
  role: string;
  content: any;
};
async function imageToBase64(imageFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(imageFilePath, (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        reject(err);
        return;
      }
      const base64Data = data.toString("base64");
      resolve(`data:image/jpeg;base64,${base64Data}`);
    });
  });
}

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

async function highlightLinks(page: any): Promise<void> {
  // Remove existing attributes
  await page.evaluate(() => {
    document.querySelectorAll("[gpt-link-text]").forEach((element) => {
      element.removeAttribute("gpt-link-text");
    });
  });

  // Select interactive elements
  const elements = await page.$$(
    "a, button, input, textarea, [role=button], [role=treeitem]"
  );

  // Iterate over elements to highlight and tag them
  for (const element of elements) {
    await page.evaluate((e: Element) => {
      // Define visibility check functions
      const isStyleVisible = (el: Element): boolean => {
        const style = window.getComputedStyle(el);
        return (
          style.width !== "0" &&
          style.height !== "0" &&
          style.opacity !== "0" &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };

      const isElementInViewport = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <=
            (window.innerWidth || document.documentElement.clientWidth)
        );
      };

      const isElementVisible = (el: Element): boolean => {
        if (!el) return false;
        if (!isStyleVisible(el)) return false;
        let parent = el.parentElement;
        while (parent) {
          if (!isStyleVisible(parent)) return false;
          parent = parent.parentElement;
        }
        return isElementInViewport(el);
      };

      // Highlight and tag the element
      // @ts-ignore
      e.style.border = "1px solid red";
      const position = e.getBoundingClientRect();
      if (position.width > 5 && position.height > 5 && isElementVisible(e)) {
        const linkText = e.textContent?.replace(/[^a-zA-Z0-9 ]/g, "") || "";
        e.setAttribute("gpt-link-text", linkText);
      }
    }, element);
  }
}
async function waitForEvent(page, event) {
  return page.evaluate((event) => {
    return new Promise((r, _) => {
      document.addEventListener(event, function (e) {
        r(e);
      });
    });
  }, event);
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: false,
  });
}

async function createNewPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 1200,
    deviceScaleFactor: 1,
  });
  return page;
}

async function navigatePage(page, url, timeout) {
  console.log("Crawling " + url);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });
  await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
  await highlightLinks(page);
}

async function takeScreenshot(page) {
  await page.screenshot({
    path: "screenshot.jpg",
    fullPage: true,
  });
}

async function clickLink(page, linkText) {
  console.log("Clicking on " + linkText);
  const elements = await page.$$("[gpt-link-text]");
  let partial;
  let exact;
  for (const element of elements) {
    const attributeValue = await element.evaluate((el) =>
      el.getAttribute("gpt-link-text")
    );
    if (attributeValue.includes(linkText)) {
      partial = element;
    }
    if (attributeValue === linkText) {
      exact = element;
    }
  }
  if (exact || partial) {
    await (exact || partial).click();
  } else {
    throw new Error("Can't find link");
  }
}

async function processMessage(page, messageText, timeout) {
  if (messageText.indexOf('{"click": "') !== -1) {
    const linkText = messageText
      .split('{"click": "')[1]
      .split('"}')[0]
      .replace(/[^a-zA-Z0-9 ]/g, "");
    await clickLink(page, linkText);
    await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
    await highlightLinks(page);
    await takeScreenshot(page);
    return true;
  } else if (messageText.indexOf('{"url": "') !== -1) {
    const url = messageText.split('{"url": "')[1].split('"}')[0];
    await navigatePage(page, url, timeout);
    return true;
  }
  return false;
}
(async () => {
  console.log("###########################################");
  console.log("# GPT4V-Browsing#");
  console.log("###########################################\n");

  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1200,
    height: 1200,
    deviceScaleFactor: 1,
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      // name:'',
      role: "system",
      content: `You are a website crawler. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.
  
              You can go to a specific URL by answering with the following JSON format:
              {"url": "url goes here"}
  
              You can click links on the website by referencing the text inside of the link/button, by answering in the following JSON format:
              {"click": "Text in link"}
  
              Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.
  
              Use google search by set a sub-page like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one. Do not make up links`,
    },
  ];

  console.log("GPT: How can I assist you today?");
  const prompt = await input("You: ");
  console.log();

  messages.push({
    role: "user",
    content: prompt,
  });

  let url;
  let isScreenShotTaken = false;

  while (true) {
    if (url) {
      console.log("Crawling " + url);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeout,
      });

      await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);

      await highlightLinks(page);

      await page.screenshot({
        path: "screenshot.jpg",
        fullPage: true,
      });

      isScreenShotTaken = true;
      url = null;
    }

    if (isScreenShotTaken) {
      const base64Image = await imageToBase64("screenshot.jpg");

      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            // @ts-ignore
            imageUrl: base64Image,
          },
          {
            type: "text",
            text: 'Here\'s the screenshot of the website you are on right now. You can click on links with {"click": "Link text"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user\'s question, you can respond normally.',
          },
        ],
      });

      isScreenShotTaken = false;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 1024,
      messages: messages,
    });

    const message = response.choices[0].message;
    const messageText = message.content;

    messages.push({
      role: "assistant",
      content: messageText,
    });

    console.log("GPT: " + messageText);

    if (messageText.indexOf('{"click": "') !== -1) {
      let parts = messageText.split('{"click": "');
      parts = parts[1].split('"}');
      const linkText = parts[0].replace(/[^a-zA-Z0-9 ]/g, "");

      console.log("Clicking on " + linkText);

      try {
        const elements = await page.$$("[gpt-link-text]");

        let partial;
        let exact;

        for (const element of elements) {
          const attributeValue = await element.evaluate((el) =>
            el.getAttribute("gpt-link-text")
          );

          if (attributeValue.includes(linkText)) {
            partial = element;
          }

          if (attributeValue === linkText) {
            exact = element;
          }
        }

        if (exact || partial) {
          const [response] = await Promise.all([
            page
              .waitForNavigation({ waitUntil: "domcontentloaded" })
              .catch((e) =>
                console.log("Navigation timeout/error:", e.message)
              ),
            (exact || partial).click(),
          ]);

          // Additional checks can be done here, like validating the response or URL
          await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);

          await highlightLinks(page);

          await page.screenshot({
            path: "screenshot.jpg",
            quality: 100,
            fullPage: true,
          });

          isScreenShotTaken = true;
        } else {
          throw new Error("Can't find link");
        }
      } catch (error) {
        console.log("ERROR: Clicking failed", error);

        messages.push({
          role: "user",
          content: "ERROR: I was unable to click that element",
        });
      }

      continue;
    } else if (messageText.indexOf('{"url": "') !== -1) {
      let parts = messageText.split('{"url": "');
      parts = parts[1].split('"}');
      url = parts[0];

      continue;
    }

    const prompt = await input("You: ");
    console.log();

    messages.push({
      role: "user",
      content: prompt,
    });
  }
})();
