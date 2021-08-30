import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {IdentifyCommand} from './commands/identify';
import { TrackCommand } from './commands/track';

yargs(hideBin(process.argv))
  .command('identify', 'Helps to identify DPS ID of the Power value. ' +
    'Starts outputting DPS properties, observe them and compare them to Tuya app output, ' +
    'one of them will be the Power consumption value.',
  {
    id: {
      require: true,
      description: 'Device ID',
      type: 'string',
    },
    key: {
      require: true,
      description: 'Device Key',
      type: 'string',
    },
  }, IdentifyCommand)
  .command('track', 'Tracks the DPS value change. Make sure you start that command BEFORE ' +
    'running the appliance. ',
  {
    id: {
      require: true,
      description: 'Device ID',
      type: 'string',
    },
    key: {
      require: true,
      description: 'Device Key',
      type: 'string',
    },
    dps: {
      require: true,
      description: 'DPS ID',
      type: 'string',
    },
    margin: {
      description: 'Acceptable deviation margin in % to avoid spamming with similar values.' +
        ' When set, the tool will still output current DPS every minute.',
      type: 'number',
    },
  }, TrackCommand)
  .help()
  .demandCommand(1)
  .strict()
  .argv;

// console.log(argv);
// yargs.showHelp();