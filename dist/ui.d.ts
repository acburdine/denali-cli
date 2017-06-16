declare var _default: {
    loglevel: string;
    raw(level: string, output: string): void;
    debug(...msgs: any[]): void;
    info(...msgs: any[]): void;
    warn(...msgs: any[]): void;
    error(...msgs: any[]): void;
    success(...msgs: any[]): void;
};
export default _default;
