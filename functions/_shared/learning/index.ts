/**
 * Learning System for Cloudflare Workers
 *
 * Main entry point for the learning system modules.
 * All modules are designed to work in Cloudflare Workers runtime.
 */

export {
  LearningService,
  createLearningService,
  type LearningMetrics,
  type LearningConfig
} from './service'

export {
  PatternExtractor,
  createPatternExtractor,
  type EnhancementPattern,
} from './pattern-extractor'

export {
  AdaptiveEnhancer,
  createAdaptiveEnhancer,
  type LocalEnhancement,
  type AdaptiveEnhancerConfig
} from './adaptive-enhancer'

/**
 * Quick start helper for creating all learning components
 */
export function createLearningSystem(config?: {
  learning?: LearningConfig
  adaptive?: AdaptiveEnhancerConfig
}) {
  return {
    learningService: createLearningService(config?.learning),
    adaptiveEnhancer: createAdaptiveEnhancer(config?.adaptive),
    patternExtractor: createPatternExtractor()
  }
}