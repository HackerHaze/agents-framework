// src/modules/openai-handler/openaiHelper.ts
import OpenAI from "openai";
import {
  ChatCompletionContentPart,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionRole,
} from "openai/resources";

const openai = new OpenAI({
  apiKey: "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",
});

export const createOpenAIHelper = () => {
  // messages are the whole conversation
  let messages: ChatCompletionMessageParam[] = [];
  // seriesMessages are a subset of messages from the current conversation.
  // It can adjust depending on the goals
  let seriesMessages: ChatCompletionMessageParam[] = [];

  const addMessage = (message: ChatCompletionMessage) => {
    messages.push(message);
  };
  const addMessageToSerie = (message: ChatCompletionMessage) => {
    seriesMessages.push(message);
  };

  const getMessages = () => {
    return messages;
  };
  const getSeriesMessages = () => {
    return seriesMessages;
  };

  const clearMessages = () => {
    messages = [];
  };
  const clearSeriesMessages = () => {
    seriesMessages = [];
  };

  const createStandaloneCompletion = async ({
    chatMessages,
  }: {
    chatMessages;
  }) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        max_tokens: 4096,
        messages: chatMessages,
        functions: [
          {
            name: "navigate",
            description: "navigates to an url",
            parameters: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                },
              },
            },
          },
        ],
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw error;
    }
  };
  const createCompletion = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        max_tokens: 4096,
        messages: messages,
        functions: [
          {
            name: "navigate",
            description: "navigates to an url",
            parameters: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                },
              },
            },
          },
        ],
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw error;
    }
  };
  const createSeriesCompletion = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        max_tokens: 4096,
        messages: [...messages, ...seriesMessages],
        tools: [
          {
            function: {
              name: "navigate",
              description: "navigates to an url",
              parameters: {
                url: "string",
              },
            },
            type: "function",
          },
        ],
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw error;
    }
  };
  const createVisionCompletion = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 4096,
        messages: [...messages, ...seriesMessages],
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw error;
    }
  };
  const createStandaloneVisionCompletion = async ({
    chatMessages,
  }: {
    chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 4096,
        messages: chatMessages,
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw error;
    }
  };
  return {
    addMessage,
    getMessages,
    clearMessages,
    createStandaloneVisionCompletion,
    createCompletion,
    addMessageToSerie,
    createSeriesCompletion,
    clearSeriesMessages,
    getSeriesMessages,
    createVisionCompletion,
    createStandaloneCompletion,
  };
};
export type OpenAIHelper = ReturnType<typeof createOpenAIHelper>;
