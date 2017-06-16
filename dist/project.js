"use strict";
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const fs = require("fs");
const path = require("path");
const dedent_js_1 = require("dedent-js");
const nsp = require("nsp");
const broccoli = require("broccoli");
const rimraf = require("rimraf");
const broccoli_slow_trees_1 = require("broccoli-slow-trees");
const copy_dereference_1 = require("copy-dereference");
const chalk = require("chalk");
const MergeTree = require("broccoli-merge-trees");
const Funnel = require("broccoli-funnel");
const createDebug = require("debug");
const tryRequire = require("try-require");
const semver = require("semver");
const builder_1 = require("./builder");
const watcher_1 = require("./watcher");
const ui_1 = require("./ui");
const spinner_1 = require("./spinner");
const timer_1 = require("./timer");
const debug = createDebug('denali-cli:project');
/**
 * The Project class represents the build process for the root directory. Denali packages are
 * composed of a root package, either an app or an addon, with a graph of addon dependencies below
 * that. Each node in the addon graph (along with the root app or addon) is represented by a
 * Builder instance, which is responsible for building that one node. The Project class coordinates
 * these builders, and produces the final output: a `dist/` folder ready to run.
 *
 * @module denali-cli
 */
class Project {
    /**
     * Creates an instance of Project
     */
    constructor(options = {}) {
        /**
         * An internal cache of builders, stored by their realpath on disk. This allows us to maintain
         * the logical deeply nested, possibly circular dependency graph, while only create a single
         * Builder per real disk location, so we avoid duplication and cycles.
         */
        this.builders = new Map();
        this.dir = options.dir || process.cwd();
        debug(`creating project for ${this.dir}`);
        this.environment = options.environment || 'development';
        this.printSlowTrees = options.printSlowTrees;
        this.pkg = require(path.join(this.dir, 'package.json'));
        this.lint = options.lint;
        this.audit = options.audit;
        this.buildDummy = options.buildDummy;
        this.pkg = require(path.join(this.dir, 'package.json'));
    }
    /**
     * Is this Project instance for an addon?
     */
    get isAddon() {
        return this.pkg.keywords && this.pkg.keywords.includes('denali-addon');
    }
    /**
     * Get the root builder and it's tree for this Project. Also returns the broccoli.Builder instance
     * based on the root tree
     */
    getBuilderAndTree() {
        let rootBuilder = this.rootBuilder = builder_1.default.createFor(this.dir, this);
        let rootTree = rootBuilder.toTree();
        if (this.isAddon && this.buildDummy) {
            rootTree = this.buildDummyTree(rootTree);
        }
        let broccoliBuilder = new broccoli.Builder(rootTree);
        // tslint:disable-next-line:completed-docs
        function onExit() {
            broccoliBuilder.cleanup();
            process.exit(1);
        }
        process.on('SIGINT', onExit);
        process.on('SIGTERM', onExit);
        debug(`building ${this.pkg.name}`);
        return {
            builder: rootBuilder,
            tree: rootTree,
            broccoliBuilder
        };
    }
    /**
     * Given the root tree for this project, return the dummy app's tree. This creates a Builder for
     * the dummy app itself, plus moves the addon's test suite into the dummy app's tree.
     */
    buildDummyTree(rootTree) {
        debug(`building ${this.pkg.name}'s dummy app`);
        let dummyBuilder = builder_1.default.createFor(path.join(this.dir, 'test', 'dummy'), this, [this.dir]);
        let dummyTree = dummyBuilder.toTree();
        let addonTests = new Funnel(rootTree, {
            include: ['test/**/*'],
            exclude: ['test/dummy/**/*']
        });
        rootTree = new Funnel(rootTree, {
            exclude: ['test/**/*'],
            destDir: path.join('node_modules', this.pkg.name)
        });
        return new MergeTree([rootTree, dummyTree, addonTests], { overwrite: true });
    }
    /**
     * Build the project and return a Promise that resolves with the output directory once the build
     * is complete.
     */
    build(outputDir = 'dist') {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            debug('building project');
            let { broccoliBuilder } = this.getBuilderAndTree();
            yield spinner_1.default.start(`Building ${this.pkg.name}`);
            let timer = timer_1.default();
            try {
                let results = yield broccoliBuilder.build();
                debug('broccoli build finished');
                this.finishBuild(results, outputDir);
                debug('build finalized');
                yield spinner_1.default.succeed(`${this.pkg.name} build complete (${timer.stop()}s)`);
            }
            catch (err) {
                yield spinner_1.default.fail('Build failed');
                if (err.file) {
                    ui_1.default.error(`File: ${err.file}`);
                }
                ui_1.default.error(err.stack);
                throw err;
            }
            finally {
                yield broccoliBuilder.cleanup();
            }
            return outputDir;
        });
    }
    /**
     * Build the project and start watching the source files for changes, rebuilding when they occur
     */
    watch(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            options.outputDir = options.outputDir || 'dist';
            options.onBuild = options.onBuild || lodash_1.noop;
            // Start watcher
            let timer = timer_1.default();
            let { broccoliBuilder, builder } = this.getBuilderAndTree();
            yield spinner_1.default.start(`Building ${this.pkg.name}`);
            let watcher = new watcher_1.default(broccoliBuilder, { beforeRebuild: options.beforeRebuild, interval: 100 });
            // Watch/build any child addons under development
            let inDevelopmentAddons = builder.childBuilders.filter((childBuilder) => {
                return childBuilder.isDevelopingAddon && fs.lstatSync(childBuilder.dir).isSymbolicLink();
            });
            // Don't finalize the first build until all the in-dev addons have built too
            options.onBuild = lodash_1.after(inDevelopmentAddons.length, options.onBuild);
            // Build the in-dev child addons
            inDevelopmentAddons.forEach((childBuilder) => {
                let addonDist = fs.realpathSync(childBuilder.dir);
                debug(`"${childBuilder.pkg.name}" (${addonDist}) addon is under development, creating a project to watch & compile it`);
                let addonPackageDir = path.dirname(addonDist);
                let addonProject = new Project({
                    environment: this.environment,
                    dir: addonPackageDir,
                    lint: this.lint,
                    audit: this.audit
                });
                addonProject.watch({ onBuild: options.onBuild, outputDir: addonDist });
            });
            let spinnerStart;
            // Handle watcher events
            watcher.on('buildstart', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                debug('changes detected, rebuilding');
                timer = timer_1.default();
                spinnerStart = spinner_1.default.start(`Building ${this.pkg.name}`);
                yield spinnerStart;
            }));
            watcher.on('change', (results) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                debug('rebuild finished, wrapping up');
                this.finishBuild(results, options.outputDir);
                yield spinnerStart;
                yield spinner_1.default.succeed(`${this.pkg.name} build complete (${timer.stop()}s)`);
                spinnerStart = null;
                options.onBuild(this);
            }));
            watcher.on('error', (error) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield spinner_1.default.fail('Build failed');
                if (error.file) {
                    if (error.line && error.column) {
                        ui_1.default.error(`File: ${error.treeDir}/${error.file}:${error.line}:${error.column}`);
                    }
                    else {
                        ui_1.default.error(`File: ${error.treeDir}/${error.file}`);
                    }
                }
                if (error.message) {
                    ui_1.default.error(`Error: ${error.message}`);
                }
                if (error.stack) {
                    ui_1.default.error(`Stack trace:\n${error.stack.replace(/(^.)/mg, '  $1')}`);
                }
            }));
        });
    }
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
    createApplication() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                let outputDir = yield this.build();
                let applicationPath = path.resolve(path.join(outputDir, 'app', 'application'));
                let Application = tryRequire(applicationPath);
                Application = Application.default || Application;
                if (!Application) {
                    throw new Error(`Denali was unable to load app/application.js from ${applicationPath}`);
                }
                return new Application({
                    dir: path.resolve(outputDir),
                    environment: this.environment
                });
            }
            catch (error) {
                ui_1.default.error(error.stack);
                throw error;
            }
        });
    }
    /**
     * After a build completes, this method cleans up the result. It copies the results out of tmp and
     * into the output directory, and kicks off any optional behaviors post-build.
     */
    finishBuild(results, outputDir) {
        // Copy the result out of broccoli tmp
        if (!path.isAbsolute(outputDir)) {
            outputDir = path.join(process.cwd(), outputDir);
        }
        rimraf.sync(outputDir);
        copy_dereference_1.sync(results.directory, outputDir);
        // Print slow build trees
        if (this.printSlowTrees) {
            broccoli_slow_trees_1.default(results.graph);
        }
        // Run an nsp audit on the package
        if (this.audit) {
            this.auditPackage();
        }
    }
    /**
     * Run the package.json through nsp to check for any security vulnerabilities, hiding any that
     * match the root builder's `ignoreVulnerabilities` array.
     */
    auditPackage() {
        let pkg = path.join(this.dir, 'package.json');
        nsp.check({ package: pkg }, (err, vulnerabilities) => {
            if (err && ['ENOTFOUND', 'ECONNRESET'].indexOf(err.code) > -1) {
                ui_1.default.warn('Error trying to scan package dependencies for vulnerabilities with nsp, unable to reach server. Skipping scan ...');
                ui_1.default.warn(err);
            }
            if (vulnerabilities && vulnerabilities.length > 0) {
                vulnerabilities = this.filterIgnoredVulnerabilities(vulnerabilities, this.rootBuilder.ignoreVulnerabilities);
                if (vulnerabilities.length > 0) {
                    ui_1.default.warn('WARNING: Some packages in your package.json may have security vulnerabilities:');
                    vulnerabilities.map(this.printVulnerability);
                }
            }
        });
    }
    /**
     * Filter the list of vulnerabilities by the ignored vulnerabilities passed in. Each ignore
     * pattern is an array of packages and versions, forming a path through the dependency graph. See
     * `Builder.ignoreVulnerabilities` for details.
     */
    filterIgnoredVulnerabilities(vulnerabilities, ignorePatterns) {
        return vulnerabilities.filter((vulnerability) => {
            return !ignorePatterns.find((ignorePattern) => {
                let ignorePatternStart = ignorePattern[0].split('@');
                let potentialMatch = lodash_1.dropWhile(vulnerability.path, (dependency) => {
                    let [name, version] = dependency.split('@');
                    return !(name === ignorePatternStart[0] && semver.satisfies(version, ignorePatternStart[1]));
                });
                let matchingSequence = lodash_1.takeWhile(potentialMatch, (dependency, i) => {
                    let [name, version] = dependency.split('@');
                    if (!ignorePattern[i]) {
                        return false;
                    }
                    let ignorePatternPart = ignorePattern[i].split('@');
                    return name === ignorePatternPart[0] && semver.satisfies(version, ignorePatternPart[1]);
                });
                return potentialMatch.length > 0 && matchingSequence.length === ignorePattern.length;
            });
        });
    }
    /**
     * Print out a humanized warning message for the given vulnerability.
     */
    printVulnerability(vulnerability) {
        let dependencyPath = vulnerability.path.join(' => ');
        let module = `*** ${vulnerability.module}@${vulnerability.version} ***`;
        let recommendation = (vulnerability.recommendation || '').replace(/\n/g, ' ');
        let message = dedent_js_1.default `${chalk.bold.yellow(module)}
                          Found in: ${dependencyPath}
                          Recommendation: ${chalk.reset.cyan(recommendation)}`;
        ui_1.default.warn(message);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Project;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBS2dCO0FBQ2hCLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IseUNBQStCO0FBQy9CLDJCQUEyQjtBQUMzQixxQ0FBcUM7QUFDckMsaUNBQWlDO0FBQ2pDLDZEQUFpRDtBQUNqRCx1REFBK0Q7QUFDL0QsK0JBQStCO0FBQy9CLGtEQUFrRDtBQUNsRCwwQ0FBMEM7QUFDMUMscUNBQXFDO0FBQ3JDLDBDQUEwQztBQUMxQyxpQ0FBaUM7QUFDakMsdUNBQTBDO0FBQzFDLHVDQUFnQztBQUNoQyw2QkFBc0I7QUFDdEIsdUNBQWdDO0FBQ2hDLG1DQUFpQztBQUVqQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQXdCaEQ7Ozs7Ozs7O0dBUUc7QUFDSDtJQWtERTs7T0FFRztJQUNILFlBQVksVUFBMEIsRUFBRTtRQW5EeEM7Ozs7V0FJRztRQUNJLGFBQVEsR0FBeUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQStDaEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN4QyxLQUFLLENBQUMsd0JBQXlCLElBQUksQ0FBQyxHQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSSxhQUFhLENBQUM7UUFDeEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQzdDLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN6QixJQUFJ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cm9wV2hpbGUsXG4gIHRha2VXaGlsZVxufSBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBkZWRlbnQgZnJvbSAnZGVkZW50LWpzJztcbmltcG9ydCAqIGFzIG5zcCBmcm9tICduc3AnO1xuaW1wb3J0ICogYXMgYnJvY2NvbGkgZnJvbSAnYnJvY2NvbGknO1xuaW1wb3J0ICogYXMgcmltcmFmIGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgcHJpbnRTbG93Tm9kZXMgZnJvbSAnYnJvY2NvbGktc2xvdy10cmVlcyc7XG5pbXBvcnQgeyBzeW5jIGFzIGNvcHlEZXJlZmVyZW5jZVN5bmMgfSBmcm9tICdjb3B5LWRlcmVmZXJlbmNlJztcbmltcG9ydCAqIGFzIGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIE1lcmdlVHJlZSBmcm9tICdicm9jY29saS1tZXJnZS10cmVlcyc7XG5pbXBvcnQgKiBhcyBGdW5uZWwgZnJvbSAnYnJvY2NvbGktZnVubmVsJztcbmltcG9ydCAqIGFzIGNyZWF0ZURlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIHRyeVJlcXVpcmUgZnJvbSAndHJ5LXJlcXVpcmUnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgQnVpbGRlciwgeyBUcmVlIH0gZnJvbSAnLi9idWlsZGVyJztcbmltcG9ydCBXYXRjaGVyIGZyb20gJy4vd2F0Y2hlcic7XG5pbXBvcnQgdWkgZnJvbSAnLi91aSc7XG5pbXBvcnQgc3Bpbm5lciBmcm9tICcuL3NwaW5uZXInO1xuaW1wb3J0IHN0YXJ0VGltZXIgZnJvbSAnLi90aW1lcic7XG5cbmNvbnN0IGRlYnVnID0gY3JlYXRlRGVidWcoJ2RlbmFsaS1jbGk6cHJvamVjdCcpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3RPcHRpb25zIHtcbiAgZGlyPzogc3RyaW5nO1xuICBlbnZpcm9ubWVudD86IHN0cmluZztcbiAgcHJpbnRTbG93VHJlZXM/OiBib29sZWFuO1xuICBsaW50PzogYm9vbGVhbjtcbiAgYXVkaXQ/OiBib29sZWFuO1xuICBidWlsZER1bW15PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaE9wdGlvbnMge1xuICBvdXRwdXREaXI6IHN0cmluZztcbiAgb25CdWlsZD8ocHJvamVjdDogUHJvamVjdCk6IHZvaWQ7XG4gIGJlZm9yZVJlYnVpbGQ/KCk6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZ1bG5lcmFiaWxpdHkge1xuICBwYXRoOiBzdHJpbmdbXTtcbiAgbW9kdWxlOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgcmVjb21tZW5kYXRpb246IHN0cmluZztcbn1cblxuLyoqXG4gKiBUaGUgUHJvamVjdCBjbGFzcyByZXByZXNlbnRzIHRoZSBidWlsZCBwcm9jZXNzIGZvciB0aGUgcm9vdCBkaXJlY3RvcnkuIERlbmFsaSBwYWNrYWdlcyBhcmVcbiAqIGNvbXBvc2VkIG9mIGEgcm9vdCBwYWNrYWdlLCBlaXRoZXIgYW4gYXBwIG9yIGFuIGFkZG9uLCB3aXRoIGEgZ3JhcGggb2YgYWRkb24gZGVwZW5kZW5jaWVzIGJlbG93XG4gKiB0aGF0LiBFYWNoIG5vZGUgaW4gdGhlIGFkZG9uIGdyYXBoIChhbG9uZyB3aXRoIHRoZSByb290IGFwcCBvciBhZGRvbikgaXMgcmVwcmVzZW50ZWQgYnkgYVxuICogQnVpbGRlciBpbnN0YW5jZSwgd2hpY2ggaXMgcmVzcG9uc2libGUgZm9yIGJ1aWxkaW5nIHRoYXQgb25lIG5vZGUuIFRoZSBQcm9qZWN0IGNsYXNzIGNvb3JkaW5hdGVzXG4gKiB0aGVzZSBidWlsZGVycywgYW5kIHByb2R1Y2VzIHRoZSBmaW5hbCBvdXRwdXQ6IGEgYGRpc3QvYCBmb2xkZXIgcmVhZHkgdG8gcnVuLlxuICpcbiAqIEBtb2R1bGUgZGVuYWxpLWNsaVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQcm9qZWN0IHtcblxuICAvKipcbiAgICogQW4gaW50ZXJuYWwgY2FjaGUgb2YgYnVpbGRlcnMsIHN0b3JlZCBieSB0aGVpciByZWFscGF0aCBvbiBkaXNrLiBUaGlzIGFsbG93cyB1cyB0byBtYWludGFpblxuICAgKiB0aGUgbG9naWNhbCBkZWVwbHkgbmVzdGVkLCBwb3NzaWJseSBjaXJjdWxhciBkZXBlbmRlbmN5IGdyYXBoLCB3aGlsZSBvbmx5IGNyZWF0ZSBhIHNpbmdsZVxuICAgKiBCdWlsZGVyIHBlciByZWFsIGRpc2sgbG9jYXRpb24sIHNvIHdlIGF2b2lkIGR1cGxpY2F0aW9uIGFuZCBjeWNsZXMuXG4gICAqL1xuICBwdWJsaWMgYnVpbGRlcnM6IE1hcDxzdHJpbmcsIEJ1aWxkZXI+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBkaXIgb2YgdGhlIHByb2plY3QncyBwYWNrYWdlXG4gICAqL1xuICBwdWJsaWMgZGlyOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBidWlsZCB0YXJnZXQgZW52aXJvbm1lbnQsIGRlZmF1bHRzIHRvICdkZXZlbG9wbWVudCdcbiAgICovXG4gIHB1YmxpYyBlbnZpcm9ubWVudDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTaG91bGQgd2UgcHJpbnQgc2xvdyBicm9jY29saSB0cmVlcyBvbiBidWlsZD9cbiAgICovXG4gIHB1YmxpYyBwcmludFNsb3dUcmVlczogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHBhY2thZ2UuanNvbiBmb3IgdGhpcyBwcm9qZWN0J3MgcGFja2FnZVxuICAgKi9cbiAgcHVibGljIHBrZzogYW55O1xuXG4gIC8qKlxuICAgKiBTaG91bGQgd2UgcnVuIGxpbnRpbmc/IFRoaXMgaXMgYW4gYWR2aXNvcnkgb25seSBmbGFnIGZvciBsaW50aW5nIGFkZG9ucyAtIGRlbmFsaS1jbGkgZG9lcyBub3RcbiAgICogZW5mb3JjZSB0aGlzLCBub3IgZG9lcyBpdCBoYXZlIGZpcnN0LWNsYXNzIGtub3dsZWRnZSBvZiBhZGRvbnMgdGhhdCBwZXJmb3JtIGxpbnRpbmcgb3Igbm90LlxuICAgKi9cbiAgcHVibGljIGxpbnQ6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNob3VsZCB3ZSBydW4gYW4gbnNwIGF1ZGl0IG9mIHRoZSBwcm9qZWN0J3MgZGVwZW5kZW5jaWVzPyBEZWZhdWx0cyB0byB0cnVlIGluIGRldmVsb3BtZW50XG4gICAqL1xuICBwdWJsaWMgYXVkaXQ6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNob3VsZCB3ZSBidWlsZCB0aGUgZHVtbXkgYXBwLCBhc3N1bWluZyB0aGlzIGlzIGFuIGFkZG9uL1xuICAgKi9cbiAgcHVibGljIGJ1aWxkRHVtbXk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSByb290IEJ1aWxkZXIgaW5zdGFuY2UgdGhhdCByZXByZXNlbnQncyB0aGUgUHJvamVjdCdzIG93biBwYWNrYWdlXG4gICAqL1xuICBwcm90ZWN0ZWQgcm9vdEJ1aWxkZXI6IEJ1aWxkZXI7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgUHJvamVjdFxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9uczogUHJvamVjdE9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuZGlyID0gb3B0aW9ucy5kaXIgfHwgcHJvY2Vzcy5jd2QoKTtcbiAgICBkZWJ1ZyhgY3JlYXRpbmcgcHJvamVjdCBmb3IgJHsgdGhpcy5kaXIgfWApO1xuICAgIHRoaXMuZW52aXJvbm1lbnQgPSBvcHRpb25zLmVudmlyb25tZW50IHx8ICdkZXZlbG9wbWVudCc7XG4gICAgdGhpcy5wcmludFNsb3dUcmVlcyA9IG9wdGlvbnMucHJpbnRTbG93VHJlZXM7XG4gICAgdGhpcy5wa2cgPSByZXF1aXJlKHBhdGguam9pbih0aGlzLmRpciwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICB0aGlzLmxpbnQgPSBvcHRpb25zLmxpbnQ7XG4gICAgdGhpcy5hdWRpdCA9IG9wdGlvbnMuYXVkaXQ7XG4gICAgdGhpcy5idWlsZER1bW15ID0gb3B0aW9ucy5idWlsZER1bW15O1xuICAgIHRoaXMucGtnID0gcmVxdWlyZShwYXRoLmpvaW4odGhpcy5kaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gIH1cblxuICAvKipcbiAgICogSXMgdGhpcyBQcm9qZWN0IGluc3RhbmNlIGZvciBhbiBhZGRvbj9cbiAgICovXG4gIHByb3RlY3RlZCBnZXQgaXNBZGRvbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wa2cua2V5d29yZHMgJiYgdGhpcy5wa2cua2V5d29yZHMuaW5jbHVkZXMoJ2RlbmFsaS1hZGRvbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcm9vdCBidWlsZGVyIGFuZCBpdCdzIHRyZWUgZm9yIHRoaXMgUHJvamVjdC4gQWxzbyByZXR1cm5zIHRoZSBicm9jY29saS5CdWlsZGVyIGluc3RhbmNlXG4gICAqIGJhc2VkIG9uIHRoZSByb290IHRyZWVcbiAgICovXG4gIHByb3RlY3RlZCBnZXRCdWlsZGVyQW5kVHJlZSgpOiB7IGJ1aWxkZXI6IEJ1aWxkZXIsIHRyZWU6IFRyZWUsIGJyb2Njb2xpQnVpbGRlcjogYW55IH0ge1xuICAgIGxldCByb290QnVpbGRlciA9IHRoaXMucm9vdEJ1aWxkZXIgPSBCdWlsZGVyLmNyZWF0ZUZvcih0aGlzLmRpciwgdGhpcyk7XG4gICAgbGV0IHJvb3RUcmVlID0gcm9vdEJ1aWxkZXIudG9UcmVlKCk7XG5cbiAgICBpZiAodGhpcy5pc0FkZG9uICYmIHRoaXMuYnVpbGREdW1teSkge1xuICAgICAgcm9vdFRyZWUgPSB0aGlzLmJ1aWxkRHVtbXlUcmVlKHJvb3RUcmVlKTtcbiAgICB9XG5cbiAgICBsZXQgYnJvY2NvbGlCdWlsZGVyID0gbmV3IGJyb2Njb2xpLkJ1aWxkZXIocm9vdFRyZWUpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpjb21wbGV0ZWQtZG9jc1xuICAgIGZ1bmN0aW9uIG9uRXhpdCgpIHtcbiAgICAgIGJyb2Njb2xpQnVpbGRlci5jbGVhbnVwKCk7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfVxuICAgIHByb2Nlc3Mub24oJ1NJR0lOVCcsIG9uRXhpdCk7XG4gICAgcHJvY2Vzcy5vbignU0lHVEVSTScsIG9uRXhpdCk7XG5cbiAgICBkZWJ1ZyhgYnVpbGRpbmcgJHsgdGhpcy5wa2cubmFtZSB9YCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1aWxkZXI6IHJvb3RCdWlsZGVyLFxuICAgICAgdHJlZTogcm9vdFRyZWUsXG4gICAgICBicm9jY29saUJ1aWxkZXJcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIHRoZSByb290IHRyZWUgZm9yIHRoaXMgcHJvamVjdCwgcmV0dXJuIHRoZSBkdW1teSBhcHAncyB0cmVlLiBUaGlzIGNyZWF0ZXMgYSBCdWlsZGVyIGZvclxuICAgKiB0aGUgZHVtbXkgYXBwIGl0c2VsZiwgcGx1cyBtb3ZlcyB0aGUgYWRkb24ncyB0ZXN0IHN1aXRlIGludG8gdGhlIGR1bW15IGFwcCdzIHRyZWUuXG4gICAqL1xuICBwcm90ZWN0ZWQgYnVpbGREdW1teVRyZWUocm9vdFRyZWU6IFRyZWUpOiBUcmVlIHtcbiAgICBkZWJ1ZyhgYnVpbGRpbmcgJHsgdGhpcy5wa2cubmFtZSB9J3MgZHVtbXkgYXBwYCk7XG4gICAgbGV0IGR1bW15QnVpbGRlciA9IEJ1aWxkZXIuY3JlYXRlRm9yKHBhdGguam9pbih0aGlzLmRpciwgJ3Rlc3QnLCAnZHVtbXknKSwgdGhpcywgWyB0aGlzLmRpciBdKTtcbiAgICBsZXQgZHVtbXlUcmVlID0gZHVtbXlCdWlsZGVyLnRvVHJlZSgpO1xuICAgIGxldCBhZGRvblRlc3RzID0gbmV3IEZ1bm5lbChyb290VHJlZSwge1xuICAgICAgaW5jbHVkZTogWyAndGVzdC8qKi8qJyBdLFxuICAgICAgZXhjbHVkZTogWyAndGVzdC9kdW1teS8qKi8qJyBdXG4gICAgfSk7XG4gICAgcm9vdFRyZWUgPSBuZXcgRnVubmVsKHJvb3RUcmVlLCB7XG4gICAgICBleGNsdWRlOiBbICd0ZXN0LyoqLyonIF0sXG4gICAgICBkZXN0RGlyOiBwYXRoLmpvaW4oJ25vZGVfbW9kdWxlcycsIHRoaXMucGtnLm5hbWUpXG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBNZXJnZVRyZWUoWyByb290VHJlZSwgZHVtbXlUcmVlLCBhZGRvblRlc3RzIF0sIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkIHRoZSBwcm9qZWN0IGFuZCByZXR1cm4gYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgb3V0cHV0IGRpcmVjdG9yeSBvbmNlIHRoZSBidWlsZFxuICAgKiBpcyBjb21wbGV0ZS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBidWlsZChvdXRwdXREaXI6IHN0cmluZyA9ICdkaXN0Jyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgZGVidWcoJ2J1aWxkaW5nIHByb2plY3QnKTtcbiAgICBsZXQgeyBicm9jY29saUJ1aWxkZXIgfSA9IHRoaXMuZ2V0QnVpbGRlckFuZFRyZWUoKTtcbiAgICBhd2FpdCBzcGlubmVyLnN0YXJ0KGBCdWlsZGluZyAkeyB0aGlzLnBrZy5uYW1lIH1gKTtcbiAgICBsZXQgdGltZXIgPSBzdGFydFRpbWVyKCk7XG4gICAgdHJ5IHtcbiAgICAgIGxldCByZXN1bHRzID0gYXdhaXQgYnJvY2NvbGlCdWlsZGVyLmJ1aWxkKCk7XG4gICAgICBkZWJ1ZygnYnJvY2NvbGkgYnVpbGQgZmluaXNoZWQnKTtcbiAgICAgIHRoaXMuZmluaXNoQnVpbGQocmVzdWx0cywgb3V0cHV0RGlyKTtcbiAgICAgIGRlYnVnKCdidWlsZCBmaW5hbGl6ZWQnKTtcbiAgICAgIGF3YWl0IHNwaW5uZXIuc3VjY2VlZChgJHsgdGhpcy5wa2cubmFtZSB9IGJ1aWxkIGNvbXBsZXRlICgkeyB0aW1lci5zdG9wKCkgfXMpYCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBhd2FpdCBzcGlubmVyLmZhaWwoJ0J1aWxkIGZhaWxlZCcpO1xuICAgICAgaWYgKGVyci5maWxlKSB7XG4gICAgICAgIHVpLmVycm9yKGBGaWxlOiAkeyBlcnIuZmlsZSB9YCk7XG4gICAgICB9XG4gICAgICB1aS5lcnJvcihlcnIuc3RhY2spO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBicm9jY29saUJ1aWxkZXIuY2xlYW51cCgpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0RGlyO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkIHRoZSBwcm9qZWN0IGFuZCBzdGFydCB3YXRjaGluZyB0aGUgc291cmNlIGZpbGVzIGZvciBjaGFuZ2VzLCByZWJ1aWxkaW5nIHdoZW4gdGhleSBvY2N1clxuICAgKi9cbiAgcHVibGljIGFzeW5jIHdhdGNoKG9wdGlvbnM6IFdhdGNoT3B0aW9ucykge1xuICAgIG9wdGlvbnMub3V0cHV0RGlyID0gb3B0aW9ucy5vdXRwdXREaXIgfHwgJ2Rpc3QnO1xuICAgIG9wdGlvbnMub25CdWlsZCA9IG9wdGlvbnMub25CdWlsZCB8fCBub29wO1xuICAgIC8vIFN0YXJ0IHdhdGNoZXJcbiAgICBsZXQgdGltZXIgPSBzdGFydFRpbWVyKCk7XG4gICAgbGV0IHsgYnJvY2NvbGlCdWlsZGVyLCBidWlsZGVyIH0gPSB0aGlzLmdldEJ1aWxkZXJBbmRUcmVlKCk7XG4gICAgYXdhaXQgc3Bpbm5lci5zdGFydChgQnVpbGRpbmcgJHsgdGhpcy5wa2cubmFtZSB9YCk7XG4gICAgbGV0IHdhdGNoZXIgPSBuZXcgV2F0Y2hlcihicm9jY29saUJ1aWxkZXIsIHsgYmVmb3JlUmVidWlsZDogb3B0aW9ucy5iZWZvcmVSZWJ1aWxkLCBpbnRlcnZhbDogMTAwIH0pO1xuXG4gICAgLy8gV2F0Y2gvYnVpbGQgYW55IGNoaWxkIGFkZG9ucyB1bmRlciBkZXZlbG9wbWVudFxuICAgIGxldCBpbkRldmVsb3BtZW50QWRkb25zID0gYnVpbGRlci5jaGlsZEJ1aWxkZXJzLmZpbHRlcigoY2hpbGRCdWlsZGVyKSA9PiB7XG4gICAgICByZXR1cm4gY2hpbGRCdWlsZGVyLmlzRGV2ZWxvcGluZ0FkZG9uICYmIGZzLmxzdGF0U3luYyhjaGlsZEJ1aWxkZXIuZGlyKS5pc1N5bWJvbGljTGluaygpO1xuICAgIH0pO1xuICAgIC8vIERvbid0IGZpbmFsaXplIHRoZSBmaXJzdCBidWlsZCB1bnRpbCBhbGwgdGhlIGluLWRldiBhZGRvbnMgaGF2ZSBidWlsdCB0b29cbiAgICBvcHRpb25zLm9uQnVpbGQgPSBhZnRlcihpbkRldmVsb3BtZW50QWRkb25zLmxlbmd0aCwgb3B0aW9ucy5vbkJ1aWxkKTtcbiAgICAvLyBCdWlsZCB0aGUgaW4tZGV2IGNoaWxkIGFkZG9uc1xuICAgIGluRGV2ZWxvcG1lbnRBZGRvbnMuZm9yRWFjaCgoY2hpbGRCdWlsZGVyKSA9PiB7XG4gICAgICBsZXQgYWRkb25EaXN0ID0gZnMucmVhbHBhdGhTeW5jKGNoaWxkQnVpbGRlci5kaXIpO1xuICAgICAgZGVidWcoYFwiJHsgY2hpbGRCdWlsZGVyLnBrZy5uYW1lIH1cIiAoJHsgYWRkb25EaXN0IH0pIGFkZG9uIGlzIHVuZGVyIGRldmVsb3BtZW50LCBjcmVhdGluZyBhIHByb2plY3QgdG8gd2F0Y2ggJiBjb21waWxlIGl0YCk7XG4gICAgICBsZXQgYWRkb25QYWNrYWdlRGlyID0gcGF0aC5kaXJuYW1lKGFkZG9uRGlzdCk7XG4gICAgICBsZXQgYWRkb25Qcm9qZWN0ID0gbmV3IFByb2plY3Qoe1xuICAgICAgICBlbnZpcm9ubWVudDogdGhpcy5lbnZpcm9ubWVudCxcbiAgICAgICAgZGlyOiBhZGRvblBhY2thZ2VEaXIsXG4gICAgICAgIGxpbnQ6IHRoaXMubGludCxcbiAgICAgICAgYXVkaXQ6IHRoaXMuYXVkaXRcbiAgICAgIH0pO1xuICAgICAgYWRkb25Qcm9qZWN0LndhdGNoKHsgb25CdWlsZDogb3B0aW9ucy5vbkJ1aWxkLCBvdXRwdXREaXI6IGFkZG9uRGlzdCB9KTtcbiAgICB9KTtcblxuICAgIGxldCBzcGlubmVyU3RhcnQ6IFByb21pc2U8dm9pZD47XG5cbiAgICAvLyBIYW5kbGUgd2F0Y2hlciBldmVudHNcbiAgICB3YXRjaGVyLm9uKCdidWlsZHN0YXJ0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGVidWcoJ2NoYW5nZXMgZGV0ZWN0ZWQsIHJlYnVpbGRpbmcnKTtcbiAgICAgIHRpbWVyID0gc3RhcnRUaW1lcigpO1xuICAgICAgc3Bpbm5lclN0YXJ0ID0gc3Bpbm5lci5zdGFydChgQnVpbGRpbmcgJHsgdGhpcy5wa2cubmFtZSB9YCk7XG4gICAgICBhd2FpdCBzcGlubmVyU3RhcnQ7XG4gICAgfSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgYXN5bmMgKHJlc3VsdHM6IHsgZGlyZWN0b3J5OiBzdHJpbmcsIGdyYXBoOiBhbnkgfSkgPT4ge1xuICAgICAgZGVidWcoJ3JlYnVpbGQgZmluaXNoZWQsIHdyYXBwaW5nIHVwJyk7XG4gICAgICB0aGlzLmZpbmlzaEJ1aWxkKHJlc3VsdHMsIG9wdGlvbnMub3V0cHV0RGlyKTtcbiAgICAgIGF3YWl0IHNwaW5uZXJTdGFydDtcbiAgICAgIGF3YWl0IHNwaW5uZXIuc3VjY2VlZChgJHsgdGhpcy5wa2cubmFtZSB9IGJ1aWxkIGNvbXBsZXRlICgkeyB0aW1lci5zdG9wKCkgfXMpYCk7XG4gICAgICBzcGlubmVyU3RhcnQgPSBudWxsO1xuICAgICAgb3B0aW9ucy5vbkJ1aWxkKHRoaXMpO1xuICAgIH0pO1xuICAgIHdhdGNoZXIub24oJ2Vycm9yJywgYXN5bmMgKGVycm9yOiBhbnkpID0+IHtcbiAgICAgIGF3YWl0IHNwaW5uZXIuZmFpbCgnQnVpbGQgZmFpbGVkJyk7XG4gICAgICBpZiAoZXJyb3IuZmlsZSkge1xuICAgICAgICBpZiAoZXJyb3IubGluZSAmJiBlcnJvci5jb2x1bW4pIHtcbiAgICAgICAgICB1aS5lcnJvcihgRmlsZTogJHsgZXJyb3IudHJlZURpciB9LyR7IGVycm9yLmZpbGUgfTokeyBlcnJvci5saW5lIH06JHsgZXJyb3IuY29sdW1uIH1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1aS5lcnJvcihgRmlsZTogJHsgZXJyb3IudHJlZURpciB9LyR7IGVycm9yLmZpbGUgfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZXJyb3IubWVzc2FnZSkge1xuICAgICAgICB1aS5lcnJvcihgRXJyb3I6ICR7IGVycm9yLm1lc3NhZ2UgfWApO1xuICAgICAgfVxuICAgICAgaWYgKGVycm9yLnN0YWNrKSB7XG4gICAgICAgIHVpLmVycm9yKGBTdGFjayB0cmFjZTpcXG4keyBlcnJvci5zdGFjay5yZXBsYWNlKC8oXi4pL21nLCAnICAkMScpIH1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZCB0aGUgcHJvamVjdCBhbmQgY3JlYXRlIGFuIGFwcGxpY2F0aW9uIGluc3RhbmNlIGZvciB0aGlzIGFwcC4gVXNlZnVsIGlmIHlvdSB3YW50IHRvXG4gICAqIHBlcmZvcm0gYWN0aW9ucyBiYXNlZCBvbiB0aGUgcnVudGltZSBzdGF0ZSBvZiB0aGUgYXBwbGljYXRpb24sIGkuZS4gcHJpbnQgYSBsaXN0IG9mIHJvdXRlcy5cbiAgICpcbiAgICogTm90ZTogd2UgZG9uJ3QgdHlwZSB0aGUgcmV0dXJuIGhlcmUgYXMgUHJvbWlzZTxBcHBsaWNhdGlvbj4gaW4gdGhlIGNvZGUgYmVjYXVzZSB0aGF0IHdvdWxkXG4gICAqIGludHJvZHVjZSBhIGhvcm5ldCdzIG5lc3Qgb2YgY2lyY3VsYXIgZGVwZW5kZW5jeSAoaS5lLiBkZW5hbGktY2xpIC0+IGRlbmFsaSAtPiBkZW5hbGktY2xpIC4uLikuXG4gICAqIEJ1dCB0aGUgZG9jdW1lbnRhdGlvbiBpcyBjb3JyZWN0IGhlcmUgLSB0aGUgcmVzb2x2ZWQgdmFsdWUgb2YgdGhlIHByb21pc2UgaXMgYW4gQXBwbGNpYXRpb25cbiAgICogaW5zdGFuY2UuIEFuZCBjb25zdW1pbmcgYXBwcy9hZGRvbnMgYWxyZWFkeSBoYXZlIGEgZGVwZW5kZW5jeSBvbiBkZW5hbGksIHNvIHRoZXkgY2FuIGNhc3QgdGhlXG4gICAqIHJldHVybiB2YWx1ZSBoZXJlIHRvIGFuIEFwcGxpY2F0aW9uLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGNyZWF0ZUFwcGxpY2F0aW9uKCk6IFByb21pc2U8YW55PiB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCBvdXRwdXREaXIgPSBhd2FpdCB0aGlzLmJ1aWxkKCk7XG4gICAgICBsZXQgYXBwbGljYXRpb25QYXRoID0gcGF0aC5yZXNvbHZlKHBhdGguam9pbihvdXRwdXREaXIsICdhcHAnLCAnYXBwbGljYXRpb24nKSk7XG4gICAgICBsZXQgQXBwbGljYXRpb24gPSB0cnlSZXF1aXJlKGFwcGxpY2F0aW9uUGF0aCk7XG4gICAgICBBcHBsaWNhdGlvbiA9IEFwcGxpY2F0aW9uLmRlZmF1bHQgfHwgQXBwbGljYXRpb247XG4gICAgICBpZiAoIUFwcGxpY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRGVuYWxpIHdhcyB1bmFibGUgdG8gbG9hZCBhcHAvYXBwbGljYXRpb24uanMgZnJvbSAkeyBhcHBsaWNhdGlvblBhdGggfWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBcHBsaWNhdGlvbih7XG4gICAgICAgIGRpcjogcGF0aC5yZXNvbHZlKG91dHB1dERpciksXG4gICAgICAgIGVudmlyb25tZW50OiB0aGlzLmVudmlyb25tZW50XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdWkuZXJyb3IoZXJyb3Iuc3RhY2spO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFmdGVyIGEgYnVpbGQgY29tcGxldGVzLCB0aGlzIG1ldGhvZCBjbGVhbnMgdXAgdGhlIHJlc3VsdC4gSXQgY29waWVzIHRoZSByZXN1bHRzIG91dCBvZiB0bXAgYW5kXG4gICAqIGludG8gdGhlIG91dHB1dCBkaXJlY3RvcnksIGFuZCBraWNrcyBvZmYgYW55IG9wdGlvbmFsIGJlaGF2aW9ycyBwb3N0LWJ1aWxkLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbmlzaEJ1aWxkKHJlc3VsdHM6IHsgZGlyZWN0b3J5OiBzdHJpbmcsIGdyYXBoOiBhbnkgfSwgb3V0cHV0RGlyOiBzdHJpbmcpIHtcbiAgICAvLyBDb3B5IHRoZSByZXN1bHQgb3V0IG9mIGJyb2Njb2xpIHRtcFxuICAgIGlmICghcGF0aC5pc0Fic29sdXRlKG91dHB1dERpcikpIHtcbiAgICAgIG91dHB1dERpciA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBvdXRwdXREaXIpO1xuICAgIH1cbiAgICByaW1yYWYuc3luYyhvdXRwdXREaXIpO1xuICAgIGNvcHlEZXJlZmVyZW5jZVN5bmMocmVzdWx0cy5kaXJlY3RvcnksIG91dHB1dERpcik7XG5cbiAgICAvLyBQcmludCBzbG93IGJ1aWxkIHRyZWVzXG4gICAgaWYgKHRoaXMucHJpbnRTbG93VHJlZXMpIHtcbiAgICAgIHByaW50U2xvd05vZGVzKHJlc3VsdHMuZ3JhcGgpO1xuICAgIH1cblxuICAgIC8vIFJ1biBhbiBuc3AgYXVkaXQgb24gdGhlIHBhY2thZ2VcbiAgICBpZiAodGhpcy5hdWRpdCkge1xuICAgICAgdGhpcy5hdWRpdFBhY2thZ2UoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBwYWNrYWdlLmpzb24gdGhyb3VnaCBuc3AgdG8gY2hlY2sgZm9yIGFueSBzZWN1cml0eSB2dWxuZXJhYmlsaXRpZXMsIGhpZGluZyBhbnkgdGhhdFxuICAgKiBtYXRjaCB0aGUgcm9vdCBidWlsZGVyJ3MgYGlnbm9yZVZ1bG5lcmFiaWxpdGllc2AgYXJyYXkuXG4gICAqL1xuICBwcm90ZWN0ZWQgYXVkaXRQYWNrYWdlKCkge1xuICAgIGxldCBwa2cgPSBwYXRoLmpvaW4odGhpcy5kaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBuc3AuY2hlY2soeyBwYWNrYWdlOiBwa2cgfSwgKGVycjogYW55LCB2dWxuZXJhYmlsaXRpZXM6IFZ1bG5lcmFiaWxpdHlbXSkgPT4ge1xuICAgICAgaWYgKGVyciAmJiBbICdFTk9URk9VTkQnLCAnRUNPTk5SRVNFVCcgXS5pbmRleE9mKGVyci5jb2RlKSA+IC0xKSB7XG4gICAgICAgIHVpLndhcm4oJ0Vycm9yIHRyeWluZyB0byBzY2FuIHBhY2thZ2UgZGVwZW5kZW5jaWVzIGZvciB2dWxuZXJhYmlsaXRpZXMgd2l0aCBuc3AsIHVuYWJsZSB0byByZWFjaCBzZXJ2ZXIuIFNraXBwaW5nIHNjYW4gLi4uJyk7XG4gICAgICAgIHVpLndhcm4oZXJyKTtcbiAgICAgIH1cbiAgICAgIGlmICh2dWxuZXJhYmlsaXRpZXMgJiYgdnVsbmVyYWJpbGl0aWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdnVsbmVyYWJpbGl0aWVzID0gdGhpcy5maWx0ZXJJZ25vcmVkVnVsbmVyYWJpbGl0aWVzKHZ1bG5lcmFiaWxpdGllcywgdGhpcy5yb290QnVpbGRlci5pZ25vcmVWdWxuZXJhYmlsaXRpZXMpO1xuICAgICAgICBpZiAodnVsbmVyYWJpbGl0aWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB1aS53YXJuKCdXQVJOSU5HOiBTb21lIHBhY2thZ2VzIGluIHlvdXIgcGFja2FnZS5qc29uIG1heSBoYXZlIHNlY3VyaXR5IHZ1bG5lcmFiaWxpdGllczonKTtcbiAgICAgICAgICB2dWxuZXJhYmlsaXRpZXMubWFwKHRoaXMucHJpbnRWdWxuZXJhYmlsaXR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbHRlciB0aGUgbGlzdCBvZiB2dWxuZXJhYmlsaXRpZXMgYnkgdGhlIGlnbm9yZWQgdnVsbmVyYWJpbGl0aWVzIHBhc3NlZCBpbi4gRWFjaCBpZ25vcmVcbiAgICogcGF0dGVybiBpcyBhbiBhcnJheSBvZiBwYWNrYWdlcyBhbmQgdmVyc2lvbnMsIGZvcm1pbmcgYSBwYXRoIHRocm91Z2ggdGhlIGRlcGVuZGVuY3kgZ3JhcGguIFNlZVxuICAgKiBgQnVpbGRlci5pZ25vcmVWdWxuZXJhYmlsaXRpZXNgIGZvciBkZXRhaWxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbHRlcklnbm9yZWRWdWxuZXJhYmlsaXRpZXModnVsbmVyYWJpbGl0aWVzOiBWdWxuZXJhYmlsaXR5W10sIGlnbm9yZVBhdHRlcm5zOiBzdHJpbmdbXVtdKTogVnVsbmVyYWJpbGl0eVtdIHtcbiAgICByZXR1cm4gdnVsbmVyYWJpbGl0aWVzLmZpbHRlcigodnVsbmVyYWJpbGl0eSkgPT4ge1xuICAgICAgcmV0dXJuICFpZ25vcmVQYXR0ZXJucy5maW5kKChpZ25vcmVQYXR0ZXJuKSA9PiB7XG4gICAgICAgIGxldCBpZ25vcmVQYXR0ZXJuU3RhcnQgPSBpZ25vcmVQYXR0ZXJuWzBdLnNwbGl0KCdAJyk7XG4gICAgICAgIGxldCBwb3RlbnRpYWxNYXRjaCA9IGRyb3BXaGlsZSh2dWxuZXJhYmlsaXR5LnBhdGgsIChkZXBlbmRlbmN5OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICBsZXQgWyBuYW1lLCB2ZXJzaW9uIF0gPSBkZXBlbmRlbmN5LnNwbGl0KCdAJyk7XG4gICAgICAgICAgcmV0dXJuICEobmFtZSA9PT0gaWdub3JlUGF0dGVyblN0YXJ0WzBdICYmIHNlbXZlci5zYXRpc2ZpZXModmVyc2lvbiwgaWdub3JlUGF0dGVyblN0YXJ0WzFdKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgbWF0Y2hpbmdTZXF1ZW5jZSA9IHRha2VXaGlsZShwb3RlbnRpYWxNYXRjaCwgKGRlcGVuZGVuY3ksIGkpID0+IHtcbiAgICAgICAgICBsZXQgWyBuYW1lLCB2ZXJzaW9uIF0gPSBkZXBlbmRlbmN5LnNwbGl0KCdAJyk7XG4gICAgICAgICAgaWYgKCFpZ25vcmVQYXR0ZXJuW2ldKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBpZ25vcmVQYXR0ZXJuUGFydCA9IGlnbm9yZVBhdHRlcm5baV0uc3BsaXQoJ0AnKTtcbiAgICAgICAgICByZXR1cm4gbmFtZSA9PT0gaWdub3JlUGF0dGVyblBhcnRbMF0gJiYgc2VtdmVyLnNhdGlzZmllcyh2ZXJzaW9uLCBpZ25vcmVQYXR0ZXJuUGFydFsxXSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcG90ZW50aWFsTWF0Y2gubGVuZ3RoID4gMCAmJiBtYXRjaGluZ1NlcXVlbmNlLmxlbmd0aCA9PT0gaWdub3JlUGF0dGVybi5sZW5ndGg7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmludCBvdXQgYSBodW1hbml6ZWQgd2FybmluZyBtZXNzYWdlIGZvciB0aGUgZ2l2ZW4gdnVsbmVyYWJpbGl0eS5cbiAgICovXG4gIHByb3RlY3RlZCBwcmludFZ1bG5lcmFiaWxpdHkodnVsbmVyYWJpbGl0eTogVnVsbmVyYWJpbGl0eSkge1xuICAgIGxldCBkZXBlbmRlbmN5UGF0aCA9IHZ1bG5lcmFiaWxpdHkucGF0aC5qb2luKCcgPT4gJyk7XG4gICAgbGV0IG1vZHVsZSA9IGAqKiogJHsgdnVsbmVyYWJpbGl0eS5tb2R1bGUgfUAkeyB2dWxuZXJhYmlsaXR5LnZlcnNpb24gfSAqKipgO1xuICAgIGxldCByZWNvbW1lbmRhdGlvbiA9ICh2dWxuZXJhYmlsaXR5LnJlY29tbWVuZGF0aW9uIHx8ICcnKS5yZXBsYWNlKC9cXG4vZywgJyAnKTtcbiAgICBsZXQgbWVzc2FnZSA9IGRlZGVudGAkeyBjaGFsay5ib2xkLnllbGxvdyhtb2R1bGUpIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgRm91bmQgaW46ICR7IGRlcGVuZGVuY3lQYXRoIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVjb21tZW5kYXRpb246ICR7IGNoYWxrLnJlc2V0LmN5YW4ocmVjb21tZW5kYXRpb24pIH1gO1xuICAgIHVpLndhcm4obWVzc2FnZSk7XG4gIH1cblxufVxuIl19