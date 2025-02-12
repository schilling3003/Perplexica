# Restaurant Search API

## POST /api/search/restaurant

Evaluates a restaurant's fit for a specialty cheese program by analyzing its menu, atmosphere, and reviews.

### Request Body

```json
{
  "restaurantName": "string",
  "address": "string",
  "optimizationMode": "speed" | "balanced" | "quality" (optional, defaults to "balanced")
}
```

### Response

```json
{
  "status": "success" | "error",
  "events": [
    {
      "type": "data" | "status" | "error",
      "data": "string"
    }
  ]
}
```

### Example Request

```bash
curl -X POST http://your-api-endpoint/api/search/restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "La Maison Bistro",
    "address": "123 Main Street, Anytown, USA",
    "optimizationMode": "balanced"
  }'
```

### Example Response

```json
{
  "status": "success",
  "events": [
    {
      "type": "status",
      "data": "Searching for restaurant information..."
    },
    {
      "type": "data",
      "data": "Based on the menu items (e.g., truffle-infused risotto, aged cheese boards) and the tone of the website (upscale, farm-to-table focus), this restaurant has a high likelihood (8 out of 10) of needing specialty cheeses."
    }
  ]
}
```

### Error Response

```json
{
  "message": "Error message describing what went wrong"
}
```

### Possible Error Messages
- "Restaurant name and address are required"
- "Failed to process restaurant search"
- "No information found for the restaurant"

### Notes
- The response is streamed through events
- Each event contains a type ("data", "status", or "error") and associated data
- The final evaluation includes a score out of 10 and detailed explanation
- Search process uses multiple engines (Google and Bing) for comprehensive results
- Results are re-ranked with a similarity threshold of 0.3 for relevance