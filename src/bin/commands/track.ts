import {Logger} from 'homebridge/lib/logger';
import {LaundryDevice} from '../../lib/laundryDevice';
import {DateTime} from 'luxon';

export async function TrackCommand(argv: { id: string; key: string; dps: string; margin?: number }) {
  Logger.setDebugEnabled(true);
  const log = new Logger();
  const device = new LaundryDevice(log, argv.id, argv.key);

  device.on('connected', (firstRun) => {
    if (firstRun) {
      log.info('Power on your appliance and start the operation now, power values will be printed below.');
    }
    if (argv.margin) {
      log.info(`Showing fluctuations of at least ${argv.margin}% or otherwise once in 60 seconds`);
    }
  });

  let previousDPS: number;
  let previousDPSTime: DateTime;
  let startTime: DateTime;

  device.on('data', (data) => {
    if (!startTime) {
      startTime = DateTime.now();
    }
    if (data.dps[argv.dps] !== undefined) {
      const currentDPS = data.dps[argv.dps];

      if (argv.margin && previousDPS) {
        const percentageChange = 100 * Math.abs((previousDPS - currentDPS) / ((previousDPS + currentDPS) / 2));
        const secondsSinceLastOutput = DateTime.now().diff(previousDPSTime, 'seconds').seconds;
        if (percentageChange < argv.margin && secondsSinceLastOutput < 60) {
          return;
        }
      }
      previousDPS = currentDPS;
      previousDPSTime = DateTime.now();

      log.info(`DPS value update: ${currentDPS} (started ${startTime.toRelative({ base: DateTime.now() })})`,);
    }
  });

  device.init();
}
