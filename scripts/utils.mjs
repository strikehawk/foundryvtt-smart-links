import { Logger } from "./logger.mjs";

/**
 * Strip the specified pattern from the start and end of the specified string.
 * @param {string} value The string to trim.
 * @param {string} pattern The pattern to search.
 * @returns {string} The stripped value.
 */
export function trim(value, pattern) {
    if (typeof value !== "string") {
        throw new Error("value must be a string");
    }

    if (typeof pattern !== "string") {
        throw new Error("pattern must be a string");
    }

    if (value.startsWith(pattern)) {
        value = value.substring(pattern.length);
    }

    if (value.endsWith(pattern)) {
        value = value.substring(0, value.length - pattern.length);
    }

    return value;
}

/**
 * Parse the content of the tag to extract the different informations.
 * @param {string} content The text to parse.
 * @param {string[]} supportedParameters The allowed parameter keys.
 * @returns {Map<string,string>} The map of parameters.
 */
export function parseTag(content, supportedParameters) {
    if (typeof content !== "string") {
        throw new Error("Content must be a string");
    }

    if (!Array.isArray(supportedParameters)) {
        throw new Error("Supported parameters must be an array.");
    }

    /** @type {Map<string,string>} */
    const params = new Map();

    // parse content chain
    const re = new RegExp('(?:^|\\s+)("[^"]*")(?:$|\\s+)|([^ \\n\\t\\r\\0]+)', "gm");

    // get all matches on the content string
    let matches = [...content.matchAll(re)];

    // extract group 1 or 2 for each match
    // first match is always the identifier, extra parameters are named

    /** @type {string} */
    let val;

    let i = 0;

    for (const m of matches) {
        val = m[1] || m[2];
        if (!val) {
            // none of the group matched
            continue;
        }

        if (i === 0) {
            params.set("identifier", trim(val, '"'));
        } else {
            // assume val is a named parameter
            for (const p of supportedParameters) {
                if (val.startsWith(p)) {
                    val = val.substring(p.length + 1);
                    val = trim(val, '"');
                    params.set(p, val);
                    break;
                }
            }
        }

        i++;
    }

    return params;
}

/**
 * Get a Document by its UUID, or its name and type.
 * @param {string} identifier The identifier of the docuent. It can be the UUID, or the name. If the name is provided, parameter `type` should be provided as well.
 * @param {string} [type] The type of the document (one of the following values: `User`, `Folder`, `Actor`, `Item`, `Scene`, `Combat`, `JournalEntry`, `Macro`, `Playlist`, `RollTable`, `Cards`, `ChatMessage`, `Setting`, `FogExploration`). If not specified, `identifier` is assumed to be a UUID.
 * @param {boolean} [checkUuid] True if `identifier` should be checked as a possible UUID, even if `type` is present.
 * @returns {object} The document if it could be found; otherwise undefined.
 */
export async function getDocument(identifier, type, checkUuid) {
    if (typeof identifier !== "string") {
        throw new Error("Identifier must be a string");
    }

    if (type && typeof type !== "string") {
        throw new Error("Type must be a string");
    }

    let doc;

    if (!type || checkUuid) {
        // assume identifier is a UUID
        try {
            doc = await fromUuid(identifier);
            return doc;
        } catch (error) {
            Logger.error(error);
            return undefined;
        }
    }

    if (type) {
        // ensure type is a valid collection key
        /** @type {Map} */
        const collections = game.collections;
        if (!collections.has(type)) {
            Logger.warn(`Type '${type}' is not a valid collection key.`);
            return undefined;
        }

        // assume identifier is a name to find in collection
        const collection = game.collections.get(type);
        doc = collection.getName(identifier);
    }

    if (!doc) {
        const typeStr = type ? ` (type '${type}')` : "";
        Logger.warn(`Could not find document '${identifier}'${typeStr}`);
        return undefined;
    }

    return doc;
}