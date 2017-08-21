var Alexa = require('alexa-sdk');
var request = require('request');
var NodeGeocoder = require('node-geocoder');

var AlexaDeviceAddressClient = require('./AlexaDeviceAddressClient');


exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context, callback);
	
	//register intent handlers:
	alexa.registerHandlers(handlers);
	
	alexa.execute();
	
};

var handlers = {
	'TideTimes': function () {		
		var address = getAddressHandler();
		this.emit(':tell', address);
		
		//var that = this;
		
		//get tide times & return string:
		//getTideTimes(function(tideTimes){
		//	//console.log("tideTimes = " + currentTideTimes);
		//	that.emit(':tell', tideTimes);
		//});
	},
	'TideTimesLocation': function () {
		var location = this.event.request.intent.slots.location.value;
		//this.emit(':tell', location);
		var that = this;
		getLatLongFromLocation(location, function(locationDetails){
			
			var outputString = locationDetails.latitude + " " + locationDetails.longitude + " " + locationDetails.city + " " + locationDetails.country;
			
			getTideTimes(locationDetails, function(tideTimes){
				var outputString = tideTimes + " In " + locationDetails.city + ", " + locationDetails.country;
				that.emit(':tell', outputString);
			});
		});
	}
};

function getLatLongFromLocation(location, callback) {
	var geocoderOpts = {
		provider: 'google',
		httpAdapter: 'https',
	};

	var geocoder = NodeGeocoder(geocoderOpts);
	
	geocoder.geocode(location, function ( err, data ) {
		if(err) {
			callback(null);
		}
		else {
			locationDetails = {};
			locationDetails.latitude = data[0].latitude;
			locationDetails.longitude = data[0].longitude;
			if(data[0].city) locationDetails.city = data[0].city;
			else locationDetails.city = location;
			locationDetails.country = data[0].country;
			
			callback(locationDetails);
		}		
	});
}

function getTideTimes(locationDetails, callback) {
	//console.log("getTideTimes");
	//get current date in seconds for tide API call:
	//var date = new Date();
	//var seconds = Math.round(date.getTime() / 1000);
	
	//params for tide API call:
	var apiURL = "https://www.worldtides.info/api";
	var apiKey = "&key=0280cdbe-614c-4382-b192-322871397487";
	var params = "?extremes" +
					"&lat=" + locationDetails.latitude +
					"&lon=" + locationDetails.longitude;

	//var params = "?extremes" +
	//				"&lat=54.579269" +
	//				"&lon=-5.640846";

	//make tide API request:					
	request({
		url: apiURL + params + apiKey,
		method: "GET",
		json:true,
	}, function (error, response){
		if(error) {
			return "Error, no tide times available.";
		}
		else {
			//parse low/high tide times from first two extremes:
			var firstTide = getTideAndTime(response.body.extremes[0]);
			var secondTide = getTideAndTime(response.body.extremes[1]);
			//construct outpust phrasing strings:
			firstTide = firstTide.tideType + " tide is at " + firstTide.tideTime;
			secondTide = secondTide.tideType + " tide is at " + secondTide.tideTime;

			//make response:			
			var tideTimesString = "Today " + firstTide + ", " + secondTide;
			//console.log("TTS = " + tideTimesString);
			
			callback(tideTimesString);
		}
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

function getAddressHandler() {
	try {
			const consentToken = this.event.context.System.user.permissions.consentToken;
		} catch (e) {
			return "Belfast";
		}

    // If we have not been provided with a consent token, this means that the user has not
    // authorized your skill to access this information. In this case, you should prompt them
    // that you don't have permissions to retrieve their address.
    if(!consentToken) {
        this.emit(":tellWithPermissionCard", Messages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);

        // Lets terminate early since we can't do anything else.
        //console.log("User did not give us permissions to access their address.");
        //console.info("Ending getAddressHandler()");
        return;
    }

    const deviceId = this.event.context.System.device.deviceId;
    const apiEndpoint = this.event.context.System.apiEndpoint;

    const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);
    let deviceAddressRequest = alexaDeviceAddressClient.getFullAddress();

    deviceAddressRequest.then((addressResponse) => {
        switch(addressResponse.statusCode) {
            case 200:
                //console.log("Address successfully retrieved, now responding to user.");
                const address = addressResponse.address;

                const ADDRESS_MESSAGE = Messages.ADDRESS_AVAILABLE +
                    `${address['addressLine1']}, ${address['stateOrRegion']}, ${address['postalCode']}`;

                this.emit(":tell", ADDRESS_MESSAGE);
                break;
            case 204:
                // This likely means that the user didn't have their address set via the companion app.
                console.log("Successfully requested from the device address API, but no address was returned.");
                this.emit(":tell", Messages.NO_ADDRESS);
                break;
            case 403:
                console.log("The consent token we had wasn't authorized to access the user's address.");
                this.emit(":tellWithPermissionCard", Messages.NOTIFY_MISSING_PERMISSIONS, PERMISSIONS);
                break;
            default:
                this.emit(":ask", Messages.LOCATION_FAILURE, Messages.LOCATION_FAILURE);
        }

        //console.info("Ending getAddressHandler()");
    });

    deviceAddressRequest.catch((error) => {
        this.emit(":tell", Messages.ERROR);
        console.error(error);
        console.info("Ending getAddressHandler()");
    });
}
