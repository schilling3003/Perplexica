import express from 'express';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { MetaSearchAgentType } from '../search/metaSearchAgent';
import RestaurantSearchAgent from '../chains/restaurantSearchAgent';
import { RestaurantSearchInput, RestaurantSearchRequest } from '../types';
import { searchHandlers } from '../websocket/messageHandler';
import logger from '../utils/logger';
import { getAvailableChatModelProviders, getAvailableEmbeddingModelProviders } from '../lib/providers';

const router = express.Router();

interface ChatModel {
  provider: string;
  model: string;
  customOpenAIBaseURL?: string;
  customOpenAIKey?: string;
}

interface EmbeddingModel {
  provider: string;
  model: string;
}

interface ChatRequestBody {
  optimizationMode: 'speed' | 'balanced' | 'quality';
  focusMode: string;
  chatModel?: ChatModel;
  embeddingModel?: EmbeddingModel;
  query: string;
  history: Array<[string, string]>;
}

router.post('/', async (req, res) => {
  try {
    const body: ChatRequestBody = req.body;

    if (!body.focusMode || !body.query) {
      return res.status(400).json({ message: 'Missing focus mode or query' });
    }

    // Handle restaurant search input format
    if (body.focusMode === 'restaurantSearch') {
      try {
        const parsedQuery = typeof body.query === 'string' ? JSON.parse(body.query) : body.query;
        const restaurantInfo: RestaurantSearchInput = {
          restaurant_name: parsedQuery.restaurantName || parsedQuery.restaurant_name || '',
          address: parsedQuery.address || ''
        };

        if (!restaurantInfo.restaurant_name || !restaurantInfo.address) {
          return res.status(400).json({ 
            message: 'Restaurant name and address are required',
            details: 'Both restaurant name and address must be provided'
          });
        }

        const [chatModelProviders, embeddingModelProviders] = await Promise.all([
          getAvailableChatModelProviders(),
          getAvailableEmbeddingModelProviders(),
        ]);

        const defaultChatProvider = Object.keys(chatModelProviders)[0];
        const defaultEmbeddingProvider = Object.keys(embeddingModelProviders)[0];
        
        let llm: BaseChatModel;
        let embeddings: Embeddings;

        if (chatModelProviders[defaultChatProvider]) {
          const defaultModel = Object.keys(chatModelProviders[defaultChatProvider])[0];
          llm = chatModelProviders[defaultChatProvider][defaultModel].model as unknown as BaseChatModel;
        } else {
          return res.status(500).json({ message: 'No chat model available' });
        }

        if (embeddingModelProviders[defaultEmbeddingProvider]) {
          const defaultModel = Object.keys(embeddingModelProviders[defaultEmbeddingProvider])[0];
          embeddings = embeddingModelProviders[defaultEmbeddingProvider][defaultModel].model as Embeddings;
        } else {
          return res.status(500).json({ message: 'No embedding model available' });
        }

        const agent = new RestaurantSearchAgent();
        const emitter = await agent.searchAndEvaluateRestaurant(
          restaurantInfo,
          [], // Empty history for API calls
          llm,
          embeddings,
          body.optimizationMode || 'balanced'
        );

        // Handle events with promises to ensure completion
        await new Promise<void>((resolve, reject) => {
          const events: any[] = [];
          
          emitter.on('data', (data) => {
            try {
              const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
              events.push(parsedData);
            } catch (error) {
              logger.error('Error parsing event data:', error);
              events.push({ type: 'error', data: 'Error processing response' });
            }
          });

          emitter.on('error', (error) => {
            reject(error);
          });

          emitter.on('end', () => {
            res.json({
              status: 'success',
              events: events
            });
            resolve();
          });
        });

        return;
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        return res.status(400).json({ message: 'Invalid restaurant search input format' });
      }
    }

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    const defaultChatProvider = Object.keys(chatModelProviders)[0];
    const defaultEmbeddingProvider = Object.keys(embeddingModelProviders)[0];
    
    let llm: BaseChatModel;
    let embeddings: Embeddings;

    if (body.chatModel?.provider === 'custom_openai') {
      if (!body.chatModel?.customOpenAIBaseURL || !body.chatModel?.customOpenAIKey) {
        return res.status(400).json({ message: 'Missing custom OpenAI base URL or key' });
      }

      llm = new ChatOpenAI({
        modelName: body.chatModel.model,
        openAIApiKey: body.chatModel.customOpenAIKey,
        temperature: 0.7,
        configuration: {
          baseURL: body.chatModel.customOpenAIBaseURL,
        },
      }) as unknown as BaseChatModel;
    } else if (chatModelProviders[defaultChatProvider]) {
      const defaultModel = Object.keys(chatModelProviders[defaultChatProvider])[0];
      llm = chatModelProviders[defaultChatProvider][defaultModel].model as unknown as BaseChatModel;
    } else {
      return res.status(500).json({ message: 'No chat model available' });
    }

    if (embeddingModelProviders[defaultEmbeddingProvider]) {
      const defaultModel = Object.keys(embeddingModelProviders[defaultEmbeddingProvider])[0];
      embeddings = embeddingModelProviders[defaultEmbeddingProvider][defaultModel].model as Embeddings;
    } else {
      return res.status(500).json({ message: 'No embedding model available' });
    }

    // Convert history to BaseMessage format
    const history: BaseMessage[] = body.history?.map(([role, content]) => {
      return role === 'human' ? new HumanMessage(content) : new AIMessage(content);
    }) || [];

    body.history = body.history || [];
    body.optimizationMode = body.optimizationMode || 'balanced';

    const searchHandler: MetaSearchAgentType = searchHandlers[body.focusMode];

    if (!searchHandler) {
      return res.status(400).json({ message: 'Invalid focus mode' });
    }

    const emitter = await searchHandler.searchAndAnswer(
      body.query,
      history,
      llm,
      embeddings,
      body.optimizationMode,
      [],
    );

    let message = '';
    let sources = [];

    emitter.on('data', (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'response') {
        message += parsedData.data;
      } else if (parsedData.type === 'sources') {
        sources = parsedData.data;
      }
    });

    emitter.on('end', () => {
      res.status(200).json({ message, sources });
    });

    emitter.on('error', (data) => {
      const parsedData = JSON.parse(data);
      res.status(500).json({ message: parsedData.data });
    });
  } catch (error) {
    logger.error('Error in search route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add new restaurant search endpoint
router.post('/restaurant', async (req, res) => {
  try {
    const { restaurantName, address, optimizationMode = 'balanced' } = req.body as RestaurantSearchRequest;

    if (!restaurantName || !address) {
      return res.status(400).json({ message: 'Restaurant name and address are required' });
    }

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    const chatModel = new ChatOpenAI() as unknown as BaseChatModel;
    const [defaultEmbeddingProvider] = Object.values(embeddingModelProviders);
    const embeddings = defaultEmbeddingProvider as unknown as Embeddings;
    
    const agent = new RestaurantSearchAgent();
    const restaurantInfo: RestaurantSearchInput = {
      restaurant_name: restaurantName,  // Map camelCase to snake_case
      address
    };

    const emitter = await agent.searchAndEvaluateRestaurant(
      restaurantInfo,
      [], // Empty history for API calls
      chatModel,
      embeddings,
      optimizationMode
    );

    // Collect all events
    const events: any[] = [];
    
    emitter.on('data', (data) => {
      events.push(data);
    });

    emitter.on('error', (error) => {
      res.status(500).json({ message: error.data || 'An error occurred during restaurant evaluation' });
    });

    emitter.on('end', () => {
      res.json({
        status: 'success',
        events: events
      });
    });

  } catch (error) {
    logger.error('Restaurant search error:', error);
    res.status(500).json({ message: 'Failed to process restaurant search' });
  }
});

export default router;
