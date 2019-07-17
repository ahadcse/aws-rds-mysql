module.exports = {
  "roots": [
    "<rootDir>/tests"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "collectCoverageFrom": ["src/**/*"],
  "notify": true,
  "coverageDirectory": "./test-reports/coverage/",
  "collectCoverage": true,
  "reporters": [
    "default"
  ],
  "testEnvironment": "node"
}
