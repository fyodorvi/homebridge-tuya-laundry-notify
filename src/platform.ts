import {API, Logger, PlatformConfig} from 'homebridge';
import {NotifyConfig} from './interfaces/notifyConfig';
import {IndependentPlatformPlugin} from 'homebridge/lib/api';
import {PushGateway} from './lib/pushGateway';
import {LaundryDeviceTracker} from './lib/laundryDeviceTracker';

export class TuyaLaundryNotifyPlatform implements IndependentPlatformPlugin {
  public readonly typedConfig: PlatformConfig & NotifyConfig;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.typedConfig = config as PlatformConfig & NotifyConfig;

    const pushGateway = new PushGateway(log, this.typedConfig.pushed);
    const laundryDevices: LaundryDeviceTracker[] = [];

    if (this.typedConfig.laundryDevices) {
      for (const laundryDevice of this.typedConfig.laundryDevices) {
        laundryDevices.push(new LaundryDeviceTracker(log, pushGateway, laundryDevice));
      }
    }

    this.api.on('didFinishLaunching', () => {
      if (this.typedConfig.laundryDevices) {
        for (const laundryDevice of laundryDevices) {
          try {
            //laundryDevice.init();
          } catch (error) {
            this.log.error(`Failed to init ${laundryDevice.config.name}`, error);
          }
        }
      }
    });
  }
}
