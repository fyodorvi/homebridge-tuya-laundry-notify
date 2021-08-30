import {PlatformConfig} from 'homebridge';
import {NotifyConfig} from '../../src/interfaces/notifyConfig';

export const emptyConfig: PlatformConfig & NotifyConfig = {
  platform: '',
  pushed: {
    appKey: '',
    appSecret: '',
    channelAlias: '',
  },
  laundryDevices: [],
};