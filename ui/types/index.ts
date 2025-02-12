import type { MouseEvent } from 'react';

export interface RestaurantSearchInput {
  restaurantName: string;
  address: string;
}

export interface MessageInputProps {
  sendMessage: (data: {
    query: string;
    focusMode: string;
    optimizationMode: string;
    history: [string, string][];
  }) => Promise<void>;
  focusMode: string;
  optimizationMode: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  loading: boolean;
}

export interface FocusProps {
  focusMode: string;
  setFocusMode: (mode: string) => void;
}

export interface FocusMode {
  key: string;
  title: string;
  description: string;
  icon: JSX.Element;
}