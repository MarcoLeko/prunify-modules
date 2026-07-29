import { program } from "commander";
import { requireDynamically } from "./config/requireDynamically.js";
import { libPackageJson } from "./config/paths.js";
import { PackageJSON } from "./types/packageJSON.js";
import { PrunifyOptions } from "./types/prunifyOptions.js";
import { PrunifyCli } from "./prunifyCli.js";

(async function main() {
  const packageJson: PackageJSON = await requireDynamically(libPackageJson);

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
          "comma-seperated list of dependencies that should be ignored from pruning (also works with mono-repo dependencies) - disclaimer: transitive dependencies of externals are being kept as well",
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

  const options = program.opts<PrunifyOptions>();

  await new PrunifyCli(options).run();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
