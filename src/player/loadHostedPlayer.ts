import type { PlayerPackageV1 } from '@excalimate/player-runtime';
import { parseShareEnvelope } from '../services/shareEnvelope';
import {
  buildEditorShareUrl,
  downloadEncryptedShare,
  parsePlayerShareFragment,
} from '../services/shareTransport';
import type { ShareReference } from '../services/shareTransport';

export type HostedPlayerLoadResult =
  | {
      kind: 'package';
      playerPackage: PlayerPackageV1;
      editorUrl: string;
    }
  | {
      kind: 'legacy';
      editorUrl: string;
    };

export interface HostedPlayerLoadOptions {
  hash?: string;
  appOrigin?: string;
  download?: (reference: ShareReference) => Promise<unknown>;
  clearFragment?: () => void;
}

export async function loadHostedPlayer(
  options: HostedPlayerLoadOptions = {},
): Promise<HostedPlayerLoadResult> {
  const hash = options.hash ?? window.location.hash;
  const appOrigin = options.appOrigin ?? window.location.origin;
  const reference = parsePlayerShareFragment(hash);
  const editorUrl = buildEditorShareUrl(appOrigin, reference);
  (options.clearFragment ?? clearPlayerFragment)();

  const plaintext = await (options.download ?? downloadEncryptedShare)(reference);
  const envelope = parseShareEnvelope(plaintext);
  if (!envelope.playerPackage) {
    return { kind: 'legacy', editorUrl };
  }
  return {
    kind: 'package',
    playerPackage: envelope.playerPackage,
    editorUrl,
  };
}

function clearPlayerFragment(): void {
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}
