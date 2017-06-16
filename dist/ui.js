"use strict";
const chalk = require("chalk");
// tslint:disable:no-console no-invalid-this
let loglevels = [
    'debug',
    'info',
    'success',
    'warn',
    'error',
    'silent'
];
let env = process.env.DENALI_ENV || process.env.NODE_ENV || 'development';
let defaultLevels = {
    development: 'debug',
    test: 'info',
    production: 'info'
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    loglevel: defaultLevels[env],
    /**
     * Print `output` the stdout stream as-is, with no additional newline or formatting.
     */
    raw(level, output) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf(level)) {
            process.stdout.write(output || '');
        }
    },
    /**
     * Log out at the 'debug' level
     */
    debug(...msgs) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf('debug')) {
            msgs = msgs.map((msg) => chalk.cyan(msg));
            console.log(msgs.shift(), ...msgs);
        }
    },
    /**
     * Log out at the 'info' level
     */
    info(...msgs) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf('info')) {
            console.log(msgs.shift(), ...msgs);
        }
    },
    /**
     * Log out at the 'warn' level
     */
    warn(...msgs) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf('warn')) {
            msgs = msgs.map((msg) => chalk.yellow(msg));
            console.log(msgs.shift(), ...msgs);
        }
    },
    /**
     * Log out at the 'error' level
     */
    error(...msgs) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf('error')) {
            msgs = msgs.map((msg) => chalk.red(msg));
            console.error(msgs.shift(), ...msgs);
        }
    },
    /**
     * Log out at the 'success' level
     */
    success(...msgs) {
        if (loglevels.indexOf(this.loglevel) <= loglevels.indexOf('success')) {
            msgs = msgs.map((msg) => chalk.green(msg));
            console.log(msgs.shift(), ...msgs);
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdWkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtCQUErQjtBQUUvQiw0Q0FBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUc7SUFDZCxPQUFPO0lBQ1AsTUFBTTtJQUNOLFNBQVM7SUFDVCxNQUFNO0lBQ04sT0FBTztJQUNQLFFBQVE7Q0FDVCxDQUFDO0FBRUYsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksYUFBYSxDQUFDO0FBRTFFLElBQUksYUFBYSxHQUE4QjtJQUM3QyxXQUFXLEVBQUUsT0FBTztJQUNwQixJQUFJLEVBQUUsTUFBTTtJQUNaLFVBQVUsRUFBRSxNQUFNO0NBQ25CLENBQUM7O0FBRUYsa0JBQWU7SUFDYixRQUFRLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQztJQUM1Qjs7T0FFRztJQUNILEdBQUcsQ0FBQyxLQUFhLEVBQUUsTUFBYztRQUMvQixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUM7UUFDckMsQ0FBQztJQUNILENBQUM7SUFDRDs7T0FFRztJQUNILEtBQUssQ0FBQyxHQUFHLElBQVc7UUFDbEIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQztJQUNILENBQUM7SUFDRDs7T0FFRztJQUNILElBQUksQ0FBQyxHQUFHLElBQVc7UUFDakIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNyQyxDQUFDO0lBQ0gsQ0FBQztJQUNEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLEdBQUcsSUFBVztRQUNqQixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNyQyxDQUFDO0lBQ0gsQ0FBQztJQUNEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEdBQUcsSUFBVztRQUNsQixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0gsQ0FBQztJQUNEOztPQUVHO0lBQ0gsT0FBTyxDQUFDLEdBQUcsSUFBVztRQUNwQixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNyQyxDQUFDO0lBQ0gsQ0FBQztDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGFsayBmcm9tICdjaGFsayc7XG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgbm8taW52YWxpZC10aGlzXG5cbmxldCBsb2dsZXZlbHMgPSBbXG4gICdkZWJ1ZycsXG4gICdpbmZvJyxcbiAgJ3N1Y2Nlc3MnLFxuICAnd2FybicsXG4gICdlcnJvcicsXG4gICdzaWxlbnQnXG5dO1xuXG5sZXQgZW52ID0gcHJvY2Vzcy5lbnYuREVOQUxJX0VOViB8fCBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAnZGV2ZWxvcG1lbnQnO1xuXG5sZXQgZGVmYXVsdExldmVsczogeyBbZW52OiBzdHJpbmddOiBzdHJpbmcgfSA9IHtcbiAgZGV2ZWxvcG1lbnQ6ICdkZWJ1ZycsXG4gIHRlc3Q6ICdpbmZvJyxcbiAgcHJvZHVjdGlvbjogJ2luZm8nXG59O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGxvZ2xldmVsOiBkZWZhdWx0TGV2ZWxzW2Vudl0sXG4gIC8qKlxuICAgKiBQcmludCBgb3V0cHV0YCB0aGUgc3Rkb3V0IHN0cmVhbSBhcy1pcywgd2l0aCBubyBhZGRpdGlvbmFsIG5ld2xpbmUgb3IgZm9ybWF0dGluZy5cbiAgICovXG4gIHJhdyhsZXZlbDogc3RyaW5nLCBvdXRwdXQ6IHN0cmluZykge1xuICAgIGlmIChsb2dsZXZlbHMuaW5kZXhPZih0aGlzLmxvZ2xldmVsKSA8PSBsb2dsZXZlbHMuaW5kZXhPZihsZXZlbCkpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG91dHB1dCB8fCAnJyk7XG4gICAgfVxuICB9LFxuICAvKipcbiAgICogTG9nIG91dCBhdCB0aGUgJ2RlYnVnJyBsZXZlbFxuICAgKi9cbiAgZGVidWcoLi4ubXNnczogYW55W10pIHtcbiAgICBpZiAobG9nbGV2ZWxzLmluZGV4T2YodGhpcy5sb2dsZXZlbCkgPD0gbG9nbGV2ZWxzLmluZGV4T2YoJ2RlYnVnJykpIHtcbiAgICAgIG1zZ3MgPSBtc2dzLm1hcCgobXNnKSA9PiBjaGFsay5jeWFuKG1zZykpO1xuICAgICAgY29uc29sZS5sb2cobXNncy5zaGlmdCgpLCAuLi5tc2dzKTtcbiAgICB9XG4gIH0sXG4gIC8qKlxuICAgKiBMb2cgb3V0IGF0IHRoZSAnaW5mbycgbGV2ZWxcbiAgICovXG4gIGluZm8oLi4ubXNnczogYW55W10pIHtcbiAgICBpZiAobG9nbGV2ZWxzLmluZGV4T2YodGhpcy5sb2dsZXZlbCkgPD0gbG9nbGV2ZWxzLmluZGV4T2YoJ2luZm8nKSkge1xuICAgICAgY29uc29sZS5sb2cobXNncy5zaGlmdCgpLCAuLi5tc2dzKTtcbiAgICB9XG4gIH0sXG4gIC8qKlxuICAgKiBMb2cgb3V0IGF0IHRoZSAnd2FybicgbGV2ZWxcbiAgICovXG4gIHdhcm4oLi4ubXNnczogYW55W10pIHtcbiAgICBpZiAobG9nbGV2ZWxzLmluZGV4T2YodGhpcy5sb2dsZXZlbCkgPD0gbG9nbGV2ZWxzLmluZGV4T2YoJ3dhcm4nKSkge1xuICAgICAgbXNncyA9IG1zZ3MubWFwKChtc2cpID0+IGNoYWxrLnllbGxvdyhtc2cpKTtcbiAgICAgIGNvbnNvbGUubG9nKG1zZ3Muc2hpZnQoKSwgLi4ubXNncyk7XG4gICAgfVxuICB9LFxuICAvKipcbiAgICogTG9nIG91dCBhdCB0aGUgJ2Vycm9yJyBsZXZlbFxuICAgKi9cbiAgZXJyb3IoLi4ubXNnczogYW55W10pIHtcbiAgICBpZiAobG9nbGV2ZWxzLmluZGV4T2YodGhpcy5sb2dsZXZlbCkgPD0gbG9nbGV2ZWxzLmluZGV4T2YoJ2Vycm9yJykpIHtcbiAgICAgIG1zZ3MgPSBtc2dzLm1hcCgobXNnKSA9PiBjaGFsay5yZWQobXNnKSk7XG4gICAgICBjb25zb2xlLmVycm9yKG1zZ3Muc2hpZnQoKSwgLi4ubXNncyk7XG4gICAgfVxuICB9LFxuICAvKipcbiAgICogTG9nIG91dCBhdCB0aGUgJ3N1Y2Nlc3MnIGxldmVsXG4gICAqL1xuICBzdWNjZXNzKC4uLm1zZ3M6IGFueVtdKSB7XG4gICAgaWYgKGxvZ2xldmVscy5pbmRleE9mKHRoaXMubG9nbGV2ZWwpIDw9IGxvZ2xldmVscy5pbmRleE9mKCdzdWNjZXNzJykpIHtcbiAgICAgIG1zZ3MgPSBtc2dzLm1hcCgobXNnKSA9PiBjaGFsay5ncmVlbihtc2cpKTtcbiAgICAgIGNvbnNvbGUubG9nKG1zZ3Muc2hpZnQoKSwgLi4ubXNncyk7XG4gICAgfVxuICB9XG59O1xuIl19