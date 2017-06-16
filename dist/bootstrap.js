"use strict";
const lodash_1 = require("lodash");
const fs = require("fs");
const path = require("path");
const ui_1 = require("./ui");
const createDebug = require("debug");
const argParser = require("yargs");
const requireTree = require("require-tree");
const find_addons_1 = require("./find-addons");
const dedent = require("dedent-js");
const dotenv = require("dotenv");
const debug = createDebug('denali-cli:bootstrap');
process.on('unhandledRejection', (reason, promise) => {
    ui_1.default.warn('A promise was rejected but did not have a .catch() handler:');
    ui_1.default.warn(reason && reason.stack || reason || promise);
    throw reason;
});
/**
 * Kicks off the Denali CLI. Discovers any addons in this project, and builds a list of all commands
 * supplied by addons. It then gives each command a chance to define any command line arguments and
 * options, and then kicks off yargs. Each command should have defined itself and the appropriate
 * way to invoke itself (by default, the _run method).
 */
function run(projectPkg) {
    dotenv.config();
    debug('discovering commands from addons');
    let commands = {};
    let coreCommands;
    // Special case Denali itself - we want to treat the Denali source like a local project, but it
    // won't have a dependency on Denali, so it won't be able to load core commands like build and
    // test from a local copy of Denali.  So to get the core commands, we point it to the global
    // package instead.
    let addons = find_addons_1.default(projectPkg && projectPkg.name !== 'denali');
    debug(`found ${addons.length} addons: ${addons.map((addon) => addon.pkg.name).join(', ')}`);
    argParser.usage(dedent `
    Usage: denali <command> [options]

    Denali is an opinionated Node.js framework that lets you focus on shipping APIs.
  `);
    addons.forEach((addon) => {
        let addonCommands = discoverCommands(commands, addon.pkg.name, path.join(addon.dir, 'commands'));
        if (addon.pkg.name === 'denali') {
            ui_1.default.info(`denali v${addon.pkg.version} [${projectPkg && projectPkg.name !== 'denali' ? 'local' : 'global'}]\n`);
            debug('found core denali commands');
            coreCommands = addonCommands;
        }
        else {
            debug(`found ${lodash_1.keys(addonCommands).length} commands from ${addon.pkg.name}: [ ${lodash_1.keys(addonCommands).join(', ')} ] `);
            commands = Object.assign(commands, addonCommands);
        }
    });
    // Ensure that denali itself is installed so we have the base commands
    if (!coreCommands) {
        ui_1.default.error('Whoops, looks like you have not installed denali itself yet.');
        ui_1.default.error('You need to install denali globally (`$ npm i -g denali`) alongside the CLI.');
    }
    // Core commands take precedence
    commands = Object.assign(commands, coreCommands);
    lodash_1.forEach(commands, (CommandClass, name) => {
        try {
            debug(`configuring ${CommandClass.commandName} command (invocation: "${name}")`);
            CommandClass.configure(name, argParser, projectPkg);
        }
        catch (error) {
            ui_1.default.warn(`${name} command failed to configure itself:`);
            ui_1.default.warn(error.stack);
        }
    });
    argParser
        .wrap(Math.min(100, argParser.terminalWidth()))
        .help()
        .version(() => {
        let versions = [];
        versions.push(`node ${process.versions.node}`, `openssl ${process.versions.openssl}`);
        return versions.join(`\n`);
    })
        .parse(process.argv.slice(2), { projectPkg });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = run;
/**
 * Discover the commands that are available in the supplied directory. For any commands whose names
 * collide with previously loaded commands, namespace the older command under it's addon name.
 */
function discoverCommands(commandsSoFar, addonName, dir) {
    if (!fs.existsSync(dir)) {
        return {};
    }
    if (addonName === 'denali') {
        addonName = 'core';
    }
    else if (addonName.startsWith('denali-')) {
        addonName = addonName.slice('denali-'.length);
    }
    // Load the commands
    let Commands = requireTree(dir, {
        // tslint:disable-next-line:completed-docs
        transform(obj) { return obj.default || obj; }
    });
    // Give commands a chance to define their own invocation name separate from the filename. Also,
    // let them know what addon they loaded from, so we can later scope their command name if it
    // collides and gets clobbered
    Commands = lodash_1.mapKeys(Commands, (CommandClass, commandDir) => {
        CommandClass.addon = addonName;
        return CommandClass.commandName || commandDir;
    });
    // Check for any command name collisions. In case of a collision, the older command gets moved to
    // a scoped invocation.
    lodash_1.intersection(lodash_1.keys(Commands), lodash_1.keys(commandsSoFar)).forEach((collidingCommandName) => {
        let clobberedCommand = commandsSoFar[collidingCommandName];
        commandsSoFar[clobberedCommand.addon + ':' + collidingCommandName] = clobberedCommand;
    });
    // Merge the newly discovered commands into what we have so far
    return lodash_1.assign(commandsSoFar, Commands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jvb3RzdHJhcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBT2dCO0FBQ2hCLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsNkJBQXNCO0FBQ3RCLHFDQUFxQztBQUNyQyxtQ0FBbUM7QUFDbkMsNENBQTZDO0FBRTdDLCtDQUF1QztBQUN2QyxvQ0FBb0M7QUFFcEMsaUNBQWlDO0FBRWpDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBRWxELE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFXLEVBQUUsT0FBWTtJQUN6RCxZQUFFLENBQUMsSUFBSSxDQUFDLDZEQUE2RCxDQUFDLENBQUM7SUFDdkUsWUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssSUFBSSxNQUFNLElBQUksT0FBTyxDQUFDLENBQUM7SUFDckQsTUFBTSxNQUFNLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQztBQUVIOzs7OztHQUtHO0FBQ0gsYUFBNEIsVUFBZ0I7SUFDMUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2hCLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQzFDLElBQUksUUFBUSxHQUFzQyxFQUFFLENBQUM7SUFDckQsSUFBSSxZQUErQyxDQUFDO0lBQ3BELCtGQUErRjtJQUMvRiw4RkFBOEY7SUFDOUYsNEZBQTRGO0lBQzVGLG1CQUFtQjtJQUNuQixJQUFJLE1BQU0sR0FBRyxxQkFBVSxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDO0lBQ3BFLEtBQUssQ0FBQyxTQUFVLE1BQU0sQ0FBQyxNQUFPLFlBQWEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElB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SSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMzRCxhQUFhLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLGdCQUFnQixDQUFDO0lBQ3hGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsK0RBQStEO0lBQy9ELE1BQU0sQ0FBQyxlQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpbnRlcnNlY3Rpb24sXG4gIGtleXMsXG4gIGZvckVhY2gsXG4gIGZpbmRLZXksXG4gIGFzc2lnbixcbiAgbWFwS2V5c1xufSBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB1aSBmcm9tICcuL3VpJztcbmltcG9ydCAqIGFzIGNyZWF0ZURlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIGFyZ1BhcnNlciBmcm9tICd5YXJncyc7XG5pbXBvcnQgcmVxdWlyZVRyZWUgPSByZXF1aXJlKCdyZXF1aXJlLXRyZWUnKTtcbmltcG9ydCBDb21tYW5kIGZyb20gJy4vY29tbWFuZCc7XG5pbXBvcnQgZmluZEFkZG9ucyBmcm9tICcuL2ZpbmQtYWRkb25zJztcbmltcG9ydCAqIGFzIGRlZGVudCBmcm9tICdkZWRlbnQtanMnO1xuaW1wb3J0ICogYXMgdHJ5UmVxdWlyZSBmcm9tICd0cnktcmVxdWlyZSc7XG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcblxuY29uc3QgZGVidWcgPSBjcmVhdGVEZWJ1ZygnZGVuYWxpLWNsaTpib290c3RyYXAnKTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgKHJlYXNvbjogYW55LCBwcm9taXNlOiBhbnkpID0+IHtcbiAgdWkud2FybignQSBwcm9taXNlIHdhcyByZWplY3RlZCBidXQgZGlkIG5vdCBoYXZlIGEgLmNhdGNoKCkgaGFuZGxlcjonKTtcbiAgdWkud2FybihyZWFzb24gJiYgcmVhc29uLnN0YWNrIHx8IHJlYXNvbiB8fCBwcm9taXNlKTtcbiAgdGhyb3cgcmVhc29uO1xufSk7XG5cbi8qKlxuICogS2lja3Mgb2ZmIHRoZSBEZW5hbGkgQ0xJLiBEaXNjb3ZlcnMgYW55IGFkZG9ucyBpbiB0aGlzIHByb2plY3QsIGFuZCBidWlsZHMgYSBsaXN0IG9mIGFsbCBjb21tYW5kc1xuICogc3VwcGxpZWQgYnkgYWRkb25zLiBJdCB0aGVuIGdpdmVzIGVhY2ggY29tbWFuZCBhIGNoYW5jZSB0byBkZWZpbmUgYW55IGNvbW1hbmQgbGluZSBhcmd1bWVudHMgYW5kXG4gKiBvcHRpb25zLCBhbmQgdGhlbiBraWNrcyBvZmYgeWFyZ3MuIEVhY2ggY29tbWFuZCBzaG91bGQgaGF2ZSBkZWZpbmVkIGl0c2VsZiBhbmQgdGhlIGFwcHJvcHJpYXRlXG4gKiB3YXkgdG8gaW52b2tlIGl0c2VsZiAoYnkgZGVmYXVsdCwgdGhlIF9ydW4gbWV0aG9kKS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcnVuKHByb2plY3RQa2c/OiBhbnkpICB7XG4gIGRvdGVudi5jb25maWcoKTtcbiAgZGVidWcoJ2Rpc2NvdmVyaW5nIGNvbW1hbmRzIGZyb20gYWRkb25zJyk7XG4gIGxldCBjb21tYW5kczogeyBba2V5OiBzdHJpbmddOiB0eXBlb2YgQ29tbWFuZCB9ID0ge307XG4gIGxldCBjb3JlQ29tbWFuZHM6IHsgW2tleTogc3RyaW5nXTogdHlwZW9mIENvbW1hbmQgfTtcbiAgLy8gU3BlY2lhbCBjYXNlIERlbmFsaSBpdHNlbGYgLSB3ZSB3YW50IHRvIHRyZWF0IHRoZSBEZW5hbGkgc291cmNlIGxpa2UgYSBsb2NhbCBwcm9qZWN0LCBidXQgaXRcbiAgLy8gd29uJ3QgaGF2ZSBhIGRlcGVuZGVuY3kgb24gRGVuYWxpLCBzbyBpdCB3b24ndCBiZSBhYmxlIHRvIGxvYWQgY29yZSBjb21tYW5kcyBsaWtlIGJ1aWxkIGFuZFxuICAvLyB0ZXN0IGZyb20gYSBsb2NhbCBjb3B5IG9mIERlbmFsaS4gIFNvIHRvIGdldCB0aGUgY29yZSBjb21tYW5kcywgd2UgcG9pbnQgaXQgdG8gdGhlIGdsb2JhbFxuICAvLyBwYWNrYWdlIGluc3RlYWQuXG4gIGxldCBhZGRvbnMgPSBmaW5kQWRkb25zKHByb2plY3RQa2cgJiYgcHJvamVjdFBrZy5uYW1lICE9PSAnZGVuYWxpJyk7XG4gIGRlYnVnKGBmb3VuZCAkeyBhZGRvbnMubGVuZ3RoIH0gYWRkb25zOiAkeyBhZGRvbnMubWFwKChhZGRvbikgPT4gYWRkb24ucGtnLm5hbWUpLmpvaW4oJywgJykgfWApO1xuXG4gIGFyZ1BhcnNlci51c2FnZShkZWRlbnRgXG4gICAgVXNhZ2U6IGRlbmFsaSA8Y29tbWFuZD4gW29wdGlvbnNdXG5cbiAgICBEZW5hbGkgaXMgYW4gb3BpbmlvbmF0ZWQgTm9kZS5qcyBmcmFtZXdvcmsgdGhhdCBsZXRzIHlvdSBmb2N1cyBvbiBzaGlwcGluZyBBUElzLlxuICBgKTtcblxuICBhZGRvbnMuZm9yRWFjaCgoYWRkb24pID0+IHtcbiAgICBsZXQgYWRkb25Db21tYW5kcyA9IGRpc2NvdmVyQ29tbWFuZHMoY29tbWFuZHMsIGFkZG9uLnBrZy5uYW1lLCBwYXRoLmpvaW4oYWRkb24uZGlyLCAnY29tbWFuZHMnKSk7XG4gICAgaWYgKGFkZG9uLnBrZy5uYW1lID09PSAnZGVuYWxpJykge1xuICAgICAgdWkuaW5mbyhgZGVuYWxpIHYkeyBhZGRvbi5wa2cudmVyc2lvbiB9IFskeyBwcm9qZWN0UGtnICYmIHByb2plY3RQa2cubmFtZSAhPT0gJ2RlbmFsaScgPyAnbG9jYWwnIDogJ2dsb2JhbCcgfV1cXG5gKTtcbiAgICAgIGRlYnVnKCdmb3VuZCBjb3JlIGRlbmFsaSBjb21tYW5kcycpO1xuICAgICAgY29yZUNvbW1hbmRzID0gYWRkb25Db21tYW5kcztcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWcoYGZvdW5kICR7IGtleXMoYWRkb25Db21tYW5kcykubGVuZ3RoIH0gY29tbWFuZHMgZnJvbSAkeyBhZGRvbi5wa2cubmFtZSB9OiBbICR7IGtleXMoYWRkb25Db21tYW5kcykuam9pbignLCAnKSB9IF0gYCk7XG4gICAgICBjb21tYW5kcyA9IE9iamVjdC5hc3NpZ24oY29tbWFuZHMsIGFkZG9uQ29tbWFuZHMpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gRW5zdXJlIHRoYXQgZGVuYWxpIGl0c2VsZiBpcyBpbnN0YWxsZWQgc28gd2UgaGF2ZSB0aGUgYmFzZSBjb21tYW5kc1xuICBpZiAoIWNvcmVDb21tYW5kcykge1xuICAgIHVpLmVycm9yKCdXaG9vcHMsIGxvb2tzIGxpa2UgeW91IGhhdmUgbm90IGluc3RhbGxlZCBkZW5hbGkgaXRzZWxmIHlldC4nKTtcbiAgICB1aS5lcnJvcignWW91IG5lZWQgdG8gaW5zdGFsbCBkZW5hbGkgZ2xvYmFsbHkgKGAkIG5wbSBpIC1nIGRlbmFsaWApIGFsb25nc2lkZSB0aGUgQ0xJLicpO1xuICB9XG5cbiAgLy8gQ29yZSBjb21tYW5kcyB0YWtlIHByZWNlZGVuY2VcbiAgY29tbWFuZHMgPSBPYmplY3QuYXNzaWduKGNvbW1hbmRzLCBjb3JlQ29tbWFuZHMpO1xuXG4gIGZvckVhY2goY29tbWFuZHMsIChDb21tYW5kQ2xhc3M6IHR5cGVvZiBDb21tYW5kLCBuYW1lOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICB0cnkge1xuICAgICAgZGVidWcoYGNvbmZpZ3VyaW5nICR7IENvbW1hbmRDbGFzcy5jb21tYW5kTmFtZSB9IGNvbW1hbmQgKGludm9jYXRpb246IFwiJHsgbmFtZSB9XCIpYCk7XG4gICAgICBDb21tYW5kQ2xhc3MuY29uZmlndXJlKG5hbWUsIGFyZ1BhcnNlciwgcHJvamVjdFBrZyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHVpLndhcm4oYCR7IG5hbWUgfSBjb21tYW5kIGZhaWxlZCB0byBjb25maWd1cmUgaXRzZWxmOmApO1xuICAgICAgdWkud2FybihlcnJvci5zdGFjayk7XG4gICAgfVxuICB9KTtcblxuICBhcmdQYXJzZXJcbiAgLndyYXAoTWF0aC5taW4oMTAwLCBhcmdQYXJzZXIudGVybWluYWxXaWR0aCgpKSlcbiAgLmhlbHAoKVxuICAudmVyc2lvbigoKSA9PiB7XG4gICAgbGV0IHZlcnNpb25zID0gW107XG4gICAgdmVyc2lvbnMucHVzaChcbiAgICAgIGBub2RlICR7IHByb2Nlc3MudmVyc2lvbnMubm9kZSB9YCxcbiAgICAgIGBvcGVuc3NsICR7IHByb2Nlc3MudmVyc2lvbnMub3BlbnNzbCB9YFxuICAgICk7XG4gICAgcmV0dXJuIHZlcnNpb25zLmpvaW4oYFxcbmApO1xuICB9KVxuICAucGFyc2UocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCB7IHByb2plY3RQa2cgfSk7XG59XG5cbi8qKlxuICogRGlzY292ZXIgdGhlIGNvbW1hbmRzIHRoYXQgYXJlIGF2YWlsYWJsZSBpbiB0aGUgc3VwcGxpZWQgZGlyZWN0b3J5LiBGb3IgYW55IGNvbW1hbmRzIHdob3NlIG5hbWVzXG4gKiBjb2xsaWRlIHdpdGggcHJldmlvdXNseSBsb2FkZWQgY29tbWFuZHMsIG5hbWVzcGFjZSB0aGUgb2xkZXIgY29tbWFuZCB1bmRlciBpdCdzIGFkZG9uIG5hbWUuXG4gKi9cbmZ1bmN0aW9uIGRpc2NvdmVyQ29tbWFuZHMoY29tbWFuZHNTb0ZhcjogeyBbY29tbWFuZE5hbWU6IHN0cmluZ106IHR5cGVvZiBDb21tYW5kIH0sIGFkZG9uTmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuICBpZiAoYWRkb25OYW1lID09PSAnZGVuYWxpJykge1xuICAgIGFkZG9uTmFtZSA9ICdjb3JlJztcbiAgfSBlbHNlIGlmIChhZGRvbk5hbWUuc3RhcnRzV2l0aCgnZGVuYWxpLScpKSB7XG4gICAgYWRkb25OYW1lID0gYWRkb25OYW1lLnNsaWNlKCdkZW5hbGktJy5sZW5ndGgpO1xuICB9XG4gIC8vIExvYWQgdGhlIGNvbW1hbmRzXG4gIGxldCBDb21tYW5kczogeyBba2V5OiBzdHJpbmddOiB0eXBlb2YgQ29tbWFuZCB9ID0gcmVxdWlyZVRyZWUoZGlyLCB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmNvbXBsZXRlZC1kb2NzXG4gICAgdHJhbnNmb3JtKG9iajogYW55KSB7IHJldHVybiBvYmouZGVmYXVsdCB8fCBvYmo7IH1cbiAgfSk7XG4gIC8vIEdpdmUgY29tbWFuZHMgYSBjaGFuY2UgdG8gZGVmaW5lIHRoZWlyIG93biBpbnZvY2F0aW9uIG5hbWUgc2VwYXJhdGUgZnJvbSB0aGUgZmlsZW5hbWUuIEFsc28sXG4gIC8vIGxldCB0aGVtIGtub3cgd2hhdCBhZGRvbiB0aGV5IGxvYWRlZCBmcm9tLCBzbyB3ZSBjYW4gbGF0ZXIgc2NvcGUgdGhlaXIgY29tbWFuZCBuYW1lIGlmIGl0XG4gIC8vIGNvbGxpZGVzIGFuZCBnZXRzIGNsb2JiZXJlZFxuICBDb21tYW5kcyA9IG1hcEtleXMoQ29tbWFuZHMsIChDb21tYW5kQ2xhc3MsIGNvbW1hbmREaXIpID0+IHtcbiAgICBDb21tYW5kQ2xhc3MuYWRkb24gPSBhZGRvbk5hbWU7XG4gICAgcmV0dXJuIENvbW1hbmRDbGFzcy5jb21tYW5kTmFtZSB8fCBjb21tYW5kRGlyO1xuICB9KTtcbiAgLy8gQ2hlY2sgZm9yIGFueSBjb21tYW5kIG5hbWUgY29sbGlzaW9ucy4gSW4gY2FzZSBvZiBhIGNvbGxpc2lvbiwgdGhlIG9sZGVyIGNvbW1hbmQgZ2V0cyBtb3ZlZCB0b1xuICAvLyBhIHNjb3BlZCBpbnZvY2F0aW9uLlxuICBpbnRlcnNlY3Rpb24oa2V5cyhDb21tYW5kcyksIGtleXMoY29tbWFuZHNTb0ZhcikpLmZvckVhY2goKGNvbGxpZGluZ0NvbW1hbmROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgY2xvYmJlcmVkQ29tbWFuZCA9IGNvbW1hbmRzU29GYXJbY29sbGlkaW5nQ29tbWFuZE5hbWVdO1xuICAgIGNvbW1hbmRzU29GYXJbY2xvYmJlcmVkQ29tbWFuZC5hZGRvbiArICc6JyArIGNvbGxpZGluZ0NvbW1hbmROYW1lXSA9IGNsb2JiZXJlZENvbW1hbmQ7XG4gIH0pO1xuICAvLyBNZXJnZSB0aGUgbmV3bHkgZGlzY292ZXJlZCBjb21tYW5kcyBpbnRvIHdoYXQgd2UgaGF2ZSBzbyBmYXJcbiAgcmV0dXJuIGFzc2lnbihjb21tYW5kc1NvRmFyLCBDb21tYW5kcyk7XG59XG4iXX0=