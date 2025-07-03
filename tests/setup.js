import { vi } from 'vitest';

// Mock process.exit to prevent tests from actually exiting
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error(`process.exit unexpectedly called with "${process.exit.mock.calls[0][0]}"`);
});