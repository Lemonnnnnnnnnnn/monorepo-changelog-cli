const pkgB = require('pkg-b');

module.exports = {
  name: 'pkg-a',
  version: '1.0.0',
  usesPkgB: () => pkgB.hello()
}; / /   A d d e d   n e w   f e a t u r e  
 / /   N e w   c h a n g e   i n   p k g - a  
 