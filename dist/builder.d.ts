import Project from './project';
import { PluginSummary } from 'find-plugins';
export interface Tree {
}
/**
 * The Builder class is responsible for taking a Denali package (an app or an addon), and performing
 * any build steps necessary to produce the final, compiled output. Often times this includes
 * transpiling, precompiling template files, etc. The base Builder class also performs some basic
 * copying of package files (package.json, Readme, etc).
 *
 * Projects can define their own Builder in `/denali-build.js`, which can customize how the package
 * is built via the `processSelf` hook. Addon Builders can also contribute to their parent package's
 * build via the processParent() hook, allowing for purely build-related addons like denali-babel or
 * denali-typescript
 *
 * @export
 * @class Builder
 * @module denali-cli
 */
export default class Builder {
    [key: string]: any;
    /**
     * An internal cache that maps real disk locations to Builder instances. This lets us accurately
     * model the deeply nested and even circular dependencies of an app's addon graph, but take
     * advantage of npm/yarn flattening by only using one Builder instance per disk location.
     */
    static buildersCache: {
        [dir: string]: Builder;
    };
    /**
     * A factory method that checks for a local Builder class in `/denali-build.js`, and instantiates
     * that if present.
     */
    static createFor(dir: string, project: Project, preseededAddons?: string[]): Builder;
    /**
     * Denali automatically checks the Node Security Project for any vulnerabilities in your app's
     * dependencies. Sometimes it will pick up vulnerabilities that you want to ignore, i.e. a
     * vulnerability in a package that is only used at build time.
     *
     * This array defines a blacklist of vulnerabilities to ignore. Each entry is an array that
     * describes the path through the dependency graph. Any vulnerabilities from that point and
     * farther down the graph will be ignored.
     *
     * So for example, if your dependencies include:
     *
     *   foo@1.2.3
     *     bar@4.5.6
     *       buzz@7.8.9
     *
     * Then adding `[ 'foo', 'bar@~4.2.1' ]` would ignore any vulnerabilities from the "bar" package
     * (as long as the version of "bar" satisfied "~4.2.1"), as well as any vulnerabilities from
     * "buzz"
     */
    ignoreVulnerabilities: string[][];
    /**
     * A list of files that should be copied as-is into the final build
     */
    packageFiles: string[];
    /**
     * A list of directories that should be copied as-is into the final build
     */
    packageDirs: string[];
    /**
     * The directory containing the package that should be built.
     */
    dir: string;
    /**
     * The package.json for this package
     */
    pkg: any;
    /**
     * The Project instance that represents the root package being built
     */
    project: Project;
    /**
     * A list of directories containing addons that are children to this package
     */
    addons: PluginSummary[];
    /**
     * If true, when the root Project is built, it will create a child Project for this package,
     * which will watch for changes and trigger a rebuild of this package as well as the root Project.
     *
     * Warning: experimental and highly unstable
     */
    isDevelopingAddon: boolean;
    /**
     * Creates an instance of Builder for the given directory, as a child of the given Project. If
     * preseededAddons are supplied, they will be included as child addons of this Builder instance.
     */
    constructor(dir: string, project: Project, preseededAddons?: string[]);
    /**
     * Returns an array of top-level directories within this package that should go through the build
     * process. Note that top-level files cannot be built. You can include them (unbuilt) in the final
     * output via the `packageFiles` property; see https://github.com/broccolijs/broccoli/issues/173#issuecomment-47584836
     */
    sourceDirs(): string[];
    /**
     * Generic treeFor method that simply returns the supplied directory as is. You could override
     * this to customize the build process for all files.
     */
    treeFor(dir: string): string | Tree;
    /**
     * Compiles the base build tree which will be passed to the user-defined build hooks. Grabs all
     * the top-level directories to be built, runs the treeFor hooks on each, adds package files
     */
    private _prepareSelf();
    /**
     * An array of builder instances for child addons of this package
     */
    childBuilders: Builder[];
    /**
     * Modify the build of the parent package that is consuming this addon.
     *
     * @param tree the tree representing the parent package
     * @param dir the absolute path to the parent package source
     */
    processParent: (tree: Tree, dir: string) => Tree;
    /**
     * Modify this package's build
     *
     * @param tree the tree representing the package
     * @param dir the absolute path to the package source
     */
    processSelf: (tree: Tree, dir: string) => Tree;
    /**
     * Return a single broccoli tree that represents the completed build output for this package
     */
    toTree(): Tree;
}
