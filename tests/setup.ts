import { vi } from 'vitest';

// Mock console methods to keep test output clean
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

// Mock environment variables
process.env.NODE_ENV = 'test';