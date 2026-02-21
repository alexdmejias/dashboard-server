/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { isolatedModules: true, tsconfig: './tsconfig.jest.json' }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lowdb|steno)/).*',
  ],
};
