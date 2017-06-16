export interface Timer {
    start: [number, number];
    stop(): string;
}
/**
 * Convenience method for creating a timer that calculates seconds elapsed to 3 decimal places
 */
export default function timer(): Timer;
