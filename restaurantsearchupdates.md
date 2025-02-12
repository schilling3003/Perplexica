# Specialty Cheese Distributor Agent Code Update Instructions

## ✅ Completed Changes

### 1. Restaurant Information Retrieval & Summarization
- Created specialized prompts in `src/prompts/restaurantSearch.ts`:
  - `restaurantInfoRetrieverPrompt` for gathering restaurant details
  - `restaurantEvaluationPrompt` for evaluating restaurant fit
- Implemented proper XML-tag based formatting for restaurant information
- Added chat history context support to improve information gathering

### 2. Agent Implementation
- Created `RestaurantSearchAgent` class in `src/chains/restaurantSearchAgent.ts`:
  - Extends the base MetaSearchAgent
  - Implements specialized restaurant search and evaluation functionality
  - Implemented the restaurant evaluation chain with proper scoring system
  - Added multi-engine search support (Google and Bing)
  - Implemented re-ranking with 0.3 threshold
  - Added streaming support for real-time updates

### 3. Integration
- Added restaurant search handler to `messageHandler.ts`
- Created new RestaurantSearchInput component with:
  - Restaurant name and address input fields
  - Form validation and submit handling
  - Loading state support
- Updated Focus component to include restaurant analysis mode
- Modified MessageInput to handle restaurant search
- Updated search route to process restaurant search requests
- Added type definitions for restaurant search

### 4. Testing
- Created initial test suite in `tests/restaurantSearchAgent.test.ts`
- Implemented basic test cases for:
  - Query formatting
  - Response handling
  - Event emission

## 🔄 Remaining Tasks

### 1. Testing Expansion
Need to:
- Add more comprehensive unit tests for complex scenarios
- Add integration tests for the full restaurant search flow
- Add error handling test cases
- Add tests for edge cases like invalid addresses or non-existent restaurants

### 2. UI Polish
Need to:
- Add input validation with proper error messages
- Add address autocomplete functionality
- Improve loading state visuals during analysis
- Add error recovery UI flows

### 3. Documentation
Need to:
- Add API documentation for new restaurant search endpoints
- Document the restaurant evaluation scoring system
- Add examples of restaurant analysis responses
- Document configuration options for search engines

### 4. Backend Optimization
Need to:
- Add caching for frequently searched restaurants
- Implement rate limiting for restaurant searches
- Add geocoding support for address validation
- Fine-tune re-ranking threshold based on real usage data

## Original Requirements (for reference)

# Specialty Cheese Distributor Agent Code Update Instructions

This document describes how to modify the existing meta-search agent code to create an agent for a specialty cheese distributor. The new agent will:

- **Take a restaurant name and address** provided by the user.
- **Search the web for information** about the restaurant.
- **Summarize key details** such as:
  - Atmosphere
  - Cuisine Type
  - Menu
  - Customer/Critic Reviews
- **Evaluate the restaurant’s fit** for a specialty cheese program by:
  - Identifying cuisine style and key ingredients.
  - Recognizing high-end or specialty items (e.g., artisanal cheeses, imported charcuterie, truffles, etc.).
  - Assessing the language used (e.g., locally sourced or premium products).
  - Producing a numeric score or short textual explanation.

For example, the final output could be:

> “Based on the menu items (e.g., truffle-infused risotto, aged cheese boards) and the tone of the website (upscale, farm-to-table focus), this restaurant has a high likelihood (8 out of 10) of needing specialty cheeses.”

---

## 1. Restaurant Information Retrieval & Summarization

### A. Create a Specialized Retriever Prompt

Replace or extend the existing generic summarization prompt with one that focuses on restaurant-specific details. Create a new prompt file (or update an existing one) with content similar to the following:

```typescript
export const restaurantInfoRetrieverPrompt = `
You are an AI restaurant information summarizer. Your task is to search the web for details about a restaurant and extract the following key points:
1. **Atmosphere**: Describe the ambiance, decor, and overall vibe.
2. **Cuisine Type**: Identify the style of cuisine offered.
3. **Menu**: Summarize the key items on the menu.
4. **Customer/Critic Reviews**: Summarize what customers and critics are saying.

Format your answer using XML-like tags as follows:
<atmosphere>[summary]</atmosphere>
<cuisine>[summary]</cuisine>
<menu>[summary]</menu>
<reviews>[summary]</reviews>

Below is the restaurant information you need to research:
Restaurant Name: {restaurant_name}
Address: {address}

Provide a clear and concise summary for each category. Good luck!
`;
```

### B. Update Document Processing in the Search Retriever Chain
In the existing createSearchRetrieverChain (or in a new chain if preferred), update the logic where the LLM is invoked to use the new restaurant information prompt. For example:

```typescript
// Example: Process each retrieved document or group:
await Promise.all(
  docGroups.map(async (doc) => {
    const res = await llm.invoke(`
      ${restaurantInfoRetrieverPrompt}
      <text>
      ${doc.pageContent}
      </text>
    `);
    // Wrap the response in a new Document instance
    const document = new Document({
      pageContent: res.content as string,
      metadata: {
        title: doc.metadata.title,
        url: doc.metadata.url,
      },
    });
    docs.push(document);
  })
);
```

This change ensures that the summaries now include the following details:

- Atmosphere
- Cuisine
- Menu
- Reviews

---

## 2. Final Evaluation for Restaurant Fit

### A. Create a New Evaluation Prompt
After retrieving and summarizing the restaurant information, create a new prompt that instructs the LLM to evaluate whether the restaurant is a good candidate for the specialty cheese program. For example:

```typescript
export const restaurantEvaluationPrompt = `
You are a gourmet consultant for a specialty cheese distributor. Below is a summary of a restaurant’s information extracted from various web sources.

**Restaurant Information:**
<atmosphere>{atmosphere}</atmosphere>
<cuisine>{cuisine}</cuisine>
<menu>{menu}</menu>
<reviews>{reviews}</reviews>

Your task is to evaluate whether this restaurant is a good candidate for a specialty cheese program. Consider the following:
- **Cuisine Style and Key Ingredients:** Identify whether the restaurant’s cuisine typically features dishes that would pair well with specialty cheeses.
- **Presence of High-End or Specialty Items:** Look for indicators such as artisanal cheeses, imported charcuterie, truffle-infused dishes, etc.
- **Tone and Emphasis:** Assess if the restaurant’s language or website emphasizes premium, locally sourced, or gourmet products.
- **Overall Fit:** Based on the above, determine a likelihood score (from 1 to 10) or provide a short textual explanation.

Your answer should be concise and may be in the following format:
"Based on the menu items (e.g., truffle-infused risotto, aged cheese boards) and the tone of the website (upscale, farm-to-table focus), this restaurant has a high likelihood (8 out of 10) of needing specialty cheeses."

Provide your final evaluation below:
`;
```

### B. Integrate the Evaluation Prompt into the Final Answering Chain
After re-ranking and processing the summarized documents containing restaurant information, use this new evaluation prompt in the final chain. For example, add a new chain (e.g., createEvaluationChain) that uses the evaluation prompt:

```typescript
private async createEvaluationChain(
  llm: BaseChatModel,
  processedRestaurantInfo: string, // Combined summary of restaurant info
  date: string
) {
  // The processedRestaurantInfo should be formatted to include the XML tags for atmosphere, cuisine, menu, and reviews.
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ['system', restaurantEvaluationPrompt],
      // Pass the processed restaurant information into the context
      ['user', '{processed_info}'],
    ]),
    llm,
    this.strParser,
  ]).withConfig({
    runName: 'FinalRestaurantEvaluation',
  });
}
```

In your main method (e.g., in searchAndAnswer), after obtaining and re-ranking the restaurant summaries, call this evaluation chain to generate the final output.

---

## 3. Putting It All Together
### Workflow Outline
**Input Processing:**

- Receive a query that includes a restaurant name and address.

**Restaurant Information Retrieval:**

- Use the specialized restaurantInfoRetrieverPrompt in your search retriever chain to gather and summarize details:
  - Atmosphere
  - Cuisine
  - Menu
  - Reviews

**Re-ranking & Document Processing:**

- Re-rank and combine the documents based on relevance, ensuring the summaries include the restaurant-specific information.

**Final Evaluation:**

- Pass the summarized restaurant information to a new evaluation chain that uses the restaurantEvaluationPrompt.
- The LLM then reviews the details and outputs a fit score or explanation regarding the restaurant’s candidacy for a specialty cheese program.

**Output:**

- Stream or return the final evaluation result to the user.

---

## 4. Next Steps
### Update Placeholders:
- Replace the placeholder variables ({restaurant_name}, {address}, {atmosphere}, {cuisine}, {menu}, {reviews}) with the actual values when constructing the chain inputs.

### Testing and Iteration:
- Test the updated prompts with sample inputs. Adjust the instructions or XML formatting as needed based on the output quality.

### Integrate with Existing Code:
- Incorporate these new prompts and chains into your existing LangChain-based agent code. Use conditional logic if necessary to decide when to use the restaurant-specific chain versus a generic search chain.

This concludes the instructions for updating the agent for a specialty cheese distributor. Follow these guidelines to ensure the new agent meets the requirements for processing restaurant queries and evaluating their fit for gourmet cheese offerings.
