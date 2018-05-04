"use strict";
const async = require('async');
const noble = require('noble');
const querystring = require('querystring');
const http = require('http');
const os = require('os');
const config = require('./config.js')


//POST data to this URL as JSON
const proxyhost = config.proxyhost;
const proxyport = config.proxyport;
const proxypath = config.proxypath;

var samples = [];



noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});



noble.on('discover', function(peripheral) {

    //console.log('peripheral with ID ' + peripheral.id + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;
    var rssi = peripheral.rssi;
    var timestamp = Date.now();
    let sample = {};

    if (localName) {
      //console.log('  Local Name        = ' + localName);
    }

    if (txPowerLevel) {
      //console.log('  TX Power Level    = ' + txPowerLevel);
    }

    if (manufacturerData) {
      let manufacturerDataString = manufacturerData.toString('hex').toUpperCase();
      //console.log('  Manufacturer Data = ' + manufacturerDataString);

      if(manufacturerDataString.startsWith('9904'))
      {
        //console.log("Queuing Ruuvi data");
        sample.type = "Ruuvi";

      }
      else if(manufacturerDataString.startsWith('A602'))
      {
        //console.log("Queuing Bosch data");
        sample.type = "Bosch";
      }
      else 
      {
        //console.log("Queuing Unknown data");
        sample.type = "unknown";
      }

      sample.dataPayload = manufacturerDataString;
      sample.timestamp = timestamp;
      sample.rssi = rssi;

      sample.mac = peripheral.id;
      sample.gateway_id = os.hostname();
      samples.push(sample);
    }
  });


// An object of options to indicate where to post to
setInterval(function(){
  let post_data = JSON.stringify(samples);
  let post_options = {
    host: proxyhost,
    port: proxyport,
    path: proxypath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(post_data)
    }
  };
  try {
  // Set up the request
  var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
          //console.log('Response: ' + chunk);
        });
  });

  // post the data
    console.log("Posting " + samples.length + " data points");
    post_req.write(post_data);
    post_req.end(function(){samples = [];});
    
  } catch (err) {
    console.log(err);
  }

}, 10000);

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    // process.exit(1);
  });