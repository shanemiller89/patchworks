/**
 * Centralized type definitions for Patchworks
 * Single source of truth for all package-related types
 */

/**
 * Base package metadata shared across all modules
 */
export interface PackageMetadata {
  current: string;
  latest: string;
  updateType: 'patch' | 'minor' | 'major';
  updatingDifficulty?: number | string;
  githubUrl?: string;
  fallbackUrl?: string;
  releaseNotesCompatible?: boolean;
  fallbackACompatible?: boolean;
  fallbackBCompatible?: boolean;
  [key: string]: any;
}

/**
 * Extended metadata with repository info (required for reports)
 */
export interface PackageMetadataWithRepo extends PackageMetadata {
  repository: {
    type: string;
    url: string;
  };
  description?: string;
  homepage?: string;
  author?: {
    name?: string;
    email?: string;
  };
}

/**
 * Package data for updates
 */
export interface PackageData {
  packageName: string;
  metadata: PackageMetadata;
}

/**
 * Package data with repository info (required for reports)
 */
export interface PackageDataWithRepo {
  packageName: string;
  metadata: PackageMetadataWithRepo;
}

/**
 * Package with release notes
 */
export interface PackageWithLogs extends PackageData {
  releaseNotes?: any;
  changelog?: any;
  categorizedNotes?: Array<{
    version: string;
    published_at?: string;
    categorized: Record<string, string[]>;
  }>;
  source?: string;
  attemptedReleaseNotes?: boolean;
  attemptedFallbackA?: boolean;
  attemptedFallbackB?: boolean;
  importantTerms?: any;
}

/**
 * Packages included in update workflow
 */
export interface IncludedPackage extends PackageData {
  // Used by writeChanges and installDependencies
}
