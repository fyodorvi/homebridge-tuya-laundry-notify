import { LaundryDeviceConfig } from "../interfaces/notifyConfig";
import {PushGateway} from "./pushGateway";
import TuyAPI, {DPData} from 'tuyapi';
import {Logger} from "homebridge";
import { DateTime } from "luxon";

export class LaundryDevice {
  private device: TuyAPI;
  private refreshTimeout?: NodeJS.Timeout;
  private startDetected?: boolean;
  private startDetectedTime?: DateTime;
  private isActive?: boolean;
  private endDetected?: boolean;
  private endDetectedTime?: DateTime;

  constructor(
    public readonly log: Logger,
    public readonly pushGateway: PushGateway,
    public readonly config: LaundryDeviceConfig,
  ) {
  }

  public init() {

    if (this.config.startValue < this.config.endValue) {
      throw new Error('startValue cannot be lower than endValue.')
    }

    this.device = new TuyAPI({
      id: this.config.id,
      key: this.config.key,
    });

    this.retryConnection(true);
  }

  private retryConnection(firstRun = false) {
    setTimeout(() => {
      this.connect(firstRun).catch((e) => {
        this.log.error('Error when retrying to connect', e);
        this.retryConnection();
      });
    }, firstRun ? 1 : 5000);
  }

  private async connect(firstRun: boolean) {
    this.device.removeAllListeners();
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.log.debug(`Trying to connect to ${this.config.name}`);

    const found = await this.device.find();

    if (found === false) {
      if (firstRun) {
        this.log.error(`Could not find ${this.config.name}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`${this.config.name} found`);
    }

    this.device.on('error', (error: Error) => {
      this.log.error(`Received error from ${this.config.name}`, error);
      return this.retryConnection();
    });

    this.device.on('disconnected', () => {
      this.log.error(`${this.config.name} disconnected! Trying to reconnect...`);
      return this.retryConnection();
    });

    this.device.on('connected', () => {
      if (firstRun) {
        this.log.info(`Discovered and connected to ${this.config.name}`);
      } else {
        this.log.info(`Reconnected to ${this.config.name}`);
      }
      this.device.on('dp-refresh', (data) => {
        this.incomingData(data).catch((error: Error) => {
          this.log.error(`Error processing incoming data from ${this.config.name}`, error);
        });
      });
      this.refresh();
    });

    const connected = await this.device.connect();

    if (!connected) {
      if (firstRun) {
        this.log.error(`Could not connect to ${this.config.name}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`${this.config.name} connected`);
    }
  }

  private async incomingData(data: DPData) {
    if (data.dps[this.config.dpsId] !== undefined) {
      const value = data.dps[this.config.dpsId];

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

  private refresh() {
    this.refreshTimeout = setTimeout(() => {
      this.device.refresh().catch((error) => {
        this.log.error(`Error refreshing data from ${this.config.name}`, error);
      });

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
      this.refresh();
    }, 1000);
  }
}