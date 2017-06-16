import Builder, { Tree } from './builder';
/**
 * Denali CLI's build system is based on Broccoli, which, while quite powerful for our use case, has
 * a specific flaw: you can't operate on files in the root directory that you are building. This
 * plugin is a hack around that - it skips Broccoli's input trees and copies files directly out of
 * the package root. The drawback is that Broccoli's natural file-watching mechanisms will fail
 * here, but that's typically fine since these files either don't matter at runtime, or would
 * require full restarts anyway.
 */
export default class PackageTree extends Tree {
    /**
     * The Builder instance that this PackageTree is part of
     */
    protected builder: Builder;
    /**
     * The root directory of the package
     */
    protected dir: string;
    /**
     * An array of filepaths that should be copied
     */
    protected files: string[];
    /**
     * The destination directory
     */
    protected outputPath: string;
    constructor(builder: Builder, options: {
        files: string[];
    });
    /**
     * Copy the package files over
     */
    build(): void;
}
