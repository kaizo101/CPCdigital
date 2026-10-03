const rootPackage = require('./package.json')

/** Internal desktop packaging probe. Not a public release configuration. */
module.exports = {
  appId: 'dev.cpcdigital.desktop',
  productName: rootPackage.productName,
  extraMetadata: { version: rootPackage.version },
  electronDist: 'node_modules/electron/dist',
  directories: {
    app: 'packages/electron',
    output: 'dist/desktop-internal',
  },
  files: ['dist/**/*', 'package.json'],
  extraResources: [
    { from: 'packages/client/dist', to: 'client' },
    { from: 'LICENSE', to: 'LICENSE' },
    { from: 'NOTICE.md', to: 'NOTICE.md' },
  ],
  asar: true,
  linux: {
    target: ['AppImage'],
    executableName: 'cpcdigital',
    syncDesktopName: true,
    publish: null,
    category: 'Game',
    artifactName: '${productName}-${version}-${arch}-internal.${ext}',
  },
}
