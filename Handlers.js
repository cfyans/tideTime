'use strict';

//handler for
const newSessionRequestHandler = function() {
    console.info("Starting newSessionRequestHandler()");

    if(this.event.request.type === Events.LAUNCH_REQUEST) {
        this.emit(Events.LAUNCH_REQUEST);
    } else if (this.event.request.type === "IntentRequest") {
        this.emit(this.event.request.intent.name);
    }

    console.info("Ending newSessionRequestHandler()");
};

//construct handlers object:
const handlers = {};
// Add event handlers
handlers[Events.NEW_SESSION] = newSessionRequestHandler;

// Add intent handlers
handlers[Intents.GET_ADDRESS] = getAddressHandler;

module.exports = handlers;