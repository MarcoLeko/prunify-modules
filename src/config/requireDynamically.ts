import { pathToFileURL } from "node:url";

async function requireDynamically<T = unknown>(path: string): Promise<T> {
  const module = await import(pathToFileURL(path).href, {
    with: { type: "json" },
  });
  return module.default as T;
}

export { requireDynamically };
