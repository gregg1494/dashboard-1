angular.module('controllers')
.controller('homeController', function($scope, $http) {

	$scope.fields = fields;
	$scope.command = "help";
	$scope.output = "";
	$scope.data = {};
	$scope.dash_output = "";
	$scope.data_error = "";
	$scope.mcu_error = "";

	// Dashboard Log
	$scope.dashClear = function() { $scope.dash_output = ""; };
	$scope.dashLog = function(message) {
		var consoleElem = document.getElementById('dash-console');
		$scope.dash_output += message + "<br>";
		consoleElem.scrollTop = consoleElem.scrollHeight;
	};

	/*************************************************************************/
	/*                        Message Send API Call                          */
	/*************************************************************************/
	$scope.sendCommand = function() {
		$http({
			method: 'GET',
			url: 'http://' + dashboard_ip + ':2000/message?data='
				+ encodeURIComponent($scope.command)
		}).then(function(response) {
			$scope.command = "";
			document.getElementById("mcu-error-msg").style.display = "none";
		}, function(response) {
			$scope.mcu_error = "Couldn't send command!";
			document.getElementById("mcu-error-msg").style.display = "block";
		});
	};

	$scope.sendStringCommand = function(message) {
		$scope.command = message;
		$scope.sendCommand();
	};
	/*************************************************************************/


	/*************************************************************************/
	/*                      Buffer Retrieve API Call                         */
	/*************************************************************************/
	$scope.getData = function() {
		var consoleElem = document.getElementById('console');
		$http({ method: 'GET', url: 'http://' + dashboard_ip + ':2000/buffer' })
		.then(function(response) {
			$scope.output = response.data.replace(/(?:\r\n|\r|\n)/g, '<br />');
			consoleElem.scrollTop = consoleElem.scrollHeight;
			document.getElementById("mcu-error-msg").style.display = "none";
		}, function(response) {
			$scope.mcu_error = "Couldn't get buffer!";
			document.getElementById("mcu-error-msg").style.display = "block";
		});
	};
	/*************************************************************************/


	/*************************************************************************/
	/*                        Buffer Reset API Call                          */
	/*************************************************************************/
	$scope.resetData = function() {
		$http({ method: 'GET', url: 'http://' + dashboard_ip + ':2000/buffer?reset' })
		.then(function(response) {
			document.getElementById("mcu-error-msg").style.display = "none";
		}, function(response) {
			$scope.mcu_error = "Couldn't reset buffer!";
			document.getElementById("mcu-error-msg").style.display = "block";
		});
		$scope.output = "";
	};
	/*************************************************************************/


	/*************************************************************************/
	/*                        Data Retrieve API Call                         */
	/*************************************************************************/
	/* TODO: refactor so that we get only one entry at a time (the latest one) */
	$scope.queryDB = function() {
		$http({ method: 'GET', url: 'http://' + dashboard_ip + ':2000' })
		.then(function(response) {

			document.getElementById("data-error-msg").style.display = "none";

			/* Check state change */
			if (statusToString(response.data.Status) !== $scope.data["Status"])
				$scope.dashLog('Status change! '
					+ $scope.data["Status"] +
					' -> ' + statusToString(response.data.Status));
			/* Check limit switch change */
			if (response.data.SwitchStates !== $scope.data["SwitchStates"])
				$scope.dashLog("Switches change! " +
					$scope.data["SwitchStates"] +
					" -> " + response.data.SwitchStates);

			/* Update Fields */
			for (var i = 0; i < fields.length; i++) {
				$scope.data[fields[i].name] = response.data[fields[i].name];
				if (response.data[fields[i].name] < fields[i].min ||
					response.data[fields[i].name] > fields[i].max) {
					changeClassColor(fields[i].name, 
						(fields[i].critical) ? "red" : "blue");
					fields[i].status = (fields[i].critical) ? "ERROR" : "WARN";
				} else {
					changeClassColor(fields[i].name, "green");
					fields[i].status = "GOOD";
				}
			}

			/* Limit switches */
			$scope.PLIM1 = ((response.data.SwitchStates & PLIM1_VAL) > 0) ? "open" : "depressed";
			$scope.PLIM2 = ((response.data.SwitchStates & PLIM2_VAL) > 0) ? "open" : "depressed";
			$scope.BLIM1 = ((response.data.SwitchStates & BLIM1_VAL) > 0) ? "open" : "depressed";
			$scope.BLIM2 = ((response.data.SwitchStates & BLIM2_VAL) > 0) ? "open" : "depressed";
			$scope.DLIM = ((response.data.SwitchStates & DLIM_VAL) > 0) ? "open" : "depressed";

			/* Battery remaining */
			if (response.data.BatteryRemaining > 432000) {
				$scope.data["BatteryRemaining"] /= 86400;
				fields[7].unit = "d";
			} else if (response.data.BatteryRemaining > 14400) {
				$scope.data["BatteryRemaining"] /= 3600;
				fields[7].unit = "h";
			} else if (response.data.BatteryRemaining > 300) {
				$scope.data["BatteryRemaining"] /= 60;
				fields[7].unit = "m";
			} else fields[7].unit = "s";
			$scope.data["BatteryRemaining"] = Math.floor($scope.data["BatteryRemaining"]);

			/* temperature scaling */
			$scope.data["BatteryTemperature"] /= 10;
			$scope.data["PodTemperature"] /= 10;
			$scope.data["PodPressure"] /= 1000;
			$scope.data["BatteryVoltage"] /= 1000;
			$scope.data["BatteryCurrent"] /= 1000;
			$scope.data["Velocity"] /= 10;

			$scope.data["Status"] = statusToString($scope.data["Status"]);

		}, function(response) {
			$scope.data_error = "Couldn't get data!";
			document.getElementById("data-error-msg").style.display = "block";
		});
	};
	/*************************************************************************/

	setInterval($scope.getData, 250);
	setInterval($scope.queryDB, 250);

});

