import fs from 'node:fs';
import path from 'node:path';

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);

const {
    appNodeModules,
} = {
    appNodeModules: resolveApp('node_modules'),
};

export {
    appDirectory,
    appNodeModules,
};
