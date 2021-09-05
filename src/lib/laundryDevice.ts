import EventEmitter from 'events';
import TuyAPI from 'tuyapi';
import {Logger} from 'homebridge';

export class LaundryDevice extends EventEmitter {
  private device: TuyAPI;

  public connectDelay= 5000;
  public refreshDelay = 1000;

  private refreshInterval?: NodeJS.Timeout;
  private connectTimeout?: NodeJS.Timeout;
  private connected = false;

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

    this.device.on('error', (error: Error) => {
      this.log.error(`Received error from ${this.name}:`, error.message);
      this.handleDisconnect();
    });

    this.device.on('disconnected', () => {
      this.log.error(`Disconnected from ${this.name}`);
      this.handleDisconnect();
    });

    this.device.on('dp-refresh', (data) => {
      this.emit('data', data);
    });

    this.startConnecting();
  }

  private handleDisconnect() {
    if (this.connected) {
      this.connected = false;
      this.stopRefresh();
      this.startConnecting();
    }
  }

  private stopRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.connected) {
        // I could never get this promise to resolve with my plug
        this.device.refresh().catch((error) => {
          this.log.error(`Could not refresh ${this.name}:`, error.message);
        });
        this.emit('refresh');
      }
    }, this.refreshDelay);
  }

  public destroy() {
    this.connected = false;
    this.device.removeAllListeners();
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
    }
    this.stopRefresh();
    this.device.disconnect();
  }

  private startConnecting() {
    this.connect().then(() => {
      this.connected = true;
      this.log.info(`Connected to ${this.name}`);
      this.emit('connected');
      this.startRefresh();
    }).catch((error) => {
      this.log.error(`Could not connect to ${this.name}:`, error.message);
      this.connectTimeout = setTimeout(() => {
        this.startConnecting();
      }, this.connectDelay);
    });
  }

  private async connect() {
    this.log.debug(`Connecting to ${this.name}`);

    const found = await this.device.find();
    if (!found) {
      throw new Error('Device not found');
    }
    const connected = await this.device.connect();
    if (!connected) {
      throw new Error('Could not connect to the device');
    }
  }

}