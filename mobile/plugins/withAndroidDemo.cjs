const { withAndroidManifest, withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');
module.exports = config => withProjectBuildGradle(withAppBuildGradle(withAndroidManifest(config, config => {
  const app = config.modResults.manifest.application[0];
  // Local demo only. Native/JS URL validation permits cleartext exclusively to private LAN/loopback.
  app.$['android:usesCleartextTraffic'] = 'true';
  app.$['android:allowBackup'] = 'false';
  return config;
}), config => {
  if (!config.modResults.contents.includes('CMAKE_OBJECT_PATH_MAX')) {
    config.modResults.contents = config.modResults.contents.replace('defaultConfig {', `defaultConfig {
        externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=260" } }
    `);
  }
  if (!config.modResults.contents.includes('buildStagingDirectory')) {
    config.modResults.contents = config.modResults.contents.replace('android {', `android {
    externalNativeBuild { cmake { buildStagingDirectory file("$rootDir/../../../.avies-cxx") } }
    `);
  }
  return config;
}), config => {
  config.modResults.contents=config.modResults.contents.replace(/\n\/\/ aviesShortNativePaths:[\s\S]*$/, '');
  config.modResults.contents += `
// aviesShortNativePaths: Windows CMake/Ninja object files must stay below MAX_PATH.
subprojects { child ->
  child.plugins.withId("com.android.library") {
    child.android {
      externalNativeBuild { cmake { buildStagingDirectory file("\u0024{rootDir}/../../../.avies-cxx/lib/\u0024{Integer.toHexString(child.path.hashCode())}") } }
      defaultConfig { externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=250" } } }
    }
  }
}
`;
  return config;
});
