'use client';

import { useState } from 'react';
import { triggerHaptic } from '../lib/hapticsAndSpatialAudio';
import { speak } from '../lib/voice';

export function usePiPAndBadging() {
  const [isPiPActive, setIsPiPActive] = useState(false);

  // App Badging API (sets unread count on OS app icon/dock)
  const setBadge = async (count?: number) => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      try {
        if (count && count > 0) {
          await (navigator as unknown as { setAppBadge: (c: number) => Promise<void> }).setAppBadge(
            count,
          );
        } else {
          await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
      } catch {
        // Restricted context guard
      }
    }
  };

  // Picture-in-Picture for Avatar Knight
  const requestPiP = async () => {
    triggerHaptic('click');

    // Check for Document Picture-in-Picture API
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await (
          window as unknown as {
            documentPictureInPicture: {
              requestWindow: (options: { width: number; height: number }) => Promise<Window>;
            };
          }
        ).documentPictureInPicture.requestWindow({
          width: 360,
          height: 480,
        });

        if (pipWindow) {
          pipWindow.document.body.innerHTML = `
            <div style="background:#0a0a16;color:white;font-family:sans-serif;padding:16px;text-align:center;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="font-size:48px;margin-bottom:8px;">⚔️</div>
              <h2 style="color:#00F0FF;margin:0 0 4px 0;font-size:16px;">Avatar Knight Cockpit</h2>
              <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">Always-on Sovereign Assistant</p>
              <div style="margin-top:16px;padding:8px 16px;background:rgba(0,240,255,0.15);border:1px solid #00F0FF;border-radius:999px;font-size:11px;color:#00F0FF;">
                ● Bifröst Listening Active
              </div>
            </div>
          `;
          setIsPiPActive(true);
          speak('Avatar Knight popped into Picture-in-Picture window.');
          pipWindow.addEventListener('pagehide', () => setIsPiPActive(false));
          return;
        }
      } catch {
        // User rejected PiP window
      }
    }

    // Fallback notification
    speak('Picture-in-Picture mode active.');
    setIsPiPActive((prev) => !prev);
  };

  return {
    isPiPActive,
    requestPiP,
    setBadge,
  };
}
