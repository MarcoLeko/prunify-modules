import { tryCatch } from "@lekoma/promise-as-u-go/dist";
import path from "path";
import { appNodeModules } from "./config/paths";
import { requireDynamically } from "./config/requireDynamically";
import { PackageJSON } from "./types/packageJSON";

async function retrievePackageJson(
  dependencyPath: string,
): Promise<PackageJSON> {
  const packageJsonPath = path.resolve(dependencyPath, "package.json");
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
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  };

  for (const transitiveDep of Object.keys(transitiveDependencies)) {
    if (!dependenciesToKeep.has(transitiveDep)) {
      dependenciesToKeep.add(transitiveDep);
      await resolveTransitiveDependencies(transitiveDep, dependenciesToKeep);
    }
  }
}

export async function getDependenciesLists(opts: {
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
    await resolveTransitiveDependencies(dependency, dependenciesToKeep);
  }

  return [dependenciesToKeep, dependenciesToForcePrune] as const;
}
