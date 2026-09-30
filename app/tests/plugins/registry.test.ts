import { describe, expect, it } from 'vitest';
import { builtInPlugins } from '../../src/plugins/registry';

describe('built-in Plugin registry', () => {
  it('lists the core, engine-pi and pocock Plugins', () => {
    expect(builtInPlugins.map((plugin) => plugin.manifest.id)).toEqual(['core', 'engine-pi', 'pocock']);
  });

  it('keeps the core Plugin from being switched off', () => {
    const core = builtInPlugins.find((plugin) => plugin.manifest.id === 'core');
    expect(core?.manifest.switchable).toBe(false);
  });
});
