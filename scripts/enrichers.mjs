import { Logger } from "./logger.mjs";
import { trim, parseTag, getDocument } from "./utils.mjs";

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
            "@SmartRoll\\[([^\\[\\]]+)\\]\\{([^\\{\\}]+)\\}",
            ["content-link", "strk-roll"]
        )
    }

    async enrich(match, options) {
        const identifier = trim(match[1], '"');
        const label = match[2];

        const a = document.createElement("a");
        a.className = this.cssClasses.join(" ");
        a.dataset.identifier = identifier;
        a.dataset.tooltip = `Roll on table '${identifier}'`;
        a.innerHTML = `<i class="fas fa-dice"></i>${label}`;

        return a;
    }

    setupUiListeners() {
        $(document).on("click", this.innerGetCssSelector(), async function (event) {
            const a = event.target;
            const identifier = a.dataset.identifier;

            let table = game.tables.getName(identifier) || game.tables.get(identifier);
            if (!table) {
                table = await fromUuid(identifier);
            }

            if (!table) {
                Logger.error(`Could not find RollTable ${identifier}`);
                ui.notifications.error(`Could not find RollTable ${identifier}`);
                return;
            }

            table.draw();
        });
    }
}

class SmartTooltip extends SmartLink {
    constructor() {
        super(
            "Smart Tooltip",
            "@SmartTooltip\\[([^\\[\\]]+)\\](?:\\{([^\\{\\}]+)\\})?",
            ["content-link", "strk-tooltip"]
        )
    }

    async enrich(match, options) {
        /** @type {string} */
        const content = match[1];
        let label = match[2];

        const supportedParameters = ["type"];
        const params = parseTag(content, supportedParameters);

        const identifier = params.get("identifier");
        const type = params.get("type");

        // check _embedDepth to prevent infinite recursion of embed()
        if (!options?._embedDepth) {
            const doc = await getDocument(identifier, type);
            if (doc) {
                const a = document.createElement("a");
                a.className = this.cssClasses.join(" ");
                const embed = await doc.toEmbed({
                    classes: "small text-left"
                }, options);
                a.dataset.tooltip = embed.outerHTML;

                if (!label) {
                    label = doc.name;
                }

                a.innerHTML = label;

                return a;
            } else {
                return label;
            }
        } else {
            // do not create inline block
            return label;
        }
    }

    async enrich_old(match, options) {
        const identifier = match[1];
        let label = match[2];

        // check _embedDepth to prevent infinite recursion of embed()
        if (!options?._embedDepth) {
            const a = document.createElement("a");
            a.className = this.cssClasses.join(" ");

            const doc = await fromUuid(identifier);
            if (doc) {
                const embed = await doc.toEmbed({
                    classes: "small text-left"
                }, options);
                a.dataset.tooltip = embed.outerHTML;

                if (!label) {
                    label = doc.name;
                }
            }

            a.innerHTML = label;

            return a;
        } else {
            // do not create inline block
            return label;
        }
    }
}

class SmartEmbed extends SmartLink {
    constructor() {
        super(
            "Smart Embed",
            "@SmartEmbed\\[([^\\[\\]]+)\\]"
        )
    }

    async enrich(match, options) {
        /** @type {string} */
        const content = match[1];

        const supportedParameters = ["type", "caption", "cite", "inline", "classes"];
        const params = parseTag(content, supportedParameters);

        const identifier = params.get("identifier");
        const type = params.get("type");

        const doc = await getDocument(identifier, type);
        if (!doc) {
            return;
        }

        // create embed of document
        const config = this.#createEmbedConfig(params);
        const embed = await doc.toEmbed(config);

        return embed;
    }

    /**
     * Create a config object, as expected by method 'toEmbed()'.
     * @param {Map<string, string>} params The map containing the parameters.
     * @returns {object} A config object. 
     */
    #createEmbedConfig(params) {
        const config = {
            values: []
        };

        if (params.has("caption")) {
            config.caption = params.get("caption");
        }

        if (params.has("cite")) {
            config.cite = params.get("cite");
        }

        if (params.has("inline")) {
            config.inline = params.get("inline");
        } else {
            config.inline = true;
        }

        if (params.has("classes")) {
            config.classes = params.get("classes");
        } else {
            config.classes = "strk-embed";
        }

        return config;
    }
}

/**
 * Enrichers management for the module.
 */
export class Enrichers {
    static #smartRoll = new SmartRoll();
    static #smartTooltip = new SmartTooltip();
    static #smartEmbed = new SmartEmbed();

    /**
     * Logic run in 'init' Hook.
     */
    static init() {
        Enrichers.#smartRoll.register();
        Enrichers.#smartTooltip.register();
        Enrichers.#smartEmbed.register();
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