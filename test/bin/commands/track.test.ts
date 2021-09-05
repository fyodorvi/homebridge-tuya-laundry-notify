import {LaundryDevice} from '../../../src/lib/laundryDevice';
import {mocked} from 'ts-jest/utils';
import { Logger } from 'homebridge/lib/logger';
import {TrackCommand} from '../../../src/bin/commands/track';

let mockedLaundryDeviceInstance: Partial<LaundryDevice>;

jest.mock('../../../src/lib/laundryDevice', () => {
  return {
    LaundryDevice: jest.fn().mockImplementation(() => {
      const { LaundryDevice } = jest.requireActual('../../../src/lib/laundryDevice');
      class MockedLaundryDevice extends LaundryDevice {
        init = jest.fn();
      }
      mockedLaundryDeviceInstance = new MockedLaundryDevice();
      return mockedLaundryDeviceInstance;
    }),
  };
});

const mockedLaundryDevice = mocked(LaundryDevice, true);

describe('TrackCommand', () => {

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let logSpy: jest.SpiedFunction<typeof Logger.prototype.info>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log');
    logSpy = jest.spyOn(Logger.prototype, 'info');
    jest.useFakeTimers();
  });

  afterEach(() => {
    consoleLogSpy.mockReset();
    logSpy.mockReset();
    jest.useRealTimers();
  });

  it('should create LaundryDevice with the right config', async () => {
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42' });
    const args = mockedLaundryDevice.mock.calls[0];
    expect(args[1]).toEqual('some-id');
    expect(args[2]).toEqual('some-key');
  });

  it('should only output log on the first connection', async () => {
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42' });
    mockedLaundryDeviceInstance.emit!('connected');
    mockedLaundryDeviceInstance.emit!('connected');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should output log about margin when it is used', async () => {
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42', margin: 5 });
    mockedLaundryDeviceInstance.emit!('connected');
    expect(logSpy).toHaveBeenCalledWith('Showing fluctuations of at least 5% or otherwise once in 60 seconds');
  });

  it('should do nothing when data did not arrive', async () => {
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42'});
    mockedLaundryDeviceInstance.emit!('data', { dps: { } });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should output data every arrival when margin is not specified', async () => {
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42'});
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 69 } });
    expect(logSpy).toHaveBeenCalledWith('Power value update: 69');
  });

  it('should report correct elapsed time since start', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42'});
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 69 } });
    jest.setSystemTime(new Date('1970-01-01T00:05:00'));
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 79 } });
    expect(logSpy).toHaveBeenCalledWith('Power value update: 79 (started 5 minutes ago)');
  });

  it('should output margin change when margin is specified', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42', margin: 5 });
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 100 } });
    jest.setSystemTime(new Date('1970-01-01T00:00:05'));
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 101 } });
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 106 } });
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 95 } });
    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenNthCalledWith(1, 'Power value update: 100');
    expect(logSpy).toHaveBeenNthCalledWith(2, 'Power value update: 106 (started 5 seconds ago)');
    expect(logSpy).toHaveBeenNthCalledWith(3, 'Power value update: 95 (started 5 seconds ago)');
  });

  it('should output margin change when margin is specified after a minute', async () => {
    jest.setSystemTime(new Date('1970-01-01T00:00:00'));
    await TrackCommand({ id: 'some-id', key: 'some-key', pid: '42', margin: 5 });
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 100 } });
    jest.setSystemTime(new Date('1970-01-01T00:01:00'));
    mockedLaundryDeviceInstance.emit!('data', { dps: { '42': 101 } });
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(2, 'Power value update: 101 (started 1 minute ago)');
  });
});