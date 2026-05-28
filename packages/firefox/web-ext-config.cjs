module.exports = {
  artifactsDir: "web-ext-artifacts",
  build: {
    filename: "topmarks-firefox-v{version}.zip",
    overwriteDest: true,
  },
  ignoreFiles: [
    "web-ext-artifacts/**",
  ],
};
