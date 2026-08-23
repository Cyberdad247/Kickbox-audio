import { useEffect, useRef, useState, useCallback } from 'react';
import { useTenant } from '../context/TenantContext';

export function useWakeWord(onWakeWordDetected: () => void, isMainListening: boolean) {
  const { activeTenant } = useTenant();
  const config = activeTenant.configuration;
  const isEnabled = config?.wakeWordEnabled ?? false;
  const targetWord = (config?.wakeWord || 'lakisha').toLowerCase().trim();
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const callbackRef = useRef(onWakeWordDetected);

  useEffect(() => {
    callbackRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          
          if (transcript.includes(targetWord)) {
            console.log('Wake word detected:', targetWord);
            if (callbackRef.current) {
              callbackRef.current();
            }
            
            // Stop and restart to clear the transcript buffer
            recognition.stop();
            break;
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted') {
          console.warn('Wake word recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if it ended and is still enabled
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setError(null);
    } catch (e) {
      console.warn('Failed to start wake word listener:', e);
      setIsListening(false);
    }
  }, [targetWord]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (isEnabled && !isMainListening) {
      startListening();
    } else {
      stopListening();
    }
    
    return () => {
      stopListening();
    };
  }, [isEnabled, isMainListening, startListening, stopListening]);

  return { isListening, error };
}
