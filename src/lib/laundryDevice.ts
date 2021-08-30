import EventEmitter from 'events';
import TuyAPI from 'tuyapi';
import {Logger} from 'homebridge';

export class LaundryDevice extends EventEmitter {

  private device: TuyAPI;
  private refreshTimeout?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;

  public reconnectDelay= 5000;
  public refreshDelay = 1000;

  constructor(
    private readonly log: Logger,
    private readonly id: string,
    private readonly key: string,
    private readonly name: string = 'the device',
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

  public destroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.device.disconnect();
  }

  private retryConnection(firstRun = false) {
    this.device.removeAllListeners();
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect(firstRun).catch((e) => {
        this.log.error('Error when retrying to connect: ', e.message);
        this.retryConnection();
      });
    }, firstRun ? 1 : this.reconnectDelay);
  }

  private async connect(firstRun: boolean) {
    this.log.debug(`Trying to connect to ${this.name}`);

    const found = await this.device.find();

    if (found === false) {
      if (firstRun) {
        this.log.error(`Could not find ${this.name}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`Found ${this.name}`);
    }

    this.device.on('error', (error: Error) => {
      this.log.error(`Received error from ${this.name}`, error.message);
      return this.retryConnection();
    });

    this.device.on('disconnected', () => {
      this.log.error(`Disconnected from ${this.name}! Trying to reconnect...`);
      return this.retryConnection();
    });

    this.device.on('connected', () => {
      if (firstRun) {
        this.log.info(`Discovered and connected to ${this.name}`);
      } else {
        this.log.info(`Reconnected to ${this.name}`);
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
        this.log.error(`Could not connect to ${this.name}, check device ID and Key`);
      }
      return this.retryConnection();
    } else {
      this.log.debug(`Connected to ${this.name}`);
    }
  }

  private refresh() {
    this.refreshTimeout = setTimeout(() => {
      // I could never get this to return with my plug
      this.device.refresh().catch((error) => {
        this.log.error(`Error refreshing data from ${this.name}`, error.message);
      });

      this.emit('refresh');
      this.refresh();
    }, this.refreshDelay);
  }
}