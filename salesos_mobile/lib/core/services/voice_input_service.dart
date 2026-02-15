import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_recognition_error.dart';

/// Voice input state
enum VoiceInputState {
  idle,
  initializing,
  listening,
  processing,
  error,
  unavailable,
}

/// Voice input result
class VoiceInputResult {
  final String text;
  final double confidence;
  final bool isFinal;

  const VoiceInputResult({
    required this.text,
    required this.confidence,
    required this.isFinal,
  });
}

/// Voice input service for speech-to-text functionality
class VoiceInputService {
  final SpeechToText _speech = SpeechToText();

  VoiceInputState _state = VoiceInputState.idle;
  bool _isInitialized = false;
  String _currentLocale = 'en_US';
  String _lastError = '';

  // Stream controllers
  final _stateController = StreamController<VoiceInputState>.broadcast();
  final _resultController = StreamController<VoiceInputResult>.broadcast();
  final _errorController = StreamController<String>.broadcast();

  // Getters
  Stream<VoiceInputState> get stateStream => _stateController.stream;
  Stream<VoiceInputResult> get resultStream => _resultController.stream;
  Stream<String> get errorStream => _errorController.stream;
  VoiceInputState get state => _state;
  bool get isListening => _state == VoiceInputState.listening;
  bool get isAvailable => _isInitialized && _state != VoiceInputState.unavailable;

  /// Initialize the speech recognition service
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    _updateState(VoiceInputState.initializing);

    try {
      _isInitialized = await _speech.initialize(
        onStatus: _onStatus,
        onError: _onError,
        debugLogging: kDebugMode,
      );

      if (!_isInitialized) {
        _updateState(VoiceInputState.unavailable);
        _lastError = 'Speech recognition not available on this device';
        return false;
      }

      // Get available locales
      final locales = await _speech.locales();

      // Prefer English
      final englishLocale = locales.firstWhere(
        (l) => l.localeId.startsWith('en'),
        orElse: () => locales.isNotEmpty ? locales.first : LocaleName('en_US', 'English'),
      );
      _currentLocale = englishLocale.localeId;

      _updateState(VoiceInputState.idle);
      return true;
    } catch (e) {
      _updateState(VoiceInputState.unavailable);
      _lastError = 'Failed to initialize speech recognition: $e';
      return false;
    }
  }

  /// Start listening for speech input
  Future<bool> startListening({
    Duration listenFor = const Duration(seconds: 30),
    Duration pauseFor = const Duration(seconds: 3),
    bool partialResults = true,
  }) async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return false;
    }

    if (_state == VoiceInputState.listening) {
      return true;
    }

    try {
      HapticFeedback.mediumImpact();
      _updateState(VoiceInputState.listening);

      await _speech.listen(
        onResult: _onResult,
        listenFor: listenFor,
        pauseFor: pauseFor,
        localeId: _currentLocale,
        listenOptions: SpeechListenOptions(
          partialResults: partialResults,
          cancelOnError: false,
          listenMode: ListenMode.dictation,
        ),
      );

      return true;
    } catch (e) {
      _updateState(VoiceInputState.error);
      _lastError = 'Failed to start listening: $e';
      _errorController.add(_lastError);
      return false;
    }
  }

  /// Stop listening
  Future<void> stopListening() async {
    if (_state != VoiceInputState.listening) return;

    try {
      HapticFeedback.lightImpact();
      await _speech.stop();
      _updateState(VoiceInputState.processing);

      // Brief delay then return to idle
      await Future.delayed(const Duration(milliseconds: 300));
      _updateState(VoiceInputState.idle);
    } catch (e) {
      _updateState(VoiceInputState.idle);
    }
  }

  /// Cancel listening without processing
  Future<void> cancelListening() async {
    try {
      await _speech.cancel();
      _updateState(VoiceInputState.idle);
    } catch (e) {
      _updateState(VoiceInputState.idle);
    }
  }

  /// Toggle listening state
  Future<bool> toggleListening() async {
    if (_state == VoiceInputState.listening) {
      await stopListening();
      return false;
    } else {
      return await startListening();
    }
  }

  // Callback handlers
  void _onResult(SpeechRecognitionResult result) {

    _resultController.add(VoiceInputResult(
      text: result.recognizedWords,
      confidence: result.confidence,
      isFinal: result.finalResult,
    ));

    if (result.finalResult) {
      _updateState(VoiceInputState.idle);
    }
  }

  void _onStatus(String status) {

    switch (status) {
      case 'listening':
        _updateState(VoiceInputState.listening);
        break;
      case 'notListening':
        if (_state == VoiceInputState.listening) {
          _updateState(VoiceInputState.processing);
        }
        break;
      case 'done':
        _updateState(VoiceInputState.idle);
        break;
    }
  }

  void _onError(SpeechRecognitionError error) {

    _lastError = error.errorMsg;
    _errorController.add(error.errorMsg);

    if (error.permanent) {
      _updateState(VoiceInputState.unavailable);
    } else {
      _updateState(VoiceInputState.error);
      // Auto-recover after a brief delay
      Future.delayed(const Duration(seconds: 1), () {
        if (_state == VoiceInputState.error) {
          _updateState(VoiceInputState.idle);
        }
      });
    }
  }

  void _updateState(VoiceInputState newState) {
    _state = newState;
    _stateController.add(newState);
  }

  /// Dispose resources
  void dispose() {
    _speech.cancel();
    _stateController.close();
    _resultController.close();
    _errorController.close();
  }
}

/// Voice input service provider
final voiceInputServiceProvider = Provider<VoiceInputService>((ref) {
  final service = VoiceInputService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Voice input state stream provider
final voiceInputStateProvider = StreamProvider<VoiceInputState>((ref) {
  final service = ref.watch(voiceInputServiceProvider);
  return service.stateStream;
});

/// Voice input result stream provider
final voiceInputResultProvider = StreamProvider<VoiceInputResult>((ref) {
  final service = ref.watch(voiceInputServiceProvider);
  return service.resultStream;
});

/// Voice input error stream provider
final voiceInputErrorProvider = StreamProvider<String>((ref) {
  final service = ref.watch(voiceInputServiceProvider);
  return service.errorStream;
});
