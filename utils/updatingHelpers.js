import logger from '../reports/logger.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
/**
 * Updates the `package.json` file with new dependency versions.
 * @param includedPackages - Array of package objects with `packageName` and `metadata`.
 * @returns Promise that resolves when the package.json file has been updated.
 */
export async function writeChanges(includedPackages) {
    const packageJsonPath = path.resolve('package.json');
    try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        includedPackages.forEach((pkg) => {
            const { packageName, metadata } = pkg;
            const { latest: version } = metadata;
            // Determine the correct section by inspecting the existing package.json
            let targetSection = null;
            if (packageJson.dependencies?.[packageName]) {
                targetSection = 'dependencies';
            }
            else if (packageJson.devDependencies?.[packageName]) {
                targetSection = 'devDependencies';
            }
            else if (packageJson.peerDependencies?.[packageName]) {
                targetSection = 'peerDependencies';
            }
            else if (packageJson.optionalDependencies?.[packageName]) {
                targetSection = 'optionalDependencies';
            }
            // Default to `dependencies` if no targetSection is found
            if (!targetSection) {
                targetSection = 'dependencies';
            }
            // Ensure the target section exists and update the package version
            packageJson[targetSection] = packageJson[targetSection] || {};
            packageJson[targetSection][packageName] = `^${version}`;
        });
        // Write the updated package.json back to disk
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        logger.success('package.json updated successfully.');
    }
    catch (error) {
        logger.error(`Could not write to package.json: ${error.message}`);
        throw error;
    }
}
/**
 * Installs updated dependencies using npm.
 */
export function installDependencies() {
    logger.info('Installing updated dependencies...');
    try {
        execSync('npm install', { stdio: 'inherit' });
        logger.success('Dependencies installed successfully.');
    }
    catch (error) {
        logger.error(`Failed to install dependencies: ${error.message}`);
    }
}
