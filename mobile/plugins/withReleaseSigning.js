// Signs release builds (APK and the .aab for Google Play) with YOUR upload
// key instead of the shared debug key. Reads mobile/credentials/keystore.properties:
//
//   storeFile=upload-key.keystore      (file inside mobile/credentials/)
//   storePassword=…
//   keyAlias=upload
//   keyPassword=…
//
// If the file is missing, builds fall back to the debug key (fine for local testing only).
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    const credDir = path.join(cfg.modRequest.projectRoot, 'credentials');
    const propsFile = path.join(credDir, 'keystore.properties');
    if (!fs.existsSync(propsFile)) {
      console.warn('⚠️  withReleaseSigning: credentials/keystore.properties not found — release builds use the DEBUG key (not accepted by Google Play).');
      return cfg;
    }
    const props = Object.fromEntries(
      fs.readFileSync(propsFile, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    );
    for (const k of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
      if (!props[k]) throw new Error(`withReleaseSigning: "${k}" missing in credentials/keystore.properties`);
    }
    const storePath = path.join(credDir, props.storeFile).replace(/\\/g, '/');
    const q = (v) => JSON.stringify(v);
    let gradle = cfg.modResults.contents;
    if (!gradle.includes('signingConfigs {')) throw new Error('withReleaseSigning: unexpected build.gradle (no signingConfigs block)');
    if (!gradle.includes('release {\n            storeFile file(')) {
      gradle = gradle.replace(
        /signingConfigs \{\n/,
        `signingConfigs {\n        release {\n            storeFile file(${q(storePath)})\n            storePassword ${q(props.storePassword)}\n            keyAlias ${q(props.keyAlias)}\n            keyPassword ${q(props.keyPassword)}\n        }\n`,
      );
    }
    // In buildTypes.release, use the release signing config.
    gradle = gradle.replace(/(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
