/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export class ElevenLabsManager {
  private static audioContext: AudioContext | null = null;
  private static currentAudio: AudioBufferSourceNode | null = null;

  /**
   * Initialize audio context
   */
  static initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Stop current audio playback
   */
  static stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.stop();
      this.currentAudio = null;
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  static async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch('/api/elevenlabs-voices');
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  /**
   * Generate speech using ElevenLabs
   */
  static async speakText(text: string, voiceId?: string, voiceSettings?: VoiceSettings): Promise<void> {
    try {
      // Stop any current audio
      this.stopAudio();

      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceId, voiceSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ElevenLabs TTS API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioContext = this.initAudioContext();
      
      // Decode the audio data
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      
      // Create and play the audio
      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);
      
      this.currentAudio = source;
      source.start(0);
      
      // Clean up when audio ends
      source.onended = () => {
        this.currentAudio = null;
      };

    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  /**
   * Check if ElevenLabs is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           (window.AudioContext || (window as any).webkitAudioContext) !== undefined;
  }

  /**
   * Get recommended voices for D&D narration
   */
  static getRecommendedVoices(): string[] {
    return [
      'VR6AewLTigWG4xSOukaG', // Arnold - Deep, dramatic (Dungeon Master)
      'AZnzlk1XvdvUeBnXmlld', // Domi - Deep, authoritative
      'EXAVITQu4vr4xnSDxMaL', // Bella - Warm, engaging
      'pNInz6obpgDQGcFmaJgB', // Adam - Clear, friendly
      '21m00Tcm4TlvDq8ikWAM', // Rachel - Clear, professional
    ];
  }
} 