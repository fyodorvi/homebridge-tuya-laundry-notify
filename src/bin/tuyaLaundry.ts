import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {IdentifyCommand} from './commands/identify';
import { TrackCommand } from './commands/track';

yargs(hideBin(process.argv))
  .command('identify', 'Helps to identify Power Property ID . ' +
    'Starts outputting Device Properties, observe them and compare them to Tuya app output, ' +
    'one of them will be the Power Value.',
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
  .command('track', 'Tracks the Power value change. Make sure you start that command BEFORE ' +
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
    pid: {
      require: true,
      description: 'Property ID',
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