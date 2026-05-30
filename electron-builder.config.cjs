const packageJson = require('./package.json');

function buildVersion() {
  const forced = process.env.GODNOTE_PACKAGE_VERSION;
  if (forced) return forced;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${packageJson.version}+${stamp}`;
}

module.exports = {
  appId: 'com.kazu.godnote',
  productName: 'godnote',
  files: [
    'dist/**/*',
    'dist-server/**/*',
    'electron/**/*',
    'src/shared/storage/*.ts',
    'package.json',
  ],
  directories: {
    output: 'release',
  },
  extraMetadata: {
    version: buildVersion(),
  },
  linux: {
    target: ['deb'],
    category: 'Development',
  },
};
