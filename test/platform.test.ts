import {TuyaLaundryNotifyPlatform} from '../src/platform';
import {API, PlatformConfig} from 'homebridge';
import {NotifyConfig} from '../src/interfaces/notifyConfig';
import {log} from './__utils__/log';
import {emptyConfig} from './__utils__/config';
import {HomebridgeAPI} from 'homebridge/lib/api';
import {LaundryDeviceTracker} from '../src/lib/laundryDeviceTracker';
import {PushGateway} from '../src/lib/pushGateway';
import {mocked} from 'ts-jest/utils';

jest.mock('../src/lib/laundryDeviceTracker');
jest.mock('../src/lib/pushGateway');

const mockedLaundryDeviceTracker = mocked(LaundryDeviceTracker, true);
const mockedPushGateway = mocked(PushGateway, true);

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
    api.emit('didFinishLaunching');
    const args = mockedLaundryDeviceTracker.mock.calls[0];
    expect(args[0]).toEqual(log);
    expect(args[1]).toBeInstanceOf(mockedPushGateway);
    expect(args[2]).toEqual(config.laundryDevices[0]);
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