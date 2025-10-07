// analysis/categorizeLogs.ts

import nlp from 'compromise';
import logger from '../reports/logger.js';

// Category Constants
const BREAKING_CHANGES = 'breaking_change' as const;
const FEATURES = 'feature' as const;
const FIXES = 'fix' as const;
const DEPRECATIONS = 'deprecation' as const;
const SECURITY = 'security' as const;
const DOCUMENTATION = 'documentation' as const;
const PERFORMANCE = 'performance' as const;
const REFACTORS = 'refactor' as const;
const CHORES = 'chore' as const;

type Category =
  | typeof BREAKING_CHANGES
  | typeof FEATURES
  | typeof FIXES
  | typeof DEPRECATIONS
  | typeof SECURITY
  | typeof DOCUMENTATION
  | typeof PERFORMANCE
  | typeof REFACTORS
  | typeof CHORES;

interface TagDefinition {
  isA: string | string[];
}

interface PluginTags {
  [key: string]: TagDefinition;
}

interface PluginWords {
  [key: string]: string[];
}

interface CompromisePlugin {
  tags: PluginTags;
  words: PluginWords;
  api: (View: any) => void;
}

interface CategoryPattern {
  high?: RegExp[];
  medium?: RegExp[];
  low?: RegExp[];
}

interface CategoryPatterns {
  [key: string]: CategoryPattern;
}

interface CategorizationResult {
  category: string | null;
  confidence?: number;
  isMiscellaneous?: boolean;
}

interface CategorizedResults {
  [BREAKING_CHANGES]: string[];
  [FEATURES]: string[];
  [FIXES]: string[];
  [DEPRECATIONS]: string[];
  [SECURITY]: string[];
  [DOCUMENTATION]: string[];
  [PERFORMANCE]: string[];
  [REFACTORS]: string[];
  [CHORES]: string[];
  miscellaneous: string[];
  uncategorized: string[];
}

interface ConfidenceScores {
  [sentence: string]: number;
}

interface ListItem {
  text?: string;
}

type ParsedItem = string | ListItem;

// Enhanced plugin with better tag definitions and lexicon
const releaseNotePlugin: CompromisePlugin = {
  tags: {
    Category: {
      isA: ['Noun'],
    },
    BreakingChange: {
      isA: 'Category',
    },
    Feature: {
      isA: 'Category',
    },
    Fix: {
      isA: 'Category',
    },
    Deprecation: {
      isA: 'Category',
    },
    Security: {
      isA: 'Category',
    },
    Documentation: {
      isA: 'Category',
    },
    Performance: {
      isA: 'Category',
    },
    Refactor: {
      isA: 'Category',
    },
    Chore: {
      isA: 'Category',
    },
    // Action tags for better verb matching
    BreakingVerb: {
      isA: 'Verb',
    },
    FeatureVerb: {
      isA: 'Verb',
    },
    FixVerb: {
      isA: 'Verb',
    },
    // Modifier tags
    Critical: {
      isA: 'Adjective',
    },
    Major: {
      isA: 'Adjective',
    },
    Minor: {
      isA: 'Adjective',
    },
  },

  // Enhanced lexicon with more comprehensive word mappings
  words: {
    // Breaking change indicators
    breaking: ['BreakingChange', 'BreakingVerb'],
    break: ['BreakingChange', 'BreakingVerb'],
    breaks: ['BreakingChange', 'BreakingVerb'],
    broke: ['BreakingChange', 'BreakingVerb'],
    broken: ['BreakingChange'],
    incompatible: ['BreakingChange', 'Critical'],
    removed: ['BreakingVerb'],
    removes: ['BreakingVerb'],
    remove: ['BreakingVerb'],
    dropped: ['BreakingVerb'],
    drops: ['BreakingVerb'],
    discontinued: ['BreakingChange', 'BreakingVerb'],
    deprecated: ['Deprecation'],
    obsolete: ['Deprecation'],
    legacy: ['Deprecation'],

    // Feature indicators
    added: ['Feature', 'FeatureVerb'],
    adds: ['Feature', 'FeatureVerb'],
    add: ['Feature', 'FeatureVerb'],
    new: ['Feature'],
    introduced: ['Feature', 'FeatureVerb'],
    introduces: ['Feature', 'FeatureVerb'],
    implemented: ['Feature', 'FeatureVerb'],
    implements: ['Feature', 'FeatureVerb'],
    feature: ['Feature'],
    features: ['Feature'],
    enhancement: ['Feature'],
    support: ['Feature'],
    supports: ['Feature', 'FeatureVerb'],

    // Fix indicators
    fix: ['Fix', 'FixVerb'],
    fixes: ['Fix', 'FixVerb'],
    fixed: ['Fix', 'FixVerb'],
    patch: ['Fix', 'FixVerb'],
    patches: ['Fix', 'FixVerb'],
    patched: ['Fix', 'FixVerb'],
    resolved: ['Fix', 'FixVerb'],
    resolves: ['Fix', 'FixVerb'],
    corrected: ['Fix', 'FixVerb'],
    corrects: ['Fix', 'FixVerb'],
    bug: ['Fix'],
    bugs: ['Fix'],
    issue: ['Fix'],
    issues: ['Fix'],
    regression: ['Fix'],

    // Security indicators
    vulnerability: ['Security'],
    vulnerabilities: ['Security'],
    security: ['Security'],
    cve: ['Security'],
    exploit: ['Security'],
    injection: ['Security'],
    xss: ['Security'],
    csrf: ['Security'],
    authentication: ['Security'],
    authorization: ['Security'],
    encryption: ['Security'],

    // Performance indicators
    performance: ['Performance'],
    optimization: ['Performance'],
    optimized: ['Performance'],
    optimize: ['Performance'],
    faster: ['Performance'],
    slower: ['Performance'],
    speed: ['Performance'],
    latency: ['Performance'],
    memory: ['Performance'],
    cpu: ['Performance'],

    // Refactor indicators
    refactor: ['Refactor'],
    refactored: ['Refactor'],
    refactoring: ['Refactor'],
    restructure: ['Refactor'],
    restructured: ['Refactor'],
    cleanup: ['Refactor'],
    simplify: ['Refactor'],
    simplified: ['Refactor'],

    // Chore indicators
    chore: ['Chore'],
    dependency: ['Chore'],
    dependencies: ['Chore'],
    upgrade: ['Chore'],
    upgraded: ['Chore'],
    bump: ['Chore'],
    bumped: ['Chore'],
    ci: ['Chore'],
    cd: ['Chore'],
    pipeline: ['Chore'],
    workflow: ['Chore'],

    // Documentation indicators
    docs: ['Documentation'],
    documentation: ['Documentation'],
    readme: ['Documentation'],
    'api-docs': ['Documentation'],
    javadoc: ['Documentation'],
    jsdoc: ['Documentation'],
    example: ['Documentation'],
    examples: ['Documentation'],
    tutorial: ['Documentation'],

    // Severity modifiers
    major: ['Major'],
    minor: ['Minor'],
    critical: ['Critical'],
    important: ['Critical'],
    urgent: ['Critical'],
  },

  // Custom matching methods
  api: (View: any) => {
    // Enhanced category detection with context awareness
    View.prototype.detectCategory = function (this: any): string | null {
      const doc = this;
      const scores: Record<string, number> = {};

      // Score each category based on multiple factors
      Object.keys(categoryPatterns).forEach((category) => {
        scores[category] = 0;

        // Check for direct category tags
        if (
          doc.has(`#${category.charAt(0).toUpperCase() + category.slice(1)}`)
        ) {
          scores[category] += 10;
        }

        // Check for category-specific verbs
        const verbMap: Record<string, string> = {
          [BREAKING_CHANGES]: '#BreakingVerb',
          [FEATURES]: '#FeatureVerb',
          [FIXES]: '#FixVerb',
        };

        if (verbMap[category] && doc.has(verbMap[category])) {
          scores[category] += 8;
        }

        // Context-based scoring
        const contextPatterns = getContextPatterns()[category] || [];
        contextPatterns.forEach((pattern: string) => {
          if (doc.match(pattern).found) {
            scores[category] += 5;
          }
        });
      });

      // Return category with highest score
      const bestCategory = Object.entries(scores)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .filter(([, score]) => (score as number) > 0)
        .map(([category]) => category)[0];

      return bestCategory || null;
    };

    // Improved fuzzy matching with context
    View.prototype.hasBreakingChange = function (this: any): boolean {
      const doc = this;

      // Direct indicators
      if (doc.has('#BreakingChange') || doc.has('#BreakingVerb')) {
        return true;
      }

      // Pattern-based detection
      const breakingPatterns = [
        '(#BreakingVerb|remove|drop|delete) #Noun',
        'no longer (support|supports|work|works)',
        'will (break|fail|stop)',
        'requires? migration',
        'incompatible with',
        'must (update|upgrade|change)',
        'legacy .* (removed|dropped)',
        'deprecat* and remov*',
        'break* compatibility',
        'api (change|changes|changed)',
        'rename* (from|to)',
        'replace* with',
      ];

      return breakingPatterns.some((pattern) => doc.match(pattern).found);
    };
  },
};

// Context-aware patterns for better matching
function getContextPatterns(): Record<string, string[]> {
  return {
    [BREAKING_CHANGES]: [
      // API changes
      'api (break|change|update)',
      'interface (change|update|modification)',
      'contract (change|modification)',
      'signature (change|update)',

      // Removal patterns
      '(remove|drop|delete) .* (api|method|function|class|interface)',
      'no longer (available|supported|exists)',

      // Migration required
      'migration (required|needed|guide)',
      'upgrade (required|needed)',
      'must (update|upgrade) to',

      // Compatibility
      'not (compatible|backwards-compatible)',
      'breaks? (compatibility|existing)',
      'incompatible (change|update|with)',

      // Renamed/moved
      'rename* (from|to)',
      'move* (from|to)',
      'replace* (by|with)',
    ],

    [FEATURES]: [
      // New additions
      '(add|introduce|implement) .* (feature|functionality|capability)',
      'new (feature|functionality|api|method|option)',
      'now (supports?|includes?|provides?)',
      'enhanced? (with|to include)',
      'extends? (support|functionality)',

      // Enablement
      'enable* .* (feature|support|functionality)',
      'allow* .* to',
      'provides? .* (capability|ability)',

      // Support patterns
      'adds? support (for|to)',
      'supports? (for|now)',
      'compatible with',
    ],

    [FIXES]: [
      // Bug fixes
      'fix* .* (bug|issue|problem|error)',
      'resolve* .* (issue|problem|error)',
      'correct* .* (behavior|issue|problem)',

      // Specific fix types
      'fix* (crash|memory leak|regression)',
      'patch* (vulnerability|issue|bug)',
      'address* .* (issue|concern|problem)',

      // Prevention
      'prevent* .* (error|crash|issue)',
      'avoid* .* (error|crash|issue)',
      'handle* .* (correctly|properly)',
    ],

    [SECURITY]: [
      // Vulnerability fixes
      'fix* .* vulnerability',
      'patch* .* (security|vulnerability)',
      'address* .* (security|vulnerability)',

      // Security improvements
      'improve* .* security',
      'enhance* .* (security|protection)',
      'harden* against',

      // Specific security issues
      '(prevent|fix|patch) .* (injection|xss|csrf|xxe)',
      'secure* .* (endpoint|api|data)',
      'encrypt* .* (data|communication)',
    ],

    [PERFORMANCE]: [
      // Speed improvements
      '(improve|enhance|boost) .* (performance|speed)',
      'faster .* (execution|processing|loading)',
      'reduce* .* (latency|time|overhead)',

      // Resource optimization
      'optimize* .* (memory|cpu|resource)',
      'reduce* .* (memory|cpu) usage',
      'more efficient',

      // Caching
      '(add|improve) .* caching',
      'cache* .* (results|data)',
    ],
  };
}

// Enhanced category patterns with weighted scoring
const categoryPatterns: CategoryPatterns = {
  [BREAKING_CHANGES]: {
    high: [
      // High confidence patterns (weight: 10)
      /breaking[\s-]?change/i,
      /\bremoved?\s+\w+\s+(api|method|function|class)/i,
      /no\s+longer\s+support/i,
      /incompatible\s+with/i,
      /requires?\s+migration/i,
      /must\s+update/i,
      /discontinued/i,
      /\bapi\s+break/i,
    ],
    medium: [
      // Medium confidence patterns (weight: 5)
      /\b(drop|delete)s?\s+support/i,
      /legacy\s+\w+\s+removed/i,
      /renamed?\s+(from|to)/i,
      /moved?\s+(from|to)/i,
      /replaced?\s+with/i,
      /deprecate.*remove/i,
    ],
    low: [
      // Low confidence patterns (weight: 2)
      /significant\s+change/i,
      /major\s+update/i,
      /not\s+backwards?\s+compatible/i,
    ],
  },

  [FEATURES]: {
    high: [
      /\b(add|adds|added)\s+\w+\s+(feature|support|functionality)/i,
      /new\s+(feature|functionality|capability)/i,
      /introduce[ds]?\s+\w+/i,
      /implement[eds]?\s+\w+/i,
      /now\s+supports?/i,
    ],
    medium: [
      /enhance[ds]?\s+\w+/i,
      /improve[ds]?\s+\w+/i,
      /extend[eds]?\s+support/i,
      /enable[ds]?\s+\w+/i,
    ],
    low: [/support\s+for\s+\w+/i, /allows?\s+\w+\s+to/i, /provides?\s+\w+/i],
  },

  [FIXES]: {
    high: [
      /fix(es|ed)?\s+\w+\s+(bug|issue|problem)/i,
      /resolve[ds]?\s+\w+\s+issue/i,
      /patch(es|ed)?\s+\w+/i,
      /correct(s|ed)?\s+\w+/i,
      /fix(es|ed)?\s+(crash|memory\s+leak)/i,
    ],
    medium: [
      /address(es|ed)?\s+\w+\s+issue/i,
      /handle[ds]?\s+\w+\s+correctly/i,
      /prevent[ds]?\s+\w+\s+error/i,
    ],
    low: [/regression\s+fix/i, /bug\s*fix/i, /issue\s+#\d+/i],
  },
};

/**
 * Enhanced analyzer with multi-pass processing and confidence scoring
 * @param parsedSections - Sections parsed from release notes
 * @returns Categorized results with confidence scores
 */
export function analyzeLogCategorization(
  parsedSections: Record<string, any[]>
): CategorizedResults {
  nlp.plugin(releaseNotePlugin);

  const results: CategorizedResults = {
    [BREAKING_CHANGES]: [],
    [FEATURES]: [],
    [FIXES]: [],
    [DEPRECATIONS]: [],
    [SECURITY]: [],
    [DOCUMENTATION]: [],
    [PERFORMANCE]: [],
    [REFACTORS]: [],
    [CHORES]: [],
    miscellaneous: [],
    uncategorized: [],
  };

  // Track confidence scores for each categorization
  const confidenceScores: ConfidenceScores = {};

  Object.entries(parsedSections).forEach(([section, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      logger.warn(`No sentences to analyze in section: ${section}`);
      return;
    }

    items.forEach((item: ParsedItem) => {
      const sentence = typeof item === 'string' ? item : item.text || '';
      const result = categorizeSentence(sentence, section);

      if (result.category) {
        results[result.category as keyof CategorizedResults].push(sentence);
        if (result.confidence !== undefined) {
          confidenceScores[sentence] = result.confidence;
        }
      } else if (result.isMiscellaneous) {
        results.miscellaneous.push(sentence);
      } else {
        results.uncategorized.push(sentence);
      }
    });
  });

  // Post-process to reduce false positives
  postProcessResults(results, confidenceScores);

  logger.debug(`Final categorized results: ${JSON.stringify(results, null, 2)}`);
  return results;
}

/**
 * Categorize a single sentence with confidence scoring
 * @param sentence - The sentence to categorize
 * @param section - The section context
 * @returns Category and confidence score
 */
function categorizeSentence(sentence: string, section: string): CategorizationResult {
  const doc = nlp(sentence);
  const sectionDoc = nlp(section);

  // Normalize text for better matching
  const normalizedSentence = doc
    .normalize({
      whitespace: true,
      case: true,
      punctuation: true,
      unicode: true,
      contractions: true,
      acronyms: true,
    })
    .text();

  // Multi-pass analysis
  let bestMatch: { category: string | null; confidence: number } = {
    category: null,
    confidence: 0,
  };

  // Pass 1: Direct tag-based detection
  const tagCategory = (doc as any).detectCategory();
  if (tagCategory) {
    bestMatch = { category: tagCategory, confidence: 0.8 };
  }

  // Pass 1.5: Check section context for strong indicators
  // Use sectionDoc to analyze the section header
  const sectionCategory = (sectionDoc as any).detectCategory();
  if (sectionCategory && !tagCategory) {
    // If section strongly indicates a category but sentence doesn't
    bestMatch = { category: sectionCategory, confidence: 0.4 };
  } else if (sectionCategory && sectionCategory === tagCategory) {
    // Both section and sentence indicate same category - boost confidence
    bestMatch.confidence = Math.min(bestMatch.confidence + 0.2, 1.0);
  }

  // Check if section contains strong category indicators
  Object.entries(categoryPatterns).forEach(([category, patterns]) => {
    // Test section header against high-confidence patterns
    if (patterns.high) {
      const sectionNormalized = sectionDoc.normalize().text();
      patterns.high.forEach((pattern) => {
        if (pattern.test(sectionNormalized)) {
          // Section header strongly indicates this category
          if (bestMatch.category === category) {
            bestMatch.confidence = Math.min(bestMatch.confidence + 0.15, 1.0);
          } else if (!bestMatch.category) {
            bestMatch = { category, confidence: 0.35 };
          }
        }
      });
    }
  });

  // Pass 2: Pattern-based detection with scoring
  Object.entries(categoryPatterns).forEach(([category, patterns]) => {
    let categoryScore = 0;

    // Check high confidence patterns
    if (patterns.high) {
      patterns.high.forEach((pattern) => {
        if (pattern.test(normalizedSentence)) {
          categoryScore += 10;
        }
      });
    }

    // Check medium confidence patterns
    if (patterns.medium) {
      patterns.medium.forEach((pattern) => {
        if (pattern.test(normalizedSentence)) {
          categoryScore += 5;
        }
      });
    }

    // Check low confidence patterns
    if (patterns.low) {
      patterns.low.forEach((pattern) => {
        if (pattern.test(normalizedSentence)) {
          categoryScore += 2;
        }
      });
    }

    // Section context bonus using both the section text and sectionDoc analysis
    if (
      sectionMatchesCategory(section, category) ||
      sectionDoc.has(`#${category.charAt(0).toUpperCase() + category.slice(1)}`)
    ) {
      categoryScore += 3;
    }

    // Convert score to confidence (0-1)
    const confidence = Math.min(categoryScore / 15, 1);

    if (confidence > bestMatch.confidence) {
      bestMatch = { category, confidence };
    }
  });

  // Pass 3: Specialized detection for breaking changes
  if ((doc as any).hasBreakingChange() && bestMatch.confidence < 0.9) {
    bestMatch = { category: BREAKING_CHANGES, confidence: 0.9 };
  }

  // Determine if miscellaneous (low confidence but relevant)
  const isMiscellaneous =
    bestMatch.confidence > 0.2 && bestMatch.confidence < 0.5;

  // Only accept high confidence matches
  if (bestMatch.confidence >= 0.5) {
    return bestMatch;
  } else if (isMiscellaneous) {
    return { category: null, isMiscellaneous: true };
  } else {
    return { category: null, isMiscellaneous: false };
  }
}

/**
 * Check if section name indicates a category
 * @param section - Section name
 * @param category - Category to check
 * @returns Whether section matches category
 */
function sectionMatchesCategory(section: string, category: string): boolean {
  const sectionLower = section.toLowerCase();
  const categoryMappings: Record<string, string[]> = {
    [BREAKING_CHANGES]: ['breaking', 'incompatible', 'migration'],
    [FEATURES]: ['feature', 'new', 'added', 'enhancement'],
    [FIXES]: ['fix', 'bug', 'patch', 'resolved'],
    [SECURITY]: ['security', 'vulnerability', 'cve'],
    [PERFORMANCE]: ['performance', 'optimization', 'speed'],
    [DEPRECATIONS]: ['deprecated', 'deprecation', 'obsolete'],
    [DOCUMENTATION]: ['docs', 'documentation', 'readme'],
    [REFACTORS]: ['refactor', 'cleanup', 'internal'],
    [CHORES]: ['chore', 'dependency', 'build', 'ci'],
  };

  const keywords = categoryMappings[category] || [];
  return keywords.some((keyword) => sectionLower.includes(keyword));
}

/**
 * Post-process results to improve accuracy
 * @param results - Categorized results
 * @param confidenceScores - Confidence scores for each sentence
 */
function postProcessResults(
  results: CategorizedResults,
  confidenceScores: ConfidenceScores
): void {
  // Move low-confidence breaking changes to miscellaneous
  results[BREAKING_CHANGES] = results[BREAKING_CHANGES].filter((sentence) => {
    const confidence = confidenceScores[sentence] || 0;
    if (confidence < 0.7) {
      results.miscellaneous.push(sentence);
      return false;
    }
    return true;
  });

  // Deduplicate entries across categories
  const seen = new Set<string>();
  Object.keys(results).forEach((category) => {
    results[category as keyof CategorizedResults] = results[
      category as keyof CategorizedResults
    ].filter((sentence) => {
      if (seen.has(sentence)) {
        return false;
      }
      seen.add(sentence);
      return true;
    });
  });
}

// Export additional utilities for testing and debugging
export { releaseNotePlugin, categoryPatterns, getContextPatterns };
