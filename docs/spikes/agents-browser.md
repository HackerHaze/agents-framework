Browser Agent Documentation
Overview

The Browser Agent is a part of the agents-framework that provides functionalities for automating interactions with a web browser. It is designed to perform tasks such as navigating web pages, clicking links, taking screenshots, and processing user inputs.
Functionalities
Navigation

- navigatePage(page, url, timeout): Navigates to a specified URL within the given timeout period.
  Interaction

- clickLink(page, linkText): Clicks on a link or button with the specified text on the current web page.
  Screenshots

- takeScreenshot(page): Takes a full-page screenshot and saves it to a predefined path.
  Input Handling

- input(prompt): Prompts the user for input and returns the provided value.
  Utility Functions

- imageToBase64(imageFilePath): Converts an image file to a Base64 string.
  Event Handling

- waitForEvent(page, event): Waits for a specified event to occur on the page.
  Browser Management

- launchBrowser(): Launches a new browser instance.
- createNewPage(browser): Opens a new tab in the browser.
  Link Highlighting

- highlightLinks(page): Highlights interactive elements such as links and buttons on the current web page.
