export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return "I'm having trouble connecting to the AI service. Please ensure Ollama is running by executing 'ollama serve' in your terminal, and that you have a model installed (e.g., 'ollama pull mistral'). If you prefer to use OpenAI instead, update your .env file with LLM_PROVIDER=openai and add your OPENAI_API_KEY.";
    } else if (error.message.includes('API key')) {
      return "There seems to be an issue with the API key configuration. Please check your environment variables and ensure your API key is valid.";
    } else if (error.message.includes('model')) {
      return "There seems to be an issue with the AI model. Please ensure you have the correct model installed and configured.";
    } else if (error.message.includes('Cannot connect to Ollama')) {
      return error.message;
    } else if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    } else if (error.message.includes('JSON')) {
      return 'Server configuration error. Please check the server logs and try again.';
    } else if (error.message.includes('HTTP')) {
      return `Server error: ${error.message}. Please try again or contact support.`;
    }
    return error.message;
  }
  return 'An unknown error occurred.';
}
