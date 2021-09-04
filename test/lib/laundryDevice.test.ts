import {LaundryDevice} from '../../src/lib/laundryDevice';
import {log} from '../__utils__/log';
import TuyAPI from 'tuyapi';
import EventEmitter from 'events';
import {MockedObject} from 'ts-jest/dist/utils/testing';

let mockedTuyaAPIInstance: MockedObject<TuyAPI>;

jest.mock('tuyapi', () => {
  return jest.fn().mockImplementation(() => {
    return mockedTuyaAPIInstance;
  });
});

class MockedTuyAPI extends EventEmitter { }

describe('LaundryDevice', () => {
  let laundryDevice: LaundryDevice;

  beforeEach(() => {
    laundryDevice = new LaundryDevice(log, '1', '2');
    laundryDevice.connectDelay = 100; // cannot use fake timers because it's complicated
    laundryDevice.refreshDelay = 100;

    mockedTuyaAPIInstance = new MockedTuyAPI();
    jest.spyOn(log, 'info');
    jest.spyOn(log, 'error');

    Object.assign(mockedTuyaAPIInstance, {
      find: async () => Promise.resolve(true),
      connect: jest.fn().mockImplementation(() => {
        mockedTuyaAPIInstance.emit('connected');
        return Promise.resolve(true);
      }),
      disconnect: jest.fn(),
      refresh: jest.fn().mockImplementation(() => Promise.resolve()),
    });
  });

  afterEach(() => {
    laundryDevice.destroy();
  });

  it('should init Tuyapi with correct properties', () => {
    laundryDevice.init();
    expect(TuyAPI).toHaveBeenCalledWith({ id: '1', key: '2' });
  });

  it('should emit connected when connection is a success', () => {
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.on('connected', () => {
        try {
          expect(log.info).toHaveBeenCalledWith('Connected to the device');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it('should emit data when dp is refreshed', () => {
    expect.assertions(1);
    const mockData = { prop: '123' };
    laundryDevice.on('connected', () => {
      mockedTuyaAPIInstance.emit('dp-refresh', mockData);
    });
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.on('data', (data) => {
        try {
          expect(data).toEqual(mockData);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it('should retry connecting when device is not found', () => {
    expect.assertions(2);
    let calledTimes = 0;
    mockedTuyaAPIInstance.find = () => {
      calledTimes++;
      return calledTimes > 1;
    };
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.on('connected', () => {
        try {
          expect(log.error).toHaveBeenCalledWith('Could not connect to the device:', 'Device not found');
          expect(log.info).toHaveBeenCalledWith('Connected to the device');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it('should retry connecting when connection failed', () => {
    expect.assertions(1);
    let calledTimes = 0;
    mockedTuyaAPIInstance.connect = () => {
      calledTimes++;
      if (calledTimes > 1) {
        mockedTuyaAPIInstance.emit('connected');
        return true;
      } else {
        return false;
      }
    };
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.on('connected', () => {
        try {
          expect(log.error).toHaveBeenCalledWith('Could not connect to the device:', 'Could not connect to the device');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it('should retry connecting when device receives an error', () => {
    expect.assertions(1);
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.once('connected', () => {
        // triggering error
        mockedTuyaAPIInstance.emit('error', new Error('Mocked error'));
        laundryDevice.once('connected', () => {
          // expecting it to connect again
          try {
            expect(log.info).toHaveBeenCalledWith('Connected to the device');
            resolve();
          } catch(error) {
            reject(error);
          }
        });
      });
    });
  });

  it('should retry connecting when an error is thrown inside connection method', () => {
    expect.assertions(1);
    let calledTimes = 0;
    mockedTuyaAPIInstance.find = () => {
      calledTimes++;
      if (calledTimes > 1) {
        return true;
      } else {
        throw new Error('connection error');
      }
    };
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.once('connected', () => {
        // expecting it to connect again
        try {
          expect(log.info).toHaveBeenCalledWith('Connected to the device');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  it('should retry connecting when device disconnects', () => {
    expect.assertions(1);
    laundryDevice.init();
    return new Promise<void>((resolve) => {
      laundryDevice.once('connected', () => {
        // triggering error
        mockedTuyaAPIInstance.emit('disconnected');
        laundryDevice.once('connected', () => {
          // expecting it to connect again
          expect(log.info).toHaveBeenCalledWith('Connected to the device');
          resolve();
        });
      });
    });
  });

  it('should emit refresh when refreshing', () => {
    expect.assertions(1);
    laundryDevice.init();
    return new Promise<void>((resolve, reject) => {
      laundryDevice.once('refresh', () => {
        try {
          expect(mockedTuyaAPIInstance.refresh).toHaveBeenCalled();
          resolve();
        } catch(error) {
          reject(error);
        }
      });
    });
  });

  it('should not break refreshing if an error is encountered', () => {
    expect.assertions(2);
    laundryDevice.init();
    let calledTimes = 0;
    mockedTuyaAPIInstance.refresh = jest.fn().mockImplementation(async () => {
      calledTimes++;
      if (calledTimes > 1) {
        return Promise.resolve();
      } else {
        throw new Error('some error');
      }
    });
    return new Promise<void>((resolve, reject) => {
      laundryDevice.once('refresh', () => {
        laundryDevice.once('refresh', () => {
          try {
            expect(log.error).toHaveBeenCalledWith('Could not refresh the device:', 'some error');
            expect(mockedTuyaAPIInstance.refresh).toHaveBeenCalledTimes(2);
            resolve();
          } catch(error) {
            reject(error);
          }
        });
      });
    });
  });
});