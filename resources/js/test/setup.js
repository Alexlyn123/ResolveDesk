import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// jsdom does not implement these browser APIs.
window.scrollTo = vi.fn();
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
