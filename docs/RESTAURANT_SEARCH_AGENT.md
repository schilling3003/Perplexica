# Restaurant Search Agent Technical Documentation

## Overview
The Restaurant Search Agent is a specialized AI agent designed to evaluate restaurants for their potential fit with a specialty cheese program. It extends the base MetaSearchAgent and provides detailed analysis of restaurants based on web searches and AI evaluation.

## Core Components

### 1. Input Processing
The agent accepts two key pieces of information:
- Restaurant Name
- Address

These can be provided in either JSON format:
```json
{
  "restaurantName": "Example Restaurant",
  "address": "123 Main St"
}
```
or as a formatted string:
```
Restaurant Name: Example Restaurant
Address: 123 Main St
```

### 2. Search Process
The agent performs searches using multiple engines:
- Configured to use both Google and Bing by default
- Uses a reranking threshold of 0.3 to filter irrelevant results
- Implements web search with result summarization

### 3. Information Retrieval
The agent uses two specialized prompts located in `src/prompts/restaurantSearch.ts`:

#### Restaurant Info Retriever Prompt (`restaurantInfoRetrieverPrompt`)
Location: `src/prompts/restaurantSearch.ts`

This prompt is responsible for initial information gathering and extraction. It structures information about the restaurant in XML format:
```xml
<atmosphere>[Description of ambiance and decor]</atmosphere>
<cuisine>[Style of cuisine offered]</cuisine>
<menu>[Key menu items]</menu>
<reviews>[Customer and critic reviews]</reviews>
```

The prompt instructs the AI to act as a restaurant information summarizer, searching the web for specific details about the restaurant's atmosphere, cuisine type, menu items, and reviews.

#### Restaurant Evaluation Prompt (`restaurantEvaluationPrompt`)
Location: `src/prompts/restaurantSearch.ts`

This prompt handles the evaluation phase. It analyzes the structured information to evaluate the restaurant's fit for a specialty cheese program by considering:
- Cuisine style and key ingredients
- Presence of high-end or specialty items
- Restaurant's tone and emphasis on premium products
- Overall fit score (1-10 scale)

Both prompts are imported and used in the `RestaurantSearchAgent` class located in `src/chains/restaurantSearchAgent.ts`. The prompts are also registered in the main prompts index file at `src/prompts/index.ts` for system-wide accessibility.

### 4. Evaluation Process

The evaluation follows these steps:

1. Web Search
   - Performs multi-engine search for restaurant information
   - Gathers comprehensive details about menu, atmosphere, and reviews

2. Information Processing
   - Structures raw search results into categorized XML format
   - Ensures consistent format for evaluation

3. Final Evaluation
   - Analyzes structured data
   - Produces a score and explanation
   - Returns results in format: "Based on [key findings], this restaurant has a [score] out of 10 likelihood of being a good fit for a specialty cheese program because [brief explanation]."

### 5. Technical Implementation

The agent uses LangChain's RunnableSequence for processing:
- Implements streaming support for real-time updates
- Uses separate chains for info retrieval and evaluation
- Includes error handling for invalid inputs
- Supports chat history context for improved results

#### Prompt Integration Flow
1. Initial Setup
   - Prompts are initialized in the RestaurantSearchAgent constructor
   - Both prompts are loaded from `src/prompts/restaurantSearch.ts`
   - Integrated into the agent's chain system via RunnableSequence

2. Chain Construction
   ```typescript
   restaurantInfoRetrieverPrompt -> Search Results Processing -> XML Formatting
                                              ↓
   restaurantEvaluationPrompt -> Structured Analysis -> Final Score/Explanation
   ```

3. Processing Pipeline
   - Info Retriever chain processes raw search results
   - Evaluation chain receives formatted XML data
   - Both chains use the chat model specified in the agent configuration

#### Configuration Integration
The prompts are configured with:
- Dynamic variable substitution for restaurant details
- XML tag validation for consistent formatting
- Error handling for malformed responses
- Context preservation between chain executions

### 6. Error Handling

The agent includes robust error handling for:
- Invalid restaurant query formats
- Missing search results
- Processing failures
- Invalid or missing restaurant information

## Usage Example

When using the agent through the API:

1. The client sends a request with restaurant details
2. The agent performs a web search and analysis
3. Real-time updates are streamed via WebSocket
4. Final evaluation is returned with a detailed explanation

## Integration Points

The agent integrates with:
- Frontend RestaurantSearchInput component
- WebSocket message handler
- Search route handler
- Chat history system

## Performance Considerations

- Uses multi-engine search for comprehensive results
- Implements reranking to filter low-quality results (threshold: 0.3)
- Supports different optimization modes: speed, balanced, quality

## Testing Strategy

The agent includes comprehensive test coverage:

### Unit Tests
- Query parsing validation
- Restaurant information processing
- Evaluation chain execution
- Error handling scenarios

### Integration Tests
- Full search and evaluation flow
- Multi-engine search integration
- Streaming response handling
- WebSocket event emission

### Performance Tests
- Document reranking validation
- Similarity threshold testing (0.3 cutoff)
- Response time optimization

## Optimization Details

### Search Optimization
- Parallel execution of Google and Bing searches
- Smart reranking system that filters results below 0.3 similarity score
- Efficient document processing with streaming updates

### Memory Management
- Proper cleanup of search results
- Efficient handling of large response streams
- Smart context management for chat history

### Response Time
- Immediate feedback through WebSocket updates
- Parallel processing where possible
- Optimized prompt templates for faster LLM responses

## Configuration Options

The agent supports various configuration options:

### Search Engines
```typescript
activeEngines: ['google', 'bing']
```

### Optimization Modes
- speed: Prioritizes faster responses
- balanced: Default mode balancing speed and quality
- quality: Prioritizes comprehensive analysis

### Reranking Settings
```typescript
rerank: true,
rerankThreshold: 0.3
```

## Future Improvements

Planned enhancements include:
- Caching frequently searched restaurants
- Geocoding support for address validation
- Enhanced error recovery mechanisms
- Additional search engine integration

## Appendix A: Prompt Templates

### Restaurant Info Retriever Prompt
Located in `src/prompts/restaurantSearch.ts`, this prompt template instructs the AI to act as an information summarizer:

```typescript
export const restaurantInfoRetrieverPrompt = `You are an AI restaurant information summarizer. Your task is to search the web for details about a restaurant and extract the following key points:
1. **Atmosphere**: Describe the ambiance, decor, and overall vibe.
2. **Cuisine Type**: Identify the style of cuisine offered.
3. **Menu**: Summarize the key items on the menu.
4. **Customer/Critic Reviews**: Summarize what customers and critics are saying.

Format your answer using XML-like tags as follows:
<atmosphere>[summary]</atmosphere>
<cuisine>[summary]</cuisine>
<menu>[summary]</menu>
<reviews>[summary]</reviews>

Review this information and provide a summary:
{raw_info}

Provide a clear and concise summary for each category.`
```

Key Features:
- Structured XML output format
- Four specific information categories (atmosphere, cuisine, menu, reviews)
- Clear formatting instructions
- Variable interpolation for raw search data

### Restaurant Evaluation Prompt
Located in `src/prompts/restaurantSearch.ts`, this prompt template guides the AI in evaluating restaurant fit:

```typescript
export const restaurantEvaluationPrompt = `You are a gourmet consultant for a specialty cheese distributor. Your task is to evaluate whether a restaurant is a good candidate for a specialty cheese program.

Consider the following information about the restaurant:
{processed_info}

Consider the following:
- **Cuisine Style and Key Ingredients:** Identify whether the restaurant's cuisine typically features dishes that would pair well with specialty cheeses.
- **Presence of High-End or Specialty Items:** Look for indicators such as artisanal cheeses, imported charcuterie, truffle-infused dishes, etc.
- **Tone and Emphasis:** Assess if the restaurant's language or website emphasizes premium, locally sourced, or gourmet products.
- **Overall Fit:** Based on the above, determine a likelihood score (from 1 to 10).

Your answer should be concise and in the following format:
"Based on [key findings], this restaurant has a [score] out of 10 likelihood of being a good fit for a specialty cheese program because [brief explanation]."`;
```

Key Features:
- Specific evaluation criteria
- Standardized scoring system (1-10)
- Consistent output format
- Focus on specialty cheese program fit
- Variable interpolation for processed restaurant data

### Type Integration
The prompts are integrated into the TypeScript type system through:

1. Import Dependencies:
```typescript
import { BaseMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
```

2. Export Pattern:
- Prompts are exported as constants
- Compatible with LangChain's PromptTemplate system
- Can be imported and used throughout the application via `src/prompts/index.ts`

This type-safe integration ensures that prompt variables are properly typed and validated at compile time.