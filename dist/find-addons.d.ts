import { PluginSummary } from 'find-plugins';
/**
 * Discover any addons for the current directory. If the current directory is a Denali project, load
 * addons from the local node_modules folder, using the local package.json as a guide.
 *
 * If the current directory is not a Denali project, load the addons from the global node_modules
 * folder (both yarn and npm are supported), and scan all the global packages for addon (rather than
 * relying on a package.json guide).
 */
export default function findAddons(isLocal: boolean): PluginSummary[];
