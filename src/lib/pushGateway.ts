import {PushedConfig} from '../interfaces/notifyConfig';
import {Logger} from 'homebridge';
import axios from 'axios';
import FormData from 'form-data';

export class PushGateway {

  // TODO: make sure message sending is capped at x per minute so we avoid spamming
  constructor(
    private readonly log: Logger,
    private readonly config: PushedConfig
  ) {

  }

  public send(message: string) {
    const form = new FormData();
    form.append('app_key', this.config.appKey);
    form.append('app_secret', this.config.appSecret);
    form.append('content', message);
    form.append('target_type', 'channel');
    form.append('target_alias', this.config.channelAlias);

    axios.post('https://api.pushed.co/1/push', form, {
      headers: form.getHeaders(),
    }).then(() => {
      this.log.debug(`Sent push to pushed.co channel alias ${this.config.channelAlias}`);
    }).catch((e) => {
      this.log.error('Failed to send push through Pushed.co:', e.message);
    });
  }

}