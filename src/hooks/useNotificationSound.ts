
import { useEffect, useRef } from 'react';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a more pleasant notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      return () => {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        // Create a pleasant notification sound with multiple tones
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // First tone - higher pitch
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        
        // Second tone - lower pitch for harmony
        oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(750, audioContext.currentTime + 0.1);
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.stop(audioContext.currentTime + 0.3);
      };
    };

    let playSound: (() => void) | null = null;
    
    try {
      playSound = createNotificationSound();
    } catch (error) {
      // Fallback to simple audio element
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmocDUCLze7GbDAGKm3A7siJNgMi');
      audioRef.current.volume = 0.3;
      playSound = () => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // Ignore if audio can't play
          });
        }
      };
    }

    audioRef.current = { play: playSound } as any;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current && typeof audioRef.current.play === 'function') {
      try {
        audioRef.current.play();
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }
    }
  };

  return { playNotificationSound };
};
