/* eslint-disable prettier/prettier */
function loadFeatures(filePath) {
  const data = require(filePath);
  let features = [];

  Object.keys(data).forEach(featureName => {
    const feature = data[featureName];

    features.push({ id: featureName, ...feature });
  });

  return features;
}

module.exports = {
  getOsArch: function (generator) {
    const features = loadFeatures(
      generator.templatePath("features.json"),
      generator
    );
    let result = [];

    features.forEach(feature => {
      feature.arch.forEach(arch => {
        feature.os.forEach(os => {
          if (result.find(item => item.name === `${os} ${arch}`) === undefined) {
            result.push({
              name: `${os} ${arch}`,
              value: `${os}-${arch}`
            });
          }
        });
      });
    });

    return result;
  },
  getFeatures: function (os, arch, generator) {
    const features = loadFeatures(
      generator.templatePath("features.json"),
      generator
    );
    let result = [];

    features.filter(feature => {
      return (feature.os.length === 0) ||
        (feature.arch.length === 0) ||
        (feature.os.includes(os) &&
          feature.arch.includes(arch));
    }).forEach(feature => {
      feature.versions.
        // A sort((a, b) => {
        //   return a.version < b.version ? 1 : -1;
        // }).
        reverse().
        forEach(version => {
          result.push({
            id: `${feature.id}`,
            name: `${feature.name}, ${version}`,
            value: `${feature.id}-${os}-${arch}-${version}`
          });
        });
    });

    return result;
  },

  getSgdbChoices: function () {
    let result = [];

    result.push({
      name: "MS-SQL Server",
      value: "mssql"
    });

    result.push({
      name: "PostgreSQL",
      value: "postgresql"
    });

    return result;
  },

  // ID format: <feature name>-<os>-<arch>-<version>
  getDownloadPath: function (id, user, password, sgdb, generator) {
    const features = loadFeatures(
      generator.templatePath("features.json"),
      generator
    );
    const parts = id.split("-");
    const featureId = parts[0];
    const os = parts[1];
    const arch = parts[2];
    const version = parts[3];
    let result = [];

    features.filter(feature => {
      return feature.id === featureId;
    }).forEach((feature) => {
      feature.urls.forEach((url) => {
        const credential = `${user}:${password}`.replaceAll("@", "%40");

        result.push(
          {
            source: url.source
              .replace("{credencial}", `${credential}@`)
              .replace("{os}", os)
              .replace("{arch}", arch)
              .replace("{version}", version)
              .replace("{sgdb}", sgdb),
            targetFolder: url.targetFolder
              .replace("{os}", os)
              .replace("{arch}", arch)
              .replace("{version}", version)
              .replace("{sgdb}", sgdb),
          });
      });
    });

    return result;
  },
  // ID format: <feature name>-<os>-<arch>-<version>
  getTargetFolder: function (id, generator) {
    const features = loadFeatures(
      generator.templatePath("features.json"),
      generator
    );
    const parts = id.split("-");
    const featureId = parts[0];
    let result = "";

    features.filter(feature => {
      return feature.id === featureId;
    }).forEach((feature, index) => {
      let targetFolder = feature.targetFolder;

      if (index > 1) {
        throw new Error(`Found more one TargetFolder feature. Feature: ${id}`);
      }

      result = targetFolder;
    });

    if (result === "") {
      throw new Error(`URL not found. Feature: ${id}`);
    }

    return result;
  }
};
