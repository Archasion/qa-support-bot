module.exports = () => {
    /**
     * Format a normal string by replacing the placeholders with the given values.
     * @name String#format
     * @returns {string} The string with the placeholders replaced with pre-set values.
     * @function
     */
    String.prototype.format = function () {
        return this.replace(/<br>/gi, "\n")
            .replace(/\\n/gi, "\n")
            .replace(/\\t/gi, "\t")
            .replace(/\\r/gi, "\r")
            .replace(/%n/gi, "\n")
            .replace(/%t/gi, "\t")
            .replace(/%r/gi, "\r");
    };

    /**
     * Formats a number into a string with commas (if applicable).
     * @name Number#format
     * @returns {string} Formatted number (seperated by commas if applicable)
     * @function
     */
    Number.prototype.format = function (seperator = ",") {
        return this.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${seperator}`);
    };
};
