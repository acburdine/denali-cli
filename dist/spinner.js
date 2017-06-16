"use strict";
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const path = require("path");
let childSpinner;
// Each operation issued to the child spinner process gets a UID so we can pair acknowledgements
// with their issuing operation.
let uid = 0;
/**
 * Start the spinner process. Returns a promise that resolves once the spinner process is up and
 * ready to recieve commands. Rejects if the process fails to start up within 5s (mostly as a
 * fail-safe to avoid hanging the program if there's a bug).
 */
function startChildSpinner() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            let fallback = setTimeout(() => reject('Spinner process failed to startup on time'), 4000);
            childSpinner = child_process_1.fork(path.join(__dirname, 'spinner-child.js'));
            childSpinner.send({ operation: 'hello' });
            childSpinner.once('message', () => {
                clearTimeout(fallback);
                resolve();
            });
        });
    });
}
/**
 * Send the operation to the child spinner process. If it's not running, fork a new one. Returns a
 * promise that resolves only once the child spinner process as confirmed the operation ran.
 */
function run(operation, ...args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!childSpinner || !childSpinner.connected) {
            yield startChildSpinner();
        }
        yield new Promise((resolve, reject) => {
            let fallback = setTimeout(() => {
                reject(new Error(`Spinner process failed to acknowledge a command on time: ${operation}(${args.join(', ')})`));
            }, 4000);
            let id = uid++;
            childSpinner.send({ operation, args, id });
            childSpinner.on('message', receiveAck);
            // Wait to resolve the parent promise until we get an ack from the child process.
            function receiveAck(data) {
                if (data.ackId === id) {
                    clearTimeout(fallback);
                    childSpinner.removeListener('message', receiveAck);
                    if (data.finished) {
                        // If the child says it's done, then don't resolve till it fully exits.
                        childSpinner.on('close', () => {
                            resolve();
                        });
                    }
                    else {
                        clearTimeout(fallback);
                        resolve();
                    }
                }
            }
        });
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
     * Start the spinner with the given message
     */
    start(msg) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield run('start', msg);
        });
    },
    /**
     * Stop the spinner, replace the spinner graphic with a checkmark, optionally update the message,
     * and turn it green.
     */
    succeed(msg) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield run('succeed', msg);
        });
    },
    /**
     * Stop the spinner, replace the spinner graphic with an X, optionally update the message, and
     * turn it red.
     */
    fail(msg) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield run('fail', msg);
        });
    },
    /**
     * Stop the spinner, replace the spinner graphic with the supplied symbol and message with the
     * supplied text.
     */
    finish(symbol, text) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield run('finish', symbol, text);
        });
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bpbm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zcGlubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaURBQW1EO0FBRW5ELDZCQUE2QjtBQUU3QixJQUFJLFlBQTBCLENBQUM7QUFFL0IsZ0dBQWdHO0FBQ2hHLGdDQUFnQztBQUNoQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFFWjs7OztHQUlHO0FBQ0g7O1FBQ0UsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNO1lBQ3RDLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxNQUFNLE1BQU0sQ0FBQywyQ0FBMkMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNGLFlBQVksR0FBRyxvQkFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUM5RCxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDMUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQzNCLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdkIsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsYUFBbUIsU0FBaUIsRUFBRSxHQUFHLElBQVc7O1FBQ2xELEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxpQkFBaUIsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU07WUFDdEMsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDO2dCQUN4QixNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsNERBQTZELFNBQVUsSUFBSyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3BILENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNULElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ2YsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzQyxZQUFZLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN2QyxpRkFBaUY7WUFDakYsb0JBQW9CLElBQTJDO2dCQUM3RCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdkIsWUFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQ25ELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUNsQix1RUFBdUU7d0JBQ3ZFLFlBQVksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFOzRCQUN2QixPQUFPLEVBQUUsQ0FBQzt3QkFDWixDQUFDLENBQUMsQ0FBQztvQkFDTCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDdkIsT0FBTyxFQUFFLENBQUM7b0JBQ1osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBOztBQUVELGtCQUFlO0lBQ2I7O09BRUc7SUFDRyxLQUFLLENBQUMsR0FBVzs7WUFDckIsTUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7S0FBQTtJQUNEOzs7T0FHRztJQUNHLE9BQU8sQ0FBQyxHQUFZOztZQUN4QixNQUFNLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztLQUFBO0lBQ0Q7OztPQUdHO0lBQ0csSUFBSSxDQUFDLEdBQVk7O1lBQ3JCLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QixDQUFDO0tBQUE7SUFDRDs7O09BR0c7SUFDRyxNQUFNLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ3ZDLE1BQU0sR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsQ0FBQztLQUFBO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZvcmssIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZnJvbU5vZGUsIGRlbGF5IH0gZnJvbSAnYmx1ZWJpcmQnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxubGV0IGNoaWxkU3Bpbm5lcjogQ2hpbGRQcm9jZXNzO1xuXG4vLyBFYWNoIG9wZXJhdGlvbiBpc3N1ZWQgdG8gdGhlIGNoaWxkIHNwaW5uZXIgcHJvY2VzcyBnZXRzIGEgVUlEIHNvIHdlIGNhbiBwYWlyIGFja25vd2xlZGdlbWVudHNcbi8vIHdpdGggdGhlaXIgaXNzdWluZyBvcGVyYXRpb24uXG5sZXQgdWlkID0gMDtcblxuLyoqXG4gKiBTdGFydCB0aGUgc3Bpbm5lciBwcm9jZXNzLiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9uY2UgdGhlIHNwaW5uZXIgcHJvY2VzcyBpcyB1cCBhbmRcbiAqIHJlYWR5IHRvIHJlY2lldmUgY29tbWFuZHMuIFJlamVjdHMgaWYgdGhlIHByb2Nlc3MgZmFpbHMgdG8gc3RhcnQgdXAgd2l0aGluIDVzIChtb3N0bHkgYXMgYVxuICogZmFpbC1zYWZlIHRvIGF2b2lkIGhhbmdpbmcgdGhlIHByb2dyYW0gaWYgdGhlcmUncyBhIGJ1ZykuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0Q2hpbGRTcGlubmVyKCkge1xuICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGZhbGxiYWNrID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QoJ1NwaW5uZXIgcHJvY2VzcyBmYWlsZWQgdG8gc3RhcnR1cCBvbiB0aW1lJyksIDQwMDApO1xuICAgIGNoaWxkU3Bpbm5lciA9IGZvcmsocGF0aC5qb2luKF9fZGlybmFtZSwgJ3NwaW5uZXItY2hpbGQuanMnKSk7XG4gICAgY2hpbGRTcGlubmVyLnNlbmQoeyBvcGVyYXRpb246ICdoZWxsbycgfSk7XG4gICAgY2hpbGRTcGlubmVyLm9uY2UoJ21lc3NhZ2UnLCAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQoZmFsbGJhY2spO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBTZW5kIHRoZSBvcGVyYXRpb24gdG8gdGhlIGNoaWxkIHNwaW5uZXIgcHJvY2Vzcy4gSWYgaXQncyBub3QgcnVubmluZywgZm9yayBhIG5ldyBvbmUuIFJldHVybnMgYVxuICogcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9ubHkgb25jZSB0aGUgY2hpbGQgc3Bpbm5lciBwcm9jZXNzIGFzIGNvbmZpcm1lZCB0aGUgb3BlcmF0aW9uIHJhbi5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcnVuKG9wZXJhdGlvbjogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWNoaWxkU3Bpbm5lciB8fCAhY2hpbGRTcGlubmVyLmNvbm5lY3RlZCkge1xuICAgIGF3YWl0IHN0YXJ0Q2hpbGRTcGlubmVyKCk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBmYWxsYmFjayA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcihgU3Bpbm5lciBwcm9jZXNzIGZhaWxlZCB0byBhY2tub3dsZWRnZSBhIGNvbW1hbmQgb24gdGltZTogJHsgb3BlcmF0aW9uIH0oJHsgYXJncy5qb2luKCcsICcpIH0pYCkpXG4gICAgfSwgNDAwMCk7XG4gICAgbGV0IGlkID0gdWlkKys7XG4gICAgY2hpbGRTcGlubmVyLnNlbmQoeyBvcGVyYXRpb24sIGFyZ3MsIGlkIH0pO1xuICAgIGNoaWxkU3Bpbm5lci5vbignbWVzc2FnZScsIHJlY2VpdmVBY2spO1xuICAgIC8vIFdhaXQgdG8gcmVzb2x2ZSB0aGUgcGFyZW50IHByb21pc2UgdW50aWwgd2UgZ2V0IGFuIGFjayBmcm9tIHRoZSBjaGlsZCBwcm9jZXNzLlxuICAgIGZ1bmN0aW9uIHJlY2VpdmVBY2soZGF0YTogeyBmaW5pc2hlZD86IGJvb2xlYW4sIGFja0lkOiBudW1iZXIgfSkge1xuICAgICAgaWYgKGRhdGEuYWNrSWQgPT09IGlkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChmYWxsYmFjayk7XG4gICAgICAgIGNoaWxkU3Bpbm5lci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIHJlY2VpdmVBY2spO1xuICAgICAgICBpZiAoZGF0YS5maW5pc2hlZCkge1xuICAgICAgICAgIC8vIElmIHRoZSBjaGlsZCBzYXlzIGl0J3MgZG9uZSwgdGhlbiBkb24ndCByZXNvbHZlIHRpbGwgaXQgZnVsbHkgZXhpdHMuXG4gICAgICAgICAgY2hpbGRTcGlubmVyLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoZmFsbGJhY2spO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgLyoqXG4gICAqIFN0YXJ0IHRoZSBzcGlubmVyIHdpdGggdGhlIGdpdmVuIG1lc3NhZ2VcbiAgICovXG4gIGFzeW5jIHN0YXJ0KG1zZzogc3RyaW5nKSB7XG4gICAgYXdhaXQgcnVuKCdzdGFydCcsIG1zZyk7XG4gIH0sXG4gIC8qKlxuICAgKiBTdG9wIHRoZSBzcGlubmVyLCByZXBsYWNlIHRoZSBzcGlubmVyIGdyYXBoaWMgd2l0aCBhIGNoZWNrbWFyaywgb3B0aW9uYWxseSB1cGRhdGUgdGhlIG1lc3NhZ2UsXG4gICAqIGFuZCB0dXJuIGl0IGdyZWVuLlxuICAgKi9cbiAgYXN5bmMgc3VjY2VlZChtc2c/OiBzdHJpbmcpIHtcbiAgICBhd2FpdCBydW4oJ3N1Y2NlZWQnLCBtc2cpO1xuICB9LFxuICAvKipcbiAgICogU3RvcCB0aGUgc3Bpbm5lciwgcmVwbGFjZSB0aGUgc3Bpbm5lciBncmFwaGljIHdpdGggYW4gWCwgb3B0aW9uYWxseSB1cGRhdGUgdGhlIG1lc3NhZ2UsIGFuZFxuICAgKiB0dXJuIGl0IHJlZC5cbiAgICovXG4gIGFzeW5jIGZhaWwobXNnPzogc3RyaW5nKSB7XG4gICAgYXdhaXQgcnVuKCdmYWlsJywgbXNnKTtcbiAgfSxcbiAgLyoqXG4gICAqIFN0b3AgdGhlIHNwaW5uZXIsIHJlcGxhY2UgdGhlIHNwaW5uZXIgZ3JhcGhpYyB3aXRoIHRoZSBzdXBwbGllZCBzeW1ib2wgYW5kIG1lc3NhZ2Ugd2l0aCB0aGVcbiAgICogc3VwcGxpZWQgdGV4dC5cbiAgICovXG4gIGFzeW5jIGZpbmlzaChzeW1ib2w6IHN0cmluZywgdGV4dDogc3RyaW5nKSB7XG4gICAgYXdhaXQgcnVuKCdmaW5pc2gnLCBzeW1ib2wsIHRleHQpO1xuICB9LFxufTtcbiJdfQ==