// Minimal @/ alias resolver for Node-based tests.
const fs = require('fs');
const Module = require('module');
const path = require('path');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(request, parent, ...rest) {
  if (request.startsWith('@/')) {
    const relativePath = request.slice(2);
    const compiledPath = path.join(process.cwd(), '.tmp-tests', relativePath);
    const sourcePath = path.join(process.cwd(), relativePath);

    const candidate = resolveExistingPath(compiledPath) ?? resolveExistingPath(sourcePath);
    if (candidate) {
      return originalResolveFilename.call(this, candidate, parent, ...rest);
    }
  }
  return originalResolveFilename.call(this, request, parent, ...rest);
};

function resolveExistingPath(basePath) {
  if (fs.existsSync(basePath)) {
    return basePath;
  }
  if (fs.existsSync(`${basePath}.js`)) {
    return `${basePath}.js`;
  }
  if (fs.existsSync(path.join(basePath, 'index.js'))) {
    return path.join(basePath, 'index.js');
  }
  return null;
}
