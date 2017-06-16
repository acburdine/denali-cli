"use strict";
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const ui_1 = require("./ui");
const createDebug = require("debug");
const debug = createDebug('denali-cli:command');
/**
 * Represents a subcommand of the `denali` CLI.
 *
 * @module denali-cli
 */
class Command {
    /**
     * Accepts the global yargs object, gives the command a chance to define it's interface.
     */
    static configure(commandName, yargs, projectPkg, context) {
        let command = commandName;
        let abbreviations = command.split('').map((letter, i) => command.substr(0, i + 1));
        if (this.params) {
            command += ` ${this.params}`;
        }
        debug(`adding command: ${command}`);
        return yargs.command({
            command,
            aliases: this.aliases.concat(abbreviations),
            describe: this.description,
            builder: (commandArgs) => {
                debug(`building options for ${commandName}`);
                commandArgs = this.configureOptions(commandName, commandArgs, projectPkg);
                if (this.configureSubcommands) {
                    commandArgs = this.configureSubcommands(commandName, commandArgs, projectPkg);
                }
                return commandArgs;
            },
            handler: (args) => {
                // tslint:disable-next-line:no-floating-promises
                this._run(lodash_1.assign(args, context));
            }
        });
    }
    /**
     * Takes the yargs object for this command, gives the command a chance to define any options
     */
    static configureOptions(commandName, yargs, projectPkg) {
        yargs.usage(this.longDescription);
        lodash_1.forEach(this.flags, (options, flagName) => {
            yargs = yargs.option(lodash_1.kebabCase(flagName), options);
        });
        return yargs;
    }
    /**
     * Do some basic checks (i.e. are we obeying runsInApp) then instantiate and run the command
     *
     * @param argv the yargs-parsed command line arguments
     * @param context additional context provided statically, passed through to the command
     *                constructor; useful for blueprints to pass additional, static data
     */
    static _run(argv) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            debug(`enforcing runsInApp setting (${this.runsInApp})`);
            if (argv.projectPkg && this.runsInApp === false) {
                ui_1.default.error('This command can only be run outside an existing Denali project.');
                return;
            }
            if (!argv.projectPkg && this.runsInApp === true) {
                ui_1.default.error('This command can only be run inside an existing Denali project.');
                return;
            }
            let command = new this();
            debug('running command');
            try {
                yield command.run(argv);
            }
            catch (e) {
                ui_1.default.error(`Error encountered when running "${this.commandName}" command`);
                ui_1.default.error(e.stack);
            }
        });
    }
    /**
     * Run the command. Can be omitted for pure-subcommand only
     */
    run(argv) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
}
/**
 * An array of possible aliases for this command's name
 */
Command.aliases = [];
/**
 * Description of what the command does. Displayed when the root help message prints
 */
Command.description = '';
/**
 * A longer description when this command's help is invoked, i.e. 'denali foo --help' or
 * 'denali help foo'
 */
Command.longDescription = '';
/**
 * Positional params for this command. Should follow yargs syntax for positional params
 */
Command.params = '';
/**
 * An object whose keys are flag names, and values are yargs.option settings
 */
Command.flags = {};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBT2dCO0FBR2hCLDZCQUFzQjtBQUV0QixxQ0FBcUM7QUFHckMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFaEQ7Ozs7R0FJRztBQUNIO0lBRUU7O09BRUc7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQW1CLEVBQUUsS0FBWSxFQUFFLFVBQWUsRUFBRSxPQUFhO1FBQ3ZGLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQztRQUMxQixJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEIsT0FBTyxJQUFJLElBQUssSUFBSSxDQUFDLE1BQU8sRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFDRCxLQUFLLENBQUMsbUJBQW9CLE9BQVEsRUFBRSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDbkIsT0FBTztZQUNQLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDM0MsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzFCLE9BQU8sRUFBRSxDQUFDLFdBQWtCO2dCQUMxQixLQUFLLENBQUMsd0JBQXlCLFdBQVksRUFBRSxDQUFDLENBQUM7Z0JBQy9DLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDMUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztvQkFDOUIsV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRixDQUFDO2dCQUNELE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDckIsQ0FBQztZQUNELE9BQU8sRUFBRSxDQUFDLElBQUk7Z0JBQ1osZ0RBQWdEO2dCQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNuQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ08sTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQW1CLEVBQUUsS0FBWSxFQUFFLFVBQWU7UUFDbEYsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEMsZ0JBQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVE7WUFDcEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBa0REOzs7Ozs7T0FNRztJQUNJLE1BQU0sQ0FBTyxJQUFJLENBQUMsSUFBUzs7WUFDaEMsS0FBSyxDQUFDLGdDQUFpQyxJQUFJLENBQUMsU0FBVSxHQUFHLENBQUMsQ0FBQztZQUMzRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsWUFBRSxDQUFDLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO2dCQUM3RSxNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsWUFBRSxDQUFDLEtBQUssQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO2dCQUM1RSxNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsSUFBSSxPQUFPLEdBQVksSUFBVSxJQUFLLEVBQUUsQ0FBQztZQUN6QyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUM7Z0JBQ0gsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNYLFlBQUUsQ0FBQyxLQUFLLENBQUMsbUNBQW9DLElBQUksQ0FBQyxXQUFZLFdBQVcsQ0FBQyxDQUFDO2dCQUMzRSxZQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0gsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDVSxHQUFHLENBQUMsSUFBUztzRUFBOEIsQ0FBQztLQUFBOztBQTlEekQ7O0dBRUc7QUFDVyxlQUFPLEdBQWEsRUFBRSxDQUFDO0FBRXJDOztHQUVHO0FBQ1csbUJBQVcsR0FBRyxFQUFFLENBQUM7QUFFL0I7OztHQUdHO0FBQ1csdUJBQWUsR0FBRyxFQUFFLENBQUM7QUFFbkM7O0dBRUc7QUFDVyxjQUFNLEdBQUcsRUFBRSxDQUFDO0FBRTFCOztHQUVHO0FBQ1csYUFBSyxHQUF5QyxFQUFFLENBQUM7O0FBMENqRSxrQkFBZSxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBmb3JJbixcbiAgZm9yRWFjaCxcbiAgcGFkRW5kLFxuICBpbmNsdWRlcyxcbiAgYXNzaWduLFxuICBrZWJhYkNhc2Vcbn0gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZmluZHVwID0gcmVxdWlyZSgnZmluZHVwLXN5bmMnKTtcbmltcG9ydCB1aSBmcm9tICcuL3VpJztcbmltcG9ydCB5YXJncywgeyBBcmd2IGFzIFlhcmdzLCBPcHRpb25zIGFzIFlhcmdzT3B0aW9ucyB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCAqIGFzIGNyZWF0ZURlYnVnIGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIHRyeVJlcXVpcmUgZnJvbSAndHJ5LXJlcXVpcmUnO1xuXG5jb25zdCBkZWJ1ZyA9IGNyZWF0ZURlYnVnKCdkZW5hbGktY2xpOmNvbW1hbmQnKTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc3ViY29tbWFuZCBvZiB0aGUgYGRlbmFsaWAgQ0xJLlxuICpcbiAqIEBtb2R1bGUgZGVuYWxpLWNsaVxuICovXG5hYnN0cmFjdCBjbGFzcyBDb21tYW5kIHtcblxuICAvKipcbiAgICogQWNjZXB0cyB0aGUgZ2xvYmFsIHlhcmdzIG9iamVjdCwgZ2l2ZXMgdGhlIGNvbW1hbmQgYSBjaGFuY2UgdG8gZGVmaW5lIGl0J3MgaW50ZXJmYWNlLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjb25maWd1cmUoY29tbWFuZE5hbWU6IHN0cmluZywgeWFyZ3M6IFlhcmdzLCBwcm9qZWN0UGtnOiBhbnksIGNvbnRleHQ/OiBhbnkpOiBZYXJncyB7XG4gICAgbGV0IGNvbW1hbmQgPSBjb21tYW5kTmFtZTtcbiAgICBsZXQgYWJicmV2aWF0aW9ucyA9IGNvbW1hbmQuc3BsaXQoJycpLm1hcCgobGV0dGVyLCBpKSA9PiBjb21tYW5kLnN1YnN0cigwLCBpICsgMSkpO1xuICAgIGlmICh0aGlzLnBhcmFtcykge1xuICAgICAgY29tbWFuZCArPSBgICR7IHRoaXMucGFyYW1zIH1gO1xuICAgIH1cbiAgICBkZWJ1ZyhgYWRkaW5nIGNvbW1hbmQ6ICR7IGNvbW1hbmQgfWApO1xuICAgIHJldHVybiB5YXJncy5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQsXG4gICAgICBhbGlhc2VzOiB0aGlzLmFsaWFzZXMuY29uY2F0KGFiYnJldmlhdGlvbnMpLFxuICAgICAgZGVzY3JpYmU6IHRoaXMuZGVzY3JpcHRpb24sXG4gICAgICBidWlsZGVyOiAoY29tbWFuZEFyZ3M6IFlhcmdzKSA9PiB7XG4gICAgICAgIGRlYnVnKGBidWlsZGluZyBvcHRpb25zIGZvciAkeyBjb21tYW5kTmFtZSB9YCk7XG4gICAgICAgIGNvbW1hbmRBcmdzID0gdGhpcy5jb25maWd1cmVPcHRpb25zKGNvbW1hbmROYW1lLCBjb21tYW5kQXJncywgcHJvamVjdFBrZyk7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyZVN1YmNvbW1hbmRzKSB7XG4gICAgICAgICAgY29tbWFuZEFyZ3MgPSB0aGlzLmNvbmZpZ3VyZVN1YmNvbW1hbmRzKGNvbW1hbmROYW1lLCBjb21tYW5kQXJncywgcHJvamVjdFBrZyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbW1hbmRBcmdzO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZXI6IChhcmdzKSA9PiB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1mbG9hdGluZy1wcm9taXNlc1xuICAgICAgICB0aGlzLl9ydW4oYXNzaWduKGFyZ3MsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlcyB0aGUgeWFyZ3Mgb2JqZWN0IGZvciB0aGlzIGNvbW1hbmQsIGdpdmVzIHRoZSBjb21tYW5kIGEgY2hhbmNlIHRvIGRlZmluZSBhbnkgb3B0aW9uc1xuICAgKi9cbiAgcHJvdGVjdGVkIHN0YXRpYyBjb25maWd1cmVPcHRpb25zKGNvbW1hbmROYW1lOiBzdHJpbmcsIHlhcmdzOiBZYXJncywgcHJvamVjdFBrZzogYW55KSB7XG4gICAgeWFyZ3MudXNhZ2UodGhpcy5sb25nRGVzY3JpcHRpb24pO1xuICAgIGZvckVhY2godGhpcy5mbGFncywgKG9wdGlvbnMsIGZsYWdOYW1lKSA9PiB7XG4gICAgICB5YXJncyA9IHlhcmdzLm9wdGlvbihrZWJhYkNhc2UoZmxhZ05hbWUpLCBvcHRpb25zKTtcbiAgICB9KTtcbiAgICByZXR1cm4geWFyZ3M7XG4gIH1cblxuICAvKipcbiAgICogVGFrZXMgdGhlIHlhcmdzIG9iamVjdCBmb3IgdGhpcyBjb21tYW5kLCBnaXZlcyB0aGUgY29tbWFuZCBhIGNoYW5jZSB0byBkZWZpbmUgYW55IHN1YmNvbW1hbmRzXG4gICAqL1xuICBwcm90ZWN0ZWQgc3RhdGljIGNvbmZpZ3VyZVN1YmNvbW1hbmRzOiAoY29tbWFuZE5hbWU6IHN0cmluZywgeWFyZ3M6IFlhcmdzLCBwcm9qZWN0UGtnOiBhbnkpID0+IFlhcmdzO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgYWRkb24gdGhhdCBzdXBwbGllZCB0aGlzIGNvbW1hbmQuIFNldCBieSB0aGUgYm9vc3RyYXBwaW5nIHNjcmlwdCBhcyBpdCBsb2Fkc1xuICAgKiBjb21tYW5kcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYWRkb246IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGNvbW1hbmRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY29tbWFuZE5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogQW4gYXJyYXkgb2YgcG9zc2libGUgYWxpYXNlcyBmb3IgdGhpcyBjb21tYW5kJ3MgbmFtZVxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBEZXNjcmlwdGlvbiBvZiB3aGF0IHRoZSBjb21tYW5kIGRvZXMuIERpc3BsYXllZCB3aGVuIHRoZSByb290IGhlbHAgbWVzc2FnZSBwcmludHNcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZGVzY3JpcHRpb24gPSAnJztcblxuICAvKipcbiAgICogQSBsb25nZXIgZGVzY3JpcHRpb24gd2hlbiB0aGlzIGNvbW1hbmQncyBoZWxwIGlzIGludm9rZWQsIGkuZS4gJ2RlbmFsaSBmb28gLS1oZWxwJyBvclxuICAgKiAnZGVuYWxpIGhlbHAgZm9vJ1xuICAgKi9cbiAgcHVibGljIHN0YXRpYyBsb25nRGVzY3JpcHRpb24gPSAnJztcblxuICAvKipcbiAgICogUG9zaXRpb25hbCBwYXJhbXMgZm9yIHRoaXMgY29tbWFuZC4gU2hvdWxkIGZvbGxvdyB5YXJncyBzeW50YXggZm9yIHBvc2l0aW9uYWwgcGFyYW1zXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHBhcmFtcyA9ICcnO1xuXG4gIC8qKlxuICAgKiBBbiBvYmplY3Qgd2hvc2Uga2V5cyBhcmUgZmxhZyBuYW1lcywgYW5kIHZhbHVlcyBhcmUgeWFyZ3Mub3B0aW9uIHNldHRpbmdzXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZsYWdzOiB7IFtmbGFnTmFtZTogc3RyaW5nXTogWWFyZ3NPcHRpb25zIH0gPSB7fTtcblxuICAvKipcbiAgICogSWYgdHJ1ZSwgRGVuYWxpIHdpbGwgcmVxdWlyZSB0aGF0IHRoaXMgY29tbWFuZCBiZSBydW4gaW5zaWRlIGFuIGV4aXN0aW5nIGFwcC4gSWYgZmFsc2UsIHJ1bm5pbmdcbiAgICogaW5zaWRlIGFuIGFwcCB3aWxsIGJlIHByZXZlbnRlZC4gSWYgbnVsbCwgYm90aCB3aWxsIGJlIGFsbG93ZWQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHJ1bnNJbkFwcDogYm9vbGVhbjtcblxuICAvKipcbiAgICogRG8gc29tZSBiYXNpYyBjaGVja3MgKGkuZS4gYXJlIHdlIG9iZXlpbmcgcnVuc0luQXBwKSB0aGVuIGluc3RhbnRpYXRlIGFuZCBydW4gdGhlIGNvbW1hbmRcbiAgICpcbiAgICogQHBhcmFtIGFyZ3YgdGhlIHlhcmdzLXBhcnNlZCBjb21tYW5kIGxpbmUgYXJndW1lbnRzXG4gICAqIEBwYXJhbSBjb250ZXh0IGFkZGl0aW9uYWwgY29udGV4dCBwcm92aWRlZCBzdGF0aWNhbGx5LCBwYXNzZWQgdGhyb3VnaCB0byB0aGUgY29tbWFuZFxuICAgKiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcjsgdXNlZnVsIGZvciBibHVlcHJpbnRzIHRvIHBhc3MgYWRkaXRpb25hbCwgc3RhdGljIGRhdGFcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgX3J1bihhcmd2OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBkZWJ1ZyhgZW5mb3JjaW5nIHJ1bnNJbkFwcCBzZXR0aW5nICgkeyB0aGlzLnJ1bnNJbkFwcCB9KWApO1xuICAgIGlmIChhcmd2LnByb2plY3RQa2cgJiYgdGhpcy5ydW5zSW5BcHAgPT09IGZhbHNlKSB7XG4gICAgICB1aS5lcnJvcignVGhpcyBjb21tYW5kIGNhbiBvbmx5IGJlIHJ1biBvdXRzaWRlIGFuIGV4aXN0aW5nIERlbmFsaSBwcm9qZWN0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWFyZ3YucHJvamVjdFBrZyAmJiB0aGlzLnJ1bnNJbkFwcCA9PT0gdHJ1ZSkge1xuICAgICAgdWkuZXJyb3IoJ1RoaXMgY29tbWFuZCBjYW4gb25seSBiZSBydW4gaW5zaWRlIGFuIGV4aXN0aW5nIERlbmFsaSBwcm9qZWN0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgY29tbWFuZDogQ29tbWFuZCA9IG5ldyAoPGFueT50aGlzKSgpO1xuICAgIGRlYnVnKCdydW5uaW5nIGNvbW1hbmQnKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY29tbWFuZC5ydW4oYXJndik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdWkuZXJyb3IoYEVycm9yIGVuY291bnRlcmVkIHdoZW4gcnVubmluZyBcIiR7IHRoaXMuY29tbWFuZE5hbWUgfVwiIGNvbW1hbmRgKTtcbiAgICAgIHVpLmVycm9yKGUuc3RhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGNvbW1hbmQuIENhbiBiZSBvbWl0dGVkIGZvciBwdXJlLXN1YmNvbW1hbmQgb25seVxuICAgKi9cbiAgcHVibGljIGFzeW5jIHJ1bihhcmd2OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHsgLyogbm9vcCAqLyB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29tbWFuZDtcbiJdfQ==