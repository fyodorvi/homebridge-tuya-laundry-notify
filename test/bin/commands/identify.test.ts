import {IdentifyCommand} from '../../../src/bin/commands/identify';
import {LaundryDevice} from '../../../src/lib/laundryDevice';
import {mocked} from 'ts-jest/utils';
import { Logger } from 'homebridge/lib/logger';

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

describe('IdentifyCommand', () => {

  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let logSpy: jest.SpiedFunction<typeof Logger.prototype.info>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log');
    logSpy = jest.spyOn(Logger.prototype, 'info');
  });

  afterEach(() => {
    consoleLogSpy.mockReset();
    logSpy.mockReset();
  });

  it('should create LaundryDevice with the right config', async () => {
    await IdentifyCommand({ id: 'some-id', key: 'some-key' });
    const args = mockedLaundryDevice.mock.calls[0];
    expect(args[1]).toEqual('some-id');
    expect(args[2]).toEqual('some-key');
  });

  it('should only output log on the first connection', async () => {
    await IdentifyCommand({ id: 'some-id', key: 'some-key' });
    mockedLaundryDeviceInstance.emit!('connected');
    mockedLaundryDeviceInstance.emit!('connected');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should output table with data properties when data arrived', async () => {
    await IdentifyCommand({ id: 'some-id', key: 'some-key' });
    mockedLaundryDeviceInstance.emit!('data', { dps: { 'prop1': 'val1', 'prop2': 'val2', 'prop3': 'val3' }});
    expect(consoleLogSpy).toHaveBeenCalledWith('╔═════════════╤═══════╗\n' +
      '║ Property ID │ Value ║\n' +
      '╟─────────────┼───────╢\n' +
      '║ prop1       │ val1  ║\n' +
      '╟─────────────┼───────╢\n' +
      '║ prop2       │ val2  ║\n' +
      '╟─────────────┼───────╢\n' +
      '║ prop3       │ val3  ║\n' +
      '╚═════════════╧═══════╝\n');
  });
});