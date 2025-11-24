module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@app$": "<rootDir>/src/app.js",
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@config$": "<rootDir>/src/config/index.js",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@classes/(.*)$": "<rootDir>/src/classes/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@models/(.*)$": "<rootDir>/src/models/$1",
    "^@data/(.*)$": "<rootDir>/data/$1",
  },


  transform: {}
};
