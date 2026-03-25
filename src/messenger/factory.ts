import type { MessengerConfig } from '../core/types.js';
import type { MessengerAdapter } from './adapter.js';
import { SlackAdapter } from './slack.js';
import { TelegramAdapter } from './telegram.js';
import { KakaoWorkAdapter } from './kakaowork.js';

// ---------------------------------------------------------------------------
// createAdapter — factory that maps a MessengerConfig to an adapter instance
// ---------------------------------------------------------------------------

export function createAdapter(config: MessengerConfig): MessengerAdapter {
  switch (config.type) {
    case 'slack': {
      if (config.signingSecret === undefined) {
        throw new Error('SlackAdapter requires a signingSecret in MessengerConfig.');
      }
      return new SlackAdapter({
        token: config.token,
        signingSecret: config.signingSecret,
        appToken: config.appToken,
      });
    }

    case 'telegram': {
      return new TelegramAdapter({ token: config.token });
    }

    case 'kakaowork': {
      return new KakaoWorkAdapter();
    }

    default: {
      // Exhaustiveness guard — TypeScript narrows `config.type` to `never` here
      // if all union members are handled above.
      const exhaustive: never = config.type as never;
      throw new Error(`Unsupported messenger type: ${String(exhaustive)}`);
    }
  }
}
