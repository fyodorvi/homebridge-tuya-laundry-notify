import {mocked} from 'ts-jest/utils';
import {LaundryDevice} from '../../src/lib/laundryDevice';
import {LaundryDeviceTracker} from '../../src/lib/laundryDeviceTracker';
import {log} from '../__utils__/log';
import {PushGateway} from '../../src/lib/pushGateway';
import {emptyConfig} from '../__utils__/config';
import {PlatformConfig, Service} from 'homebridge';
import {NotifyConfig} from '../../src/interfaces/notifyConfig';
import {MockedObject} from 'ts-jest/dist/utils/testing';
import {HomebridgeAPI} from 'homebridge/lib/api';
import {PlatformAccessory} from 'homebridge/lib/platformAccessory';

let mockedLaundryDeviceInstance: Partial<LaundryDevice>;

jest.mock('../../src/lib/pushGateway');
jest.mock('homebridge/lib/platformAccessory');
jest.mock('../../src/lib/laundryDevice', () => {
  return {
    LaundryDevice: jest.fn().mockImplementation(() => {
      const { LaundryDevice } = jest.requireActual('../../src/lib/laundryDevice');
      class MockedLaundryDevice extends LaundryDevice {
        init = jest.fn();
      }
      mockedLaundryDeviceInstance = new MockedLaundryDevice();
      return mockedLaundryDeviceInstance;
    }),
  };
});

const mockedLaundryDevice = mocked(LaundryDevice, true);
const mockedPlatformAccessory = mocked(PlatformAccessory, true);

describe('LaundryDeviceTracker', () => {
  let landryDeviceTracker: LaundryDeviceTracker;
  let config: PlatformConfig & NotifyConfig;
  let mockedPushGatewayInstance: MockedObject<PushGateway>;
  let api: HomebridgeAPI;
  let mockedService: Service;
  let dummyAccessory: PlatformAccessory;

  beforeEach(() => {
    config = { ...emptyConfig };
    api = new HomebridgeAPI();

    mockedPlatformAccessory.mockReset();
    dummyAccessory = new PlatformAccessory('does not', 'matter');

    mockedService = {
      setCharacteristic: jest.fn(),
    } as Partial<Service> as unknown as Service;

    config.laundryDevices = [
      {
        id: 'id',
        key: 'key',
        name: 'washing machine',
        startMessage: 'start message',
        endMessage: 'end message',
        startValue: 100,
        endValue: 50,
        powerValueId: '42',
        startDuration: 10,
        endDuration: 10,
      },
    ];

    mockedPushGatewayInstance = mocked(new PushGateway(log, config.pushed), true);
    landryDeviceTracker = new LaundryDeviceTracker(log, mockedPushGatewayInstance, config.laundryDevices[0], api);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create LaundryDevice with the right config', async () => {
    landryDeviceTracker.init();
    expect(mockedLaundryDevice).toHaveBeenCalledWith(log, 'id', 'key', 'washing machine');
  });

  it('should error is startValue is lower than endValue', async () => {
    config.laundryDevices[0].startValue = 50;
    config.laundryDevices[0].endValue = 100;
    expect(() => landryDeviceTracker.init()).toThrow('startValue cannot be lower than endValue.');
  });

  it('should send push notification when device reached power value and work for the right duration', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPushGatewayInstance.send).toHaveBeenCalledWith('start message');
  });

  it('should send push notification if start message is not defined', async () => {
    config.laundryDevices[0].startMessage = undefined;
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPushGatewayInstance.send).not.toHaveBeenCalled();
  });

  it('should not send push notification when device reached power value and not enough duration passed', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:09'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPushGatewayInstance.send).not.toHaveBeenCalled();
  });

  it('should not send push notification when device did not reached power value', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 95 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPushGatewayInstance.send).not.toHaveBeenCalled();
  });

  it('should send push notification when device reached active state and then finished', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 40 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:22'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPushGatewayInstance.send).toHaveBeenCalledWith('end message');
  });

  it('should flip accessory to on when device reached power value and work for the right duration', async () => {
    config.laundryDevices[0].exposeStateSwitch = true;
    landryDeviceTracker.accessory = dummyAccessory;
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedPlatformAccessory.mock.instances[0].getService = jest.fn(() => mockedService);
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPlatformAccessory.mock.instances[0].getService).toHaveBeenCalledWith(api.hap.Service.Switch);
    expect(mockedService.setCharacteristic).toHaveBeenCalledWith(api.hap.Characteristic.On, true);
  });

  it('should flip accessory to off when device reached active state and then finished', async () => {
    config.laundryDevices[0].exposeStateSwitch = true;
    landryDeviceTracker.accessory = dummyAccessory;
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    landryDeviceTracker.init();
    mockedPlatformAccessory.mock.instances[0].getService = jest.fn(() => mockedService);
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 101 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:11'));
    mockedLaundryDeviceInstance.emit!('refresh');
    mockedLaundryDeviceInstance.emit!('data', { dps: {'42': 40 }});
    jest.setSystemTime(new Date('1970-01-01T00:00:22'));
    mockedLaundryDeviceInstance.emit!('refresh');
    expect(mockedPlatformAccessory.mock.instances[0].getService).toHaveBeenCalledWith(api.hap.Service.Switch);
    expect(mockedService.setCharacteristic).toHaveBeenCalledWith(api.hap.Characteristic.On, false);
  });
});