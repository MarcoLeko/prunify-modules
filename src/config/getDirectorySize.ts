import fs from "fs";
import path from "path";

export async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.resolve(dirPath, entry.name);

    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(entryPath);
    } else {
      const stats = await fs.promises.stat(entryPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}
