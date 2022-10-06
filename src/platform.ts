import {API, Logger, PlatformAccessory, PlatformConfig} from 'homebridge';
import {NotifyConfig} from './interfaces/notifyConfig';
import {IndependentPlatformPlugin} from 'homebridge/lib/api';
import {PushGateway} from './lib/pushGateway';
import {LaundryDeviceTracker} from './lib/laundryDeviceTracker';
import {PLATFORM_NAME, PLUGIN_NAME} from './settings';

let Accessory: typeof PlatformAccessory;

export class TuyaLaundryNotifyPlatform implements IndependentPlatformPlugin {
  public readonly typedConfig: PlatformConfig & NotifyConfig;
  private readonly accessories: PlatformAccessory[] = [];
  private readonly laundryDevices: LaundryDeviceTracker[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.typedConfig = config as PlatformConfig & NotifyConfig;
    Accessory = api.platformAccessory;

    const pushGateway = new PushGateway(log, this.typedConfig.pushed);

    if (this.typedConfig.laundryDevices) {
      for (const laundryDevice of this.typedConfig.laundryDevices) {
        this.laundryDevices.push(new LaundryDeviceTracker(log, pushGateway, laundryDevice, api));
      }
    }

    this.api.on('didFinishLaunching', () => {
      if (this.typedConfig.laundryDevices) {
        for (const laundryDevice of this.laundryDevices) {
          try {
            const uuid = api.hap.uuid.generate(laundryDevice.config.name);
            const cachedAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
            if (laundryDevice.config.exposeStateSwitch) {
              if (!cachedAccessory) {
                laundryDevice.accessory = new Accessory(laundryDevice.config.name, uuid);
                laundryDevice.accessory.addService(api.hap.Service.Switch, laundryDevice.config.name);
                this.accessories.push(laundryDevice.accessory);
                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [laundryDevice.accessory]);
              } else {
                laundryDevice.accessory = cachedAccessory;
              }
            }
            laundryDevice.init();
          } catch (error) {
            this.log.error(`Failed to init ${laundryDevice.config.name}`, error);
          }
        }
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    const existingDevice = this.laundryDevices.find((laundryDevice) =>
      this.api.hap.uuid.generate(laundryDevice.config.name) === accessory.UUID);
    if (!existingDevice || !existingDevice.config.exposeStateSwitch) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    } else {
      this.accessories.push(accessory);
    }
  }
}
