import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const libDirectory = path.dirname(fileURLToPath(import.meta.url));
const resolveApp = (relativePath: string) =>
  path.resolve(appDirectory, relativePath);
const resolveLib = (relativePath: string) =>
  path.resolve(libDirectory, relativePath);

const { appPackageJson, appNodeModules, libPackageJson } = {
  libPackageJson: resolveLib("../../../package.json"),
  appPackageJson: resolveApp("package.json"),
  appNodeModules: resolveApp("node_modules"),
};

export { appDirectory, appNodeModules, appPackageJson, libPackageJson };
