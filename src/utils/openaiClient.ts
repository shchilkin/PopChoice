import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API key is missing or invalid.');
}

const openAIClient = new OpenAI();

export default openAIClient;
