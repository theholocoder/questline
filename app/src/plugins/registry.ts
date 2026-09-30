// The only module in the app allowed to import built-in Plugins (enforced by dependency-cruiser).
import core from '@questline/plugin-core';
import enginePi from '@questline/plugin-engine-pi';
import pocock from '@questline/plugin-pocock';
import type { PluginDefinition } from '@questline/plugin-api';

export const builtInPlugins: readonly PluginDefinition[] = [core, enginePi, pocock];
