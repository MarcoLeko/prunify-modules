import { program } from "commander";
import { requireDynamically } from "./config/requireDynamically";
import { appNodeModules, libPackageJson } from "./config/paths";
import { PackageJSON } from "./types/packageJSON";
import { getDirectorySize } from "./getDirectorySize";
import { filesize } from "filesize";
import chalk from "chalk";
import { getDependenciesLists } from "./getDependenciesLists";
import { pruneDirectoriesOf } from "./pruneDirectoriesOf";

const packageJson: PackageJSON = requireDynamically(libPackageJson);

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .option(
    "-d, --dry-run",
    "condition to avoid pruning - if enabled - dependencies that would be pruned are listed",
    false,
  )
  .option(
    "-e, --externals <list>",
    "comma-seperated list of dependencies that should be ignored from pruning (also works with mono-repo dependencies)",
    (val: string) => val.split(","),
    [],
  )
  .option(
    "-p, --prune <list>",
    "comma-seperated list of dependencies to force prune",
    (val: string) => val.split(","),
    [],
  );

program.parse();

const options = program.opts<{
  externals: string[];
  prune: string[];
  dryRun: boolean;
}>();

(async function main() {
  const formattedSizeBefore = filesize(await getDirectorySize(appNodeModules));
  console.log(
    "node_modules size un-optimized being: ",
    chalk.bold.red(formattedSizeBefore),
  );
  console.log(chalk.bold("Pruning node_modules"));

  const [dependenciesToKeep, dependenciesToForcePrune] =
    await getDependenciesLists(options);

  await pruneDirectoriesOf(
    appNodeModules,
    dependenciesToKeep,
    dependenciesToForcePrune,
    options.dryRun,
  );

  const formattedSizeAfter = filesize(await getDirectorySize(appNodeModules));
  console.log(chalk.bold("Pruning complete"));
  console.log(
    `node_modules size optimized being: ${chalk.bold.blue(formattedSizeAfter)} 🚀`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
