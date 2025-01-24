import { tryCatch } from "@lekoma/promise-as-u-go/dist";
import path from "path";
import { appNodeModules } from "./config/paths";
import { requireDynamically } from "./config/requireDynamically";
import { PackageJSON } from "./types/packageJSON";

export class DependencyResolver {
  public async retrievePackageJson(
    dependencyPath: string,
  ): Promise<PackageJSON> {
    const packageJsonPath = path.resolve(dependencyPath, "package.json");
    return requireDynamically(packageJsonPath);
  }

  public async getDependenciesLists(opts: {
    externals: string[];
    prune: string[];
  }): Promise<readonly [Set<string>, Set<RegExp>]> {
    const dependenciesToKeep = new Set<string>(opts.externals);

    // The likelihood that these dependencies are being kept as transitive dependencies is given
    // so, we force the removal in any given circumstance after the build job, as they are not needed
    const dependenciesToForcePrune = new Set<RegExp>(
      opts.prune.map((item: string) => new RegExp(item)),
    );

    // Recursively resolve transitive dependencies for all root-level dependencies
    for (const dependency of Array.from(dependenciesToKeep)) {
      await this.resolveTransitiveDependencies(dependency, dependenciesToKeep);
    }

    return [dependenciesToKeep, dependenciesToForcePrune] as const;
  }

  private async resolveTransitiveDependencies(
    dependency: string,
    dependenciesToKeep: Set<string>,
  ): Promise<void> {
    const [_, packageJson] = await tryCatch(
      this.retrievePackageJson(path.join(appNodeModules, dependency)),
    );

    if (!packageJson) {
      return;
    }

    const transitiveDependencies = {
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.peerDependencies ?? {}),
    };

    for (const transitiveDep of Object.keys(transitiveDependencies)) {
      if (!dependenciesToKeep.has(transitiveDep)) {
        dependenciesToKeep.add(transitiveDep);
        await this.resolveTransitiveDependencies(
          transitiveDep,
          dependenciesToKeep,
        );
      }
    }
  }
}
