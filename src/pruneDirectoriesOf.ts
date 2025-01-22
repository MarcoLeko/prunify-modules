import filesize from "filesize";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { rimraf } from "rimraf";
import { tryCatch } from "@lekoma/promise-as-u-go/dist";

import { requireDynamically } from "./config/requireDynamically";
import { type Dirent } from "node:fs";

const BINARIES_FOLDER = ".bin";

async function retrievePackageJson(
  dependencyPath: string,
): Promise<Record<string, string | string[] | Record<string, string>>> {
  const packageJsonPath = path.resolve(dependencyPath, "package.json");
  return requireDynamically(packageJsonPath);
}

async function prunePackage(entry: Dirent, packageName: string) {
  const packagePath = path.resolve(entry.path, entry.name);

  const [error] = await tryCatch(rimraf(packagePath));

  if (error) {
    console.error(chalk.bold.yellow(`Failed to delete: ${packageName}`), error);
  }
}

export async function pruneDirectoriesOf(
  modulePath: string,
  keepList: Set<string | RegExp>,
  forcePruneList: Set<RegExp>,
  dryRun: boolean,
): Promise<void> {
  const entries = await fs.promises.readdir(modulePath, {
    withFileTypes: true,
  });

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
      await pruneDirectoriesOf(
        currentDirectory,
        keepList,
        forcePruneList,
        dryRun,
      );
    }

    const packageName = packageJson?.name as string | null;
    const canDirectoryBeForcePruned = Array.from(forcePruneList).some((item) =>
      item.test(directory),
    );

    if (
      !canDirectoryBeForcePruned &&
      packageName &&
      keepList.has(packageName)
    ) {
      continue;
    }

    const isDirectoryEmpty =
      fs.readdirSync(currentDirectory, { withFileTypes: true }).length === 0;

    if (
      (!isMonoRepoDirectory ||
        isDirectoryEmpty ||
        directory === BINARIES_FOLDER ||
        canDirectoryBeForcePruned) &&
      !dryRun
    ) {
      await prunePackage(entry, directory);
    }
  }
}
