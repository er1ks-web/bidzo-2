import Capacitor

/**
 * Lets the web app say "I've rendered, you can go" (hideSplash() in src/lib/native.js).
 * MainViewController keeps the launch screen up until then and plays the exit animation.
 * iOS counterpart of android/app/src/main/java/com/bidzo/app/LaunchScreenPlugin.java.
 */
@objc(LaunchScreenPlugin)
public class LaunchScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LaunchScreenPlugin"
    public let jsName = "LaunchScreen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            (self.bridge?.viewController as? MainViewController)?.hideLaunchScreen()
        }
        call.resolve()
    }
}
