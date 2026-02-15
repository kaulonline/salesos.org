import 'dart:async';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// Voice output state
enum VoiceOutputState {
  idle,
  initializing,
  speaking,
  paused,
  error,
  unavailable,
}

/// Voice output settings
class VoiceOutputSettings {
  final double speechRate; // 0.0 - 1.0
  final double pitch; // 0.5 - 2.0
  final double volume; // 0.0 - 1.0
  final String? language;
  final String? voice;

  const VoiceOutputSettings({
    this.speechRate = 0.5,
    this.pitch = 1.0,
    this.volume = 1.0,
    this.language,
    this.voice,
  });

  VoiceOutputSettings copyWith({
    double? speechRate,
    double? pitch,
    double? volume,
    String? language,
    String? voice,
  }) {
    return VoiceOutputSettings(
      speechRate: speechRate ?? this.speechRate,
      pitch: pitch ?? this.pitch,
      volume: volume ?? this.volume,
      language: language ?? this.language,
      voice: voice ?? this.voice,
    );
  }
}

/// Voice output service for text-to-speech functionality
class VoiceOutputService {
  final FlutterTts _tts = FlutterTts();

  VoiceOutputState _state = VoiceOutputState.idle;
  bool _isInitialized = false;
  VoiceOutputSettings _settings = const VoiceOutputSettings();
  List<dynamic>? _availableLanguages;
  List<dynamic>? _availableVoices;

  // Stream controllers
  final _stateController = StreamController<VoiceOutputState>.broadcast();
  final _progressController = StreamController<double>.broadcast();
  final _completionController = StreamController<void>.broadcast();

  // Getters
  Stream<VoiceOutputState> get stateStream => _stateController.stream;
  Stream<double> get progressStream => _progressController.stream;
  Stream<void> get completionStream => _completionController.stream;
  VoiceOutputState get state => _state;
  bool get isSpeaking => _state == VoiceOutputState.speaking;
  bool get isAvailable => _isInitialized && _state != VoiceOutputState.unavailable;
  VoiceOutputSettings get settings => _settings;
  List<dynamic>? get availableLanguages => _availableLanguages;
  List<dynamic>? get availableVoices => _availableVoices;

  /// Initialize the TTS service
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    _updateState(VoiceOutputState.initializing);

    try {
      // Set up handlers
      _tts.setStartHandler(() {
        _updateState(VoiceOutputState.speaking);
      });

      _tts.setCompletionHandler(() {
        _updateState(VoiceOutputState.idle);
        _completionController.add(null);
      });

      _tts.setCancelHandler(() {
        _updateState(VoiceOutputState.idle);
      });

      _tts.setPauseHandler(() {
        _updateState(VoiceOutputState.paused);
      });

      _tts.setContinueHandler(() {
        _updateState(VoiceOutputState.speaking);
      });

      _tts.setErrorHandler((message) {
        _updateState(VoiceOutputState.error);
      });

      _tts.setProgressHandler((text, start, end, word) {
        if (text.isNotEmpty) {
          final progress = end / text.length;
          _progressController.add(progress);
        }
      });

      // Get available languages and voices
      _availableLanguages = await _tts.getLanguages;
      _availableVoices = await _tts.getVoices;


      // Set default language (prefer English)
      String defaultLanguage = 'en-US';
      if (_availableLanguages != null && _availableLanguages!.isNotEmpty) {
        if (_availableLanguages!.contains('en-US')) {
          defaultLanguage = 'en-US';
        } else if (_availableLanguages!.any((l) => l.toString().startsWith('en'))) {
          defaultLanguage = _availableLanguages!.firstWhere((l) => l.toString().startsWith('en'));
        }
      }

      await _tts.setLanguage(defaultLanguage);
      _settings = _settings.copyWith(language: defaultLanguage);

      // Platform-specific settings
      if (Platform.isIOS) {
        await _tts.setSharedInstance(true);
        await _tts.setIosAudioCategory(
          IosTextToSpeechAudioCategory.playback,
          [
            IosTextToSpeechAudioCategoryOptions.allowBluetooth,
            IosTextToSpeechAudioCategoryOptions.allowBluetoothA2DP,
            IosTextToSpeechAudioCategoryOptions.mixWithOthers,
          ],
          IosTextToSpeechAudioMode.voicePrompt,
        );
      }

      // Apply default settings
      await _applySettings();

      _isInitialized = true;
      _updateState(VoiceOutputState.idle);
      return true;
    } catch (e) {
      _updateState(VoiceOutputState.unavailable);
      return false;
    }
  }

  /// Speak the given text
  Future<bool> speak(String text) async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return false;
    }

    if (text.trim().isEmpty) {
      return false;
    }

    try {
      // Stop any ongoing speech
      if (_state == VoiceOutputState.speaking) {
        await stop();
        await Future.delayed(const Duration(milliseconds: 100));
      }

      final result = await _tts.speak(text);
      return result == 1;
    } catch (e) {
      _updateState(VoiceOutputState.error);
      return false;
    }
  }

  /// Stop speaking
  Future<void> stop() async {
    try {
      await _tts.stop();
      _updateState(VoiceOutputState.idle);
    } catch (e) {
      // Silently ignore
    }
  }

  /// Pause speaking (iOS only)
  Future<void> pause() async {
    if (!Platform.isIOS) {
      return;
    }

    try {
      await _tts.pause();
    } catch (e) {
      // Silently ignore
    }
  }

  /// Update TTS settings
  Future<void> updateSettings(VoiceOutputSettings newSettings) async {
    _settings = newSettings;
    if (_isInitialized) {
      await _applySettings();
    }
  }

  /// Set speech rate (0.0 - 1.0)
  Future<void> setSpeechRate(double rate) async {
    _settings = _settings.copyWith(speechRate: rate.clamp(0.0, 1.0));
    if (_isInitialized) {
      await _tts.setSpeechRate(_settings.speechRate);
    }
  }

  /// Set pitch (0.5 - 2.0)
  Future<void> setPitch(double pitch) async {
    _settings = _settings.copyWith(pitch: pitch.clamp(0.5, 2.0));
    if (_isInitialized) {
      await _tts.setPitch(_settings.pitch);
    }
  }

  /// Set volume (0.0 - 1.0)
  Future<void> setVolume(double volume) async {
    _settings = _settings.copyWith(volume: volume.clamp(0.0, 1.0));
    if (_isInitialized) {
      await _tts.setVolume(_settings.volume);
    }
  }

  /// Set language
  Future<void> setLanguage(String language) async {
    _settings = _settings.copyWith(language: language);
    if (_isInitialized) {
      await _tts.setLanguage(language);
    }
  }

  /// Set voice
  Future<void> setVoice(Map<String, String> voice) async {
    if (_isInitialized) {
      await _tts.setVoice(voice);
    }
  }

  /// Apply current settings to TTS engine
  Future<void> _applySettings() async {
    await _tts.setSpeechRate(_settings.speechRate);
    await _tts.setPitch(_settings.pitch);
    await _tts.setVolume(_settings.volume);
    if (_settings.language != null) {
      await _tts.setLanguage(_settings.language!);
    }
  }

  void _updateState(VoiceOutputState newState) {
    _state = newState;
    _stateController.add(newState);
  }

  /// Dispose resources
  void dispose() {
    _tts.stop();
    _stateController.close();
    _progressController.close();
    _completionController.close();
  }
}

/// Voice output service provider
final voiceOutputServiceProvider = Provider<VoiceOutputService>((ref) {
  final service = VoiceOutputService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Voice output state stream provider
final voiceOutputStateProvider = StreamProvider<VoiceOutputState>((ref) {
  final service = ref.watch(voiceOutputServiceProvider);
  return service.stateStream;
});

/// Voice output completion stream provider
final voiceOutputCompletionProvider = StreamProvider<void>((ref) {
  final service = ref.watch(voiceOutputServiceProvider);
  return service.completionStream;
});
