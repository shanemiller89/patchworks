// versionLogs/fetchChangelog.ts

import axios from 'axios';
// eslint-disable-next-line lodash/import-scope
import tar from 'tar-stream';
import logger from '../reports/logger.js';
import { gunzipSync } from 'zlib';

interface PackageMetadata {
  dist: {
    tarball: string;
  };
  current: string;
  latest: string;
}

interface PackageData {
  packageName: string;
  metadata: PackageMetadata;
}

/**
 * Fetch changelog from Unpkg or tarball locations.
 * Attempts to retrieve a changelog from Unpkg first, then falls back to tarball extraction.
 * @param packageData - Package name and metadata
 * @returns The extracted changelog content or null if not found.
 */
export async function fetchChangelog({
  packageName,
  metadata,
}: PackageData): Promise<string | null> {
  const { dist, current, latest } = metadata;
  const version = latest;
  const tarballUrl = dist.tarball;

  logger.debug(
    `Fallback A Begin: ${packageName}: ${current} -> ${version} - ${tarballUrl}`
  );

  try {
    const possiblePaths = [
      'CHANGELOG.md',
      'HISTORY.md',
      'docs/CHANGELOG.md',
      'docs/HISTORY.md',
      'changelog.md',
      'history.md',
      'CHANGELOG.txt',
      'HISTORY.txt',
      'changelog.txt',
      'history.txt',
      'changelog/index.md',
      'history/index.md',
      'ReleaseNotes.md',
      'CHANGES.md',
    ];

    // Attempt to fetch changelog from Unpkg
    for (const path of possiblePaths) {
      const unpkgUrl = `https://unpkg.com/${packageName}@${version}/${path}`;
      logger.debug(`Attempting to fetch changelog from Unpkg: ${unpkgUrl}`);

      try {
        const unpkgResponse = await axios.get(unpkgUrl, {
          timeout: 10000,
        });
        if (unpkgResponse.status === 200) {
          const changelogContent = unpkgResponse.data;
          logger.success(`Changelog successfully fetched from Unpkg: ${unpkgUrl}`);
          return changelogContent;
        }
      } catch (unpkgError: any) {
        // Only log if it's not a 404 (which is expected for most paths)
        if (unpkgError.response?.status !== 404) {
          logger.warn(`Error fetching from Unpkg: ${unpkgError.message}`);
        }
      }
    }

    // Fallback to tarball extraction
    if (tarballUrl) {
      logger.debug(`Attempting to fetch tarball from: ${tarballUrl}`);

      try {
        const tarballResponse = await axios.get(tarballUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
        });
        if (tarballResponse.status !== 200) {
          logger.warn(`Failed to fetch tarball: ${tarballResponse.statusText}`);
          return null;
        }

        const tarballBuffer = Buffer.from(tarballResponse.data);
        
        // Use AbortController pattern to properly cleanup timeout
        let timeoutId: NodeJS.Timeout | undefined;
        const changelogContent = await Promise.race([
          extractChangelogFromTarball(tarballBuffer),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Tarball extraction timeout')), 30000);
          })
        ]).catch(err => {
          logger.warn(`Tarball extraction failed or timed out: ${err.message}`);
          return null;
        }).finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        }) as string | null;

        if (changelogContent) {
          logger.success(`Changelog extracted successfully from tarball.`);
          return changelogContent;
        } else {
          logger.warn('No changelog file found in tarball.');
        }
      } catch (tarballError: any) {
        logger.error(`Failed to fetch or extract tarball: ${tarballError.message}`);
      }
    } else {
      logger.warn('No tarball URL provided or tarball fetch failed.');
    }

    return null;
  } catch (error: any) {
    logger.error(`Unexpected error while fetching changelog: ${error.message}`);
    return null;
  }
}

/**
 * Extracts the changelog content from a tarball buffer.
 * @param tarballBuffer - The tarball buffer to extract from.
 * @returns The content of the changelog file or null if not found.
 */
async function extractChangelogFromTarball(
  tarballBuffer: Buffer
): Promise<string | null> {
  try {
    const extract = tar.extract();
    const gunzippedBuffer = gunzipSync(tarballBuffer);
    
    // Create a Set for faster lookups
    const changelogFileSet = new Set([
      'CHANGELOG.md',
      'HISTORY.md',
      'docs/CHANGELOG.md',
      'docs/HISTORY.md',
      'changelog.md',
      'history.md',
      'CHANGELOG.txt',
      'HISTORY.txt',
      'changelog.txt',
      'history.txt',
      'changelog/index.md',
      'history/index.md',
      'ReleaseNotes.md',
      'CHANGES.md',
    ]);

    return new Promise<string | null>((resolve, reject) => {
      let changelogContent: string | null = null;
      let resolved = false;

      extract.on('entry', (header, stream, next) => {
        // Skip processing if we already found a changelog
        if (resolved) {
          stream.resume();
          next();
          return;
        }

        logger.debug(`Processing tarball entry: ${header.name}`);
        
        // Check if the full path matches first
        if (changelogFileSet.has(header.name)) {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            changelogContent = Buffer.concat(chunks).toString('utf-8');
            resolved = true;
            resolve(changelogContent);
          });
        } else {
          // Only extract basename if full path doesn't match
          const fileName = header.name.split('/').pop() || '';
          if (changelogFileSet.has(fileName)) {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => {
              changelogContent = Buffer.concat(chunks).toString('utf-8');
              resolved = true;
              resolve(changelogContent);
            });
          } else {
            stream.resume();
          }
        }
        next();
      });

      extract.on('finish', () => {
        if (!resolved) {
          resolve(changelogContent || null);
        }
      });

      extract.on('error', (err) => {
        if (!resolved) {
          reject(`Extraction error: ${err.message}`);
        }
      });

      extract.end(gunzippedBuffer);
    });
  } catch (error: any) {
    logger.error(`Error extracting changelog from tarball: ${error.message}`);
    return null;
  }
}
