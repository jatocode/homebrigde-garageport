const request = require('request');
const url = require('url');

var Accesory, Service, Characteristic, DoorState;

function mySwitch(log, config) {
    this.log = log;
    this.getUrl = url.parse(config['getUrl']);
    this.postUrl = url.parse(config['postUrl']);

    this.currentDoorState = DoorState.CLOSED;
    this.targetDoorState = DoorState.CLOSED;
  }
   
  mySwitch.prototype = {
   
    getSwitchOnCharacteristic: function (next) {
      const me = this;
      me.log('uppdaterar');
      request({
          url: me.getUrl,
          json: true,
          method: 'GET',
      }, 
      function (error, response, body) {
        if (error) {
          me.log('STATUS: ' + response);
          me.log(error);
          return next(error);
        }
        let state = 'open'?DoorState.OPEN:DoorState.CLOSED;
        this.currentDoorState = state;
        this.targetDoorState = state;      
        return next(null, 
          body.garagedoor === state);
      });
    },
     
    setSwitchOnCharacteristic: function (on, next) {
        const me = this;
        request({
          url: me.getUrl,
          json: true,
          method: 'GET',
      }, 
      function (error, response, body) {
        if (error) {
          me.log('STATUS: ' + response);
          me.log(error);
          return next(error);
        }
        let state = 'open'?DoorState.OPEN:DoorState.CLOSED;
        this.currentDoorState = state;
        this.targetDoorState = state;      
        return next(null, 
          body.garagedoor === state);
      });
    },

    getServices: function () {
        let informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Tobias")
            .setCharacteristic(Characteristic.Model, "Min garagemodel")
            .setCharacteristic(Characteristic.SerialNumber, "123-456-789");

        let switchService = new Service.GarageDoorOpener("Garageporten", "Garageport");
        switchService
            .getCharacteristic(Characteristic.CurrentDoorState)
            .on('get', this.getSwitchOnCharacteristic.bind(this))
            .on('set', this.setSwitchOnCharacteristic.bind(this));

        switchService
            .getCharacteristic(Characteristic.TargetDoorState)
            .on('get', this.getSwitchOnCharacteristic.bind(this))
            .on('set', this.setSwitchOnCharacteristic.bind(this));

        this.informationService = informationService;
        this.switchService = switchService;
        return [informationService, switchService];
    }
};

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    DoorState = homebridge.hap.Characteristic.CurrentDoorState;
    homebridge.registerAccessory("homebridge-testplugin", "testplugin", mySwitch);
};

