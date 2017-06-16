declare var _default: {
    start(msg: string): Promise<void>;
    succeed(msg?: string): Promise<void>;
    fail(msg?: string): Promise<void>;
    finish(symbol: string, text: string): Promise<void>;
};
export default _default;
