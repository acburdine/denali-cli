"use strict";
const lib_1 = require("broccoli/lib");
const bluebird_1 = require("bluebird");
const lodash_1 = require("lodash");
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
class PausingWatcher extends lib_1.Watcher {
    constructor(tree, options) {
        super(tree, options);
        /**
         * Is the watcher currently ready to start a rebuild?
         */
        this.readyForRebuild = false;
        /**
         * Is a prebuild currently in progress?
         */
        this.prebuildInProgress = false;
        this.beforeRebuild = options.beforeRebuild || lodash_1.noop;
    }
    /**
     * Patch the detectChanges to hide changes until beforeRebuild resolves
     */
    detectChanges() {
        let changedDirs = super.detectChanges();
        if (changedDirs.length > 0) {
            if (!this.readyForRebuild) {
                if (!this.prebuildInProgress) {
                    this.prebuildInProgress = true;
                    bluebird_1.resolve(this.beforeRebuild()).then(() => {
                        this.readyForRebuild = true;
                        this.prebuildInProgress = false;
                    });
                }
            }
            else {
                this.readyForRebuild = false;
                this.emit('buildstart');
                return changedDirs;
            }
        }
        return [];
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PausingWatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy93YXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxzQ0FBdUM7QUFDdkMsdUNBQW1DO0FBQ25DLG1DQUVnQjtBQUVoQjs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILG9CQUFvQyxTQUFRLGFBQU87SUFrQmpELFlBQVksSUFBVSxFQUFFLE9BQW9FO1FBQzFGLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFqQnZCOztXQUVHO1FBQ0ksb0JBQWUsR0FBRyxLQUFLLENBQUM7UUFFL0I7O1dBRUc7UUFDSSx1QkFBa0IsR0FBRyxLQUFLLENBQUM7UUFVaEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxJQUFJLGFBQUksQ0FBQztJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxhQUFhO1FBQ2xCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO29CQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO29CQUMvQixrQkFBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQzt3QkFDakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7d0JBQzVCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDSCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUM7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUVGOztBQTlDRCxpQ0E4Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUcmVlIH0gZnJvbSAnLi9idWlsZGVyJztcbmltcG9ydCB7IFdhdGNoZXIgfSBmcm9tICdicm9jY29saS9saWInO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ2JsdWViaXJkJztcbmltcG9ydCB7XG4gIG5vb3Bcbn0gZnJvbSAnbG9kYXNoJztcblxuLyoqXG4gKiBUaGUgUGF1c2luZ1dhdGNoZXIgY2xhc3MgaXMgYSBoYWNrIGFyb3VuZCBhIGxpbWl0YXRpb24gb2YgQnJvY2NvbGkncyBpbnRlcm5hbCBXYXRjaGVyLCB3aGljaFxuICogcGVyZm9ybXMgZmlsZS13YXRjaGluZyBhbmQgcmVidWlsZCB0cmlnZ2VyaW5nLlxuICpcbiAqIFRoZSBpbnRlcm5hbCBXYXRjaGVyIGRvZXNuJ3QgYWxsb3cgZm9yIGRlbGF5aW5nIHRoZSB0cmlnZ2VyZWQgcmVidWlsZDsgYXMgc29vbiBhcyBjaGFuZ2VzIGFyZVxuICogc2VlbiwgaXQgc3RhcnRzIHJlYnVpbGRpbmcuXG4gKlxuICogSG93ZXZlciwgaW4gRGVuYWxpJ3MgY2FzZSwgd2hpbGUgcnVubmluZyB0ZXN0cywgaWYgQnJvY2NvbGkgdHJpZ2dlcnMgYSByZWJ1aWxkIGl0IHdpbGwgd2lwZSBvdXRcbiAqIHRoZSBidWlsdCBmaWxlcyBpbW1lZGlhdGVseS4gVGhpcyBtZWFucyB0aGF0IHRoZSBpbi1mbGlnaHQgdGVzdHMgd2lsbCBjb250aW51ZSBydW5uaW5nLCBidXQgdGhlXG4gKiBzb3VyY2UgZmlsZXMgd2lsbCBiZSB3aXBlZCBvdXQsIHJlc3VsdGluZyBpbiBjcnlwdGljIGFuZCBiaXphcnJlIGVycm9ycy5cbiAqXG4gKiBTbyB3ZSBwYXRjaCB0aGUgV2F0Y2hlciBjbGFzcyBoZXJlIHRvIGFsbG93IHVzIHRvIGNhcHR1cmUgYW5kIGRlbGF5IHRoZSByZWJ1aWxkIHNpZ25hbCB1bnRpbFxuICogc29tZSBhcmJpdHJhcnkgYXN5bmMgY29uZGl0aW9uIGlzIGZ1bGZpbGxlZCAoaW4gb3VyIGNhc2UsIHVudGlsIHRoZSB0ZXN0IHByb2Nlc3MgaXMgY29tcGxldGVseVxuICoga2lsbGVkKS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGF1c2luZ1dhdGNoZXIgZXh0ZW5kcyBXYXRjaGVyIHtcblxuICAvKipcbiAgICogSXMgdGhlIHdhdGNoZXIgY3VycmVudGx5IHJlYWR5IHRvIHN0YXJ0IGEgcmVidWlsZD9cbiAgICovXG4gIHB1YmxpYyByZWFkeUZvclJlYnVpbGQgPSBmYWxzZTtcblxuICAvKipcbiAgICogSXMgYSBwcmVidWlsZCBjdXJyZW50bHkgaW4gcHJvZ3Jlc3M/XG4gICAqL1xuICBwdWJsaWMgcHJlYnVpbGRJblByb2dyZXNzID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGludm9rZWQgd2hlbiB0aGVyZSBhcmUgY2hhbmdlcywgYnV0IGJlZm9yZSB0aGUgcmVidWlsZCBpcyB0cmlnZ2VyZWQuIElmIGEgcHJvbWlzZSBpc1xuICAgKiByZXR1cm5lZCwgdGhlIHJlYnVpbGQgd2lsbCB3YWl0IHVudGlsIHRoZSBwcm9taXNlIHJlc29sdmVzIGJlZm9yZSBzdGFydGluZy5cbiAgICovXG4gIHB1YmxpYyBiZWZvcmVSZWJ1aWxkOiAoKSA9PiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcblxuICBjb25zdHJ1Y3Rvcih0cmVlOiBUcmVlLCBvcHRpb25zOiB7IGJlZm9yZVJlYnVpbGQoKTogUHJvbWlzZTx2b2lkPiB8IHZvaWQsIGludGVydmFsOiBudW1iZXIgfSkge1xuICAgIHN1cGVyKHRyZWUsIG9wdGlvbnMpO1xuICAgIHRoaXMuYmVmb3JlUmVidWlsZCA9IG9wdGlvbnMuYmVmb3JlUmVidWlsZCB8fCBub29wO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoIHRoZSBkZXRlY3RDaGFuZ2VzIHRvIGhpZGUgY2hhbmdlcyB1bnRpbCBiZWZvcmVSZWJ1aWxkIHJlc29sdmVzXG4gICAqL1xuICBwdWJsaWMgZGV0ZWN0Q2hhbmdlcygpIHtcbiAgICBsZXQgY2hhbmdlZERpcnMgPSBzdXBlci5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgaWYgKGNoYW5nZWREaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICghdGhpcy5yZWFkeUZvclJlYnVpbGQpIHtcbiAgICAgICAgaWYgKCF0aGlzLnByZWJ1aWxkSW5Qcm9ncmVzcykge1xuICAgICAgICAgIHRoaXMucHJlYnVpbGRJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICByZXNvbHZlKHRoaXMuYmVmb3JlUmVidWlsZCgpKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVhZHlGb3JSZWJ1aWxkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMucHJlYnVpbGRJblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVhZHlGb3JSZWJ1aWxkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZW1pdCgnYnVpbGRzdGFydCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZERpcnM7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG59XG4iXX0=