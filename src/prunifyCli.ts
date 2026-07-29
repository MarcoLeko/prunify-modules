import { filesize } from "filesize";
import { getDirectorySize } from "./config/getDirectorySize.js";
import { appNodeModules } from "./config/paths.js";
import { PrunifyOptions } from "./types/prunifyOptions.js";
import { DependencyResolver } from "./dependencyResolver.js";
import { tryCatch } from "@lekoma/promise-as-u-go/dist/try-catch.js";
import { rimraf } from "rimraf";
import fs from "fs";
import path from "path";
import chalk from "chalk";

export class PrunifyCli {
  readonly #options: PrunifyOptions;
  readonly #binariesFolder = ".bin";

  constructor(options: PrunifyOptions) {
    this.#options = options;
  }

  public async run(): Promise<void | never> {
    await this.logPruneStart();

    const [dependenciesToKeep, dependenciesToForcePrune] =
      await new DependencyResolver().getDependenciesLists(this.#options);

    await this.pruneDirectoriesOf(
      appNodeModules,
      dependenciesToKeep,
      dependenciesToForcePrune,
      this.#options.dryRun,
    );

    await this.logPruneEnd();
  }

  private async logPruneStart(): Promise<void> {
    const formattedSizeBefore = filesize(
      await getDirectorySize(appNodeModules),
    );
    console.log(
      "node_modules size un-optimized being: ",
      chalk.bold.red(formattedSizeBefore),
    );
    console.log(chalk.bold("Pruning node_modules"));
  }

  private async logPruneEnd(): Promise<void> {
    const formattedSizeAfter = filesize(await getDirectorySize(appNodeModules));
    console.log(chalk.bold("Pruning complete"));
    console.log(
      `node_modules size optimized being: ${chalk.bold.blue(formattedSizeAfter)} 🚀`,
    );
  }

  private logPretendedPackagePrune(packagePath: string): void {
    console.log(
      `${chalk.bold.gray("[Dry-run]")} Package that would be pruned: ${packagePath}`,
    );
  }

  private async prunePackage(packagePath: string, packageName: string) {
    const [error] = await tryCatch(rimraf(packagePath));

    if (error) {
      console.error(
        chalk.bold.yellow(`Failed to delete: ${packageName}`),
        error,
      );
    }
  }

  private async pruneDirectoriesOf(
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
        new DependencyResolver().retrievePackageJson(currentDirectory),
      );

      if (isMonoRepoDirectory) {
        await this.pruneDirectoriesOf(
          currentDirectory,
          keepList,
          forcePruneList,
          dryRun,
        );
      }

      const packageName = packageJson?.name as string | null;
      const canDirectoryBeForcePruned = Array.from(forcePruneList).some(
        (item) => item.test(directory),
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

      const packagePath = path.resolve(entry.parentPath, entry.name);

      if (dryRun) {
        this.logPretendedPackagePrune(packagePath);
        continue;
      }

      if (
        !isMonoRepoDirectory ||
        isDirectoryEmpty ||
        canDirectoryBeForcePruned ||
        directory === this.#binariesFolder
      ) {
        await this.prunePackage(packagePath, directory);
      }
    }
  }
}
