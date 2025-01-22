export type PackageJSON = {
  name: string;
  description: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
