const request = require('request');
const io = require('socket.io-client');
const url = 'http://192.168.0.22:4000';
//const url = 'http://garagepi.helentobias.se';
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
    this.openCloseTime = 50;
    
    this.currentDoorState = CurrentDoorState.CLOSED;
    this.targetDoorState = TargetDoorState.CLOSED;

    this.socket = io(url);
                  
    this.socket.on('status', (message) => {
      let state = message.status.garage==='open'?CurrentDoorState.OPEN:CurrentDoorState.CLOSED;
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
  
  openCloseGarage(callback) {
    this.socket.emit('run', {start:'running'});
    callback();
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
      callback(null, this.targetDoorState);
    })
    .on('set', (value, callback) => {
      this.targetDoorState = value;
      if (this.targetDoorState === TargetDoorState.OPEN) {
        if (this.currentDoorState === CurrentDoorState.CLOSED) {
          this.openCloseGarage(() =>
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
        } else if (this.currentDoorState === CurrentDoorState.OPENING) {
          // Do nothing
        } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
          this.openCloseGarage(() =>
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
        } else if (this.currentDoorState === CurrentDoorState.OPEN) {
          // Do nothing
        }
      } else if (this.targetDoorState === TargetDoorState.CLOSED) {
        if (this.currentDoorState === CurrentDoorState.CLOSED) {
          // Do nothing
        } else if (this.currentDoorState === CurrentDoorState.OPENING) {
          this.openCloseGarage(() =>
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING));
          // Do nothing
        } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
          // Do nothing
        } else if (this.currentDoorState === CurrentDoorState.OPEN) {
          this.openCloseGarage(() =>
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING));
        }
      }
      callback();
    });
    
    this.service.getCharacteristic(CurrentDoorState)
    .on('get', (callback) => {
      callback(null, this.currentDoorState);
    })
    .on('set', (value, callback) => {
      this.currentDoorState = value;
      
      if (this.currentDoorState === CurrentDoorState.OPENING) {
        clearTimeout(this.openCloseTimer);
        this.doorOpenStartTime = new Date();
        const timeSinceDoorStartedClosing = new Date() - this.doorCloseStartTime;
        let stateChangeTimer = this.openCloseTime;
        if (timeSinceDoorStartedClosing < this.openCloseTime) {
          stateChangeTimer = timeSinceDoorStartedClosing;
        }
        this.openCloseTimer = setTimeout(() => {
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPEN);
        }, stateChangeTimer);
      } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
        clearTimeout(this.openCloseTimer);
        this.doorCloseStartTime = new Date();
        const timeSinceDoorStartedOpening = new Date() - this.doorOpenStartTime;
        let stateChangeTimer = this.openCloseTime;
        if (timeSinceDoorStartedOpening < this.openCloseTime) {
          stateChangeTimer = timeSinceDoorStartedOpening;
        }
        this.openCloseTimer = setTimeout(() => {
          this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);
        }, stateChangeTimer);
      }
      
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

