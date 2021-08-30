import {Logger} from 'homebridge/lib/logger';
import {mocked} from 'ts-jest/utils';
jest.mock('homebridge/lib/logger');

const logger = new Logger();
const mockedLogger = mocked(logger, true);
export const log = mockedLogger;