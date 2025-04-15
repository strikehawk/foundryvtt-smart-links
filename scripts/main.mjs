import { Logger } from "./logger.mjs";
import { Enrichers } from "./enrichers.mjs";

Hooks.once("init", function () {
    Logger.log("Starting initialization.");

    Enrichers.init();
});

Hooks.once("ready", () => {
    Enrichers.ready();
})