import fs from "node:fs";
import path from "node:path";

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const libDirectory = fs.realpathSync(__dirname);
const resolveApp = (relativePath: string) =>
  path.resolve(appDirectory, relativePath);
const resolveLib = (relativePath: string) =>
  path.resolve(libDirectory, relativePath);

const { appPackageJson, appNodeModules, libPackageJson } = {
  libPackageJson: resolveLib("../../package.json"),
  appPackageJson: resolveApp("package.json"),
  appNodeModules: resolveApp("node_modules"),
};

export { appDirectory, appNodeModules, appPackageJson, libPackageJson };
