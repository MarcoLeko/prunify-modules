function requireDynamically(path: string) {
    return eval(`require('${path.split('\\').join('/')}');`);
}

export { requireDynamically };