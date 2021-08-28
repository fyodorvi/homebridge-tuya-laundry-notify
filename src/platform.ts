import {API, Logger, Service, Characteristic, PlatformConfig} from 'homebridge';
import {NotifyConfig} from "./interfaces/notifyConfig";
import {IndependentPlatformPlugin} from "homebridge/lib/api";
import {PushGateway} from "./lib/pushGateway";
import {LaundryDevice} from "./lib/laundryDevice";

export class TuyaLaundryNotifyPlatform implements IndependentPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly typedConfig: PlatformConfig & NotifyConfig;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.typedConfig = config as PlatformConfig & NotifyConfig;

    const pushGateway = new PushGateway(log, this.typedConfig.pushed);
    const laundryDevices: LaundryDevice[] = []

    if (this.typedConfig.laundryDevices) {
      for (const laundryDevice of this.typedConfig.laundryDevices) {
        laundryDevices.push(new LaundryDevice(log, pushGateway, laundryDevice));
      }
    }

    this.log.debug('Finished initializing platform:', this.typedConfig.name);

    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      if (this.typedConfig.laundryDevices) {
        for (const laundryDevice of laundryDevices) {
          try {
            laundryDevice.init();
          } catch (error) {
            this.log.error(`Failed to init ${laundryDevice.config.name}`, error);
          }
        }
      }
    });
  }
}
