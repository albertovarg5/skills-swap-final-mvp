import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Start every test with empty storage so tests do not affect each other.
beforeEach(() => localStorage.clear());
