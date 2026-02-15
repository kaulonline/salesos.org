import Flutter
import UIKit
import AVFoundation
import flutter_local_notifications
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var pushMethodChannel: FlutterMethodChannel?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configure AVAudioSession for WebRTC voice calls
    configureAudioSession()

    // Required for flutter_local_notifications to display notifications in foreground on iOS 10+
    FlutterLocalNotificationsPlugin.setPluginRegistrantCallback { (registry) in
      GeneratedPluginRegistrant.register(with: registry)
    }

    // Set up notification center delegate
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as UNUserNotificationCenterDelegate
    }

    GeneratedPluginRegistrant.register(with: self)

    // Set up Flutter method channel using the plugin registry API (avoids deprecated rootViewController access)
    if let registrar = self.registrar(forPlugin: "com.salesos.mobile/push") {
      self.pushMethodChannel = FlutterMethodChannel(
        name: "com.salesos.mobile/push",
        binaryMessenger: registrar.messenger()
      )

      self.pushMethodChannel?.setMethodCallHandler { [weak self] (call, result) in
        switch call.method {
        case "requestAPNsToken":
          self?.requestAPNsToken(result: result)
        case "getPendingNotification":
          result(self?.getPendingNotification())
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    // Check if app was launched from notification tap (cold start)
    if let remoteNotification = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
      #if DEBUG
      print("SalesOS: App launched from notification tap: \(remoteNotification)")
      #endif

      // Store for later - will send to Flutter once method channel is ready
      pendingNotificationPayload = convertToFlutterPayload(remoteNotification)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// Store pending notification payload from cold start
  private var pendingNotificationPayload: [String: Any]?

  /// Convert AnyHashable dictionary to String-keyed dictionary for Flutter
  private func convertToFlutterPayload(_ userInfo: [AnyHashable: Any]) -> [String: Any] {
    var payload: [String: Any] = [:]
    for (key, value) in userInfo {
      if let stringKey = key as? String {
        payload[stringKey] = value
      }
    }
    return payload
  }

  /// Called by Flutter to check for pending notification (cold start scenario)
  func getPendingNotification() -> [String: Any]? {
    let pending = pendingNotificationPayload
    pendingNotificationPayload = nil
    return pending
  }

  // MARK: - APNs Token Registration

  /// Request APNs token from iOS
  private func requestAPNsToken(result: @escaping FlutterResult) {
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
        DispatchQueue.main.async {
          if granted {
            UIApplication.shared.registerForRemoteNotifications()
            // Token will be returned via didRegisterForRemoteNotificationsWithDeviceToken
            result(nil) // Return nil for now, token will come via callback
          } else {
            result(FlutterError(code: "PERMISSION_DENIED", message: "Notification permission not granted", details: error?.localizedDescription))
          }
        }
      }
    } else {
      // iOS 9 fallback
      let settings = UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
      UIApplication.shared.registerUserNotificationSettings(settings)
      UIApplication.shared.registerForRemoteNotifications()
      result(nil)
    }
  }

  /// Called when APNs token is successfully received
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Convert token to hex string
    let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()

    #if DEBUG
    print("SalesOS: APNs token received: \(tokenString.prefix(32))...")
    #endif

    // Send token to Flutter
    pushMethodChannel?.invokeMethod("onAPNsTokenReceived", arguments: tokenString)

    // Also pass to parent for any other handling
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  /// Called when APNs registration fails
  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    #if DEBUG
    print("SalesOS: APNs registration failed: \(error.localizedDescription)")
    #endif

    // Send error to Flutter
    pushMethodChannel?.invokeMethod("onAPNsTokenFailed", arguments: error.localizedDescription)

    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }

  // MARK: - Remote Notification Handling

  /// Handle received remote notification (when app is in background/foreground)
  override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {

    #if DEBUG
    print("SalesOS: Remote notification received: \(userInfo)")
    #endif

    // Convert to Flutter-compatible dictionary
    var payload: [String: Any] = [:]
    for (key, value) in userInfo {
      if let stringKey = key as? String {
        payload[stringKey] = value
      }
    }

    // Send to Flutter
    pushMethodChannel?.invokeMethod("onRemoteNotificationReceived", arguments: payload)

    // Call parent implementation
    super.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
  }

  // MARK: - Notification Tap Handling (UNUserNotificationCenterDelegate)

  /// Called when user taps on a notification
  override func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo

    #if DEBUG
    print("SalesOS: Notification tapped: \(userInfo)")
    #endif

    // Convert to Flutter-compatible dictionary
    var payload: [String: Any] = [:]
    for (key, value) in userInfo {
      if let stringKey = key as? String {
        payload[stringKey] = value
      }
    }

    // Send tap event to Flutter for deep link navigation
    pushMethodChannel?.invokeMethod("onNotificationTapped", arguments: payload)

    completionHandler()
  }

  /// Handle notification display while app is in foreground
  override func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Show the notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .badge, .sound])
    } else {
      completionHandler([.alert, .badge, .sound])
    }
  }

  // MARK: - Audio Session Configuration

  /// Configure AVAudioSession for WebRTC
  private func configureAudioSession() {
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(
        .playAndRecord,
        mode: .voiceChat,
        options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
      )
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

      #if DEBUG
      print("SalesOS: AVAudioSession configured for WebRTC")
      #endif
    } catch {
      #if DEBUG
      print("SalesOS: Failed to configure AVAudioSession: \(error.localizedDescription)")
      #endif
    }
  }

  /// Handle audio route changes
  override func applicationWillEnterForeground(_ application: UIApplication) {
    super.applicationWillEnterForeground(application)
    configureAudioSession()
  }
}
