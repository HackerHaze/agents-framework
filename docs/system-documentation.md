# Agents framework - Software Documentation

## Overview

This document provides a comprehensive guide to the software components and functionalities of an autonomous agents-framework designed for web browsing automation and task execution.

### Components

**Agent Management**: Manages the lifecycle of agents, task queuing, agent registry, event-driven communication, and task execution.
**Base Agent**: Base Agents encompasses the base capabilities of an agent.
**Browser Agent**: Automates web browser interactions such as navigation, clicking, taking screenshots, and handling user inputs.
**Plugins**: Extend the base agent's capabilities with specific actions like browsing and base functionalities.
**Actions**: Define higher-level 'actions' that agents can execute, such as taking screenshots, browsing etc.
**Strategies**: Define higher-level 'set of actions' or 'strategies' that agents can execute, such as taking screenshots, analyzing them and returning the elements that can be interacted with. Strategies are ultimately a set of various actions.
**Helpers**: Integrates helpers that will abstract common libraries like OpenAI's API to process and generate text completions for the agents' tasks. This is abstracted so that other services can be integrated in the future.

## Key Functionalities

### Agent-Management

- **Agent Lifecycle Management**: Handles states like initializing, idle, active, paused, and terminated.
- **Task Queue**: Manages the order of task execution for agents.
- **Agent Registry**: Tracks all registered agents and their statuses.
- **Event Emitter**: Enables event-driven communication between agents and the framework.
- **Agent Task Execution**: Orchestrates the execution of tasks by combining lifecycle management, task queue, and event emitter.

### Plugins

- **Base Plugin**: Offers basic functionalities such as user input handling. // More to be added soon
- **Browse Plugin**: Provides actions for browser automation like navigation, clicking, taking screenshots, and highlighting links.

### Strategies

- **Screenshot Analysis**: Take a screenshot, highlight interactable elements, and analyze them using OpenAI's vision model.
- **Message Processing**: Interpret messages to determine the next action, such as clicking a link or navigating to a URL.

### Browser Agent Functionalities

- **Navigation**: Navigate to URLs within a timeout period.
- **Interaction**: Click on links or buttons with specified text.
- **Screenshots**: Take full-page screenshots and save them.
- **Input Handling**: Prompt the user for input and return the value.
- **Utility Functions**: Convert images to Base64 strings.
- **Event Handling**: Wait for specified events to occur on the page.
- **Browser Management**: Launch new browser instances and create new pages.
- **Link Highlighting**: Highlight interactive elements on the web page.

### OpenAI Helper

- **Message Management**: Add and clear messages from the conversation history.
- **Completion Creation**: Generate text completions using OpenAI's GPT model.

### Integration

The agent management features are integrated with existing browsing helper functions, allowing agents to navigate web pages, click links, take screenshots, and handle I/O within the agent management system.

### Processes

Outlined processes include launching the browser, setting up initial system messages, user input, creating completions, and executing strategies within a loop to handle tasks like taking screenshots and analyzing them.

Folder structure:

agents-framework/
|-- src/
|--|-- modules/
|--|--|-- base-agent/
|--|--|-- handlers/
|--|--|-- plugins/
|--|--|--|-- actions/
|--|--|--|-- strategies/
|--|-- utils/
|-- index.js
