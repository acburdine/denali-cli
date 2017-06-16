"use strict";
const lodash_1 = require("lodash");
const fs = require("fs");
const path = require("path");
const Funnel = require("broccoli-funnel");
const MergeTree = require("broccoli-merge-trees");
const package_tree_1 = require("./package-tree");
const createDebug = require("debug");
const find_plugins_1 = require("find-plugins");
const debug = createDebug('denali-cli:builder');
;
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
class Builder {
    /**
     * Creates an instance of Builder for the given directory, as a child of the given Project. If
     * preseededAddons are supplied, they will be included as child addons of this Builder instance.
     */
    constructor(dir, project, preseededAddons) {
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
        this.ignoreVulnerabilities = [
            ['broccoli@*'],
            ['jscodeshift@*']
        ];
        /**
         * A list of files that should be copied as-is into the final build
         */
        this.packageFiles = [
            'package.json',
            'README.md',
            'CHANGELOG.md',
            'LICENSE',
            'denali-build.js',
            'yarn.lock'
        ];
        /**
         * A list of directories that should be copied as-is into the final build
         */
        this.packageDirs = [];
        /**
         * If true, when the root Project is built, it will create a child Project for this package,
         * which will watch for changes and trigger a rebuild of this package as well as the root Project.
         *
         * Warning: experimental and highly unstable
         */
        this.isDevelopingAddon = false;
        debug(`creating builder for ./${path.relative(project.dir, dir)}`);
        this.dir = dir;
        this.pkg = require(path.join(this.dir, 'package.json'));
        this.project = project;
        this.addons = find_plugins_1.default({
            dir: this.dir,
            keyword: 'denali-addon',
            sort: true,
            includeDev: true,
            configName: 'denali',
            include: preseededAddons
        });
    }
    /**
     * A factory method that checks for a local Builder class in `/denali-build.js`, and instantiates
     * that if present.
     */
    static createFor(dir, project, preseededAddons) {
        if (!this.buildersCache[dir]) {
            // Use the local denali-build.js if present
            let denaliBuildPath = path.join(dir, 'denali-build');
            if (fs.existsSync(`${denaliBuildPath}.js`)) {
                let LocalBuilder = require(denaliBuildPath);
                LocalBuilder = LocalBuilder.default || LocalBuilder;
                this.buildersCache[dir] = new LocalBuilder(dir, project, preseededAddons);
            }
            else {
                this.buildersCache[dir] = new this(dir, project, preseededAddons);
            }
        }
        return this.buildersCache[dir];
    }
    /**
     * Returns an array of top-level directories within this package that should go through the build
     * process. Note that top-level files cannot be built. You can include them (unbuilt) in the final
     * output via the `packageFiles` property; see https://github.com/broccolijs/broccoli/issues/173#issuecomment-47584836
     */
    sourceDirs() {
        let dirs = ['app', 'blueprints', 'commands', 'config', 'lib'];
        if (this.project.environment === 'test') {
            dirs.push('test');
        }
        return dirs;
    }
    /**
     * Generic treeFor method that simply returns the supplied directory as is. You could override
     * this to customize the build process for all files.
     */
    treeFor(dir) {
        return dir;
    }
    /**
     * Compiles the base build tree which will be passed to the user-defined build hooks. Grabs all
     * the top-level directories to be built, runs the treeFor hooks on each, adds package files
     */
    _prepareSelf() {
        // Get the various source dirs we'll use. This is important because broccoli
        // cannot pick files at the root of the project directory.
        let dirs = this.sourceDirs();
        // Give any subclasses a chance to override the source directories by defining
        // a treeFor* method
        let sourceTrees = dirs.map((dir) => {
            let treeFor = this[`treeFor${lodash_1.upperFirst(dir)}`] || this.treeFor;
            let tree = treeFor.call(this, path.join(this.dir, dir));
            if (typeof tree !== 'string' || fs.existsSync(tree)) {
                return new Funnel(tree, { annotation: dir, destDir: dir });
            }
            return false;
        }).filter(Boolean);
        // Copy top level files into our build output (this special tree is
        // necessary because broccoli can't pick a file from the root dir).
        sourceTrees.push(new package_tree_1.default(this, { files: this.packageFiles }));
        // Combine everything into our unified source tree, ready for building
        return new MergeTree(sourceTrees, { overwrite: true });
    }
    /**
     * Return a single broccoli tree that represents the completed build output for this package
     */
    toTree() {
        let tree = this._prepareSelf();
        // Find child addons
        this.childBuilders = this.addons.map((addon) => Builder.createFor(addon.dir, this.project));
        // Run processParent hooks
        this.childBuilders.forEach((builder) => {
            if (builder.processParent) {
                tree = builder.processParent(tree, this.dir);
            }
        });
        // Run processSelf hooks
        if (this.processSelf) {
            tree = this.processSelf(tree, this.dir);
        }
        let unbuiltTrees = [];
        this.packageDirs.forEach((dir) => {
            if (fs.existsSync(path.join(this.dir, dir))) {
                unbuiltTrees.push(new Funnel(path.join(this.dir, dir), { destDir: dir }));
            }
        });
        if (unbuiltTrees.length > 0) {
            tree = new MergeTree(unbuiltTrees.concat(tree), { overwrite: true });
        }
        return tree;
    }
}
/**
 * An internal cache that maps real disk locations to Builder instances. This lets us accurately
 * model the deeply nested and even circular dependencies of an app's addon graph, but take
 * advantage of npm/yarn flattening by only using one Builder instance per disk location.
 */
Builder.buildersCache = {};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Builder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQ0FFZ0I7QUFDaEIseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QiwwQ0FBMEM7QUFDMUMsa0RBQWtEO0FBQ2xELGlEQUF5QztBQUV6QyxxQ0FBcUM7QUFDckMsK0NBQTBEO0FBRTFELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBSXhCLENBQUM7QUFFekI7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSDtJQW1HRTs7O09BR0c7SUFDSCxZQUFZLEdBQVcsRUFBRSxPQUFnQixFQUFFLGVBQTBCO1FBekVyRTs7Ozs7Ozs7Ozs7Ozs7Ozs7O1dBa0JHO1FBQ0ksMEJBQXFCLEdBQWU7WUFDekMsQ0FBRSxZQUFZLENBQUU7WUFDaEIsQ0FBRSxlQUFlLENBQUU7U0FDcEIsQ0FBQztRQUVGOztXQUVHO1FBQ0ksaUJBQVksR0FBYTtZQUM5QixjQUFjO1lBQ2QsV0FBVztZQUNYLGNBQWM7WUFDZCxTQUFTO1lBQ1QsaUJBQWlCO1lBQ2pCLFdBQVc7U0FDWixDQUFDO1FBRUY7O1dBRUc7UUFDSSxnQkFBVyxHQUFhLEVBQUUsQ0FBQztRQXNCbEM7Ozs7O1dBS0c7UUFDSSxzQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFPL0IsS0FBSyxDQUFDLDBCQUEyQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1B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TyxDQUFDLENBQUMsR0FBRztZQUMzQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQzs7QUF6TkQ7Ozs7R0FJRztBQUNXLHFCQUFhLEdBQStCLEVBQUUsQ0FBQzs7QUFUL0QsMEJBK05DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgdXBwZXJGaXJzdFxufSBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIEZ1bm5lbCBmcm9tICdicm9jY29saS1mdW5uZWwnO1xuaW1wb3J0ICogYXMgTWVyZ2VUcmVlIGZyb20gJ2Jyb2Njb2xpLW1lcmdlLXRyZWVzJztcbmltcG9ydCBQYWNrYWdlVHJlZSBmcm9tICcuL3BhY2thZ2UtdHJlZSc7XG5pbXBvcnQgUHJvamVjdCBmcm9tICcuL3Byb2plY3QnO1xuaW1wb3J0ICogYXMgY3JlYXRlRGVidWcgZnJvbSAnZGVidWcnO1xuaW1wb3J0IGZpbmRQbHVnaW5zLCB7IFBsdWdpblN1bW1hcnkgfSBmcm9tICdmaW5kLXBsdWdpbnMnO1xuXG5jb25zdCBkZWJ1ZyA9IGNyZWF0ZURlYnVnKCdkZW5hbGktY2xpOmJ1aWxkZXInKTtcblxuLy8gQmVjYXVzZSBpdCdzIG5pY2UgdG8gaGF2ZSBhIG5hbWVkIHR5cGUgZm9yIHRoaXNcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eS1pbnRlcmZhY2VcbmV4cG9ydCBpbnRlcmZhY2UgVHJlZSB7fTtcblxuLyoqXG4gKiBUaGUgQnVpbGRlciBjbGFzcyBpcyByZXNwb25zaWJsZSBmb3IgdGFraW5nIGEgRGVuYWxpIHBhY2thZ2UgKGFuIGFwcCBvciBhbiBhZGRvbiksIGFuZCBwZXJmb3JtaW5nXG4gKiBhbnkgYnVpbGQgc3RlcHMgbmVjZXNzYXJ5IHRvIHByb2R1Y2UgdGhlIGZpbmFsLCBjb21waWxlZCBvdXRwdXQuIE9mdGVuIHRpbWVzIHRoaXMgaW5jbHVkZXNcbiAqIHRyYW5zcGlsaW5nLCBwcmVjb21waWxpbmcgdGVtcGxhdGUgZmlsZXMsIGV0Yy4gVGhlIGJhc2UgQnVpbGRlciBjbGFzcyBhbHNvIHBlcmZvcm1zIHNvbWUgYmFzaWNcbiAqIGNvcHlpbmcgb2YgcGFja2FnZSBmaWxlcyAocGFja2FnZS5qc29uLCBSZWFkbWUsIGV0YykuXG4gKlxuICogUHJvamVjdHMgY2FuIGRlZmluZSB0aGVpciBvd24gQnVpbGRlciBpbiBgL2RlbmFsaS1idWlsZC5qc2AsIHdoaWNoIGNhbiBjdXN0b21pemUgaG93IHRoZSBwYWNrYWdlXG4gKiBpcyBidWlsdCB2aWEgdGhlIGBwcm9jZXNzU2VsZmAgaG9vay4gQWRkb24gQnVpbGRlcnMgY2FuIGFsc28gY29udHJpYnV0ZSB0byB0aGVpciBwYXJlbnQgcGFja2FnZSdzXG4gKiBidWlsZCB2aWEgdGhlIHByb2Nlc3NQYXJlbnQoKSBob29rLCBhbGxvd2luZyBmb3IgcHVyZWx5IGJ1aWxkLXJlbGF0ZWQgYWRkb25zIGxpa2UgZGVuYWxpLWJhYmVsIG9yXG4gKiBkZW5hbGktdHlwZXNjcmlwdFxuICpcbiAqIEBleHBvcnRcbiAqIEBjbGFzcyBCdWlsZGVyXG4gKiBAbW9kdWxlIGRlbmFsaS1jbGlcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnVpbGRlciB7XG5cbiAgW2tleTogc3RyaW5nXTogYW55O1xuXG4gIC8qKlxuICAgKiBBbiBpbnRlcm5hbCBjYWNoZSB0aGF0IG1hcHMgcmVhbCBkaXNrIGxvY2F0aW9ucyB0byBCdWlsZGVyIGluc3RhbmNlcy4gVGhpcyBsZXRzIHVzIGFjY3VyYXRlbHlcbiAgICogbW9kZWwgdGhlIGRlZXBseSBuZXN0ZWQgYW5kIGV2ZW4gY2lyY3VsYXIgZGVwZW5kZW5jaWVzIG9mIGFuIGFwcCdzIGFkZG9uIGdyYXBoLCBidXQgdGFrZVxuICAgKiBhZHZhbnRhZ2Ugb2YgbnBtL3lhcm4gZmxhdHRlbmluZyBieSBvbmx5IHVzaW5nIG9uZSBCdWlsZGVyIGluc3RhbmNlIHBlciBkaXNrIGxvY2F0aW9uLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBidWlsZGVyc0NhY2hlOiB7IFtkaXI6IHN0cmluZ106IEJ1aWxkZXIgfSA9IHt9O1xuXG4gIC8qKlxuICAgKiBBIGZhY3RvcnkgbWV0aG9kIHRoYXQgY2hlY2tzIGZvciBhIGxvY2FsIEJ1aWxkZXIgY2xhc3MgaW4gYC9kZW5hbGktYnVpbGQuanNgLCBhbmQgaW5zdGFudGlhdGVzXG4gICAqIHRoYXQgaWYgcHJlc2VudC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlRm9yKGRpcjogc3RyaW5nLCBwcm9qZWN0OiBQcm9qZWN0LCBwcmVzZWVkZWRBZGRvbnM/OiBzdHJpbmdbXSk6IEJ1aWxkZXIge1xuICAgIGlmICghdGhpcy5idWlsZGVyc0NhY2hlW2Rpcl0pIHtcbiAgICAgIC8vIFVzZSB0aGUgbG9jYWwgZGVuYWxpLWJ1aWxkLmpzIGlmIHByZXNlbnRcbiAgICAgIGxldCBkZW5hbGlCdWlsZFBhdGggPSBwYXRoLmpvaW4oZGlyLCAnZGVuYWxpLWJ1aWxkJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhgJHsgZGVuYWxpQnVpbGRQYXRoIH0uanNgKSkge1xuICAgICAgICBsZXQgTG9jYWxCdWlsZGVyID0gcmVxdWlyZShkZW5hbGlCdWlsZFBhdGgpO1xuICAgICAgICBMb2NhbEJ1aWxkZXIgPSBMb2NhbEJ1aWxkZXIuZGVmYXVsdCB8fCBMb2NhbEJ1aWxkZXI7XG4gICAgICAgIHRoaXMuYnVpbGRlcnNDYWNoZVtkaXJdID0gbmV3IExvY2FsQnVpbGRlcihkaXIsIHByb2plY3QsIHByZXNlZWRlZEFkZG9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1aWxkZXJzQ2FjaGVbZGlyXSA9IG5ldyB0aGlzKGRpciwgcHJvamVjdCwgcHJlc2VlZGVkQWRkb25zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYnVpbGRlcnNDYWNoZVtkaXJdO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbmFsaSBhdXRvbWF0aWNhbGx5IGNoZWNrcyB0aGUgTm9kZSBTZWN1cml0eSBQcm9qZWN0IGZvciBhbnkgdnVsbmVyYWJpbGl0aWVzIGluIHlvdXIgYXBwJ3NcbiAgICogZGVwZW5kZW5jaWVzLiBTb21ldGltZXMgaXQgd2lsbCBwaWNrIHVwIHZ1bG5lcmFiaWxpdGllcyB0aGF0IHlvdSB3YW50IHRvIGlnbm9yZSwgaS5lLiBhXG4gICAqIHZ1bG5lcmFiaWxpdHkgaW4gYSBwYWNrYWdlIHRoYXQgaXMgb25seSB1c2VkIGF0IGJ1aWxkIHRpbWUuXG4gICAqXG4gICAqIFRoaXMgYXJyYXkgZGVmaW5lcyBhIGJsYWNrbGlzdCBvZiB2dWxuZXJhYmlsaXRpZXMgdG8gaWdub3JlLiBFYWNoIGVudHJ5IGlzIGFuIGFycmF5IHRoYXRcbiAgICogZGVzY3JpYmVzIHRoZSBwYXRoIHRocm91Z2ggdGhlIGRlcGVuZGVuY3kgZ3JhcGguIEFueSB2dWxuZXJhYmlsaXRpZXMgZnJvbSB0aGF0IHBvaW50IGFuZFxuICAgKiBmYXJ0aGVyIGRvd24gdGhlIGdyYXBoIHdpbGwgYmUgaWdub3JlZC5cbiAgICpcbiAgICogU28gZm9yIGV4YW1wbGUsIGlmIHlvdXIgZGVwZW5kZW5jaWVzIGluY2x1ZGU6XG4gICAqXG4gICAqICAgZm9vQDEuMi4zXG4gICAqICAgICBiYXJANC41LjZcbiAgICogICAgICAgYnV6ekA3LjguOVxuICAgKlxuICAgKiBUaGVuIGFkZGluZyBgWyAnZm9vJywgJ2JhckB+NC4yLjEnIF1gIHdvdWxkIGlnbm9yZSBhbnkgdnVsbmVyYWJpbGl0aWVzIGZyb20gdGhlIFwiYmFyXCIgcGFja2FnZVxuICAgKiAoYXMgbG9uZyBhcyB0aGUgdmVyc2lvbiBvZiBcImJhclwiIHNhdGlzZmllZCBcIn40LjIuMVwiKSwgYXMgd2VsbCBhcyBhbnkgdnVsbmVyYWJpbGl0aWVzIGZyb21cbiAgICogXCJidXp6XCJcbiAgICovXG4gIHB1YmxpYyBpZ25vcmVWdWxuZXJhYmlsaXRpZXM6IHN0cmluZ1tdW10gPSBbXG4gICAgWyAnYnJvY2NvbGlAKicgXSxcbiAgICBbICdqc2NvZGVzaGlmdEAqJyBdXG4gIF07XG5cbiAgLyoqXG4gICAqIEEgbGlzdCBvZiBmaWxlcyB0aGF0IHNob3VsZCBiZSBjb3BpZWQgYXMtaXMgaW50byB0aGUgZmluYWwgYnVpbGRcbiAgICovXG4gIHB1YmxpYyBwYWNrYWdlRmlsZXM6IHN0cmluZ1tdID0gW1xuICAgICdwYWNrYWdlLmpzb24nLFxuICAgICdSRUFETUUubWQnLFxuICAgICdDSEFOR0VMT0cubWQnLFxuICAgICdMSUNFTlNFJyxcbiAgICAnZGVuYWxpLWJ1aWxkLmpzJyxcbiAgICAneWFybi5sb2NrJ1xuICBdO1xuXG4gIC8qKlxuICAgKiBBIGxpc3Qgb2YgZGlyZWN0b3JpZXMgdGhhdCBzaG91bGQgYmUgY29waWVkIGFzLWlzIGludG8gdGhlIGZpbmFsIGJ1aWxkXG4gICAqL1xuICBwdWJsaWMgcGFja2FnZURpcnM6IHN0cmluZ1tdID0gW107XG5cbiAgLyoqXG4gICAqIFRoZSBkaXJlY3RvcnkgY29udGFpbmluZyB0aGUgcGFja2FnZSB0aGF0IHNob3VsZCBiZSBidWlsdC5cbiAgICovXG4gIHB1YmxpYyBkaXI6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhY2thZ2UuanNvbiBmb3IgdGhpcyBwYWNrYWdlXG4gICAqL1xuICBwdWJsaWMgcGtnOiBhbnk7XG5cbiAgLyoqXG4gICAqIFRoZSBQcm9qZWN0IGluc3RhbmNlIHRoYXQgcmVwcmVzZW50cyB0aGUgcm9vdCBwYWNrYWdlIGJlaW5nIGJ1aWx0XG4gICAqL1xuICBwdWJsaWMgcHJvamVjdDogUHJvamVjdDtcblxuICAvKipcbiAgICogQSBsaXN0IG9mIGRpcmVjdG9yaWVzIGNvbnRhaW5pbmcgYWRkb25zIHRoYXQgYXJlIGNoaWxkcmVuIHRvIHRoaXMgcGFja2FnZVxuICAgKi9cbiAgcHVibGljIGFkZG9uczogUGx1Z2luU3VtbWFyeVtdO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCB3aGVuIHRoZSByb290IFByb2plY3QgaXMgYnVpbHQsIGl0IHdpbGwgY3JlYXRlIGEgY2hpbGQgUHJvamVjdCBmb3IgdGhpcyBwYWNrYWdlLFxuICAgKiB3aGljaCB3aWxsIHdhdGNoIGZvciBjaGFuZ2VzIGFuZCB0cmlnZ2VyIGEgcmVidWlsZCBvZiB0aGlzIHBhY2thZ2UgYXMgd2VsbCBhcyB0aGUgcm9vdCBQcm9qZWN0LlxuICAgKlxuICAgKiBXYXJuaW5nOiBleHBlcmltZW50YWwgYW5kIGhpZ2hseSB1bnN0YWJsZVxuICAgKi9cbiAgcHVibGljIGlzRGV2ZWxvcGluZ0FkZG9uID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgQnVpbGRlciBmb3IgdGhlIGdpdmVuIGRpcmVjdG9yeSwgYXMgYSBjaGlsZCBvZiB0aGUgZ2l2ZW4gUHJvamVjdC4gSWZcbiAgICogcHJlc2VlZGVkQWRkb25zIGFyZSBzdXBwbGllZCwgdGhleSB3aWxsIGJlIGluY2x1ZGVkIGFzIGNoaWxkIGFkZG9ucyBvZiB0aGlzIEJ1aWxkZXIgaW5zdGFuY2UuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihkaXI6IHN0cmluZywgcHJvamVjdDogUHJvamVjdCwgcHJlc2VlZGVkQWRkb25zPzogc3RyaW5nW10pIHtcbiAgICBkZWJ1ZyhgY3JlYXRpbmcgYnVpbGRlciBmb3IgLi8keyBwYXRoLnJlbGF0aXZlKHByb2plY3QuZGlyLCBkaXIpIH1gKTtcbiAgICB0aGlzLmRpciA9IGRpcjtcbiAgICB0aGlzLnBrZyA9IHJlcXVpcmUocGF0aC5qb2luKHRoaXMuZGlyLCAncGFja2FnZS5qc29uJykpO1xuICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgdGhpcy5hZGRvbnMgPSBmaW5kUGx1Z2lucyh7XG4gICAgICBkaXI6IHRoaXMuZGlyLFxuICAgICAga2V5d29yZDogJ2RlbmFsaS1hZGRvbicsXG4gICAgICBzb3J0OiB0cnVlLFxuICAgICAgaW5jbHVkZURldjogdHJ1ZSxcbiAgICAgIGNvbmZpZ05hbWU6ICdkZW5hbGknLFxuICAgICAgaW5jbHVkZTogcHJlc2VlZGVkQWRkb25zXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0b3AtbGV2ZWwgZGlyZWN0b3JpZXMgd2l0aGluIHRoaXMgcGFja2FnZSB0aGF0IHNob3VsZCBnbyB0aHJvdWdoIHRoZSBidWlsZFxuICAgKiBwcm9jZXNzLiBOb3RlIHRoYXQgdG9wLWxldmVsIGZpbGVzIGNhbm5vdCBiZSBidWlsdC4gWW91IGNhbiBpbmNsdWRlIHRoZW0gKHVuYnVpbHQpIGluIHRoZSBmaW5hbFxuICAgKiBvdXRwdXQgdmlhIHRoZSBgcGFja2FnZUZpbGVzYCBwcm9wZXJ0eTsgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9jY29saWpzL2Jyb2Njb2xpL2lzc3Vlcy8xNzMjaXNzdWVjb21tZW50LTQ3NTg0ODM2XG4gICAqL1xuICBwdWJsaWMgc291cmNlRGlycygpOiBzdHJpbmdbXSB7XG4gICAgbGV0IGRpcnMgPSBbICdhcHAnLCAnYmx1ZXByaW50cycsICdjb21tYW5kcycsICdjb25maWcnLCAnbGliJyBdO1xuICAgIGlmICh0aGlzLnByb2plY3QuZW52aXJvbm1lbnQgPT09ICd0ZXN0Jykge1xuICAgICAgZGlycy5wdXNoKCd0ZXN0Jyk7XG4gICAgfVxuICAgIHJldHVybiBkaXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyaWMgdHJlZUZvciBtZXRob2QgdGhhdCBzaW1wbHkgcmV0dXJucyB0aGUgc3VwcGxpZWQgZGlyZWN0b3J5IGFzIGlzLiBZb3UgY291bGQgb3ZlcnJpZGVcbiAgICogdGhpcyB0byBjdXN0b21pemUgdGhlIGJ1aWxkIHByb2Nlc3MgZm9yIGFsbCBmaWxlcy5cbiAgICovXG4gIHB1YmxpYyB0cmVlRm9yKGRpcjogc3RyaW5nKTogc3RyaW5nIHwgVHJlZSB7XG4gICAgcmV0dXJuIGRpcjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIHRoZSBiYXNlIGJ1aWxkIHRyZWUgd2hpY2ggd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHVzZXItZGVmaW5lZCBidWlsZCBob29rcy4gR3JhYnMgYWxsXG4gICAqIHRoZSB0b3AtbGV2ZWwgZGlyZWN0b3JpZXMgdG8gYmUgYnVpbHQsIHJ1bnMgdGhlIHRyZWVGb3IgaG9va3Mgb24gZWFjaCwgYWRkcyBwYWNrYWdlIGZpbGVzXG4gICAqL1xuICBwcml2YXRlIF9wcmVwYXJlU2VsZigpOiBUcmVlIHtcbiAgICAvLyBHZXQgdGhlIHZhcmlvdXMgc291cmNlIGRpcnMgd2UnbGwgdXNlLiBUaGlzIGlzIGltcG9ydGFudCBiZWNhdXNlIGJyb2Njb2xpXG4gICAgLy8gY2Fubm90IHBpY2sgZmlsZXMgYXQgdGhlIHJvb3Qgb2YgdGhlIHByb2plY3QgZGlyZWN0b3J5LlxuICAgIGxldCBkaXJzID0gdGhpcy5zb3VyY2VEaXJzKCk7XG5cbiAgICAvLyBHaXZlIGFueSBzdWJjbGFzc2VzIGEgY2hhbmNlIHRvIG92ZXJyaWRlIHRoZSBzb3VyY2UgZGlyZWN0b3JpZXMgYnkgZGVmaW5pbmdcbiAgICAvLyBhIHRyZWVGb3IqIG1ldGhvZFxuICAgIGxldCBzb3VyY2VUcmVlcyA9IGRpcnMubWFwKChkaXIpID0+IHtcbiAgICAgIGxldCB0cmVlRm9yID0gdGhpc1tgdHJlZUZvciR7IHVwcGVyRmlyc3QoZGlyKSB9YF0gfHwgdGhpcy50cmVlRm9yO1xuICAgICAgbGV0IHRyZWUgPSB0cmVlRm9yLmNhbGwodGhpcywgcGF0aC5qb2luKHRoaXMuZGlyLCBkaXIpKTtcbiAgICAgIGlmICh0eXBlb2YgdHJlZSAhPT0gJ3N0cmluZycgfHwgZnMuZXhpc3RzU3luYyh0cmVlKSkge1xuICAgICAgICByZXR1cm4gbmV3IEZ1bm5lbCh0cmVlLCB7IGFubm90YXRpb246IGRpciwgZGVzdERpcjogZGlyIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pLmZpbHRlcihCb29sZWFuKTtcblxuICAgIC8vIENvcHkgdG9wIGxldmVsIGZpbGVzIGludG8gb3VyIGJ1aWxkIG91dHB1dCAodGhpcyBzcGVjaWFsIHRyZWUgaXNcbiAgICAvLyBuZWNlc3NhcnkgYmVjYXVzZSBicm9jY29saSBjYW4ndCBwaWNrIGEgZmlsZSBmcm9tIHRoZSByb290IGRpcikuXG4gICAgc291cmNlVHJlZXMucHVzaChuZXcgUGFja2FnZVRyZWUodGhpcywgeyBmaWxlczogdGhpcy5wYWNrYWdlRmlsZXMgfSkpO1xuXG4gICAgLy8gQ29tYmluZSBldmVyeXRoaW5nIGludG8gb3VyIHVuaWZpZWQgc291cmNlIHRyZWUsIHJlYWR5IGZvciBidWlsZGluZ1xuICAgIHJldHVybiBuZXcgTWVyZ2VUcmVlKHNvdXJjZVRyZWVzLCB7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBidWlsZGVyIGluc3RhbmNlcyBmb3IgY2hpbGQgYWRkb25zIG9mIHRoaXMgcGFja2FnZVxuICAgKi9cbiAgcHVibGljIGNoaWxkQnVpbGRlcnM6IEJ1aWxkZXJbXTtcblxuICAvKipcbiAgICogTW9kaWZ5IHRoZSBidWlsZCBvZiB0aGUgcGFyZW50IHBhY2thZ2UgdGhhdCBpcyBjb25zdW1pbmcgdGhpcyBhZGRvbi5cbiAgICpcbiAgICogQHBhcmFtIHRyZWUgdGhlIHRyZWUgcmVwcmVzZW50aW5nIHRoZSBwYXJlbnQgcGFja2FnZVxuICAgKiBAcGFyYW0gZGlyIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYXJlbnQgcGFja2FnZSBzb3VyY2VcbiAgICovXG4gIHB1YmxpYyBwcm9jZXNzUGFyZW50OiAodHJlZTogVHJlZSwgZGlyOiBzdHJpbmcpICA9PiBUcmVlO1xuXG4gIC8qKlxuICAgKiBNb2RpZnkgdGhpcyBwYWNrYWdlJ3MgYnVpbGRcbiAgICpcbiAgICogQHBhcmFtIHRyZWUgdGhlIHRyZWUgcmVwcmVzZW50aW5nIHRoZSBwYWNrYWdlXG4gICAqIEBwYXJhbSBkaXIgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2Ugc291cmNlXG4gICAqL1xuICBwdWJsaWMgcHJvY2Vzc1NlbGY6ICh0cmVlOiBUcmVlLCBkaXI6IHN0cmluZykgPT4gVHJlZTtcblxuICAvKipcbiAgICogUmV0dXJuIGEgc2luZ2xlIGJyb2Njb2xpIHRyZWUgdGhhdCByZXByZXNlbnRzIHRoZSBjb21wbGV0ZWQgYnVpbGQgb3V0cHV0IGZvciB0aGlzIHBhY2thZ2VcbiAgICovXG4gIHB1YmxpYyB0b1RyZWUoKTogVHJlZSB7XG4gICAgbGV0IHRyZWUgPSB0aGlzLl9wcmVwYXJlU2VsZigpO1xuXG4gICAgLy8gRmluZCBjaGlsZCBhZGRvbnNcbiAgICB0aGlzLmNoaWxkQnVpbGRlcnMgPSB0aGlzLmFkZG9ucy5tYXAoKGFkZG9uKSA9PiBCdWlsZGVyLmNyZWF0ZUZvcihhZGRvbi5kaXIsIHRoaXMucHJvamVjdCkpO1xuXG4gICAgLy8gUnVuIHByb2Nlc3NQYXJlbnQgaG9va3NcbiAgICB0aGlzLmNoaWxkQnVpbGRlcnMuZm9yRWFjaCgoYnVpbGRlcikgPT4ge1xuICAgICAgaWYgKGJ1aWxkZXIucHJvY2Vzc1BhcmVudCkge1xuICAgICAgICB0cmVlID0gYnVpbGRlci5wcm9jZXNzUGFyZW50KHRyZWUsIHRoaXMuZGlyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFJ1biBwcm9jZXNzU2VsZiBob29rc1xuICAgIGlmICh0aGlzLnByb2Nlc3NTZWxmKSB7XG4gICAgICB0cmVlID0gdGhpcy5wcm9jZXNzU2VsZih0cmVlLCB0aGlzLmRpcik7XG4gICAgfVxuXG4gICAgbGV0IHVuYnVpbHRUcmVlczogVHJlZVtdID0gW107XG4gICAgdGhpcy5wYWNrYWdlRGlycy5mb3JFYWNoKChkaXIpID0+IHtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbih0aGlzLmRpciwgZGlyKSkpIHtcbiAgICAgICAgdW5idWlsdFRyZWVzLnB1c2gobmV3IEZ1bm5lbChwYXRoLmpvaW4odGhpcy5kaXIsIGRpciksIHsgZGVzdERpcjogZGlyIH0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodW5idWlsdFRyZWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRyZWUgPSBuZXcgTWVyZ2VUcmVlKHVuYnVpbHRUcmVlcy5jb25jYXQodHJlZSksIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbn1cbiJdfQ==