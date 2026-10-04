// Pins THIS project's Android build to JDK 17 without touching the system Java.
// JDK 24+ prints a "restricted method" warning during native (CMake) steps,
// which the React Native Android build treats as a failure. Rather than
// changing the machine-wide Java (other projects need 25), we write
// org.gradle.java.home into android/gradle.properties at prebuild time.
const { withGradleProperties } = require('expo/config-plugins');
const { execSync } = require('child_process');

function findJdk17() {
  try {
    return execSync('/usr/libexec/java_home -v 17', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null; // not on macOS or JDK 17 not installed — leave Gradle's default
  }
}

module.exports = function withProjectJdk(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === 'org.gradle.java.home'));
    const home = findJdk17();
    if (home) cfg.modResults.push({ type: 'property', key: 'org.gradle.java.home', value: home });
    return cfg;
  });
};
