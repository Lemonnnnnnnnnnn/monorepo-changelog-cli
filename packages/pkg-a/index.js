const pkgB = require('pkg-b');

module.exports = {
  name: 'pkg-a',
  version: '1.0.0',
  usesPkgB: () => pkgB.hello()
}; 