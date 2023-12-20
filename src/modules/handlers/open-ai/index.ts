// src/modules/openai-handler/openaiHelper.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

export const createOpenAIHelper = () => {
  let messages = [];

  const addMessage = (role, content) => {
    messages.push({ role, content });
  };

  const getMessages = () => {
    return messages;
  };

  const clearMessages = () => {
    messages = [];
  };

  const createCompletion = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 1024,
        messages: messages,
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
    createCompletion,
  };
};
