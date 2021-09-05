import { LaundryDeviceConfig } from '../interfaces/notifyConfig';
import {PushGateway} from './pushGateway';
import {DeviceData} from 'tuyapi';
import {Logger} from 'homebridge';
import { DateTime } from 'luxon';
import {LaundryDevice} from './laundryDevice';

export class LaundryDeviceTracker {
  private device?: LaundryDevice;
  private startDetected?: boolean;
  private startDetectedTime?: DateTime;
  private isActive?: boolean;
  private endDetected?: boolean;
  private endDetectedTime?: DateTime;

  constructor(
    public readonly log: Logger,
    public readonly pushGateway: PushGateway,
    public config: LaundryDeviceConfig,
  ) {
  }

  public init() {
    if (this.config.startValue < this.config.endValue) {
      throw new Error('startValue cannot be lower than endValue.');
    }

    this.device = new LaundryDevice(this.log, this.config.id, this.config.key, this.config.name);

    this.device.on('data', (data: DeviceData) => {
      this.incomingData(data);
    });

    this.device.on('refresh', () => {
      if (!this.isActive && this.startDetected && this.startDetectedTime) {
        const secondsDiff = DateTime.now().diff(this.startDetectedTime, 'seconds').seconds;
        if (secondsDiff > this.config.startDuration) {
          this.log.info(`${this.config.name} started the job!`);
          if (this.config.startMessage) {
            this.pushGateway.send(this.config.startMessage);
          }
          this.isActive = true;
        }
      }
      if (this.isActive && this.endDetected && this.endDetectedTime) {
        const secondsDiff = DateTime.now().diff(this.endDetectedTime, 'seconds').seconds;
        if (secondsDiff > this.config.endDuration) {
          this.log.info(`${this.config.name} finished the job!`);
          // send push here if needed
          if (this.config.endMessage) {
            this.pushGateway.send(this.config.endMessage);
          }
          this.isActive = false;
        }
      }
    });

    this.device.init();
  }

  private incomingData(data: DeviceData) {
    if (data.dps[this.config.powerValueId] !== undefined) {
      const value = data.dps[this.config.powerValueId];

      if (value > this.config.startValue) {
        if (!this.isActive && !this.startDetected) {
          this.startDetected = true;
          this.startDetectedTime = DateTime.now();
          this.log.debug(`Detected start value, waiting for ${this.config.startDuration} seconds...`);
        }
      } else {
        this.startDetected = false;
        this.startDetectedTime = undefined;
      }

      if (value < this.config.endValue) {
        if (this.isActive && !this.endDetected) {
          this.endDetected = true;
          this.endDetectedTime = DateTime.now();
          this.log.debug(`Detected end value, waiting for ${this.config.startDuration} seconds...`);
        }
      } else {
        this.endDetected = false;
        this.endDetectedTime = undefined;
      }
    }
  }
}