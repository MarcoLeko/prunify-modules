import filesize from 'filesize';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { rimraf } from 'rimraf';
import { tryCatch } from '@lekoma/promise-as-u-go/dist';

import { appNodeModules } from './config/paths';
import { requireDynamically } from './config/requireDynamically';
import { type Dirent } from 'node:fs';

const BINARIES_FOLDER = '.bin';

async function getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.resolve(dirPath, entry.name);

        if (entry.isDirectory()) {
            totalSize += await getDirectorySize(entryPath);
        } else {
            const stats = await fs.promises.stat(entryPath);
            totalSize += stats.size;
        }
    }

    return totalSize;
}

async function retrievePackageJson(
    dependencyPath: string,
): Promise<Record<string, string | string[] | Record<string, string>>> {
    const packageJsonPath = path.resolve(dependencyPath, 'package.json');
    return requireDynamically(packageJsonPath);
}

async function resolveTransitiveDependencies(
    dependency: string,
    dependenciesToKeep: Set<string>,
): Promise<void> {
    const [_, packageJson] = await tryCatch(
        retrievePackageJson(path.join(appNodeModules, dependency)),
    );

    if (!packageJson) {
        return;
    }

    const transitiveDependencies = {
        ...(packageJson.dependencies as Record<string, string>),
        ...(packageJson.peerDependencies as Record<string, string>),
    };

    for (const transitiveDep of Object.keys(transitiveDependencies)) {
        if (!dependenciesToKeep.has(transitiveDep)) {
            dependenciesToKeep.add(transitiveDep);
            await resolveTransitiveDependencies(transitiveDep, dependenciesToKeep);
        }
    }
}

async function getDependenciesLists(): Promise<Array<Set<string | RegExp>>> {
    // @todo set this as option to pass as command-line arg
    const dependenciesToKeep = new Set<string>([
        '@datadog',
        'react',
        'react-dom',
        'react-intl',
        '@sentry/browser',
        '@sentry/core',
    ]);

    // The likelihood that these dependencies are being kept as transitive dependencies is given
    // so, we force the removal in any given circumstance after the build job, as they are not needed
    const dependenciesToForcePrune = new Set<RegExp>([
        /typescript/,
        /babel/,
        /react-native/,
        /@types/,
        /eslint/,
    ]);

    // Recursively resolve transitive dependencies for all root-level dependencies
    for (const dependency of Array.from(dependenciesToKeep)) {
        await resolveTransitiveDependencies(dependency, dependenciesToKeep);
    }

    return [dependenciesToKeep, dependenciesToForcePrune] as const;
}

async function prunePackage(entry: Dirent, packageName: string) {
    const packagePath = path.resolve(entry.path, entry.name);

    const [error] = await tryCatch(rimraf(packagePath));

    if (error) {
        console.error(chalk.bold.yellow(`Failed to delete: ${packageName}`), error);
    }
}

async function pruneDirectoriesOf(
    modulePath: string,
    keepList: Set<string | RegExp>,
    forcePruneList: Set<RegExp>,
): Promise<void> {
    const entries = await fs.promises.readdir(modulePath, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const directory = entry.name;
        const currentDirectory = path.join(modulePath, directory);
        const [isMonoRepoDirectory, packageJson] = await tryCatch(
            retrievePackageJson(currentDirectory),
        );

        if (isMonoRepoDirectory) {
            await pruneDirectoriesOf(currentDirectory, keepList, forcePruneList);
        }

        const packageName = packageJson?.name as string | null;
        const canDirectoryBeForcePruned = Array.from(forcePruneList).some(item =>
            item.test(directory),
        );

        if (!canDirectoryBeForcePruned && packageName && keepList.has(packageName)) {
            continue;
        }

        const isDirectoryEmpty =
            fs.readdirSync(currentDirectory, { withFileTypes: true }).length === 0;

        if (
            !isMonoRepoDirectory ||
            isDirectoryEmpty ||
            directory === BINARIES_FOLDER ||
            canDirectoryBeForcePruned
        ) {
            await prunePackage(entry, directory);
        }
    }
}

/**
 *  The purpose of the script is to prune extraneous and unnecessary libraries from the node_modules in order to ensure that docker images are being kept small
 */
(async function main() {
    const formattedSizeBefore = filesize(await getDirectorySize(appNodeModules));
    console.log('node_modules size un-optimized being: ', chalk.bold.red(formattedSizeBefore));
    console.log(chalk.bold('Pruning node_modules'));

    const [dependenciesToKeep, dependenciesToForcePrune] = await getDependenciesLists();

    await pruneDirectoriesOf(
        appNodeModules,
        dependenciesToKeep!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
        dependenciesToForcePrune as Set<RegExp>,
    );

    const formattedSizeAfter = filesize(await getDirectorySize(appNodeModules));
    console.log(chalk.bold('Pruning complete'));
    console.log(`node_modules size optimized being: ${chalk.bold.blue(formattedSizeAfter)} 🚀`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
