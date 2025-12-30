import registryFetch from 'npm-registry-fetch';
import logger from '../../reports/logger.js';

interface PackageMetadata {
  name: string;
  version: string;
  versions: string[];
  dist: any;
  distTags: Record<string, string>;
  repository: any;
  description: string;
  keywords: string | string[];
  homepage: string;
  bugs: any;
  license: string;
  author: any;
  contributors: any;
  engines: any;
  devEngines: any;
  files: any;
  directories: any;
  githubUrl?: string;
  fallbackUrl?: string;
  releaseNotesCompatible?: boolean;
  fallbackACompatible?: boolean | string;
  fallbackBCompatible?: boolean;
  validationStatus?: string;
}

interface PackageVersionInfo {
  current: string;
  wanted?: string;
  latest: string;
  updateType?: string;
  updatingDifficulty?: number;
}

interface ProcessResults {
  valid: Record<string, PackageMetadata & PackageVersionInfo>;
  invalid: Record<string, Partial<PackageMetadata & PackageVersionInfo>>;
}

export async function fetchPackageMetadata(
  packageName: string,
  version: string
): Promise<PackageMetadata> {
  try {
    logger.debug(
      `Fetching metadata for package: ${packageName}, version: ${version}`
    );

    // Fetch general metadata (to get versions and dist-tags)
    const generalMetadata = await registryFetch.json(`/${packageName}`);
    const versions = Object.keys(generalMetadata.versions || {}).slice(-5); // Last 5 versions
    const distTags = generalMetadata['dist-tags'] || {};

    // Fetch specific version metadata
    const versionMetadata = await registryFetch.json(`/${packageName}/${version}`);

    // Combine fields from general and specific metadata
    const requiredMetadata: PackageMetadata = {
      name: versionMetadata.name || generalMetadata.name || 'UNKNOWN',
      version: versionMetadata.version || 'UNKNOWN',
      versions, // From general metadata
      dist: versionMetadata.dist || 'UNKNOWN',
      distTags, // From general metadata
      repository: generalMetadata.repository || 'UNKNOWN',
      description:
        versionMetadata.description || generalMetadata.description || 'UNKNOWN',
      keywords: versionMetadata.keywords || generalMetadata.keywords || 'UNKNOWN',
      homepage: versionMetadata.homepage || generalMetadata.homepage || 'UNKNOWN',
      bugs: versionMetadata.bugs || generalMetadata.bugs || 'UNKNOWN',
      license: versionMetadata.license || generalMetadata.license || 'UNKNOWN',
      author: versionMetadata.author || generalMetadata.author || 'UNKNOWN',
      contributors:
        versionMetadata.contributors || generalMetadata.contributors || 'UNKNOWN',
      engines: versionMetadata.engines || generalMetadata.engines || 'UNKNOWN',
      devEngines:
        versionMetadata.devEngines || generalMetadata.devEngines || 'UNKNOWN',
      files:
        (versionMetadata.files || []).filter((file: string) =>
          file.match(
            /^(readme|changelog|history|releases|upgrade|faq|install)(\.[a-z0-9]+)?$/i
          )
        ) || 'UNKNOWN',
      directories:
        versionMetadata.directories || generalMetadata.directories || 'UNKNOWN',
    };

    logger.debug(
      `Fetched metadata for ${packageName} (version: ${version}): ${JSON.stringify(
        requiredMetadata,
        null,
        2
      )}`
    );
    return requiredMetadata;
  } catch (error: any) {
    logger.error(
      `Error fetching metadata for package ${packageName}, version: ${version}: ${error.message}`
    );
    throw error;
  }
}

/**
 * Validates the metadata fetched for a package to ensure required fields exist.
 * @param metadata - The package metadata to validate.
 * @param pkg - Package name for logging
 * @returns True if the metadata is valid; otherwise, false.
 */
export function validatePackageMetadata(
  metadata: PackageMetadata,
  pkg: string
): boolean {
  logger.debug('Validating package metadata.');

  if (!metadata || typeof metadata !== 'object') {
    logger.error(`Invalid metadata for ${pkg}: Metadata is null or not an object.`);
    return false;
  }

  const requiredFields = ['name', 'version'];
  const missingFields = requiredFields.filter(
    (field) => !metadata[field as keyof PackageMetadata] || metadata[field as keyof PackageMetadata] === 'UNKNOWN'
  );

  if (missingFields.length > 0) {
    logger.error(
      `Invalid metadata: Missing required fields: ${missingFields.join(', ')}`
    );
    return false;
  }

  // Validate repository field
  let githubUrl: string | null = null;
  let fallbackUrl: string | null = null;

  if (
    metadata.repository &&
    typeof metadata.repository === 'object' &&
    metadata.repository.url
  ) {
    const repoUrl = metadata.repository.url;
    if (!/^(https?|git\+https?):\/\//.test(repoUrl)) {
      logger.warn(`Invalid repository URL format: ${repoUrl}`);
      metadata.repository.url = 'INVALID';
    } else {
      const isGitHub = /github\.com/.test(repoUrl);
      if (isGitHub) {
        githubUrl = repoUrl;
      } else {
        logger.warn(`Repository is not GitHub-compatible: ${repoUrl}`);
      }
    }
  } else {
    logger.warn('Missing repository field or URL.');
    metadata.repository = { url: 'INVALID', type: 'UNKNOWN' };
  }

  // Check homepage and bugs.url for GitHub fallback compatibility
  if (!githubUrl) {
    const homepage = metadata.homepage?.replace(/(#readme|\/issues)/g, '');
    const bugsUrl = metadata.bugs?.url?.replace(/(#readme|\/issues)/g, '');

    if (homepage && /github\.com/.test(homepage)) {
      fallbackUrl = homepage;
    } else if (bugsUrl && /github\.com/.test(bugsUrl)) {
      fallbackUrl = bugsUrl;
    }
  }

  // Assign GitHub URLs if applicable
  if (githubUrl) {
    metadata.githubUrl = githubUrl;
    metadata.releaseNotesCompatible = true;
    metadata.fallbackBCompatible = true;
  } else if (fallbackUrl) {
    metadata.fallbackUrl = fallbackUrl;
    metadata.releaseNotesCompatible = true;
    metadata.fallbackBCompatible = true;
  } else {
    metadata.releaseNotesCompatible = false;
    metadata.fallbackBCompatible = false;
  }

  // Validate tarball URL for fallback A compatibility
  if (metadata.dist && metadata.dist.tarball) {
    const tarballUrl = metadata.dist.tarball;
    if (/^https?:\/\//.test(tarballUrl)) {
      metadata.fallbackACompatible = true;
    } else {
      logger.warn(`Invalid tarball URL: ${tarballUrl}`);
      metadata.fallbackACompatible = 'INVALID';
    }
  } else {
    logger.warn('Missing tarball URL for fallback A compatibility.');
    metadata.fallbackACompatible = 'MISSING';
  }

  logger.debug('Metadata validation passed.');
  metadata.validationStatus = 'VALIDATED METADATA';

  return true;
}

/**
 * Processes items in batches with concurrency control
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param concurrency - Maximum number of concurrent operations
 */
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Processes a list of packages by fetching and validating their metadata.
 * Optimized with concurrency control to prevent rate limiting.
 * @param packages - The list of packages to process with version info.
 * @returns An object containing valid and invalid packages.
 */
export async function processPackagesMetadata(
  packages: Record<string, PackageVersionInfo>
): Promise<ProcessResults> {
  const results: ProcessResults = {
    valid: {},
    invalid: {},
  };

  const packageEntries = Object.entries(packages);
  
  // Process packages with concurrency limit to avoid overwhelming the npm registry
  await processBatch(
    packageEntries,
    async ([pkg, info]) => {
      const { latest } = info;
      try {
        const metadata = await fetchPackageMetadata(pkg, latest);

        if (validatePackageMetadata(metadata, pkg)) {
          results.valid[pkg] = { ...info, ...metadata };
        } else {
          results.invalid[pkg] = {
            validationStatus: 'FAILED VALIDATION',
            ...info,
            ...metadata,
          };
        }
      } catch (error) {
        results.invalid[pkg] = {
          validationStatus: 'FAILED VALIDATION',
          ...info,
        };
      }
    },
    5 // Process 5 packages at a time
  );

  logger.debug(`Processed packages. Results: ${JSON.stringify(results, null, 2)}`);
  return results;
}
