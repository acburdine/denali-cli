import { Tree } from './builder';
import { Watcher } from 'broccoli/lib';
/**
 * The PausingWatcher class is a hack around a limitation of Broccoli's internal Watcher, which
 * performs file-watching and rebuild triggering.
 *
 * The internal Watcher doesn't allow for delaying the triggered rebuild; as soon as changes are
 * seen, it starts rebuilding.
 *
 * However, in Denali's case, while running tests, if Broccoli triggers a rebuild it will wipe out
 * the built files immediately. This means that the in-flight tests will continue running, but the
 * source files will be wiped out, resulting in cryptic and bizarre errors.
 *
 * So we patch the Watcher class here to allow us to capture and delay the rebuild signal until
 * some arbitrary async condition is fulfilled (in our case, until the test process is completely
 * killed).
 */
export default class PausingWatcher extends Watcher {
    /**
     * Is the watcher currently ready to start a rebuild?
     */
    readyForRebuild: boolean;
    /**
     * Is a prebuild currently in progress?
     */
    prebuildInProgress: boolean;
    /**
     * Callback invoked when there are changes, but before the rebuild is triggered. If a promise is
     * returned, the rebuild will wait until the promise resolves before starting.
     */
    beforeRebuild: () => Promise<void> | void;
    constructor(tree: Tree, options: {
        beforeRebuild(): Promise<void> | void;
        interval: number;
    });
    /**
     * Patch the detectChanges to hide changes until beforeRebuild resolves
     */
    detectChanges(): string[];
}
