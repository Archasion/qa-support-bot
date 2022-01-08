const EventListener = require("../modules/listeners/listener");

module.exports = class ErrorEventListener extends EventListener {
    constructor(client) {
        super(client, { event: "error" });
    }

    async execute(error) {
        log.warn("The client encountered an error");
        log.error(error);
    }
};
