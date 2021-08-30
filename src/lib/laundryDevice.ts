import EventEmitter from 'events';
import TuyAPI from 'tuyapi';
import {Logger} from 'homebridge';

export class LaundryDevice extends EventEmitter {

  private device: TuyAPI;
  private refreshTimeout?: NodeJS.Timeout;

  constructor(
    private readonly log: Logger,
    private readonly id: string,
    private readonly key: string,
    private readonly name?: string,
  ) {
    super();
  }

  public init() {
    this.device = new TuyAPI({
      id: this.id,
      key: this.key,
    });

    this.retryConnection(true);
  }

  private retryConnection(firstRun = false) {
    this.device.removeAllListeners();
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    setTimeout(() => {
      this.connect(firstRun).catch((e) => {
        this.log.error('Error when retrying to connect: ', e.message);
        this.retryConnection();
      });
    }, firstRun ? 1 : 5000);
  }

  private async connect(firstRun: boolean) {
    this.log.debug(`Trying to connect to ${this.name || 'the device'}`);

    const found = await this.device.find();

    if (found === false) {
      if (firstRun) {
        this.log.error(`Could not find ${this.name || 'the device'}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`${this.name || 'The device'} found`);
    }

    this.device.on('error', (error: Error) => {
      this.log.error(`Received error from ${this.name || 'the device'}`, error.message);
      return this.retryConnection();
    });

    this.device.on('disconnected', () => {
      this.log.error(`${this.name || 'The device'} disconnected! Trying to reconnect...`);
      return this.retryConnection();
    });

    this.device.on('connected', () => {
      if (firstRun) {
        this.log.info(`Discovered and connected to ${this.name || 'the device'}`);
      } else {
        this.log.info(`Reconnected to ${this.name || 'the device'}`);
      }
      this.emit('connected', firstRun);
      this.device.on('dp-refresh', (data) => {
        this.emit('data', data);
      });
      this.refresh();
    });

    const connected = await this.device.connect();

    if (!connected) {
      if (firstRun) {
        this.log.error(`Could not connect to ${this.name || 'the device'}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`${this.name || 'The device'} connected`);
    }
  }

  private refresh() {
    this.refreshTimeout = setTimeout(() => {
      this.device.refresh().catch((error) => {
        this.log.error(`Error refreshing data from ${this.name || 'the device'}`, error.message);
      });

      this.emit('refresh');
      this.refresh();
    }, 1000);
  }
}