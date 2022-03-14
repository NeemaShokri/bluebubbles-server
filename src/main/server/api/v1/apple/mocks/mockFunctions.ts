
export const isEmpty = (value: string | Array<any> | NodeJS.Dict<any>, trim = true): boolean => {
    return !isNotEmpty(value, trim);
};

export const isNotEmpty = (value: string | Array<any> | NodeJS.Dict<any>, trim = true): boolean => {
    if (!value) return false;

    // Handle if the input is a string
    if (typeof value === "string" && (trim ? (value as string).trim() : value).length > 0) return true;

    // Handle if the input is a list
    if (typeof value === "object" && Array.isArray(value)) {
        if (trim) return value.filter(i => isNotEmpty(i)).length > 0;
        return value.length > 0;
    }

    // Handle if the input is a dictionary
    if (typeof value === "object" && !Array.isArray(value)) return Object.keys(value).length > 0;

    // If all fails, it's not empty
    return true;
};

export const escapeOsaExp = (input: string) => {
    return input
        .replace(/\\/g, "\\\\\\\\") // Replace backslash with 4 backslashes (yes, this is on purpose)
        .replace(/"/g, '\\\\"') // Replace double quote with escaped double quote (2 backslashes)
        .replace(/\$/g, "\\$") // Replace $ with escaped $ (1 backslash)
        .replace(/`/g, "\\`") // Replace ` with escaped ` (1 backslashes)
        .replace(/\r?\n/g, "\\n"); // Replace returns with explicit new line character
};


export const buildMessageScript = (message: string, target = "targetBuddy") => {
    let messageScpt = "";
    if (isNotEmpty(message)) {
        messageScpt = `send "${escapeOsaExp(message)}" to ${target}`;
    }

    return messageScpt;
};

export const getAddressFromInput = (value: string) => {
    // This should always produce an array of minimum length, 1
    const valSplit = value.split(";");

    // If somehow the length is 0, just return the input
    if (isEmpty(valSplit)) return value;

    // Return the "last" index in the array (or the 0th)
    return valSplit[valSplit.length - 1];
};

export const getServiceFromInput = (value: string) => {
    // This should always produce an array of minimum length, 1
    const valSplit = value.split(";");

    // If we have 0 or 1 items, it means there is no `;` character
    // so we should default to iMessage
    if (valSplit.length <= 1) return "iMessage";

    // Otherwise, return the "first" index in the array,
    return valSplit[0];
};
