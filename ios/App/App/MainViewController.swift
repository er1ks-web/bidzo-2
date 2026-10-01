import UIKit
import Capacitor

/**
 * The app's web view (set as the custom class in Main.storyboard).
 * iOS counterpart of android/app/src/main/java/com/bidzo/app/MainActivity.java.
 */
class MainViewController: CAPBridgeViewController {

    // Never leave the user on the launch screen if the web app fails to report in.
    private static let maxSplashSeconds: TimeInterval = 6

    private var launchScreen: LaunchScreenView?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LaunchScreenPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Edge swipe goes back, like the Android back button (src/lib/native.js).
        webView?.allowsBackForwardNavigationGestures = true

        // LaunchScreen.storyboard is only the background; the logo spins in here so it can
        // stay up until the web app has rendered.
        let splash = LaunchScreenView()
        view.addSubview(splash)
        launchScreen = splash
        splash.playIntro()

        DispatchQueue.main.asyncAfter(deadline: .now() + Self.maxSplashSeconds) { [weak self] in
            self?.hideLaunchScreen()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // The status bar plugin moves the web view below the status bar; the launch screen
        // still covers the whole screen so the logo sits where the storyboard's centre is.
        guard let splash = launchScreen else { return }
        let top = view.frame.minY
        splash.frame = CGRect(x: 0, y: -top, width: view.bounds.width, height: view.bounds.height + top)
    }

    func hideLaunchScreen() {
        guard let splash = launchScreen else { return }
        launchScreen = nil
        splash.playExit()
    }
}
