// API Types
export interface RefactorRequest {
  prompt: string;
  context?: string;
  isRefinement?: boolean;
  isExpansion?: boolean;
  repeatCount?: number;
  provider?: string;
}

export interface RefactorResponse {
  result: string;
  metadata?: {
    source?: string;
    model?: string;
    processingTime?: number;
    originalLength?: number;
    enhancedLength?: number;
    cached?: boolean;
  };
}

// History Types
export interface HistoryItem {
  id: string;
  original: string;
  refactored: string;
  context?: string;
  timestamp: number;
  metadata?: {
    source?: string;
    model?: string;
    processingTime?: number;
  };
}

// Settings Types
export interface Settings {
  providerMode: 'auto' | 'manual';
  preferredProvider?: string;
  floatingButton: 'always' | 'on-focus' | 'disabled';
  syncHistory: boolean;
  keyboardShortcuts: boolean;
  apiBaseUrl: string;
  maxHistoryItems: number;
}

// Storage Schema
export interface StorageSchema {
  history: HistoryItem[];
  settings: Settings;
  lastSession?: {
    rawPrompt: string;
    refactoredPrompt: string;
    timestamp: number;
  };
}

// Message Types for content script <-> background communication
export type MessageType =
  | 'REFACTOR_PROMPT'
  | 'GET_HISTORY'
  | 'ADD_TO_HISTORY'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'INJECT_TEXT'
  | 'GET_INPUT_TEXT';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
  requestId?: string;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// Platform Adapter Types
export interface PlatformAdapter {
  name: string;
  hostPatterns: RegExp[];
  findInputElement(): Element | null;
  getInputContent(): string;
  setInputContent(value: string): Promise<boolean>;
  getButtonAnchorPoint(): Element | null;
  getButtonPosition(): 'before' | 'after' | 'inside';
}

export interface SelectorConfig {
  primary: string[];
  secondary: string[];
  fallback: string[];
}
