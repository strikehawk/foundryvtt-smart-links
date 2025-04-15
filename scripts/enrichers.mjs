import { Logger } from "./logger.mjs";

class SmartLink {
    #label = undefined;
    #pattern = undefined;
    #cssClasses = [];

    get label() {
        return this.#label;
    }

    get regexPattern() {
        return this.#pattern;
    }

    get cssClasses() {
        return this.#cssClasses;
    }

    constructor(label, pattern, cssClasses) {
        this.#label = label;
        this.#pattern = pattern;
        this.#cssClasses = cssClasses;
    }

    register() {
        try {
            const config = this.toConfig();
            CONFIG.TextEditor.enrichers.push(config);
            Logger.log(`${this.label} registered.`);
        } catch (error) {
            Logger.error(error);
        }
    }

    toConfig() {
        const options = {
            pattern: this.regexPattern,
            enricher: (match, options) => this.enrich(match, options)
        };

        return options;
    }

    async enrich(match, options) { }

    setupUiListeners() { }

    innerGetCssSelector() {
        return "." + this.#cssClasses.join(".");
    }
}

class SmartRoll extends SmartLink {
    constructor() {
        super(
            "Smart Roll",
            "@SmartRoll\\[(.+)\\]\\{(.+)\\}",
            ["content-link", "strikehawk-smart-roll"]
        )
    }

    async enrich(match, options) {
        const a = document.createElement("a");
        a.className = this.cssClasses.join(" ");
        a.dataset.type = "RollTable";
        a.dataset.identifier = match[1];
        a.innerHTML = `<i class="fas fa-dice"></i>${match[2]}`;

        return a;
    }

    setupUiListeners() {
        $(document).on("click", this.innerGetCssSelector(), function (event) {
            const a = event.target;
            const identifier = a.dataset.identifier;

            let table = game.tables.getName(identifier) || game.tables.get(identifier);
            if (!table) {
                Logger.error(`Could find Rollable Table ${identifier}`);
                ui.notifications.error(`Could find Rollable Table ${identifier}`);
                return;
            }

            table.draw();
        });
    }
}

/**
 * Enrichers management for the module.
 */
export class Enrichers {
    static #smartRoll = new SmartRoll();

    /**
     * Logic run in 'init' Hook.
     */
    static init() {
        Enrichers.#smartRoll.register();
        Logger.log("Enrichers set up.");
    }

    /**
     * Logic run in 'ready' Hook.
     */
    static ready() {
        Enrichers.#smartRoll.setupUiListeners();
        Logger.log("Enrichers UI listeners set up.");
    }
}