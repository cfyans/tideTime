'use strict';

var request = require('request');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
		console.log("ID - " + context.System.device.deviceId);
		console.log("Consent - " + context.System.user.permissions.consentToken);
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);
		context.fail("testing");
        //Uncomment this if statement and populate with your skill's application ID to
        //prevent someone else from configuring a skill that sends requests to this function.
		if (event.session.application.applicationId !== "amzn1.ask.skill.f72b8e78-0918-4644-ba88-e178c253e8ea") {
			context.fail("Invalid Application ID");
		 }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};


//Called when the session starts.
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

//Called when the user invokes the skill without specifying what they want.
function onLaunch(launchRequest, session, callback) {
    //console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);

    var cardTitle = "Tide Times";
    var speechOutput = "You can ask Tide Times to give you the low and high tide times for today at your location";
    callback(session.attributes, buildSpeechletResponse(cardTitle, speechOutput, "", true));
}


//Called when the user specifies an intent for this skill.
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent;
    var intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if (intentName == 'TideTimes') {
        handleTideTimesRequest(intent, session, callback);
    }
    else {
        throw "Invalid intent";
    }
}


//Called when the user ends the session.
//Is not called when the skill returns shouldEndSession=true.
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
    // Add any cleanup logic here
}

function handleTideTimesRequest(intent, session, callback) {
	//get current date in seconds for tide API call:
	//var date = new Date();
	//var seconds = Math.round(date.getTime() / 1000);
	
	//params for tide API call:
	var apiURL = "https://www.worldtides.info/api";
	var apiKey = "&key=0280cdbe-614c-4382-b192-322871397487";
	var params = "?extremes" +
					"&lat=54.579269" +
					"&lon=-5.640846";

	//make tide API request:					
	request({
		url: apiURL + params + apiKey,
		method: "GET",
		json:true,
	}, function (error, response){
		
		//parse low/high tide times from first two extremes:
		var firstTide = getTideAndTime(response.body.extremes[0]);
		var secondTide = getTideAndTime(response.body.extremes[1]);
		//construct outpust phrasing strings:
		firstTide = firstTide.tideType + " tide is at " + firstTide.tideTime;
		secondTide = secondTide.tideType + " tide is at " + secondTide.tideTime;
		
		//make callback response:
		callback(session.attributes, buildSpeechletResponseWithoutCard("Today " + firstTide + ", " + secondTide, "", "true"));
	});
}

function getTideAndTime(tideObject) {
	var tideType = tideObject.type;
	var tideTime = "no time information";
	var dateTime = new Date(0); // The 0 there is the key, which sets the date to the epoch
	dateTime.setUTCSeconds(tideObject.dt);
	dateTime = dateTime.toTimeString();
	dateTime = dateTime.split(" ");
	tideTime = dateTime[0];

	return {tideType : tideType,
			tideTime : tideTime};
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
