import { AgentState, PluginApi } from "../../base-agent/baseAgent";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";

import { sleep } from "openai/core";

puppeteer.use(StealthPlugin());

export const browsePlugin = (pluginApi: PluginApi) => {
  let browser;
  let page;

  const launchBrowser = async () => {
    browser = await puppeteer.launch({
      headless: false, // Make this configurable
    });
    return browser;
  };

  async function createNewPage(browser) {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1200,
      height: 1200,
      deviceScaleFactor: 1,
    });
    return page;
  }

  const navigatePage = async (page, url, timeout) => {
    try {
      pluginApi.emit("stateChanging", "busy");
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: timeout,
      });
      // await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
      pluginApi.emit("stateChanged", "idle");
      return page;
    } catch (error) {
      pluginApi.emit("stateChanged", "error");
      throw error;
    }
  };

  const takeScreenshot = async (page): Promise<string> => {
    const screenshotPath = "screenshot.jpg";
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    return screenshotPath;
  };

  async function clickLink(page, linkText) {
    linkText = linkText.trim().toLowerCase();

    const elements = await page.$$("[gpt-link-text]");

    let matchedElement = null;
    for (const element of elements) {
      const attributeValue = await element.evaluate((el) =>
        el.getAttribute("gpt-link-text")
      );
      if (attributeValue.trim().toLowerCase() === linkText) {
        matchedElement = element;
        break;
      }
    }

    // if (matchedElement) {
    //   // console.log("Found element, clicking: ", linkText);
    //   // // const navigationPromise = page.waitForNavigation({
    //   // //   waitUntil: "networkidle0",
    //   // // });
    //   // await matchedElement.click();
    //   // // await navigationPromise.catch((e) =>
    //   // //   console.log("Navigation timeout/error:", e.message)
    //   // // );
    //   console.log("Found element, clicking: ", linkText);
    //   // Wait for navigation to complete after the click
    //   const navigationPromise = page.waitForNavigation({
    //     waitUntil: "networkidle0",
    //   });
    //   await matchedElement.click();
    //   await navigationPromise.catch((e) =>
    //     console.log("Navigation timeout/error:", e.message)
    //   );
    //   return page;
    // } else {
    //   console.log("No match!!");
    //   // throw new Error(`Can't find link with text: ${linkText}`);
    // }
    if (matchedElement) {
      console.log("Found element, clicking!!! ", linkText);
      try {
        // Start the navigation promise before clicking the link
        const navigationPromise = page.waitForNavigation({
          waitUntil: "networkidle0",
        });
        await matchedElement.click();
        // Wait for the navigation to complete
        await navigationPromise;
      } catch (error) {
        console.error("Error during navigation after click:", error.message);
      }
    } else {
      console.log("No match!!");
      // throw new Error(`Can't find link with text: ${linkText}`);
    }
    return page;
  }

  async function highlightLinks(page: any): Promise<void> {
    await page.evaluate(() => {
      document.querySelectorAll("[gpt-link-text]").forEach((element) => {
        element.removeAttribute("gpt-link-text");
      });
    });

    const elements = await page.$$(
      "a, button, input, textarea, [role=button], [role=treeitem]"
    );

    for (const element of elements) {
      const isHighlighted = await page.evaluate((e: Element) => {
        console.log("evaluating");
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

        // @ts-ignore
        // e.style.border = "1px solid red";
        const position = e.getBoundingClientRect();

        const htmlElement = e as HTMLElement;

        if (position.width > 5 && position.height > 5) {
          // Use textContent for better extraction of nested elements
          let linkTextContent = htmlElement.textContent || "";
          linkTextContent = linkTextContent.replace(/\s+/g, " ").trim(); // Normalize whitespace
          linkTextContent = linkTextContent
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .toLowerCase(); // Remove non-alphanumeric chars and convert to lower case
          htmlElement.setAttribute("gpt-link-text", linkTextContent);
          htmlElement.style.border = "1px solid red";
          return true;
        }
        return false;
      }, element);
      if (isHighlighted) {
        const outerHTML = await element.evaluate((e) => e.outerHTML);
        // console.log(`Highlighted element: ${outerHTML}`);
      }
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

  // async function handleLinkClick(page, linkText, timeout) {
  //   console.log("HANDLING CLICK: ", linkText);
  //   // Capture the return value of clickLink
  //   page = await clickLink(page, linkText);
  //   // Check if the page is still defined after the click
  //   if (!page) {
  //     throw new Error("The page context is lost after clicking the link.");
  //   }
  //   await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
  //   console.log(`Finish handleLinkClick.`);
  //   return page; // Return the updated page context
  // }

  async function processMessage(page, messageText, timeout) {
    let result = {};
    // console.log("🚀 ~ file: browse.ts:218 ~ processing message:", messageText);

    const clickRegex = /{"click"\s*:\s*"([^"]+)"}/;
    const urlRegex = /{"url"\s*:\s*"([^"]+)"}/;

    const containsClick = messageText.includes('{"click"');
    const containsUrl = messageText.includes('{"url"');

    const clickMatch = messageText.match(clickRegex);
    const urlMatch = messageText.match(urlRegex);

    if (clickMatch || containsClick) {
      const linkText = clickMatch[1].replace(/[^a-zA-Z0-9 ]/g, "");
      result = {
        actionType: "click",
        link: linkText,
      };
    } else if (urlMatch || containsUrl) {
      const url = urlMatch[1];
      result = {
        actionType: "navigation",
        link: url,
      };
    }

    return result;
  }
  const imageToBase64 = async (imageFilePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fs.readFile(imageFilePath, (err, data) => {
        if (err) {
          pluginApi.emit("stateChanged", "error");
          reject(err);
          return;
        }
        const base64Data = data.toString("base64");
        resolve(`data:image/jpeg;base64,${base64Data}`);
      });
    });
  };

  return {
    navigatePage,
    takeScreenshot,
    clickLink,
    waitForEvent,
    imageToBase64,
    launchBrowser,
    createNewPage,
    // handleLinkClick,
    highlightLinks,
    // maybe move these away to 'strategies'
    processMessage,
  };
};
