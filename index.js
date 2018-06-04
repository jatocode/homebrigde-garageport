const request = require('request');
const io = require('socket.io-client');
//const url = 'http://192.168.0.22:4000';
const url = 'http://garagepi.helentobias.se';
let Service, Characteristic, TargetDoorState, CurrentDoorState;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  TargetDoorState = Characteristic.TargetDoorState;
  CurrentDoorState = Characteristic.CurrentDoorState;
  homebridge.registerAccessory("homebridge-garageport", "garageport", GarageDoorOpener);
};

class GarageDoorOpener {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    
    this.currentDoorState = CurrentDoorState.CLOSED;
    this.targetDoorState = TargetDoorState.CLOSED;

    this.socket = io(url);
                  
    this.socket.on('status', (message) => {
      let state = message.status.garage==='open'?CurrentDoorState.OPEN:CurrentDoorState.CLOSED;
      this.log('Got status:' + state);
      this.service.setCharacteristic(CurrentDoorState, state);
    });

    this.socket.on('connect', (message) => {
        this.log("Connected to " + url);
    });

  }
  
  identify(callback) {
    this.log('Identify requested!');
    callback(null);
  }
  
  openCloseGarage() {
    this.socket.emit('run', {start:'running'});
  }

  getServices() {
    const informationService = new Service.AccessoryInformation();
    
    informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Tobias')
    .setCharacteristic(Characteristic.Model, 'LM60')
    .setCharacteristic(Characteristic.SerialNumber, '000');
    
    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED);
    this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);
    
    this.service.getCharacteristic(TargetDoorState)
    .on('get', (callback) => {
      this.log('get tds:' + this.targetDoorState);
      callback(null, this.targetDoorState);
    })
    .on('set', (value, callback) => {
      this.targetDoorState = value;
      this.log('set tds:' + this.targetDoorState);
      if (this.targetDoorState === TargetDoorState.OPEN &&
          this.currentDoorState === CurrentDoorState.CLOSED) {
          this.openCloseGarage(); 
      } else if (this.targetDoorState === TargetDoorState.CLOSED &&
          this.currentDoorState === CurrentDoorState.OPEN) {
          this.openCloseGarage();
      }
      callback();
    });
    
    this.service.getCharacteristic(CurrentDoorState)
    .on('get', (callback) => {
      this.log('get cds:' + this.currentDoorState);
      callback(null, this.currentDoorState);
    })
    .on('set', (value, callback) => {
      this.log('set cds:' + this.currentDoorState);
      this.currentDoorState = value;
      callback();
    });
    
    this.service
    .getCharacteristic(Characteristic.Name)
    .on('get', callback => {
      callback(null, this.name);
    });
    
    return [informationService, this.service];
  }
}

