import Builder, { Tree } from './builder';
export interface ProjectOptions {
    dir?: string;
    environment?: string;
    printSlowTrees?: boolean;
    lint?: boolean;
    audit?: boolean;
    buildDummy?: boolean;
}
export interface WatchOptions {
    outputDir: string;
    onBuild?(project: Project): void;
    beforeRebuild?(): Promise<void> | void;
}
export interface Vulnerability {
    path: string[];
    module: string;
    version: string;
    recommendation: string;
}
/**
 * The Project class represents the build process for the root directory. Denali packages are
 * composed of a root package, either an app or an addon, with a graph of addon dependencies below
 * that. Each node in the addon graph (along with the root app or addon) is represented by a
 * Builder instance, which is responsible for building that one node. The Project class coordinates
 * these builders, and produces the final output: a `dist/` folder ready to run.
 *
 * @module denali-cli
 */
export default class Project {
    /**
     * An internal cache of builders, stored by their realpath on disk. This allows us to maintain
     * the logical deeply nested, possibly circular dependency graph, while only create a single
     * Builder per real disk location, so we avoid duplication and cycles.
     */
    builders: Map<string, Builder>;
    /**
     * The root dir of the project's package
     */
    dir: string;
    /**
     * The build target environment, defaults to 'development'
     */
    environment: string;
    /**
     * Should we print slow broccoli trees on build?
     */
    printSlowTrees: boolean;
    /**
     * The package.json for this project's package
     */
    pkg: any;
    /**
     * Should we run linting? This is an advisory only flag for linting addons - denali-cli does not
     * enforce this, nor does it have first-class knowledge of addons that perform linting or not.
     */
    lint: boolean;
    /**
     * Should we run an nsp audit of the project's dependencies? Defaults to true in development
     */
    audit: boolean;
    /**
     * Should we build the dummy app, assuming this is an addon/
     */
    buildDummy: boolean;
    /**
     * The root Builder instance that represent's the Project's own package
     */
    protected rootBuilder: Builder;
    /**
     * Creates an instance of Project
     */
    constructor(options?: ProjectOptions);
    /**
     * Is this Project instance for an addon?
     */
    protected readonly isAddon: boolean;
    /**
     * Get the root builder and it's tree for this Project. Also returns the broccoli.Builder instance
     * based on the root tree
     */
    protected getBuilderAndTree(): {
        builder: Builder;
        tree: Tree;
        broccoliBuilder: any;
    };
    /**
     * Given the root tree for this project, return the dummy app's tree. This creates a Builder for
     * the dummy app itself, plus moves the addon's test suite into the dummy app's tree.
     */
    protected buildDummyTree(rootTree: Tree): Tree;
    /**
     * Build the project and return a Promise that resolves with the output directory once the build
     * is complete.
     */
    build(outputDir?: string): Promise<string>;
    /**
     * Build the project and start watching the source files for changes, rebuilding when they occur
     */
    watch(options: WatchOptions): Promise<void>;
    /**
     * Build the project and create an application instance for this app. Useful if you want to
     * perform actions based on the runtime state of the application, i.e. print a list of routes.
     *
     * Note: we don't type the return here as Promise<Application> in the code because that would
     * introduce a hornet's nest of circular dependency (i.e. denali-cli -> denali -> denali-cli ...).
     * But the documentation is correct here - the resolved value of the promise is an Applciation
     * instance. And consuming apps/addons already have a dependency on denali, so they can cast the
     * return value here to an Application.
     */
    createApplication(): Promise<any>;
    /**
     * After a build completes, this method cleans up the result. It copies the results out of tmp and
     * into the output directory, and kicks off any optional behaviors post-build.
     */
    protected finishBuild(results: {
        directory: string;
        graph: any;
    }, outputDir: string): void;
    /**
     * Run the package.json through nsp to check for any security vulnerabilities, hiding any that
     * match the root builder's `ignoreVulnerabilities` array.
     */
    protected auditPackage(): void;
    /**
     * Filter the list of vulnerabilities by the ignored vulnerabilities passed in. Each ignore
     * pattern is an array of packages and versions, forming a path through the dependency graph. See
     * `Builder.ignoreVulnerabilities` for details.
     */
    protected filterIgnoredVulnerabilities(vulnerabilities: Vulnerability[], ignorePatterns: string[][]): Vulnerability[];
    /**
     * Print out a humanized warning message for the given vulnerability.
     */
    protected printVulnerability(vulnerability: Vulnerability): void;
}
