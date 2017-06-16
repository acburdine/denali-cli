"use strict";
/**
 * Convenience method for creating a timer that calculates seconds elapsed to 3 decimal places
 */
function timer() {
    let start = process.hrtime();
    return {
        start,
        /**
         * Stop the timer and return the elapsed seconds to 3 decimal places as a string
         */
        stop() {
            let [sec, ns] = process.hrtime(start);
            return (sec + (ns / 1e9)).toFixed(3);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = timer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdGltZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUtBOztHQUVHO0FBQ0g7SUFDRSxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0IsTUFBTSxDQUFDO1FBQ0wsS0FBSztRQUNMOztXQUVHO1FBQ0gsSUFBSTtZQUNGLElBQUksQ0FBRSxHQUFHLEVBQUUsRUFBRSxDQUFFLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQztLQUNGLENBQUM7QUFDSixDQUFDOztBQVpELHdCQVlDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGludGVyZmFjZSBUaW1lciB7XG4gIHN0YXJ0OiBbIG51bWJlciwgbnVtYmVyIF07XG4gIHN0b3AoKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIENvbnZlbmllbmNlIG1ldGhvZCBmb3IgY3JlYXRpbmcgYSB0aW1lciB0aGF0IGNhbGN1bGF0ZXMgc2Vjb25kcyBlbGFwc2VkIHRvIDMgZGVjaW1hbCBwbGFjZXNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZXIoKTogVGltZXIge1xuICBsZXQgc3RhcnQgPSBwcm9jZXNzLmhydGltZSgpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0LFxuICAgIC8qKlxuICAgICAqIFN0b3AgdGhlIHRpbWVyIGFuZCByZXR1cm4gdGhlIGVsYXBzZWQgc2Vjb25kcyB0byAzIGRlY2ltYWwgcGxhY2VzIGFzIGEgc3RyaW5nXG4gICAgICovXG4gICAgc3RvcCgpIHtcbiAgICAgIGxldCBbIHNlYywgbnMgXSA9IHByb2Nlc3MuaHJ0aW1lKHN0YXJ0KTtcbiAgICAgIHJldHVybiAoc2VjICsgKG5zIC8gMWU5KSkudG9GaXhlZCgzKTtcbiAgICB9XG4gIH07XG59XG4iXX0=