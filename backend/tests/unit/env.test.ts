import { jest, describe, it, expect } from '@jest/globals';
import { config } from '../../src/config/env';

describe('Environment Variables Config', () => {
  it('should export the expected configuration values', () => {
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
    expect(config.PORT).toBeDefined();
    expect(config.DATABASE_URL).toBeDefined();
  });

  it('should parse MAX_UPLOAD_SIZE_MB to bytes correctly', () => {
    // default is 5MB in .env => 5 * 1024 * 1024 = 5242880
    expect(config.MAX_UPLOAD_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
