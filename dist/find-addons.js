"use strict";
const lodash_1 = require("lodash");
const path = require("path");
const fs = require("fs");
const find_plugins_1 = require("find-plugins");
const child_process_1 = require("child_process");
const command_exists_1 = require("command-exists");
const YarnConstants = require("yarn/lib/constants");
const createDebug = require("debug");
const debug = createDebug('denali-cli:find-addons');
/**
 * Discover any addons for the current directory. If the current directory is a Denali project, load
 * addons from the local node_modules folder, using the local package.json as a guide.
 *
 * If the current directory is not a Denali project, load the addons from the global node_modules
 * folder (both yarn and npm are supported), and scan all the global packages for addon (rather than
 * relying on a package.json guide).
 */
function findAddons(isLocal) {
    let findOptions = {
        sort: true,
        configName: 'denali',
        keyword: 'denali-addon',
        includeDev: true
    };
    if (isLocal) {
        debug(`searching for addons locally in ${process.cwd()}`);
        return find_plugins_1.default(findOptions);
    }
    let npmRoot = child_process_1.execSync('npm root -g').toString().trim();
    debug(`searching for addons globally in npm root: ${npmRoot}`);
    let addons = find_plugins_1.default(lodash_1.merge({
        dir: npmRoot,
        scanAllDirs: true
    }, findOptions));
    // Because yarn stores it's global modules separately, and doesn't yet support the `root` command,
    // we have to double check yarn's global installs for any denali addons. The easiest way of
    // determining that location is to simply include yarn and require it directly. Ugly, but until
    // they add `root`, our best option. We have to do the same for linked packages to allow for
    // development of global addons (like denali itself)
    // TODO shell out to `yarn root` once yarnpkg/yarn#2388 is fixed
    if (command_exists_1.sync('yarn')) {
        let yarnGlobalInstalls = path.join(YarnConstants.GLOBAL_MODULE_DIRECTORY, 'node_modules');
        debug(`searching for addons globally in yarn global installs: ${yarnGlobalInstalls}`);
        if (fs.existsSync(yarnGlobalInstalls)) {
            addons = addons.concat(find_plugins_1.default(lodash_1.merge({
                dir: yarnGlobalInstalls,
                scanAllDirs: true
            }, findOptions)));
        }
        else {
            debug(`Tried to load globally installed addons from yarn, but ${yarnGlobalInstalls} doesn't exist, skipping ...`);
        }
        let yarnGlobalLinks = YarnConstants.LINK_REGISTRY_DIRECTORY;
        debug(`searching for addons globally in yarn global links: ${yarnGlobalLinks}`);
        if (fs.existsSync(yarnGlobalLinks)) {
            addons = addons.concat(find_plugins_1.default(lodash_1.merge({
                dir: yarnGlobalLinks,
                scanAllDirs: true
            }, findOptions)));
        }
        else {
            debug(`Tried to load globally linked addons from yarn, but ${yarnGlobalLinks} doesn't exist, skipping ...`);
        }
    }
    return addons;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = findAddons;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1hZGRvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZmluZC1hZGRvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUVnQjtBQUNoQiw2QkFBNkI7QUFDN0IseUJBQXlCO0FBQ3pCLCtDQUEwRDtBQUMxRCxpREFBeUM7QUFDekMsbURBQXVEO0FBQ3ZELG9EQUFvRDtBQUNwRCxxQ0FBcUM7QUFHckMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFHcEQ7Ozs7Ozs7R0FPRztBQUNILG9CQUFtQyxPQUFnQjtJQUVqRCxJQUFJLFdBQVcsR0FBRztRQUNoQixJQUFJLEVBQUUsSUFBSTtRQUNWLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFVBQVUsRUFBRSxJQUFJO0tBQ2pCLENBQUM7SUFFRixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1osS0FBSyxDQUFDLG1DQUFvQyxPQUFPLENBQUMsR0FBRyxFQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxzQkFBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyx3QkFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3hELEtBQUssQ0FBQyw4Q0FBK0MsT0FBUSxFQUFFLENBQUMsQ0FBQztJQUNqRSxJQUFJLE1BQU0sR0FBRyxzQkFBVyxDQUFDLGNBQUssQ0FBQztRQUM3QixHQUFHLEVBQUUsT0FBTztRQUNaLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUVqQixrR0FBa0c7SUFDbEcsMkZBQTJGO0lBQzNGLCtGQUErRjtJQUMvRiw0RkFBNEY7SUFDNUYsb0RBQW9EO0lBQ3BELGdFQUFnRTtJQUNoRSxFQUFFLENBQUMsQ0FBQyxxQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFGLEtBQUssQ0FBQywwREFBMkQsa0JBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQ3hGLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQVcsQ0FBQyxjQUFLLENBQUM7Z0JBQ3ZDLEdBQUcsRUFBRSxrQkFBa0I7Z0JBQ3ZCLFdBQVcsRUFBRSxJQUFJO2FBQ2xCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLEtBQUssQ0FBQywwREFBMkQsa0JBQW1CLDhCQUE4QixDQUFDLENBQUM7UUFDdEgsQ0FBQztRQUNELElBQUksZUFBZSxHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztRQUM1RCxLQUFLLENBQUMsdURBQXdELGVBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFXLENBQUMsY0FBSyxDQUFDO2dCQUN2QyxHQUFHLEVBQUUsZUFBZTtnQkFDcEIsV0FBVyxFQUFFLElBQUk7YUFDbEIsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sS0FBSyxDQUFDLHVEQUF3RCxlQUFnQiw4QkFBOEIsQ0FBQyxDQUFDO1FBQ2hILENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUVoQixDQUFDOztBQXBERCw2QkFvREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBtZXJnZVxufSBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmaW5kUGx1Z2lucywgeyBQbHVnaW5TdW1tYXJ5IH0gZnJvbSAnZmluZC1wbHVnaW5zJztcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBzeW5jIGFzIGNvbW1hbmRFeGlzdHMgfSBmcm9tICdjb21tYW5kLWV4aXN0cyc7XG5pbXBvcnQgKiBhcyBZYXJuQ29uc3RhbnRzIGZyb20gJ3lhcm4vbGliL2NvbnN0YW50cyc7XG5pbXBvcnQgKiBhcyBjcmVhdGVEZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgdWkgZnJvbSAnLi91aSc7XG5cbmNvbnN0IGRlYnVnID0gY3JlYXRlRGVidWcoJ2RlbmFsaS1jbGk6ZmluZC1hZGRvbnMnKTtcblxuXG4vKipcbiAqIERpc2NvdmVyIGFueSBhZGRvbnMgZm9yIHRoZSBjdXJyZW50IGRpcmVjdG9yeS4gSWYgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGEgRGVuYWxpIHByb2plY3QsIGxvYWRcbiAqIGFkZG9ucyBmcm9tIHRoZSBsb2NhbCBub2RlX21vZHVsZXMgZm9sZGVyLCB1c2luZyB0aGUgbG9jYWwgcGFja2FnZS5qc29uIGFzIGEgZ3VpZGUuXG4gKlxuICogSWYgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIERlbmFsaSBwcm9qZWN0LCBsb2FkIHRoZSBhZGRvbnMgZnJvbSB0aGUgZ2xvYmFsIG5vZGVfbW9kdWxlc1xuICogZm9sZGVyIChib3RoIHlhcm4gYW5kIG5wbSBhcmUgc3VwcG9ydGVkKSwgYW5kIHNjYW4gYWxsIHRoZSBnbG9iYWwgcGFja2FnZXMgZm9yIGFkZG9uIChyYXRoZXIgdGhhblxuICogcmVseWluZyBvbiBhIHBhY2thZ2UuanNvbiBndWlkZSkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZpbmRBZGRvbnMoaXNMb2NhbDogYm9vbGVhbik6IFBsdWdpblN1bW1hcnlbXSB7XG5cbiAgbGV0IGZpbmRPcHRpb25zID0ge1xuICAgIHNvcnQ6IHRydWUsXG4gICAgY29uZmlnTmFtZTogJ2RlbmFsaScsXG4gICAga2V5d29yZDogJ2RlbmFsaS1hZGRvbicsXG4gICAgaW5jbHVkZURldjogdHJ1ZVxuICB9O1xuXG4gIGlmIChpc0xvY2FsKSB7XG4gICAgZGVidWcoYHNlYXJjaGluZyBmb3IgYWRkb25zIGxvY2FsbHkgaW4gJHsgcHJvY2Vzcy5jd2QoKSB9YCk7XG4gICAgcmV0dXJuIGZpbmRQbHVnaW5zKGZpbmRPcHRpb25zKTtcbiAgfVxuXG4gIGxldCBucG1Sb290ID0gZXhlY1N5bmMoJ25wbSByb290IC1nJykudG9TdHJpbmcoKS50cmltKCk7XG4gIGRlYnVnKGBzZWFyY2hpbmcgZm9yIGFkZG9ucyBnbG9iYWxseSBpbiBucG0gcm9vdDogJHsgbnBtUm9vdCB9YCk7XG4gIGxldCBhZGRvbnMgPSBmaW5kUGx1Z2lucyhtZXJnZSh7XG4gICAgZGlyOiBucG1Sb290LFxuICAgIHNjYW5BbGxEaXJzOiB0cnVlXG4gIH0sIGZpbmRPcHRpb25zKSk7XG5cbiAgLy8gQmVjYXVzZSB5YXJuIHN0b3JlcyBpdCdzIGdsb2JhbCBtb2R1bGVzIHNlcGFyYXRlbHksIGFuZCBkb2Vzbid0IHlldCBzdXBwb3J0IHRoZSBgcm9vdGAgY29tbWFuZCxcbiAgLy8gd2UgaGF2ZSB0byBkb3VibGUgY2hlY2sgeWFybidzIGdsb2JhbCBpbnN0YWxscyBmb3IgYW55IGRlbmFsaSBhZGRvbnMuIFRoZSBlYXNpZXN0IHdheSBvZlxuICAvLyBkZXRlcm1pbmluZyB0aGF0IGxvY2F0aW9uIGlzIHRvIHNpbXBseSBpbmNsdWRlIHlhcm4gYW5kIHJlcXVpcmUgaXQgZGlyZWN0bHkuIFVnbHksIGJ1dCB1bnRpbFxuICAvLyB0aGV5IGFkZCBgcm9vdGAsIG91ciBiZXN0IG9wdGlvbi4gV2UgaGF2ZSB0byBkbyB0aGUgc2FtZSBmb3IgbGlua2VkIHBhY2thZ2VzIHRvIGFsbG93IGZvclxuICAvLyBkZXZlbG9wbWVudCBvZiBnbG9iYWwgYWRkb25zIChsaWtlIGRlbmFsaSBpdHNlbGYpXG4gIC8vIFRPRE8gc2hlbGwgb3V0IHRvIGB5YXJuIHJvb3RgIG9uY2UgeWFybnBrZy95YXJuIzIzODggaXMgZml4ZWRcbiAgaWYgKGNvbW1hbmRFeGlzdHMoJ3lhcm4nKSkge1xuICAgIGxldCB5YXJuR2xvYmFsSW5zdGFsbHMgPSBwYXRoLmpvaW4oWWFybkNvbnN0YW50cy5HTE9CQUxfTU9EVUxFX0RJUkVDVE9SWSwgJ25vZGVfbW9kdWxlcycpO1xuICAgIGRlYnVnKGBzZWFyY2hpbmcgZm9yIGFkZG9ucyBnbG9iYWxseSBpbiB5YXJuIGdsb2JhbCBpbnN0YWxsczogJHsgeWFybkdsb2JhbEluc3RhbGxzIH1gKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh5YXJuR2xvYmFsSW5zdGFsbHMpKSB7XG4gICAgICBhZGRvbnMgPSBhZGRvbnMuY29uY2F0KGZpbmRQbHVnaW5zKG1lcmdlKHtcbiAgICAgICAgZGlyOiB5YXJuR2xvYmFsSW5zdGFsbHMsXG4gICAgICAgIHNjYW5BbGxEaXJzOiB0cnVlXG4gICAgICB9LCBmaW5kT3B0aW9ucykpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWcoYFRyaWVkIHRvIGxvYWQgZ2xvYmFsbHkgaW5zdGFsbGVkIGFkZG9ucyBmcm9tIHlhcm4sIGJ1dCAkeyB5YXJuR2xvYmFsSW5zdGFsbHMgfSBkb2Vzbid0IGV4aXN0LCBza2lwcGluZyAuLi5gKTtcbiAgICB9XG4gICAgbGV0IHlhcm5HbG9iYWxMaW5rcyA9IFlhcm5Db25zdGFudHMuTElOS19SRUdJU1RSWV9ESVJFQ1RPUlk7XG4gICAgZGVidWcoYHNlYXJjaGluZyBmb3IgYWRkb25zIGdsb2JhbGx5IGluIHlhcm4gZ2xvYmFsIGxpbmtzOiAkeyB5YXJuR2xvYmFsTGlua3MgfWApO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHlhcm5HbG9iYWxMaW5rcykpIHtcbiAgICAgIGFkZG9ucyA9IGFkZG9ucy5jb25jYXQoZmluZFBsdWdpbnMobWVyZ2Uoe1xuICAgICAgICBkaXI6IHlhcm5HbG9iYWxMaW5rcyxcbiAgICAgICAgc2NhbkFsbERpcnM6IHRydWVcbiAgICAgIH0sIGZpbmRPcHRpb25zKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1ZyhgVHJpZWQgdG8gbG9hZCBnbG9iYWxseSBsaW5rZWQgYWRkb25zIGZyb20geWFybiwgYnV0ICR7IHlhcm5HbG9iYWxMaW5rcyB9IGRvZXNuJ3QgZXhpc3QsIHNraXBwaW5nIC4uLmApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhZGRvbnM7XG5cbn1cbiJdfQ==