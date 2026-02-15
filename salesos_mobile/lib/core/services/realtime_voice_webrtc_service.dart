import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';
import '../network/api_client.dart';
import '../providers/auth_mode_provider.dart';

/// Azure OpenAI Realtime WebRTC Configuration
class RealtimeWebRTCConfig {
  // Voice options: alloy, echo, fable, onyx, nova, shimmer
  // Using shimmer as recommended by Azure for realtime
  static const String defaultVoice = 'shimmer';
  // Deployment name - should match Azure OpenAI deployment
  // Using gpt-realtime-mini for 97% cost savings!
  static const String defaultModel = 'gpt-realtime-mini';
}

/// State of the realtime voice conversation
enum RealtimeVoiceState {
  disconnected,
  connecting,
  connected,
  listening,
  processing,
  speaking,
  error,
}

/// Represents a conversation turn
class ConversationTurn {
  final String id;
  final String role; // 'user' or 'assistant'
  final String? transcript;
  final DateTime timestamp;
  final bool isComplete;

  ConversationTurn({
    required this.id,
    required this.role,
    this.transcript,
    DateTime? timestamp,
    this.isComplete = false,
  }) : timestamp = timestamp ?? DateTime.now();

  ConversationTurn copyWith({
    String? transcript,
    bool? isComplete,
  }) {
    return ConversationTurn(
      id: id,
      role: role,
      transcript: transcript ?? this.transcript,
      timestamp: timestamp,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

/// Session analytics for tracking voice conversation metrics
class SessionAnalytics {
  final DateTime? sessionStartTime;
  final DateTime? sessionEndTime;
  final int userTurnCount;
  final int assistantTurnCount;
  final int functionCallCount;
  final bool userHasSpoken;
  final int reconnectionAttempts;
  final Duration totalSpeakingTime;
  final List<String> toolsExecuted;

  const SessionAnalytics({
    this.sessionStartTime,
    this.sessionEndTime,
    this.userTurnCount = 0,
    this.assistantTurnCount = 0,
    this.functionCallCount = 0,
    this.userHasSpoken = false,
    this.reconnectionAttempts = 0,
    this.totalSpeakingTime = Duration.zero,
    this.toolsExecuted = const [],
  });

  /// Session duration (returns zero if session not started)
  Duration get sessionDuration {
    if (sessionStartTime == null) return Duration.zero;
    final end = sessionEndTime ?? DateTime.now();
    return end.difference(sessionStartTime!);
  }

  /// Total number of conversation turns
  int get totalTurns => userTurnCount + assistantTurnCount;

  SessionAnalytics copyWith({
    DateTime? sessionStartTime,
    DateTime? sessionEndTime,
    int? userTurnCount,
    int? assistantTurnCount,
    int? functionCallCount,
    bool? userHasSpoken,
    int? reconnectionAttempts,
    Duration? totalSpeakingTime,
    List<String>? toolsExecuted,
  }) {
    return SessionAnalytics(
      sessionStartTime: sessionStartTime ?? this.sessionStartTime,
      sessionEndTime: sessionEndTime ?? this.sessionEndTime,
      userTurnCount: userTurnCount ?? this.userTurnCount,
      assistantTurnCount: assistantTurnCount ?? this.assistantTurnCount,
      functionCallCount: functionCallCount ?? this.functionCallCount,
      userHasSpoken: userHasSpoken ?? this.userHasSpoken,
      reconnectionAttempts: reconnectionAttempts ?? this.reconnectionAttempts,
      totalSpeakingTime: totalSpeakingTime ?? this.totalSpeakingTime,
      toolsExecuted: toolsExecuted ?? this.toolsExecuted,
    );
  }

  Map<String, dynamic> toJson() => {
    'sessionDurationMs': sessionDuration.inMilliseconds,
    'userTurnCount': userTurnCount,
    'assistantTurnCount': assistantTurnCount,
    'totalTurns': totalTurns,
    'functionCallCount': functionCallCount,
    'userHasSpoken': userHasSpoken,
    'reconnectionAttempts': reconnectionAttempts,
    'totalSpeakingTimeMs': totalSpeakingTime.inMilliseconds,
    'toolsExecuted': toolsExecuted,
  };
}

/// Realtime voice conversation state
class RealtimeConversationState {
  final RealtimeVoiceState state;
  final List<ConversationTurn> turns;
  final String? currentTranscript;
  final String? errorMessage;
  final double inputLevel;
  final double outputLevel;
  final bool isUserSpeaking;
  final bool isAssistantSpeaking;
  final SessionAnalytics analytics;
  final bool isReconnecting;

  const RealtimeConversationState({
    this.state = RealtimeVoiceState.disconnected,
    this.turns = const [],
    this.currentTranscript,
    this.errorMessage,
    this.inputLevel = 0.0,
    this.outputLevel = 0.0,
    this.isUserSpeaking = false,
    this.isAssistantSpeaking = false,
    this.analytics = const SessionAnalytics(),
    this.isReconnecting = false,
  });

  RealtimeConversationState copyWith({
    RealtimeVoiceState? state,
    List<ConversationTurn>? turns,
    String? currentTranscript,
    String? errorMessage,
    double? inputLevel,
    double? outputLevel,
    bool? isUserSpeaking,
    bool? isAssistantSpeaking,
    SessionAnalytics? analytics,
    bool? isReconnecting,
  }) {
    return RealtimeConversationState(
      state: state ?? this.state,
      turns: turns ?? this.turns,
      currentTranscript: currentTranscript,
      errorMessage: errorMessage,
      inputLevel: inputLevel ?? this.inputLevel,
      outputLevel: outputLevel ?? this.outputLevel,
      isUserSpeaking: isUserSpeaking ?? this.isUserSpeaking,
      isAssistantSpeaking: isAssistantSpeaking ?? this.isAssistantSpeaking,
      analytics: analytics ?? this.analytics,
      isReconnecting: isReconnecting ?? this.isReconnecting,
    );
  }
}

/// Service for real-time voice conversations with Azure OpenAI using WebRTC
/// WebRTC provides lower latency and automatic audio handling
class RealtimeVoiceWebRTCService extends Notifier<RealtimeConversationState> {
  // WebRTC components
  RTCPeerConnection? _peerConnection;
  RTCDataChannel? _dataChannel;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  // API client (injected via ref)
  ApiClient? _apiClient;

  // Session state
  String? _ephemeralToken;
  String? _webrtcEndpoint;
  String? _currentResponseId;
  Map<String, dynamic>? _sessionConfig;
  final Map<String, ConversationTurn> _turnMap = {};
  bool _userHasSpoken = false;
  bool _isDisposed = false;

  // Function call tracking
  String? _currentFunctionCallId;
  String? _currentFunctionName;
  final StringBuffer _currentFunctionArguments = StringBuffer();
  int _functionCallCount = 0;

  // Dynamic engagement messages fetched from backend
  Map<String, String> _engagementMessages = {};
  String _defaultEngagementMessage = 'One moment, let me check that...';

  // Reconnection state
  int _reconnectionAttempts = 0;
  static const int _maxReconnectionAttempts = 3;
  static const Duration _reconnectionDelay = Duration(seconds: 2);
  bool _shouldReconnect = false;
  Timer? _reconnectionTimer;

  // Session analytics tracking
  DateTime? _sessionStartTime;
  DateTime? _audioOutputStartTime;
  Duration _totalSpeakingTime = Duration.zero;

  // Configuration - stores prompt for session reconnection
  String _systemPrompt = '''You are SalesOS, an AI-powered sales assistant.
You help sales professionals manage their CRM, track deals, and provide insights.
Be conversational, helpful, and concise in your responses.
When discussing numbers or data, be precise and clear.
Keep responses brief - under 2 sentences when possible.
IMPORTANT: Always respond in English regardless of the language spoken by the user.''';

  @override
  RealtimeConversationState build() {
    // Reset disposed flag on build
    _isDisposed = false;

    // Inject API client
    _apiClient = ref.watch(apiClientProvider);

    ref.onDispose(() {
      _isDisposed = true;
      _cleanup();
    });
    return const RealtimeConversationState();
  }

  /// Safely update state, checking if provider is disposed
  void _safeUpdateState(RealtimeConversationState Function(RealtimeConversationState) updater) {
    if (_isDisposed) {
      return;
    }
    try {
      state = updater(state);
    } catch (e) {
      // Silently ignore
    }
  }

  /// Cleanup resources without resetting state (for disposal)
  Future<void> _cleanup() async {

    // Cancel reconnection timer
    _reconnectionTimer?.cancel();
    _reconnectionTimer = null;

    // Close data channel
    _dataChannel?.close();
    _dataChannel = null;

    // Close peer connection
    await _peerConnection?.close();
    _peerConnection = null;

    // Stop local stream
    _localStream?.getTracks().forEach((track) => track.stop());
    await _localStream?.dispose();
    _localStream = null;

    // Dispose remote stream
    await _remoteStream?.dispose();
    _remoteStream = null;

    // Log session analytics before cleanup
    _logSessionAnalytics();

    // Reset tokens
    _ephemeralToken = null;
    _webrtcEndpoint = null;
    _sessionConfig = null;
    _currentResponseId = null;
    _userHasSpoken = false;
    _turnMap.clear();

    // Reset analytics tracking (but keep _systemPrompt for potential reconnect)
    _sessionStartTime = null;
    _functionCallCount = 0;
    _totalSpeakingTime = Duration.zero;
    _audioOutputStartTime = null;

  }

  /// Log session analytics to debug output and update state
  void _logSessionAnalytics() {
    if (_sessionStartTime == null) return;

    final analytics = _buildCurrentAnalytics();

    // Update state with final analytics
    _safeUpdateState((s) => s.copyWith(
      analytics: analytics.copyWith(sessionEndTime: DateTime.now()),
    ));
  }

  /// Build current analytics snapshot
  SessionAnalytics _buildCurrentAnalytics() {
    int userTurns = 0;
    int assistantTurns = 0;
    for (final turn in _turnMap.values) {
      if (turn.role == 'user') {
        userTurns++;
      } else {
        assistantTurns++;
      }
    }

    return SessionAnalytics(
      sessionStartTime: _sessionStartTime,
      userTurnCount: userTurns,
      assistantTurnCount: assistantTurns,
      functionCallCount: _functionCallCount,
      userHasSpoken: _userHasSpoken,
      reconnectionAttempts: _reconnectionAttempts,
      totalSpeakingTime: _totalSpeakingTime,
    );
  }

  /// Update analytics in state
  void _updateAnalytics() {
    _safeUpdateState((s) => s.copyWith(analytics: _buildCurrentAnalytics()));
  }

  /// Enable speakerphone for audio output on mobile devices
  Future<void> _enableSpeakerphone() async {
    try {
      // flutter_webrtc Helper class for audio routing
      await Helper.setSpeakerphoneOn(true);
    } catch (e) {
      // Silently ignore
    }
  }

  /// Configure iOS audio session for WebRTC
  /// This ensures audio plays through speakers on real iOS devices
  Future<void> _configureIOSAudioSession() async {
    if (!Platform.isIOS) return;

    try {
      // Use flutter_webrtc's built-in audio session configuration
      // This sets up AVAudioSession properly for WebRTC
      await Helper.setAppleAudioConfiguration(AppleAudioConfiguration(
        appleAudioCategory: AppleAudioCategory.playAndRecord,
        appleAudioCategoryOptions: {
          AppleAudioCategoryOption.defaultToSpeaker,
          AppleAudioCategoryOption.allowBluetooth,
          AppleAudioCategoryOption.allowBluetoothA2DP,
        },
        appleAudioMode: AppleAudioMode.voiceChat,
      ));
    } catch (e) {
      // Fallback: just try speakerphone
      await _enableSpeakerphone();
    }
  }

  /// Check and request microphone permission
  Future<bool> _checkPermission() async {
    final status = await Permission.microphone.status;
    if (status.isGranted) return true;

    final result = await Permission.microphone.request();
    return result.isGranted;
  }

  /// Fetch engagement messages from backend for dynamic UI feedback
  Future<void> _fetchEngagementMessages() async {
    try {
      final response = await _apiClient!.get<Map<String, dynamic>>(
        '/realtime/engagement-messages',
      );

      if (response.statusCode == 200 && response.data != null) {
        final messages = response.data!['messages'] as Map<String, dynamic>?;
        final defaultMsg = response.data!['defaultMessage'] as String?;

        if (messages != null) {
          _engagementMessages = messages.map((k, v) => MapEntry(k, v.toString()));
        }
        if (defaultMsg != null) {
          _defaultEngagementMessage = defaultMsg;
        }
      }
    } catch (e) {
      // Continue with hardcoded fallbacks
    }
  }

  /// Get ephemeral token, endpoint, and session config from backend API
  /// The backend returns all necessary info for WebRTC connection
  Future<bool> _getConnectionConfig() async {
    if (_apiClient == null) {
      return false;
    }

    try {

      // Build request data - include custom instructions if system prompt was modified
      final requestData = <String, dynamic>{
        'voice': RealtimeWebRTCConfig.defaultVoice,
        'model': RealtimeWebRTCConfig.defaultModel,
      };

      // Include custom instructions if system prompt differs from default
      // This allows dynamic prompt updates while still using backend defaults normally
      if (_systemPrompt.isNotEmpty && !_systemPrompt.contains('You are SalesOS, an AI-powered sales assistant')) {
        requestData['instructions'] = _systemPrompt;
      }

      final response = await _apiClient!.post<Map<String, dynamic>>(
        '/realtime/token',
        data: requestData,
      );

      if (response.statusCode == 200 && response.data != null) {
        _ephemeralToken = response.data!['token'] as String?;
        _webrtcEndpoint = response.data!['endpoint'] as String?;
        _sessionConfig = response.data!['sessionConfig'] as Map<String, dynamic>?;

        return _ephemeralToken != null && _webrtcEndpoint != null;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Connect to Azure OpenAI Realtime API via WebRTC
  Future<bool> connect() async {
    if (state.state == RealtimeVoiceState.connecting ||
        state.state == RealtimeVoiceState.connected) {
      return true;
    }

    // Check microphone permission
    final hasPermission = await _checkPermission();
    if (!hasPermission) {
      _safeUpdateState((s) => s.copyWith(
        state: RealtimeVoiceState.error,
        errorMessage: 'Microphone permission required',
      ));
      return false;
    }

    _safeUpdateState((s) => s.copyWith(state: RealtimeVoiceState.connecting));

    try {
      // Step 0: Configure iOS audio session BEFORE WebRTC setup
      // This is CRITICAL for audio to work on real iOS devices
      await _configureIOSAudioSession();

      // Step 1: Get connection config (token, endpoint, session config) from backend
      final gotConfig = await _getConnectionConfig();
      if (!gotConfig) {
        throw Exception('Failed to get connection configuration');
      }

      // Step 1b: Fetch engagement messages for dynamic UI feedback (non-blocking)
      _fetchEngagementMessages(); // Fire and forget - don't block connection

      // Step 2: Create RTCPeerConnection
      final configuration = <String, dynamic>{
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
        ],
      };
      _peerConnection = await createPeerConnection(configuration);

      // Step 3: Get microphone audio and add track
      _localStream = await navigator.mediaDevices.getUserMedia({
        'audio': {
          'echoCancellation': true,
          'noiseSuppression': true,
          'autoGainControl': true,
        },
        'video': false,
      });

      final audioTracks = _localStream!.getAudioTracks();
      if (audioTracks.isEmpty) {
        throw Exception('No audio track available - microphone access may have been denied');
      }
      final audioTrack = audioTracks.first;
      await _peerConnection!.addTrack(audioTrack, _localStream!);

      // Step 4: Set up remote audio playback
      _peerConnection!.onTrack = (RTCTrackEvent event) async {
        if (event.track.kind == 'audio') {
          // Store the remote stream for audio playback
          if (event.streams.isNotEmpty) {
            _remoteStream = event.streams.first;

            // Enable audio track
            for (var track in _remoteStream!.getAudioTracks()) {
              track.enabled = true;
            }
          }

          // Configure iOS audio session and enable speakerphone
          // This is critical for audio playback on real iOS devices
          if (Platform.isIOS) {
            await _configureIOSAudioSession();
          }
          await _enableSpeakerphone();

          _safeUpdateState((s) => s.copyWith(isAssistantSpeaking: true));
        }
      };

      // Step 5: Create data channel for events
      _dataChannel = await _peerConnection!.createDataChannel(
        'realtime-channel',
        RTCDataChannelInit(),
      );
      _setupDataChannel(_dataChannel!);

      // Step 6: Handle ICE candidates
      _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      };

      _peerConnection!.onIceConnectionState = (RTCIceConnectionState iceState) async {
        if (iceState == RTCIceConnectionState.RTCIceConnectionStateFailed) {
          _handleConnectionLost('ICE connection failed');
        } else if (iceState == RTCIceConnectionState.RTCIceConnectionStateDisconnected) {
          // ICE disconnected - may recover, but prepare for reconnection
          _safeUpdateState((s) => s.copyWith(
            state: RealtimeVoiceState.connecting,
            errorMessage: 'Connection interrupted, attempting recovery...',
          ));
        } else if (iceState == RTCIceConnectionState.RTCIceConnectionStateConnected) {
          // Re-configure audio session and enable speakerphone when ICE connects
          // This ensures audio works properly on real iOS devices
          if (Platform.isIOS) {
            await _configureIOSAudioSession();
          }
          await _enableSpeakerphone();
        }
      };

      // Step 7: Create SDP offer
      final offer = await _peerConnection!.createOffer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': false,
      });
      await _peerConnection!.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await _waitForIceGathering();

      // Step 8: Exchange SDP with Azure OpenAI
      final localDescription = await _peerConnection!.getLocalDescription();
      final answerSdp = await _exchangeSDP(localDescription!.sdp!);
      if (answerSdp == null) {
        throw Exception('SDP exchange failed');
      }

      // Step 9: Set remote description
      final answer = RTCSessionDescription(answerSdp, 'answer');
      await _peerConnection!.setRemoteDescription(answer);

      // Mark session start time and reset reconnection state
      _sessionStartTime = DateTime.now();
      _reconnectionAttempts = 0;
      _shouldReconnect = true;
      _functionCallCount = 0;
      _totalSpeakingTime = Duration.zero;

      _safeUpdateState((s) => s.copyWith(
        state: RealtimeVoiceState.connected,
        isReconnecting: false,
        analytics: _buildCurrentAnalytics(),
      ));
      return true;
    } catch (e) {

      // Attempt reconnection if allowed
      if (_shouldReconnect && _reconnectionAttempts < _maxReconnectionAttempts) {
        return _attemptReconnection();
      }

      _safeUpdateState((s) => s.copyWith(
        state: RealtimeVoiceState.error,
        errorMessage: 'Connection failed: $e',
        isReconnecting: false,
      ));
      await disconnect();
      return false;
    }
  }

  /// Attempt to reconnect to the service
  Future<bool> _attemptReconnection() async {
    _reconnectionAttempts++;

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.connecting,
      isReconnecting: true,
      analytics: _buildCurrentAnalytics(),
    ));

    // Clean up existing connection without full disconnect
    _dataChannel?.close();
    _dataChannel = null;
    await _peerConnection?.close();
    _peerConnection = null;

    // Wait before retry with exponential backoff
    final delay = _reconnectionDelay * _reconnectionAttempts;
    await Future.delayed(delay);

    if (!_shouldReconnect || _isDisposed) {
      return false;
    }

    // Retry connection (recursive call to connect)
    return connect();
  }

  /// Manually trigger reconnection
  Future<bool> reconnect() async {
    _reconnectionAttempts = 0;
    _shouldReconnect = true;

    // Preserve conversation history for potential restoration
    final preservedTurns = List<ConversationTurn>.from(_turnMap.values);

    await disconnect();

    final success = await connect();

    if (success && preservedTurns.isNotEmpty) {
      // Restore turns to turnMap (they're already in state.turns)
      for (final turn in preservedTurns) {
        _turnMap[turn.id] = turn;
      }
    }

    return success;
  }

  /// Handle connection lost - attempt reconnection if allowed
  void _handleConnectionLost(String reason) {

    if (_shouldReconnect && _reconnectionAttempts < _maxReconnectionAttempts) {
      _safeUpdateState((s) => s.copyWith(
        state: RealtimeVoiceState.error,
        errorMessage: '$reason - reconnecting...',
        isReconnecting: true,
      ));

      // Schedule reconnection attempt
      _reconnectionTimer?.cancel();
      _reconnectionTimer = Timer(_reconnectionDelay, () {
        if (!_isDisposed && _shouldReconnect) {
          _attemptReconnection();
        }
      });
    } else {
      _safeUpdateState((s) => s.copyWith(
        state: RealtimeVoiceState.error,
        errorMessage: reason,
        isReconnecting: false,
      ));
    }
  }

  /// Wait for ICE gathering to complete
  Future<void> _waitForIceGathering() async {
    if (_peerConnection == null) return;

    final completer = Completer<void>();

    _peerConnection!.onIceGatheringState = (RTCIceGatheringState gatherState) {
      if (gatherState == RTCIceGatheringState.RTCIceGatheringStateComplete) {
        if (!completer.isCompleted) {
          completer.complete();
        }
      }
    };

    // Also set a timeout
    Future.delayed(const Duration(seconds: 5), () {
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    await completer.future;
  }

  /// Exchange SDP offer with Azure OpenAI and get answer
  /// Uses the WebRTC endpoint URL from backend with Bearer token authentication
  Future<String?> _exchangeSDP(String offerSdp) async {
    if (_webrtcEndpoint == null || _ephemeralToken == null) {
      return null;
    }

    try {
      // Endpoint URL includes api-version and deployment from backend

      // Use dart:io HttpClient for direct SDP exchange (plain text)
      final uri = Uri.parse(_webrtcEndpoint!);
      final request = await HttpClient().postUrl(uri);
      // Use Authorization: Bearer for Azure AI Foundry authentication
      request.headers.set('Authorization', 'Bearer $_ephemeralToken');
      request.headers.set('Content-Type', 'application/sdp');
      request.write(offerSdp);

      final response = await request.close();
      final responseBody = await response.transform(utf8.decoder).join();

      if (response.statusCode == 201 || response.statusCode == 200) {
        return responseBody;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Set up data channel event handlers
  void _setupDataChannel(RTCDataChannel channel) {
    channel.onDataChannelState = (RTCDataChannelState channelState) {
      if (channelState == RTCDataChannelState.RTCDataChannelOpen) {
        // Send session config to configure the AI assistant
        _sendSessionConfig();
      }
    };

    channel.onMessage = (RTCDataChannelMessage message) {
      _handleMessage(message.text);
    };
  }

  /// Send session configuration to Azure OpenAI
  void _sendSessionConfig() {
    if (_sessionConfig == null) {
      return;
    }

    _sendEvent(_sessionConfig!);
  }

  /// Handle incoming data channel message
  void _handleMessage(String message) {
    try {
      final data = jsonDecode(message) as Map<String, dynamic>;
      final type = data['type'] as String?;


      switch (type) {
        // Session events
        case 'session.created':
        case 'session.updated':
          break;

        // Input audio events
        case 'input_audio_buffer.speech_started':
          _handleSpeechStarted(data);
          break;
        case 'input_audio_buffer.speech_stopped':
          _handleSpeechStopped(data);
          break;
        case 'input_audio_buffer.committed':
          break;

        // Output audio events (WebRTC audio track)
        case 'response.audio.delta':
          // Audio comes via WebRTC track, but this indicates AI is speaking
          _handleOutputAudioStarted();
          break;
        case 'response.audio.done':
          _handleOutputAudioStopped();
          break;

        // Conversation item events
        case 'conversation.item.created':
          _handleItemCreated(data);
          break;
        case 'conversation.item.input_audio_transcription.completed':
          _handleInputTranscript(data);
          break;
        case 'conversation.item.input_audio_transcription.failed':
          // Error handled silently - transcription failures are non-critical
          break;

        // Response output item events
        case 'response.output_item.added':
          final item = data['item'] as Map<String, dynamic>?;
          if (item != null) {
            final itemType = item['type'] as String?;

            // Check if this is a function call
            if (itemType == 'function_call') {
              final functionName = item['name'] as String?;
              final callId = item['call_id'] as String?;
              _currentFunctionCallId = callId;
              _currentFunctionName = functionName;
              _currentFunctionArguments.clear();

              // Show engagement message while tool executes
              final engagementMessage = _getEngagementMessage(functionName);
              _safeUpdateState((s) => s.copyWith(
                state: RealtimeVoiceState.processing,
                currentTranscript: engagementMessage,
              ));
            }
          }
          break;
        case 'response.output_item.done':
          break;

        // Content part events
        case 'response.content_part.added':
          break;
        case 'response.content_part.done':
          break;

        // Response transcript events (Azure OpenAI Realtime API format)
        case 'response.audio_transcript.delta':
          _handleTranscriptDelta(data);
          break;
        case 'response.audio_transcript.done':
          _handleTranscriptDone(data);
          break;
        case 'response.text.delta':
          _handleTranscriptDelta(data);
          break;
        case 'response.text.done':
          _handleTranscriptDone(data);
          break;

        // Response lifecycle events
        case 'response.created':
          _handleResponseCreated(data);
          break;
        case 'response.done':
          _handleResponseDone(data);
          break;

        // Function call events - for CRM tool execution
        case 'response.function_call_arguments.delta':
          _handleFunctionCallDelta(data);
          break;
        case 'response.function_call_arguments.done':
          _handleFunctionCallDone(data);
          break;

        // Error handling
        case 'error':
          _handleApiError(data);
          break;

        default:
      }
    } catch (e) {
      // Silently ignore
    }
  }

  void _handleSpeechStarted(Map<String, dynamic> data) {
    _userHasSpoken = true;
    _safeUpdateState((s) => s.copyWith(
      isUserSpeaking: true,
      state: RealtimeVoiceState.listening,
    ));

    // Interrupt current response if assistant is speaking
    if (_currentResponseId != null && state.isAssistantSpeaking) {
      _sendEvent({'type': 'response.cancel'});
    }
  }

  void _handleSpeechStopped(Map<String, dynamic> data) {
    _safeUpdateState((s) => s.copyWith(
      isUserSpeaking: false,
      state: RealtimeVoiceState.processing,
    ));
  }

  /// Handle output audio started - track when assistant begins speaking
  void _handleOutputAudioStarted() {
    if (!state.isAssistantSpeaking) {
      _audioOutputStartTime = DateTime.now();
      _safeUpdateState((s) => s.copyWith(
        isAssistantSpeaking: true,
        state: RealtimeVoiceState.speaking,
      ));
    }
  }

  /// Handle output audio stopped - track speaking duration
  void _handleOutputAudioStopped() {

    // Calculate and accumulate speaking time
    if (_audioOutputStartTime != null) {
      final speakingDuration = DateTime.now().difference(_audioOutputStartTime!);
      _totalSpeakingTime += speakingDuration;
      _audioOutputStartTime = null;
    }

    _safeUpdateState((s) => s.copyWith(
      isAssistantSpeaking: false,
      state: RealtimeVoiceState.connected,
      outputLevel: 0.0,
      analytics: _buildCurrentAnalytics(),
    ));
  }

  void _handleItemCreated(Map<String, dynamic> data) {
    final item = data['item'] as Map<String, dynamic>?;
    if (item == null) {
      return;
    }

    final id = item['id'] as String;
    final role = item['role'] as String? ?? 'assistant';

    // Check if this is an audio input item and get any existing transcript
    final content = item['content'] as List<dynamic>?;
    String? existingTranscript;
    if (content != null && content.isNotEmpty) {
      for (final part in content) {
        if (part is Map<String, dynamic>) {
          final transcript = part['transcript'] as String?;
          if (transcript != null && transcript.isNotEmpty) {
            existingTranscript = transcript;
          }
        }
      }
    }

    final turn = ConversationTurn(
      id: id,
      role: role,
      transcript: existingTranscript,
    );
    _turnMap[id] = turn;

    _safeUpdateState((s) => s.copyWith(
      turns: [...s.turns, turn],
    ));
  }

  void _handleInputTranscript(Map<String, dynamic> data) {
    final transcript = data['transcript'] as String? ?? '';
    final itemId = data['item_id'] as String?;


    if (itemId != null && _turnMap.containsKey(itemId)) {
      _turnMap[itemId] = _turnMap[itemId]!.copyWith(transcript: transcript);
      _safeUpdateState((s) => s.copyWith(
        turns: s.turns.map((t) {
          if (t.id == itemId) return _turnMap[itemId]!;
          return t;
        }).toList(),
      ));
    } else if (itemId != null) {
      // Create the turn if it doesn't exist
      final turn = ConversationTurn(id: itemId, role: 'user', transcript: transcript);
      _turnMap[itemId] = turn;
      _safeUpdateState((s) => s.copyWith(
        turns: [...s.turns, turn],
      ));
    }
  }

  void _handleResponseCreated(Map<String, dynamic> data) {
    _currentResponseId = data['response']?['id'] as String?;

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.processing,
    ));
  }

  void _handleTranscriptDelta(Map<String, dynamic> data) {
    final delta = data['delta'] as String? ?? '';
    final itemId = data['item_id'] as String?;


    // If we don't have this item yet, create it
    if (itemId != null && !_turnMap.containsKey(itemId)) {
      final turn = ConversationTurn(id: itemId, role: 'assistant');
      _turnMap[itemId] = turn;
      _safeUpdateState((s) => s.copyWith(
        turns: [...s.turns, turn],
        isAssistantSpeaking: true,
        state: RealtimeVoiceState.speaking,
      ));
    }

    if (itemId != null && _turnMap.containsKey(itemId)) {
      final turn = _turnMap[itemId]!;
      final newTranscript = (turn.transcript ?? '') + delta;
      _turnMap[itemId] = turn.copyWith(transcript: newTranscript);

      _safeUpdateState((s) => s.copyWith(
        currentTranscript: newTranscript,
        isAssistantSpeaking: true,
        state: RealtimeVoiceState.speaking,
        turns: s.turns.map((t) {
          if (t.id == itemId) return _turnMap[itemId]!;
          return t;
        }).toList(),
      ));
    }
  }

  void _handleTranscriptDone(Map<String, dynamic> data) {
    final itemId = data['item_id'] as String?;
    if (itemId != null && _turnMap.containsKey(itemId)) {
      _turnMap[itemId] = _turnMap[itemId]!.copyWith(isComplete: true);
    }
  }

  void _handleResponseDone(Map<String, dynamic> data) {
    _currentResponseId = null;

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.connected,
      isAssistantSpeaking: false,
      currentTranscript: null,
    ));
  }

  /// Handle function call arguments delta - accumulate the arguments
  void _handleFunctionCallDelta(Map<String, dynamic> data) {
    final delta = data['delta'] as String? ?? '';
    _currentFunctionArguments.write(delta);
  }

  /// Handle function call arguments done - execute the tool
  void _handleFunctionCallDone(Map<String, dynamic> data) async {
    final callId = data['call_id'] as String? ?? _currentFunctionCallId;
    final functionName = data['name'] as String? ?? _currentFunctionName;
    final argumentsJson = _currentFunctionArguments.toString();


    // Increment function call counter for analytics
    _functionCallCount++;
    _updateAnalytics();

    if (functionName == null || callId == null) {
      return;
    }

    // Parse arguments
    Map<String, dynamic> arguments = {};
    try {
      if (argumentsJson.isNotEmpty) {
        arguments = jsonDecode(argumentsJson) as Map<String, dynamic>;
      }
    } catch (e) {
      // Silently ignore
    }

    // Execute the tool via the backend API
    try {
      final result = await _executeToolViaBackend(functionName, arguments);

      // Send the function result back to Azure
      _sendFunctionResult(callId, result);
    } catch (e) {
      // Send error result
      _sendFunctionResult(callId, {'error': e.toString()});
    }

    // Reset function call state
    _currentFunctionCallId = null;
    _currentFunctionName = null;
    _currentFunctionArguments.clear();
  }

  /// Execute a CRM tool via the IRIS backend API
  /// Passes the current auth mode as dataSource to ensure correct CRM context
  Future<Map<String, dynamic>> _executeToolViaBackend(
    String toolName,
    Map<String, dynamic> arguments,
  ) async {
    if (_apiClient == null) {
      throw Exception('API client not initialized');
    }

    // Get current auth mode to determine data source
    // This ensures voice assistant respects user's CRM mode preference
    final authMode = ref.read(authModeProvider);

    final response = await _apiClient!.post<Map<String, dynamic>>(
      '/realtime/execute-tool',
      data: {
        'toolName': toolName,
        'arguments': arguments,
        'dataSource': authMode.name, // 'local' or 'salesforce'
      },
    );

    if (response.statusCode == 200 && response.data != null) {
      return response.data!;
    } else {
      throw Exception('Tool execution failed: ${response.statusCode}');
    }
  }

  /// Send function result back to Azure OpenAI via data channel
  void _sendFunctionResult(String callId, Map<String, dynamic> result) {
    // Create conversation item with function result
    _sendEvent({
      'type': 'conversation.item.create',
      'item': {
        'type': 'function_call_output',
        'call_id': callId,
        'output': jsonEncode(result),
      },
    });

    // Trigger a new response with the function result
    _sendEvent({
      'type': 'response.create',
    });

  }

  void _handleApiError(Map<String, dynamic> data) {
    final error = data['error'] as Map<String, dynamic>?;
    final message = error?['message'] as String? ?? 'Unknown error';
    final code = error?['code'] as String?;


    // Ignore harmless race condition errors
    if (code == 'response_cancel_not_active') {
      return;
    }

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.error,
      errorMessage: '$code: $message',
    ));
  }

  /// Get an engaging message to show while a tool is executing
  /// This keeps users engaged during backend processing delays
  /// Messages are dynamically loaded from the backend for easy updates
  String _getEngagementMessage(String? functionName) {
    if (functionName == null) {
      return _defaultEngagementMessage;
    }

    // First, try to get from dynamic backend messages
    if (_engagementMessages.containsKey(functionName)) {
      return _engagementMessages[functionName]!;
    }

    // Fallback to hardcoded messages if backend fetch hasn't completed yet
    // These will be replaced once _fetchEngagementMessages completes
    switch (functionName) {
      // Lead operations
      case 'get_top_leads':
        return 'Let me pull up your top leads...';
      case 'search_leads':
        return 'Searching your leads now...';
      case 'get_lead_details':
        return 'Getting those lead details...';
      case 'update_lead':
        return 'Updating that lead for you...';
      case 'create_lead':
        return 'Creating that lead for you...';

      // Opportunity operations
      case 'search_opportunities':
        return 'Checking your pipeline...';
      case 'get_opportunity_details':
        return 'Pulling up that deal...';
      case 'get_pipeline_stats':
        return 'Calculating your pipeline stats...';
      case 'get_at_risk_opportunities':
        return 'Looking for at-risk deals...';
      case 'update_opportunity':
        return 'Updating that opportunity...';
      case 'create_opportunity':
        return 'Setting up that deal...';

      // Account operations
      case 'search_accounts':
        return 'Searching accounts...';
      case 'get_account_details':
        return 'Getting account information...';
      case 'create_account':
        return 'Creating that account...';
      case 'update_account':
        return 'Updating account details...';

      // Contact operations
      case 'search_contacts':
        return 'Looking up contacts...';
      case 'get_contact_details':
        return 'Getting contact details...';
      case 'create_contact':
        return 'Adding that contact...';
      case 'update_contact':
        return 'Updating contact info...';

      // Task operations
      case 'get_my_tasks':
        return 'Checking your tasks...';
      case 'create_task':
        return 'Creating that task...';
      case 'complete_task':
        return 'Marking that task complete...';
      case 'update_task':
        return 'Updating that task...';
      case 'delete_task':
        return 'Removing that task...';

      // Activity operations
      case 'log_call':
        return 'Logging that call...';
      case 'log_email':
        return 'Recording that email...';
      case 'get_activity_timeline':
        return 'Getting recent activities...';
      case 'send_email':
        return 'Sending that email now...';

      // Meeting operations
      case 'list_meetings':
        return 'Checking your calendar...';
      case 'schedule_meeting':
        return 'Scheduling that meeting...';

      // Notes
      case 'create_note':
        return 'Adding that note...';
      case 'get_notes':
        return 'Getting notes...';

      // Intelligence
      case 'get_daily_priorities':
        return 'Getting your priorities for today...';
      case 'research_company':
        return 'Researching that company...';
      case 'get_forecast':
        return 'Pulling up your forecast...';
      case 'get_recommended_actions':
        return 'Getting recommendations for you...';

      default:
        return _defaultEngagementMessage;
    }
  }

  /// Send event via data channel
  void _sendEvent(Map<String, dynamic> event) {
    if (_dataChannel == null ||
        _dataChannel!.state != RTCDataChannelState.RTCDataChannelOpen) {
      return;
    }

    try {
      final json = jsonEncode(event);
      _dataChannel!.send(RTCDataChannelMessage(json));
    } catch (e) {
      // Silently ignore
    }
  }

  /// Send a text message
  void sendTextMessage(String text) {
    if (state.state != RealtimeVoiceState.connected) return;

    _userHasSpoken = true;

    // Create conversation item
    _sendEvent({
      'type': 'conversation.item.create',
      'item': {
        'type': 'message',
        'role': 'user',
        'content': [
          {
            'type': 'input_text',
            'text': text,
          },
        ],
      },
    });

    // Trigger response
    _sendEvent({
      'type': 'response.create',
    });
  }

  /// Interrupt the current response
  void interrupt() {
    if (_currentResponseId != null) {
      _sendEvent({'type': 'response.cancel'});
      _currentResponseId = null;
    }
    _safeUpdateState((s) => s.copyWith(
      isAssistantSpeaking: false,
      state: RealtimeVoiceState.connected,
      outputLevel: 0.0,
    ));
  }

  /// Clear conversation history
  void clearConversation() {
    _turnMap.clear();
    _safeUpdateState((s) => s.copyWith(
      turns: [],
      currentTranscript: null,
    ));
  }

  /// Update system prompt
  void updateSystemPrompt(String prompt) {
    _systemPrompt = prompt;
    // Note: For WebRTC, prompt is set during token generation
    // Would need to reconnect to change prompt
  }

  /// Mute/unmute microphone
  void setMicrophoneMuted(bool muted) {
    if (_localStream != null) {
      for (var track in _localStream!.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  /// Start listening (unmute microphone and update state)
  /// In WebRTC, audio is always streaming, this just unmutes
  Future<void> startListening() async {
    if (state.state != RealtimeVoiceState.connected &&
        state.state != RealtimeVoiceState.speaking) {
      return;
    }

    _userHasSpoken = true;

    // Unmute microphone
    setMicrophoneMuted(false);

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.listening,
      isUserSpeaking: true,
    ));
  }

  /// Stop listening (mute microphone and update state)
  Future<void> stopListening() async {
    // Mute microphone
    setMicrophoneMuted(true);

    _safeUpdateState((s) => s.copyWith(
      state: RealtimeVoiceState.connected,
      isUserSpeaking: false,
    ));
  }

  /// Disconnect from the realtime API
  Future<void> disconnect() async {

    // Stop any pending reconnection
    _shouldReconnect = false;
    _reconnectionTimer?.cancel();
    _reconnectionTimer = null;

    // Log final session analytics before cleanup
    _logSessionAnalytics();

    // Close data channel
    _dataChannel?.close();
    _dataChannel = null;

    // Close peer connection
    await _peerConnection?.close();
    _peerConnection = null;

    // Stop local stream
    _localStream?.getTracks().forEach((track) => track.stop());
    await _localStream?.dispose();
    _localStream = null;

    // Dispose remote stream
    await _remoteStream?.dispose();
    _remoteStream = null;

    // Reset state
    _ephemeralToken = null;
    _webrtcEndpoint = null;
    _sessionConfig = null;
    _currentResponseId = null;
    _userHasSpoken = false;
    _turnMap.clear();

    // Reset analytics tracking
    _sessionStartTime = null;
    _functionCallCount = 0;
    _totalSpeakingTime = Duration.zero;
    _audioOutputStartTime = null;
    _reconnectionAttempts = 0;

    // Only update state if not disposed
    if (!_isDisposed) {
      try {
        state = const RealtimeConversationState();
      } catch (e) {
        // Silently ignore
      }
    }
  }
}

/// Provider for RealtimeVoiceWebRTCService
final realtimeVoiceWebRTCProvider = NotifierProvider<RealtimeVoiceWebRTCService, RealtimeConversationState>(() {
  return RealtimeVoiceWebRTCService();
});
