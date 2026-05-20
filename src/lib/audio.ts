let isAudioUnlocked = false;

export const unlockAudio = () => {
  if (isAudioUnlocked) return;
  const audio = new Audio();
  audio.play().then(() => {
    isAudioUnlocked = true;
  }).catch(() => {
    // Still locked
  });
};

export const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0.5;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        if (e.name === 'NotAllowedError') {
          console.warn("Audio playback blocked by autoplay policy. Waiting for user interaction.");
        } else {
          console.error("Audio playback failed:", e);
        }
      });
    }
  } catch (err) {
    console.error("Failed to initialize sound:", err);
  }
};
