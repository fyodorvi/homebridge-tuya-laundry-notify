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

const MockedLaundryDeviceTracker = mocked(LaundryDeviceTracker, true);
const MockedPushGateway = mocked(PushGateway, true);

describe('TuyaLaundryNotifyPlatform', () => {
  let config: PlatformConfig & NotifyConfig;
  let api: HomebridgeAPI;

  beforeEach(() => {
    api = new HomebridgeAPI();
    config = { ...emptyConfig };
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
    expect(MockedPushGateway).toHaveBeenCalledWith(log, config.pushed);
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
    const args = MockedLaundryDeviceTracker.mock.calls[0];
    expect(args[0]).toEqual(log);
    expect(args[1]).toBeInstanceOf(MockedPushGateway);
    expect(args[2]).toEqual(config.laundryDevices[0]);
  });
});