import { table } from 'table';
import {LaundryDevice} from '../../lib/laundryDevice';
import { Logger } from 'homebridge/lib/logger';

export async function IdentifyCommand(argv: { id: string; key: string }) {
  Logger.setDebugEnabled(true);
  const log = new Logger();
  const device = new LaundryDevice(log, argv.id, argv.key);

  let firstRun = true;
  device.on('connected', () => {
    if (firstRun) {
      firstRun = false;
      log.info('Power on your appliance to observe the values.');
    }
  });

  const existingDPS: { [key: string]: string } = {};

  device.on('data', (data) => {
    // eslint-disable-next-line no-console
    console.clear();
    Object.assign(existingDPS, data.dps);
    const tableData: string[][] = [['Property ID', 'Value']];
    for (const [key, value] of Object.entries(existingDPS)) {
      tableData.push([key, value]);
    }
    // eslint-disable-next-line no-console
    console.log(table(tableData));
    log.info('Make sure plugged in appliance is consuming power (operating).');
    log.info('One of the values above will represent power consumption.');
    log.info('Compare to the values displayed in Tuya app.');
    log.info('When identified the correct Power Property ID, run tuya-laundry track');
    log.info('and run the appliance to record power fluctuation during operation.');
  });

  device.init();
}
