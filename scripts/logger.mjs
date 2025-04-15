const PREFIX = "Strikehawk's Smart Links";

export class Logger {
    static log(msg) {
        console.log(`${PREFIX} | ${msg}`);
    }

    static warn(msg) {
        console.warn(`${PREFIX} | ${msg}`);
    }

    static error(msg) {
        console.error(`${PREFIX} | ${msg}`);
    }
}