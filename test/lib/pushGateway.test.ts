import {PushGateway} from '../../src/lib/pushGateway';
import {log} from '../__utils__/log';
import {PlatformConfig} from 'homebridge';
import {NotifyConfig} from '../../src/interfaces/notifyConfig';
import {emptyConfig} from '../__utils__/config';
import {mocked} from 'ts-jest/utils';
import axios from 'axios';
import FormData from 'form-data';

jest.mock('axios');
jest.mock('form-data');

const mockedAxios = mocked(axios, true);
const mockedFormData = mocked(FormData, true);

describe('PushGateway', () => {
  let config: PlatformConfig & NotifyConfig;
  let pushGateway: PushGateway;

  beforeEach(() => {
    config = { ...emptyConfig };
    pushGateway = new PushGateway(log, {
      appKey: 'key',
      appSecret: 'secret',
      channelAlias: 'alias',
    });
  });

  it('should send axios POST with correct parameters', () => {
    mockedAxios.post.mockImplementation(() => Promise.resolve());
    mockedFormData.prototype.getHeaders.mockImplementation(() => {
      return { 'headers' : 'header' };
    });
    pushGateway.send('my message');
    expect(mockedFormData.mock.instances[0].append).toHaveBeenCalledWith('app_key', 'key');
    expect(mockedFormData.mock.instances[0].append).toHaveBeenCalledWith('app_secret', 'secret');
    expect(mockedFormData.mock.instances[0].append).toHaveBeenCalledWith('content', 'my message');
    expect(mockedFormData.mock.instances[0].append).toHaveBeenCalledWith('target_type', 'channel');
    expect(mockedFormData.mock.instances[0].append).toHaveBeenCalledWith('target_alias', 'alias');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.pushed.co/1/push',
      mockedFormData.mock.instances[0], { headers: { 'headers' : 'header' } });
  });

  it('should not throw if axios is getting an error', () => {
    mockedAxios.post.mockImplementation(() => Promise.reject(new Error('some network error')));
    expect(() => pushGateway.send('my message')).not.toThrow();
  });
});