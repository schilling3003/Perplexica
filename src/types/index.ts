export interface RestaurantSearchInput extends Record<string, unknown> {
  restaurant_name: string;  // Using snake_case to match agent's expectations
  address: string;
}

export interface RestaurantSearchResponse {
  status: 'success' | 'error';
  events: Array<{
    type: 'data' | 'status' | 'error';
    data: string;
  }>;
}

export interface RestaurantSearchRequest {
  restaurantName: string;  // Using camelCase for API requests
  address: string;
  optimizationMode?: 'speed' | 'balanced' | 'quality';
}