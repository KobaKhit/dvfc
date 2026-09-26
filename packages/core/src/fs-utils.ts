/**
 * Tiny fs helpers shared inside @dvfc/core (not part of the public API).
 */

import { access } from 'fs/promises';

export async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
