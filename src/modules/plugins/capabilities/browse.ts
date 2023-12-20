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
      await Promise.race([waitForEvent(page, "load"), sleep(timeout)]);
      await highlightLinks(page);
      pluginApi.emit("stateChanged", "idle");
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
      await page.evaluate((e: Element) => {
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

  // Initialize the browser when the plugin is registered
  // Let's think about this
  // (async () => {
  //   try {
  //     const browser = await launchBrowser();
  //     await createNewPage(browser);
  //   } catch (error) {
  //     console.error("Failed to initialize the browser:", error);
  //     pluginApi.emit("stateChanged", "error");
  //   }
  // })();

  return {
    navigatePage,
    takeScreenshot,
    clickLink,
    waitForEvent,
    imageToBase64,
    // maybe move these away to a 'default plugin'
    processMessage,
  };
};
