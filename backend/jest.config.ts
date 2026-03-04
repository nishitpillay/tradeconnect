import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    // Map the shared package alias used in tsconfig
    '@tradeconnect/shared': '<rootDir>/../packages/shared/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Isolate each test file to prevent side-effects between test suites
  clearMocks: true,
  restoreMocks: true,
  // Coverage config
  collectCoverageFrom: ['src/**/*.ts', '!src/app.ts', '!src/config/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
