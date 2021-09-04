declare module 'tuyapi' {
  import * as EventEmitter from 'events';

  interface TuyAPI extends EventEmitter {
    new (config: { id: string; key: string });
    find(): Promise<boolean | []>;
    refresh(options: { schema: boolean }): Promise<void>;
    connect(): Promise<boolean>;
    disconnect();
    on(event: 'dp-refresh', listener: (data: DeviceData) => void): this;
  }

  export interface DeviceData {
    dps: { [index: string]: any }
  }

  export default TuyAPI;
}