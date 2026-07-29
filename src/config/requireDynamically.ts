async function requireDynamically(path: string) {
    return import(path);
}

export { requireDynamically };