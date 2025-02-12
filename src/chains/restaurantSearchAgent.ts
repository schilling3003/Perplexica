import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { PromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';
import { RunnableSequence, RunnableMap } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { EventEmitter } from 'events';

import MetaSearchAgent from '../search/metaSearchAgent';
import { restaurantInfoRetrieverPrompt, restaurantEvaluationPrompt } from '../prompts/restaurantSearch';
import { formatChatHistoryAsString } from '../utils/formatHistory';
import { EventLogger } from '../utils/logger';

interface RestaurantSearchInput extends Record<string, unknown> {
  restaurant_name: string;
  address: string;
}

class RestaurantSearchAgent extends MetaSearchAgent {
  protected readonly outputParser: StringOutputParser;
  private queryGeneratorPrompt: string;
  private responsePrompt: string;

  constructor() {
    super({
      activeEngines: ['google', 'bing'],
      queryGeneratorPrompt: '', // Initialize with empty string
      responsePrompt: '', // Initialize with empty string
      rerank: true,
      rerankThreshold: 0.3,
      searchWeb: true,
      summarizer: true,
    });
    this.outputParser = new StringOutputParser();
    this.queryGeneratorPrompt = '';
    this.responsePrompt = '';
    this.initializePrompts();
  }

  private initializePrompts() {
    const infoTemplate = PromptTemplate.fromTemplate(restaurantInfoRetrieverPrompt);
    const evaluationTemplate = PromptTemplate.fromTemplate(restaurantEvaluationPrompt);
    
    // Store the formatted templates for use in search and evaluation
    this.queryGeneratorPrompt = JSON.stringify(infoTemplate.template);
    this.responsePrompt = JSON.stringify(evaluationTemplate.template);
  }

  async searchAndAnswer(
    query: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    files: string[] = []
  ): Promise<EventLogger> {
    const emitter = new EventLogger();
    
    try {
      const parsedInfo = this.parseRestaurantQuery(query);
      emitter.emit('data', { type: 'status', data: 'Searching for restaurant information...' });
      
      // Get initial web search results
      const searchEmitter = await super.searchAndAnswer(
        `Find detailed information about ${parsedInfo.restaurant_name} restaurant at ${parsedInfo.address}. Include details about their menu, cuisine style, atmosphere, and customer reviews.`,
        history,
        llm,
        embeddings,
        optimizationMode,
        files
      );

      // Collect search results synchronously
      const searchResults = await new Promise<string>((resolve, reject) => {
        let collectedResults = '';
        
        searchEmitter.on('data', (data) => {
          if (data.type === 'response') {
            collectedResults += data.data;
          }
        });

        searchEmitter.once('end', () => resolve(collectedResults));
        searchEmitter.once('error', reject);
      });

      if (!searchResults.trim()) {
        throw new Error('No information found for the restaurant');
      }

      emitter.emit('data', { type: 'status', data: 'Analyzing restaurant information...' });

      // Process restaurant information
      const infoPrompt = PromptTemplate.fromTemplate(restaurantInfoRetrieverPrompt);
      const formattedInfo = await llm.invoke(await infoPrompt.format({
        raw_info: searchResults,
        restaurant_name: parsedInfo.restaurant_name,
        address: parsedInfo.address,
        chat_history: formatChatHistoryAsString(history)
      }));

      // Evaluate the restaurant
      const evaluationPrompt = PromptTemplate.fromTemplate(restaurantEvaluationPrompt);
      const evaluationStream = await llm.stream(await evaluationPrompt.format({
        processed_info: formattedInfo,
        context: formattedInfo.content // Assuming 'formattedInfo' has a 'content' property that can be used as 'context'
      }));

      for await (const chunk of evaluationStream) {
        emitter.emit('data', { type: 'response', data: chunk.content });
      }

      emitter.emit('end');
      return emitter;

    } catch (error) {
      console.error('Error in restaurant search:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process restaurant search';
      emitter.emit('error', { type: 'error', data: errorMessage });
      return emitter;
    }
  }

  private parseRestaurantQuery(query: string): RestaurantSearchInput {
    try {
      if (typeof query === 'string') {
        // Try parsing as JSON first
        try {
          const parsed = JSON.parse(query);
          if (parsed.restaurantName || parsed.restaurant_name) {
            return {
              restaurant_name: parsed.restaurantName || parsed.restaurant_name,
              address: parsed.address
            };
          }
        } catch (e) {
          // If JSON parsing fails, try string format
          if (query.includes('Restaurant Name:') && query.includes('Address:')) {
            const nameParts = query.split('Restaurant Name:')[1].split('Address:');
            return {
              restaurant_name: nameParts[0].trim(),
              address: nameParts[1].trim()
            };
          }
        }
      }
      throw new Error('Invalid restaurant query format');
    } catch (error) {
      console.error('Error parsing restaurant query:', error);
      throw error;
    }
  }

  async searchAndEvaluateRestaurant(
    restaurantInfo: RestaurantSearchInput,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality'
  ) {
    const emitter = new EventLogger();
    
    try {
      emitter.emit('data', JSON.stringify({ type: 'status', data: 'Searching for restaurant information...' }));
      
      // Get initial web search results using the base search functionality
      const searchResults = await super.searchAndAnswer(
        `Find detailed information about ${restaurantInfo.restaurant_name} restaurant at ${restaurantInfo.address}. Include details about their menu, cuisine style, atmosphere, and customer reviews.`,
        history,
        llm,
        embeddings,
        optimizationMode,
        []
      ).then(async (searchEmitter) => {
        return new Promise<string>((resolve, reject) => {
          let collectedResults = '';
          
          searchEmitter.on('data', (data) => {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            if (parsedData.type === 'response') {
              collectedResults += parsedData.data;
            }
          });

          searchEmitter.once('end', () => resolve(collectedResults));
          searchEmitter.once('error', reject);
        });
      });

      if (!searchResults?.trim()) {
        throw new Error('No information found for the restaurant');
      }

      emitter.emit('data', JSON.stringify({ type: 'status', data: 'Analyzing restaurant information...' }));

      // Process restaurant information with structured chain
      const infoRetrieverChain = await RunnableSequence.from([
        async () => ({
          restaurant_name: restaurantInfo.restaurant_name,
          address: restaurantInfo.address,
          chat_history: formatChatHistoryAsString(history),
          raw_info: searchResults
        }),
        PromptTemplate.fromTemplate(restaurantInfoRetrieverPrompt),
        llm,
        this.outputParser
      ]);

      const restaurantData = await infoRetrieverChain.invoke({});

      // Create and run the evaluation chain with structured data
      const evaluationChain = await RunnableSequence.from([
        async () => ({
          processed_info: restaurantData
        }),
        PromptTemplate.fromTemplate(restaurantEvaluationPrompt),
        llm,
        this.outputParser
      ]).withConfig({
        runName: 'RestaurantEvaluation',
      });

      const evaluationResult = await evaluationChain.invoke({});
      emitter.emit('data', JSON.stringify({ type: 'response', data: evaluationResult }));
      emitter.emit('end');
      return emitter;
    } catch (error) {
      console.error('Error in restaurant evaluation:', error);
      emitter.emit('error', JSON.stringify({ type: 'error', data: error instanceof Error ? error.message : 'Failed to evaluate restaurant' }));
      return emitter;
    }
  }

  private async createRestaurantEvaluationChain(
    llm: BaseChatModel,
    restaurantInfo: RestaurantSearchInput
  ) {
    const evaluationPrompt = PromptTemplate.fromTemplate(restaurantEvaluationPrompt);

    return RunnableSequence.from([
      RunnableMap.from({
        chat_history: (input: any) => formatChatHistoryAsString(input.chat_history),
        processed_info: (input: any) => input.search_results,
      }),
      evaluationPrompt,
      llm,
      this.outputParser
    ]).withConfig({
      runName: 'RestaurantEvaluation',
    });
  }
}

export default RestaurantSearchAgent;