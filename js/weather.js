var radarMap;
var activeweatherLoop;
var weatherTiles;
var precipitationTiles;
var temperatureTiles = [];
var temperatureMarkers = [];
var defaultCoordinates = "39.1155,-94.6268";
var temperatureLoaded = false;
var httpRequest = new XMLHttpRequest();
var getClass = document.getElementsByClassName.bind(document);




function apiError(obj) {
	console.log(obj);
	alert("API Error - Temperatures not avaiable.");
}

function fetchTemperatures() {
	httpRequest.open("GET", "https://api.weather.gov/points/" + defaultCoordinates, true);
	try {
		httpRequest.onload = (function () {
			if (httpRequest.status != 200) {
				requestError();
				return;
			}
			let responseObj = JSON.parse(httpRequest.responseText);
			if (responseObj.status) {
				apiError();
				return;
			}

			httpRequest.abort();
			httpRequest.open("GET", responseObj.properties.forecastOffice, true);
			httpRequest.onload = (function () {
				if (httpRequest.status != 200) {
					requestError();
					return;
				}
				var stationObj = JSON.parse(httpRequest.responseText);
				if (stationObj.status) {
					apiError();
					return;
				}
				var stationRequest = new XMLHttpRequest();

				for (let i = 0; i < stationObj.approvedObservationStations.length; i += 4) {
					stationRequest.open("GET", stationObj.approvedObservationStations[i], false); // Cant seem to get it to work async
					stationRequest.send(null);
					if (stationRequest.status != 200) {
						console.warn("Station Error.");
						console.log(stationRequest);
						return;
					}

					let localObj = JSON.parse(stationRequest.responseText);
					let tempWeather = {
						"Name": localObj.properties.name,
						"Position": localObj.geometry.coordinates,
						"id": localObj.properties.forecast.split("/").pop()
					}

					let localRequest = new XMLHttpRequest();
					localRequest.open("GET", "https://api.weather.gov/zones/forecast/" + tempWeather.id + "/observations?limit=1", false);
					localRequest.send(null);
					localObj = JSON.parse(localRequest.responseText);
					tempWeather["Temperature"] = ((localObj.features[0].properties.temperature.value * (9 / 5) + 32).toString().slice(0, 5) + "° F");
					temperatureTiles.push(tempWeather);
					localRequest.abort();
				}
				temperatureLoaded = true;
				getClass("radarOption")[0].click();
			})
			httpRequest.send(null);
		})
	} catch {
		console.log("Temperature Error.");
		temperatureTiles.push({
			"Position": [39.1155, -94.6268],
			"Temperature": "There was an error while retreiving temperatures."
		});
	}
	httpRequest.send(null);
}

// Retrieves the 7 day forecast and sets up event listeners
window.onload = function () {
	let forecastRequest = new XMLHttpRequest();
	forecastRequest.open("GET", "https://api.weather.gov/gridpoints/EAX/41,50/forecast", true);
	forecastRequest.onload = (function () {
		if (forecastRequest.status != 200) {
			console.log(forecastRequest);
			alert("Unable to retreive forecast.");
			return;
		}
		let forecastObj = JSON.parse(forecastRequest.responseText);
		let iconNames = ["clear", "cloudy", "partly sunny", "rain", "snow", "windy", "sunny"];
		let currentName = 0;
		for (let i = 0; i < 7; i++) {
			getClass("forecastTitle")[i].innerHTML = forecastObj.properties.periods[currentName].name;
			getClass("forecastDescription")[i].innerHTML = forecastObj.properties.periods[currentName].detailedForecast;
			getClass("forecastTemperature")[i].innerHTML = forecastObj.properties.periods[i].temperature + " °F";
			for (let z = 0; z < iconNames.length; z++) {
				if (forecastObj.properties.periods[currentName].detailedForecast.search(iconNames[z]) != -1) {
					getClass("forecastIcon")[i].src = "img/icons/" + iconNames[z] + ".png";
					getClass("forecastPhoto")[i].src = "img/weather/" + iconNames[z] + ".png";
					break;

				}


			}
			if (forecastObj.properties.periods[currentName].name == "Tonight") {
				currentName++;
			} else {
				currentName = currentName + 2;
			}
		}
	})
	forecastRequest.send(null);

	// Event functions

	// Temperature
	getClass("radarOption")[0].addEventListener("click", function () {
		if (!temperatureLoaded) {
			alert("Retrieving temperatures. This may take a moment.\n(Page may become unresponsive for a few seconds.)");
			fetchTemperatures();
			return;
		}

		if (getClass("radarOption")[0].style.color == "green") {
			return;
		}
		getClass("radarOption")[0].style = "color: green";
		getClass("radarOption")[1].style = "color: red;";
		getClass("radarOption")[2].style = "color: red;";

		radarMap.overlayMapTypes.clear();
		clearInterval(activeweatherLoop);
		if (temperatureMarkers.length == 0) {
			for (let i = 0; i < temperatureTiles.length; i++) {
				let tempMarker = new google.maps.Marker({
					position: {
						lat: temperatureTiles[i].Position[1],
						lng: temperatureTiles[i].Position[0]
					},
					map: radarMap,
					animation: google.maps.Animation.DROP,
					label: {
						text: temperatureTiles[i].Temperature,
						color: "#34ebe5",
						fontSize: "20px",
						fontWeight: "bold",
					},
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 0
					}
				})
				temperatureMarkers.push(tempMarker);
			}
		} else {
			for (let i = 0; i < temperatureMarkers.length; i++) {
				temperatureMarkers[i].setMap(radarMap);
			}
		}
	})

	// Active Weather
	getClass("radarOption")[1].addEventListener("click", function () {
		if (getClass("radarOption")[1].style.color == "green") {
			return;
		}
		getClass("radarOption")[1].style = "color: green";
		getClass("radarOption")[0].style = "color: red;";
		getClass("radarOption")[2].style = "color: red;";

		radarMap.overlayMapTypes.clear();
		for (let i = 0; i < temperatureMarkers.length; i++) {
			temperatureMarkers[i].setMap(null);
		}

		let counter = 1;
		radarMap.overlayMapTypes.setAt("1", weatherTiles[0]);
		activeweatherLoop = setInterval(function () {
			radarMap.overlayMapTypes.setAt("1", weatherTiles[counter]);
			counter = (++counter) % weatherTiles.length;
		}, 2000);

	})

	// Precipitation
	getClass("radarOption")[2].addEventListener("click", function () {
		if (getClass("radarOption")[2].style.color == "green") {
			return;
		}
		getClass("radarOption")[2].style = "color: green";
		getClass("radarOption")[0].style = "color: red;";
		getClass("radarOption")[1].style = "color: red;";

		radarMap.overlayMapTypes.clear();
		clearInterval(activeweatherLoop);
		for (let i = 0; i < temperatureMarkers.length; i++) {
			temperatureMarkers[i].setMap(null);
		}

		radarMap.overlayMapTypes.setAt("1", precipitationTiles);
	})
}

function loadMap() {
	let timestamps = []
	let defaultCenter = new google.maps.LatLng(39.115, -94.626);
	let weatherURL = "http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-{timestamp}/{zoom}/{x}/{y}.png"
	let precipitationURL = "http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/q2-p24h-900913/{zoom}/{x}/{y}.png"

	// 900913-m[number]m where number specifies how long ago in minutes (maximum of 50)
	for (let i = 10; i > 1; i += -1) {
		timestamps.push("900913-m" + i * 5 + "m");
	};
	timestamps.push("900913-m05m");
	timestamps.push("900913");

	radarMap = new google.maps.Map(document.getElementById("radarMap"), {
		center: defaultCenter,
		zoom: 6, // The higher the number the more zoomed in, The lower the more zoomed out
		mapTypeId: 'terrain',
		draggable: false,
		disableDefaultUI: true
	})

	precipitationTiles = new google.maps.ImageMapType({
		getTileUrl: function (tile, zoom) {
			let tempURL = precipitationURL;
			tempURL = tempURL.replace("{zoom}", zoom);
			tempURL = tempURL.replace("{x}", tile.x);
			tempURL = tempURL.replace("{y}", tile.y);
			return tempURL;

		},
		tileSize: new google.maps.Size(256, 256),
		opacity: 0.6,
		name: 'precipitationWeather',
		isPng: true
	})

	weatherTiles = timestamps.map((timestamp) => {
		return new google.maps.ImageMapType({
			getTileUrl: function (tile, zoom) {
				let tempURL = weatherURL;
				tempURL = tempURL.replace("{timestamp}", timestamp);
				tempURL = tempURL.replace("{zoom}", zoom);
				tempURL = tempURL.replace("{x}", tile.x);
				tempURL = tempURL.replace("{y}", tile.y);
				return tempURL;
			},
			tileSize: new google.maps.Size(256, 256),
			opacity: 0.6,
			name: 'radarWeather',
			isPng: true
		})
	})
}