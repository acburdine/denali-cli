/// <reference types="yargs" />
import { Argv as Yargs, Options as YargsOptions } from 'yargs';
/**
 * Represents a subcommand of the `denali` CLI.
 *
 * @module denali-cli
 */
declare abstract class Command {
    /**
     * Accepts the global yargs object, gives the command a chance to define it's interface.
     */
    static configure(commandName: string, yargs: Yargs, projectPkg: any, context?: any): Yargs;
    /**
     * Takes the yargs object for this command, gives the command a chance to define any options
     */
    protected static configureOptions(commandName: string, yargs: Yargs, projectPkg: any): Yargs;
    /**
     * Takes the yargs object for this command, gives the command a chance to define any subcommands
     */
    protected static configureSubcommands: (commandName: string, yargs: Yargs, projectPkg: any) => Yargs;
    /**
     * The name of the addon that supplied this command. Set by the boostrapping script as it loads
     * commands.
     */
    static addon: string;
    /**
     * The name of the command
     */
    static commandName: string;
    /**
     * An array of possible aliases for this command's name
     */
    static aliases: string[];
    /**
     * Description of what the command does. Displayed when the root help message prints
     */
    static description: string;
    /**
     * A longer description when this command's help is invoked, i.e. 'denali foo --help' or
     * 'denali help foo'
     */
    static longDescription: string;
    /**
     * Positional params for this command. Should follow yargs syntax for positional params
     */
    static params: string;
    /**
     * An object whose keys are flag names, and values are yargs.option settings
     */
    static flags: {
        [flagName: string]: YargsOptions;
    };
    /**
     * If true, Denali will require that this command be run inside an existing app. If false, running
     * inside an app will be prevented. If null, both will be allowed.
     */
    static runsInApp: boolean;
    /**
     * Do some basic checks (i.e. are we obeying runsInApp) then instantiate and run the command
     *
     * @param argv the yargs-parsed command line arguments
     * @param context additional context provided statically, passed through to the command
     *                constructor; useful for blueprints to pass additional, static data
     */
    static _run(argv: any): Promise<void>;
    /**
     * Run the command. Can be omitted for pure-subcommand only
     */
    run(argv: any): Promise<void>;
}
export default Command;
