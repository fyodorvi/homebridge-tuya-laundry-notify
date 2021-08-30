declare module 'tuyapi' {
  import * as EventEmitter from 'events';

  export interface TuyAPI extends EventEmitter {
    new (config: { id: string; key: string });
    find(): Promise<boolean | []>;
    refresh(options: { schema: boolean }): Promise<void>;
    connect(): Promise<boolean>;
    on(event: 'dp-refresh', listener: (data: DPSData) => void): this;
  }

  export interface DPSData {
    dps: { [index: string]: any }
  }

  export default TuyAPI;
}