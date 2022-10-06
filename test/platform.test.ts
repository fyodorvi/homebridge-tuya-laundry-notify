import {TuyaLaundryNotifyPlatform} from '../src/platform';
import {PlatformConfig} from 'homebridge';
import {NotifyConfig} from '../src/interfaces/notifyConfig';
import {log} from './__utils__/log';
import {emptyConfig} from './__utils__/config';
import {HomebridgeAPI} from 'homebridge/lib/api';
import {LaundryDeviceTracker} from '../src/lib/laundryDeviceTracker';
import {PushGateway} from '../src/lib/pushGateway';
import {mocked} from 'ts-jest/utils';
import {BinaryLike} from 'crypto';
import {PlatformAccessory} from 'homebridge/lib/platformAccessory';
import {PLATFORM_NAME, PLUGIN_NAME} from '../src/settings';

jest.mock('../src/lib/laundryDeviceTracker');
jest.mock('../src/lib/pushGateway');
jest.mock('homebridge/lib/platformAccessory');

const mockedLaundryDeviceTracker = mocked(LaundryDeviceTracker, true);
const mockedPushGateway = mocked(PushGateway, true);
const mockedPlatformAccessory = mocked(PlatformAccessory, true);

describe('TuyaLaundryNotifyPlatform', () => {
  let config: PlatformConfig & NotifyConfig;
  let api: HomebridgeAPI;

  beforeEach(() => {
    api = new HomebridgeAPI();
    config = { ...emptyConfig };
  });

  afterEach(() => {
    mockedLaundryDeviceTracker.mockReset();
  });

  it('should not fail if there are no laundry devices provided', () => {
    config.laundryDevices = [];
    new TuyaLaundryNotifyPlatform(log, config, api);
    api.emit('didFinishLaunching');
  });

  it('should init push gateway with right params', () => {
    config.pushed = {
      channelAlias: '1',
      appSecret: '2',
      appKey: '3',
    };
    new TuyaLaundryNotifyPlatform(log, config, api);
    expect(mockedPushGateway).toHaveBeenCalledWith(log, config.pushed);
  });

  it('should init laundry devices based on the config with correct params', () => {
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: '3',
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
      },
    ];
    new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0];
    api.emit('didFinishLaunching');
    const args = mockedLaundryDeviceTracker.mock.calls[0];
    expect(args[0]).toEqual(log);
    expect(args[1]).toBeInstanceOf(mockedPushGateway);
    expect(args[2]).toEqual(config.laundryDevices[0]);
  });

  it('should init laundry device and NOT add accessory for not exposed state switch', () => {
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: '3',
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
        exposeStateSwitch: false,
      },
    ];
    new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0];
    api.emit('didFinishLaunching');
    expect(mockedPlatformAccessory.mock.instances.length).toEqual(0);
  });

  it('should init laundry device and add correct accessory', () => {
    const rightUUID = 'ea032c53-19ce-431c-b2ae-661dab14a08c';
    const rightName = 'name is important';
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: rightName,
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
        exposeStateSwitch: true,
      },
    ];
    new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0];
    api.hap.uuid.generate = jest.fn((input: BinaryLike) => {
      expect(input).toEqual(rightName);
      return rightUUID;
    });
    api.registerPlatformAccessories = jest.fn();
    api.emit('didFinishLaunching');
    const args = mockedLaundryDeviceTracker.mock.calls[0];
    expect(mockedPlatformAccessory.mock.instances.length).toEqual(1);
    expect(mockedPlatformAccessory.mock.calls[0]).toEqual([rightName, rightUUID]);
    expect(mockedPlatformAccessory.mock.instances[0].addService).toHaveBeenCalledWith(api.hap.Service.Switch, rightName);
    expect(api.registerPlatformAccessories).toHaveBeenCalledWith(PLUGIN_NAME, PLATFORM_NAME, [mockedPlatformAccessory.mock.instances[0]]);
    expect(args[0]).toEqual(log);
    expect(args[1]).toBeInstanceOf(mockedPushGateway);
    expect(args[2]).toEqual(config.laundryDevices[0]);
    expect.assertions(8);
  });

  it('should init laundry device but not add accessory if it is cached', () => {
    const rightUUID = 'ea032c53-19ce-431c-b2ae-661dab14a08c';
    const rightName = 'name is important';
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: 'anotherName',
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
        exposeStateSwitch: true,
      },
      {
        id: '1',
        key: '2',
        name: rightName,
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
        exposeStateSwitch: true,
      },
    ];
    api.hap.uuid.generate = jest.fn((input: BinaryLike) => {
      if (input === rightName) {
        return rightUUID;
      }
      return Math.random().toString();
    });
    const dummyAccessory: PlatformAccessory = new PlatformAccessory(rightName, rightUUID);
    dummyAccessory.UUID = rightUUID;
    const platform = new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0];
    mockedLaundryDeviceTracker.mock.instances[1].config = config.laundryDevices[1];
    platform.configureAccessory(dummyAccessory);
    api.emit('didFinishLaunching');
    expect(mockedLaundryDeviceTracker.mock.instances[1].accessory).toEqual(dummyAccessory);
  });

  it('should unregister accessory when it got removed', () => {
    const rightUUID = 'ea032c53-19ce-431c-b2ae-661dab14a08c';
    const rightName = 'name is important';
    config.laundryDevices = [];
    api.hap.uuid.generate = jest.fn((input: BinaryLike) => {
      return Math.random().toString();
    });
    api.unregisterPlatformAccessories = jest.fn();
    const dummyAccessory: PlatformAccessory = new PlatformAccessory(rightName, rightUUID);
    dummyAccessory.UUID = rightUUID;
    const platform = new TuyaLaundryNotifyPlatform(log, config, api);
    platform.configureAccessory(dummyAccessory);
    expect(api.unregisterPlatformAccessories).toHaveBeenCalledWith(PLUGIN_NAME, PLATFORM_NAME, [dummyAccessory]);
  });

  it('should unregister accessory when it got flipped to not exposed state switch', () => {
    const rightUUID = 'ea032c53-19ce-431c-b2ae-661dab14a08c';
    const rightName = 'name is important';
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: rightName,
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
        exposeStateSwitch: false,
      }
    ];
    api.hap.uuid.generate = jest.fn((input: BinaryLike) => {
      return Math.random().toString();
    });
    api.unregisterPlatformAccessories = jest.fn();
    const dummyAccessory: PlatformAccessory = new PlatformAccessory(rightName, rightUUID);
    dummyAccessory.UUID = rightUUID;
    const platform = new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0];
    platform.configureAccessory(dummyAccessory);
    expect(api.unregisterPlatformAccessories).toHaveBeenCalledWith(PLUGIN_NAME, PLATFORM_NAME, [dummyAccessory]);
  });

  it('should not throw if initialization failed on a laundry device', () => {
    config.laundryDevices = [
      {
        id: '1',
        key: '2',
        name: 'device',
        startValue: 4,
        endValue: 5,
        powerValueId: '6',
        startDuration: 7,
        endDuration: 8,
        endMessage: '9',
      },
    ];
    new TuyaLaundryNotifyPlatform(log, config, api);
    mockedLaundryDeviceTracker.mock.instances[0].config = config.laundryDevices[0]
    jest.spyOn(mockedLaundryDeviceTracker.prototype, 'init').mockImplementation(() => {
      throw new Error();
    });
    expect(() => api.emit('didFinishLaunching')).not.toThrow();
  });
});