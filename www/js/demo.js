"use strict";

(function() {
    function log(msg, level) {


        if (typeof msg === "object") {

            msg = JSON.stringify(msg, null, "  ");
        }

        $("#log").html(msg);
    }

    function handleError(error) {
        alert("handleError");
        alert(error.error);
        alert(error.message);

        var msg;

        if (error.error && error.message) {

            var errorItems = [];

            if (error.service) {

                errorItems.push("service: " + (uuids[error.service] || error.service));
            }

            if (error.characteristic) {

                errorItems.push("characteristic: " + (uuids[error.characteristic] || error.characteristic));
            }

            msg = "Error on " + error.error + ": " + error.message + (errorItems.length && (" (" + errorItems.join(", ") + ")"));
        } else {

            msg = error;
        }

        log(msg, "error");

        if (error.error === "read" && error.service && error.characteristic) {

            reportValue(error.service, error.characteristic, "Error: " + error.message);
        }
    }

    var foundDevices = [];

    function startScan() {
        alert("start scan");
        log("Starting scan for devices..." + foundDevices.length);
        foundDevices = [];

        document.getElementById("devices").innerHTML = "";
        document.getElementById("services").innerHTML = "";
        document.getElementById("output").innerHTML = "";

        if (window.cordova.platformId === "windows") {

            bluetoothle.retrieveConnected(retrieveConnectedSuccess, handleError, {});
        } else {
            setTimeout(function() {
                bluetoothle.startScan(startScanSuccess, handleError, {
                    "services": null,
                    "allowDuplicates": true,
                    "scanMode": bluetoothle.SCAN_MODE_LOW_LATENCY,
                    "matchMode": bluetoothle.MATCH_MODE_AGGRESSIVE,
                    "matchNum": bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
                    "callbackType": bluetoothle.CALLBACK_TYPE_ALL_MATCHES,
                });

            }, 5000);
        }
    }
    setInterval(function() {
        function isScanning(result) {

            // alert(result.isScanning);
        }
        bluetoothle.isScanning(isScanning);

    }, 5000);

    function startScanSuccess(result) {
        // alert("startScanSuccess");
        log(result.status);

        if (result.status === "scanStarted") {
            // alert("scanStarted");
            log("Scanning for devices (will continue to scan until you select a device)...", "status");
        } else if (result.status === "scanResult") {
            // alert("scanResult");
            if (!foundDevices.some(function(device) {

                    return device.address === result.address;

                })) {

                log('FOUND DEVICE:');
                log(result);
                foundDevices.push(result);
                addDevice(result.name, result.address);
            }
        }
    }

    function retrieveConnectedSuccess(result) {

        log("retrieveConnectedSuccess()");
        log(result);

        result.forEach(function(device) {

            addDevice(device.name, device.address);

        });
    }

    function addDevice(name, address) {
        // alert("add device");
        var button = document.createElement("button");
        button.style.width = "100%";
        button.style.padding = "10px";
        button.style.fontSize = "16px";
        button.textContent = name + ": " + address;

        button.addEventListener("click", function() {

            document.getElementById("services").innerHTML = "";
            connect(address);
        });

        document.getElementById("devices").appendChild(button);
    }

    function connect(address) {
        // alert("connect now");
        log('Connecting to device: ' + address + "...", "status");

        if (cordova.platformId === "windows") {

            getDeviceServices(address);

        } else {

            stopScan();

            new Promise(function(resolve, reject) {

                bluetoothle.connect(resolve, reject, { address: address });

            }).then(connectSuccess, handleError);

        }
    }

    function stopScan() {

        new Promise(function(resolve, reject) {

            bluetoothle.stopScan(resolve, reject);

        }).then(stopScanSuccess, handleError);
    }

    function stopScanSuccess() {

        if (!foundDevices.length) {

            log("NO DEVICES FOUND");
        } else {

            log("Found " + foundDevices.length + " devices.", "status");
        }
    }

    function connectSuccess(result) {
        // alert("connect success");
        log("- " + result.status);

        if (result.status === "connected") {

            getDeviceServices(result.address);
        } else if (result.status === "disconnected") {

            log("Disconnected from device: " + result.address, "status");
        }
    }

    function getDeviceServices(address) {

        // alert("Getting device services");
        log("Getting device services...", "status");

        var platform = window.cordova.platformId;

        if (platform === "android") {

            //alert("Android");
            new Promise(function(resolve, reject) {

                bluetoothle.discover(resolve, reject, { address: address });

            }).then(discoverSuccess, handleError);

        } else if (platform === "windows") {

            alert("Windows");
            new Promise(function(resolve, reject) {

                bluetoothle.services(resolve, reject, { address: address });

            }).then(servicesSuccess, handleError);

        } else {
            //ios here
            alert("ios");
            alert(address);
            log("Unsupported platform: '" + window.cordova.platformId + "'", "error");
            new Promise(function(resolve, reject) {

                bluetoothle.discover(resolve, reject, { address: address });

            }).then(discoverSuccess, handleError);
        }
    }

    function discoverSuccess(result) {
        alert("discover success");
        log(result);

        log("Discover returned with status: " + result.status);

        if (result.status === "discovered") {
            alert("discovered");

            // Create a chain of read promises so we don't try to read a property until we've finished
            // reading the previous property.


            var readSequence = result.services.reduce(function(sequence, service) {

                return sequence.then(function() {

                    alert("then");
                    return addService(result.address, service.uuid, service.characteristics);
                });

            }, Promise.resolve());
            /*
                        // Once we're done reading all the values, disconnect
                        readSequence.then(function () {

                            new Promise(function (resolve, reject) {

                                bluetoothle.disconnect(resolve, reject,
                                    { address: result.address });

                            }).then(connectSuccess, handleError);

                        });
            */
        }
    }

    function write(string) {
        var bytes = bluetoothle.stringToBytes(string);
        var encodedString = bluetoothle.bytesToEncodedString(bytes);
        bluetoothle.write(function() {
            // alert("write success");
        }, function(error) {
            alert("write error");
            log(error);
        }, {
            "value": encodedString,
            "service": "FFE0", //from log result of discoverSuccess
            "characteristic": "FFE1",
            "type": "noResponse",
            "address": s.address
        });

    }
    $("#turn_on").click(function() {
        // alert("on");
        write("1");
    });
    $("#turn_off").click(function() {
        // alert("off");
        write("0");
    });
    var s = {};

    function addService(address, serviceUuid, characteristics) {
        alert("addService");
        // alert("address:"+address);
        // alert("serviceUuid:"+serviceUuid);
        // log("characteristics:"+characteristics);
        s.address = address;
        s.service = serviceUuid;
        // alert('Adding service ' + serviceUuid + '; characteristics:');
        // log(characteristics);

        var readSequence = Promise.resolve();

        var wrapperDiv = document.createElement("div");
        wrapperDiv.className = "service-wrapper";

        // var serviceDiv = document.createElement("div");
        // serviceDiv.className = "service";
        // serviceDiv.textContent = uuids[serviceUuid] || serviceUuid;
        // wrapperDiv.appendChild(serviceDiv);
        characteristics.forEach(function(characteristic) {

            // var characteristicDiv = document.createElement("div");
            // characteristicDiv.className = "characteristic";

            // var characteristicNameSpan = document.createElement("span");
            // characteristicNameSpan.textContent = (uuids[characteristic.uuid] || characteristic.uuid) + ":";
            // characteristicDiv.appendChild(characteristicNameSpan);

            // characteristicDiv.appendChild(document.createElement("br"));

            // var characteristicValueSpan = document.createElement("span");
            // characteristicValueSpan.id = serviceUuid + "." + characteristic.uuid;
            // characteristicValueSpan.style.color = "blue";
            // characteristicDiv.appendChild(characteristicValueSpan);

            // wrapperDiv.appendChild(characteristicDiv);

            $("#services").append("address:"+address+"<br />");
            $("#services").append("service:"+serviceUuid+"<br />");
            $("#services").append("characteristic:"+characteristic.uuid+"<br />");
            
            readSequence = readSequence.then(function() {
                return new Promise(function(resolve, reject) {

                    alert("then");
                    bluetoothle.read(resolve, reject, { address: address, service: serviceUuid, characteristic: characteristic.uuid });

                }).then(readSuccess, handleError);

            });

        });

        document.getElementById("services").appendChild(wrapperDiv);

        return readSequence;
    }

    function readSuccess(result) {
        alert("read success");
        log(result);



            //test subscribe
            bluetoothle.subscribe(subscribeSuccess, handleError, {
          "address": s.address,
          "service": s.service,
          "characteristic": "555A0003-0AAA-467A-9538-01F0652C74E8", //GSJ required
        });
        // if (result.status === "read") {

        //     reportValue(result.service, result.characteristic, window.atob(result.value));
        // }
    }
    function subscribeSuccess(result) {

        //keep loop at here
        log(bluetoothle.encodedStringToBytes(result.value));


    }

    function parseData(value){
        var bytes = bluetoothle.encodedStringToBytes(value);
          if (bytes.length === 0)
          {
            return;
          }

          //NOTE: Follow along to understand how the parsing works
          //https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml

          //First byte provides instructions on what to do with the remaining bytes
          var flag = bytes[0];

          //Offset from beginning of the array
          var offset = 1;

          //If the first bit of the flag is set, the HR is in 16 bit form
          if ((flag & 0x01) == 1)
          {
              //Extract second and third bytes and convert to 16bit unsigned integer
              var u16bytesHr = bytes.buffer.slice(offset, offset + 2);
              var u16Hr = new Uint16Array(u16bytesHr)[0];
              //16 bits takes up 2 bytes, so increase offset by two
              offset += 2;
          }
          //Else the HR is in 8 bit form
          else
          {
              //Extract second byte and convert to 8bit unsigned integer
              var u8bytesHr = bytes.buffer.slice(offset, offset + 1);
              var u8Hr = new Uint8Array(u8bytesHr)[0];

              //Or I believe I could just do this: var u8Hr = u8bytesHr[offset]

              //8 bits takes up 1 byte, so increase offset by one
              offset += 1;
          }

          //NOTE: I'm ignoring the second and third bit because I'm not interested in the sensor contact, and it doesn't affect the offset

          //If the fourth bit is set, increase the offset to skip over the energy expended information
          if ((flag & 0x08) == 8)
          {
              offset += 2;
          }

          //If the fifth bit is set, get the RR interval(s)
          if ((flag & 0x10) == 16)
          {
              //Number of rr intervals
              var rrCount = (bytes.length - offset) / 2;

              for (var i = rrCount - 1; i >= 0; i--)
              {
                  //Cast to 16 bit unsigned int
                  var u16bytesRr = bytes.buffer.slice(offset, offset + 2);
                  var u16Rr = new Uint16Array(u16bytesRr)[0];
                  //Increase offset
                  offset += 2;
              }
          }
      }

    function reportValue(serviceUuid, characteristicUuid, value) {

        document.getElementById(serviceUuid + "." + characteristicUuid).textContent = value;
    }

    function main() {
        alert("ready");




        //bluetooth

        alert("test start");
        bluetoothle.initialize(initializeSuccess, handleError, {
            "request": true,
            "statusReceiver": false,
            "restoreKey": "bluetoothleplugin"
        });


        function initializeSuccess(result) {
            // alert("success but");
            alert(result.status);
            if (result.status === "enabled") {
                alert("Bluetooth is enabled.");
                startScan();
            }
        }


        $("#test").click(function() {
            Cocoon.Share.share({
                message: "http://yahoo.com.hk",
                image: "http://www.lovethisgif.com/uploaded_images/78401-Animated-Animated-Gif-Black-Hair-Blazer-Blue-Eyes-Bow-Chuunibyou-Demo-....gif"
            }, function(activity, completed, error) {
                console.log("Share " + completed ? 'Ok' : 'Failed');
            });
        });
    }

    function test() {
        alert("test start");
        bluetoothle.initialize(function(){
            alert("success");
        }, function(){
            alert("error");
        }, {
            "request": true,
            "statusReceiver": false,
            "restoreKey": "bluetoothleplugin"
        });
    }
    if (window.cordova) {
        // alert("There is cordova");
        document.addEventListener("deviceready", main);
    }
    // window.bluetooth = cordova.require("cordova/plugin/bluetooth");
    // if (bluetoothle) {
    //     alert("There is bluetoothle");
    // }

})();
