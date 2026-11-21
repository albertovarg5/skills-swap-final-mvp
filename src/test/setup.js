import "@testing-library/jest-dom/vitest";

// Start every test with empty storage so tests do not affect each other.
beforeEach(() => globalThis.localStorage?.clear());
