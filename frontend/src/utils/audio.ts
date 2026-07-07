class AudioController {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor(src: string) {
    if (typeof window !== 'undefined') {
      this.audio = new Audio(src);
      this.audio.preload = 'auto';
      
      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
      });
    }
  }

  play() {
    if (!this.audio) return;
    
    // Prevent overlapping plays
    if (this.isPlaying) {
      this.audio.currentTime = 0; // Restart if already playing
    } else {
      this.isPlaying = true;
    }

    // Play and handle potential autoplay policy rejections
    this.audio.play().catch(error => {
      console.warn("Audio playback failed. This is usually due to browser autoplay policies. The user must interact with the document first.", error);
      this.isPlaying = false;
    });
  }

  playDouble() {
    if (!this.audio) return;
    
    // Play the first time
    this.play();
    
    // Play the second time shortly after using a separate Audio instance to overlap cleanly
    setTimeout(() => {
      if (this.audio) {
        const secondAudio = new Audio(this.audio.src);
        secondAudio.play().catch(() => {});
      }
    }, 200); // 200ms delay for urgency
  }
}

// Export singleton instance for the main notification sound
export const notificationSound = new AudioController('/notification.wav');

// Export singleton instance for success/confirmation sound
export const successSound = new AudioController('/success.wav');

let isAudioUnlocked = false;

export const unlockAudio = () => {
  if (isAudioUnlocked) return;
  isAudioUnlocked = true;

  [notificationSound, successSound].forEach(controller => {
    if (controller['audio']) {
      // Play and immediately pause to satisfy iOS Safari's interaction requirement
      controller['audio'].volume = 0;
      const promise = controller['audio'].play();
      if (promise !== undefined) {
        promise.then(() => {
          controller['audio']!.pause();
          controller['audio']!.currentTime = 0;
          controller['audio']!.volume = 1;
        }).catch(() => {
          isAudioUnlocked = false; // Retry next time if it fails
        });
      }
    }
  });
};
