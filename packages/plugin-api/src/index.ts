/** Contents of a Plugin's `plugin.json`. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  description?: string;
  dependsOn?: string[];
  switchable?: boolean;
  main?: string;
  renderer?: string;
}

export interface PluginDefinition {
  manifest: PluginManifest;
}

export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}
