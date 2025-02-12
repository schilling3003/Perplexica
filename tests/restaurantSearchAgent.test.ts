import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import RestaurantSearchAgent from '../src/chains/restaurantSearchAgent';
import { HumanMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';

describe('RestaurantSearchAgent', () => {
  let agent: RestaurantSearchAgent;
  let mockLLM: BaseChatModel;
  let mockEmbeddings: Embeddings;

  beforeEach(() => {
    mockLLM = {
      invoke: vi.fn().mockResolvedValue({ content: 'Mocked response' }),
      stream: vi.fn(),
      streamEvents: vi.fn(),
    } as unknown as BaseChatModel;

    // Create a properly mocked Embeddings instance with vi.fn()
    const embedDocumentsMock = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const embedQueryMock = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    
    mockEmbeddings = {
      embedDocuments: embedDocumentsMock,
      embedQuery: embedQueryMock,
    } as unknown as Embeddings;

    agent = new RestaurantSearchAgent();
  });

  it('should properly format restaurant query', async () => {
    const message = JSON.stringify({
      restaurantName: "Joe's Italian",
      address: '123 Main St, Anytown, USA'
    });
    const history = [new HumanMessage('Previous message')];

    const emitter = await agent.searchAndAnswer(
      message,
      history,
      mockLLM,
      mockEmbeddings,
      'balanced',
      []
    );

    // Verify emitter events
    let responseMessage = '';
    let sources: any[] = [];

    emitter.on('data', (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'response') {
        responseMessage += parsedData.data;
      } else if (parsedData.type === 'sources') {
        sources = parsedData.data;
      }
    });

    // Wait for emitter to finish
    await new Promise((resolve) => emitter.on('end', resolve));

    expect(responseMessage).toBeTruthy();
  });

  it('should handle invalid restaurant input', async () => {
    const message = 'invalid input';
    const history = [new HumanMessage('Previous message')];

    const emitter = await agent.searchAndAnswer(
      message,
      history,
      mockLLM,
      mockEmbeddings,
      'balanced',
      []
    );

    let error = false;
    emitter.on('error', () => {
      error = true;
    });

    await new Promise((resolve) => emitter.on('end', resolve));
    expect(error).toBe(true);
  });

  describe('evaluation chain', () => {
    it('should evaluate restaurant fit using the evaluation prompt', async () => {
      const restaurantInfo = {
        atmosphere: 'Upscale fine dining establishment with modern decor',
        cuisine: 'Modern Italian fusion',
        menu: 'Features truffle dishes, artisanal pasta, and imported cheeses',
        reviews: 'Known for high-end ingredients and wine pairings'
      };

      vi.mocked(mockLLM.invoke).mockResolvedValueOnce({
        content: 'Based on the menu items (truffle dishes, artisanal pasta) and upscale atmosphere, this restaurant has a high likelihood (9 out of 10) of needing specialty cheeses.'
      });

      const result = await agent['createRestaurantEvaluationChain'](
        mockLLM,
        mockEmbeddings,
        { restaurant_name: "Joe's Italian", address: '123 Main St' }
      );

      expect(mockLLM.invoke).toHaveBeenCalledWith(expect.stringContaining('specialty cheese program'));
      expect(result).toBeDefined();
    });

    it('should handle missing restaurant information gracefully', async () => {
      vi.mocked(mockLLM.invoke).mockRejectedValueOnce(new Error('Insufficient restaurant information'));

      await expect(
        agent['createRestaurantEvaluationChain'](
          mockLLM,
          mockEmbeddings,
          { restaurant_name: '', address: '' }
        )
      ).rejects.toThrow();
    });
  });

  describe('re-ranking behavior', () => {
    it('should filter documents below 0.3 similarity threshold', async () => {
      const docs = [
        new Document({ pageContent: 'High relevance', metadata: { score: 0.8 } }),
        new Document({ pageContent: 'Medium relevance', metadata: { score: 0.4 } }),
        new Document({ pageContent: 'Low relevance', metadata: { score: 0.2 } })
      ];

      vi.mocked(mockEmbeddings.embedDocuments).mockResolvedValueOnce([
        [0.8, 0.8, 0.8],
        [0.4, 0.4, 0.4],
        [0.2, 0.2, 0.2]
      ]);

      const result = await agent['rerankDocuments'](docs, 'test query', mockEmbeddings);
      
      expect(result).toHaveLength(2);
      expect(result[0].metadata.score).toBeGreaterThan(0.3);
      expect(result[1].metadata.score).toBeGreaterThan(0.3);
    });
  });

  describe('multi-engine search', () => {
    it('should merge results from multiple search engines', async () => {
      const googleResults = [
        new Document({ pageContent: 'Google result 1', metadata: { engine: 'google' } }),
        new Document({ pageContent: 'Google result 2', metadata: { engine: 'google' } })
      ];

      const bingResults = [
        new Document({ pageContent: 'Bing result 1', metadata: { engine: 'bing' } }),
        new Document({ pageContent: 'Bing result 2', metadata: { engine: 'bing' } })
      ];

      // Mock the search functions
      vi.spyOn(agent as any, 'searchGoogle').mockResolvedValueOnce(googleResults);
      vi.spyOn(agent as any, 'searchBing').mockResolvedValueOnce(bingResults);

      const message = JSON.stringify({
        restaurantName: "Joe's Italian",
        address: '123 Main St, Anytown, USA'
      });

      const emitter = await agent.searchAndAnswer(
        message,
        [],
        mockLLM,
        mockEmbeddings,
        'balanced',
        []
      );

      let sources: any[] = [];
      emitter.on('data', (data) => {
        const parsedData = JSON.parse(data);
        if (parsedData.type === 'sources') {
          sources = parsedData.data;
        }
      });

      await new Promise((resolve) => emitter.on('end', resolve));
      
      expect(sources).toBeDefined();
      expect(sources.some(s => s.metadata?.engine === 'google')).toBe(true);
      expect(sources.some(s => s.metadata?.engine === 'bing')).toBe(true);
    });
  });
});