import {Logger} from 'homebridge/lib/logger';
import {LaundryDevice} from '../../lib/laundryDevice';
import {DateTime} from 'luxon';

export async function TrackCommand(argv: { id: string; key: string; pid: string; margin?: number }) {
  Logger.setDebugEnabled(true);
  const log = new Logger();
  const device = new LaundryDevice(log, argv.id, argv.key);

  let firstRun = true;

  device.on('connected', () => {
    if (firstRun) {
      log.info('Power on your appliance and start the operation now, power value will be printed below.');
      firstRun = false;
    }
    if (argv.margin) {
      log.info(`Showing fluctuations of at least ${argv.margin}% or otherwise once in 60 seconds`);
    }
  });

  let previousDPS: number;
  let previousDPSTime: DateTime;
  let startTime: DateTime;

  device.on('data', (data) => {
    if (data.dps[argv.pid] !== undefined) {
      const currentDPS = data.dps[argv.pid];

      if (argv.margin && previousDPS) {
        const percentageChange = 100 * Math.abs((previousDPS - currentDPS) / ((previousDPS + currentDPS) / 2));
        const secondsSinceLastOutput = DateTime.now().diff(previousDPSTime, 'seconds').seconds;
        if (percentageChange < argv.margin && secondsSinceLastOutput < 60) {
          return;
        }
      }
      previousDPS = currentDPS;
      previousDPSTime = DateTime.now();

      if (!startTime) {
        startTime = DateTime.now();
        log.info(`Power value update: ${currentDPS}`);
      } else {
        log.info(`Power value update: ${currentDPS} (started ${startTime.toRelative({ base: DateTime.now() })})`);
      }
    }
  });

  device.init();
}
