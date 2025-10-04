/**
 * Learning System for Cloudflare Workers
 *
 * Main entry point for the learning system modules.
 * All modules are designed to work in Cloudflare Workers runtime.
 */

import {
  LearningService as _LearningService,
  createLearningService as _createLearningService,
  type LearningMetrics as _LearningMetrics,
  type LearningConfig as _LearningConfig
} from './service'

import {
  PatternExtractor as _PatternExtractor,
  createPatternExtractor as _createPatternExtractor,
  type EnhancementPattern as _EnhancementPattern
} from './pattern-extractor'

import {
  AdaptiveEnhancer as _AdaptiveEnhancer,
  createAdaptiveEnhancer as _createAdaptiveEnhancer,
  type LocalEnhancement as _LocalEnhancement,
  type AdaptiveEnhancerConfig as _AdaptiveEnhancerConfig
} from './adaptive-enhancer'

// Re-export everything
export const LearningService = _LearningService
export const createLearningService = _createLearningService
export type LearningMetrics = _LearningMetrics
export type LearningConfig = _LearningConfig

export const PatternExtractor = _PatternExtractor
export const createPatternExtractor = _createPatternExtractor
export type EnhancementPattern = _EnhancementPattern

export const AdaptiveEnhancer = _AdaptiveEnhancer
export const createAdaptiveEnhancer = _createAdaptiveEnhancer
export type LocalEnhancement = _LocalEnhancement
export type AdaptiveEnhancerConfig = _AdaptiveEnhancerConfig

/**
 * Quick start helper for creating all learning components
 */
export function createLearningSystem(config?: {
  learning?: _LearningConfig
  adaptive?: _AdaptiveEnhancerConfig
}) {
  return {
    learningService: _createLearningService(config?.learning),
    adaptiveEnhancer: _createAdaptiveEnhancer(config?.adaptive),
    patternExtractor: _createPatternExtractor()
  }
}