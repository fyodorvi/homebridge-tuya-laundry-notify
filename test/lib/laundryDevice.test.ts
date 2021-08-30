import {LaundryDevice} from '../../src/lib/laundryDevice';
import {log} from '../__utils__/log';
import TuyAPI from 'tuyapi';
import EventEmitter from 'events';
import {MockedObject} from 'ts-jest/dist/utils/testing';

let tuyaAPIMockedInstance: MockedObject<TuyAPI>;

jest.mock('tuyapi', () => {
  return jest.fn().mockImplementation(() => {
    return tuyaAPIMockedInstance;
  });
});

class MockedTuyAPI extends EventEmitter { }

describe('LaundryDevice', () => {
  let laundryDevice: LaundryDevice;

  beforeEach(() => {
    laundryDevice = new LaundryDevice(log, '1', '2');
    laundryDevice.reconnectDelay = 1; // cannot use fake timers because it's complicated
    laundryDevice.refreshDelay = 1;

    tuyaAPIMockedInstance = new MockedTuyAPI();

    Object.assign(tuyaAPIMockedInstance, {
      find: async () => Promise.resolve(true),
      connect: jest.fn().mockImplementation(() => {
        tuyaAPIMockedInstance.emit('connected');
      }),
      disconnect: jest.fn(),
    });
  });

  afterEach(() => {
    laundryDevice.destroy();
  });

  it('should init Tuyapi with correct properties', () => {
    laundryDevice.init();
    expect(TuyAPI).toHaveBeenCalledWith({ id: '1', key: '2' });
  });

  it('should retry connecting when device is not found', () => {
    expect.assertions(2);
    let calledTimes = 0;
    tuyaAPIMockedInstance.find = () => {
      calledTimes++;
      return calledTimes > 1;
    };
    laundryDevice.init();
    return new Promise<void>((resolve) => {
      laundryDevice.on('connected', () => {
        expect(log.error).toHaveBeenCalledWith('Could not find the device, check device ID and Key');
        expect(log.info).toHaveBeenCalledWith('Reconnected to the device');
        resolve();
      });
    });

  });
});