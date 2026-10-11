import UIKit

/**
 * Launch-screen logo (public/favicon.svg) on the app background. Same motion as Android:
 * spins in and settles with a small overshoot (splash_icon_animated.xml), then on exit eases
 * a little bigger while fading out as the app fades in underneath (MainActivity.fadeOutLogo()).
 */
final class LaunchScreenView: UIView {

    private static let background = UIColor(red: 0x11 / 255, green: 0x11 / 255, blue: 0x11 / 255, alpha: 1)
    private static let accent = UIColor(red: 0xFA / 255, green: 0xCC / 255, blue: 0x15 / 255, alpha: 1)

    // Android draws a 156dp circle (r = 78 in the 288dp icon) and scales the glyph by 0.138.
    private static let logoSize: CGFloat = 156
    private static let glyphScale: CGFloat = 0.138

    private static let introSeconds: CFTimeInterval = 0.6
    private static let exitSeconds: TimeInterval = 0.32
    private static let exitScale: CGFloat = 1.2

    private let logo = UIView()
    private var introEnd = Date()

    init() {
        super.init(frame: UIScreen.main.bounds)
        backgroundColor = Self.background
        isUserInteractionEnabled = true // swallow touches until the app is showing

        let size = Self.logoSize
        logo.bounds = CGRect(x: 0, y: 0, width: size, height: size)

        let circle = CAShapeLayer()
        circle.path = UIBezierPath(ovalIn: logo.bounds).cgPath
        circle.fillColor = Self.accent.cgColor
        logo.layer.addSublayer(circle)

        // The glyph is in font units (y up): centre it on (334, 350) and flip.
        var transform = CGAffineTransform(translationX: size / 2, y: size / 2)
            .scaledBy(x: Self.glyphScale, y: -Self.glyphScale)
            .translatedBy(x: -334, y: -350)
        let glyph = CAShapeLayer()
        glyph.path = BidzoGlyph.path.copy(using: &transform)
        glyph.fillColor = Self.background.cgColor
        logo.layer.addSublayer(glyph)

        addSubview(logo)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        logo.center = CGPoint(x: bounds.midX, y: bounds.midY)
    }

    func playIntro() {
        introEnd = Date().addingTimeInterval(Self.introSeconds)

        let spin = CABasicAnimation(keyPath: "transform.rotation.z")
        spin.fromValue = -2 * CGFloat.pi
        spin.toValue = 0
        spin.duration = Self.introSeconds
        spin.timingFunction = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.2, 1) // fast_out_slow_in

        // Android's overshoot_interpolator (tension 2), sampled.
        let grow = CAKeyframeAnimation(keyPath: "transform.scale")
        let steps = 30
        grow.values = (0...steps).map { i -> CGFloat in
            let t = CGFloat(i) / CGFloat(steps) - 1
            let overshoot = t * t * (3 * t + 2) + 1
            return 0.2 + 0.8 * overshoot
        }
        grow.duration = Self.introSeconds

        logo.layer.add(spin, forKey: "spin")
        logo.layer.add(grow, forKey: "grow")
    }

    func playExit() {
        // Let the spin-in finish if the app loaded faster than it.
        let delay = min(1, max(0, introEnd.timeIntervalSinceNow))

        UIView.animate(withDuration: Self.exitSeconds, delay: delay, options: [.curveEaseOut], animations: {
            self.logo.transform = CGAffineTransform(scaleX: Self.exitScale, y: Self.exitScale)
            self.logo.alpha = 0
        })
        // Background trails the logo slightly so the logo is mostly gone before the app shows.
        UIView.animate(withDuration: Self.exitSeconds, delay: delay + Self.exitSeconds / 3, options: [.curveEaseOut], animations: {
            self.alpha = 0
        }, completion: { _ in
            self.removeFromSuperview()
        })
    }
}

/// The Bidzo "B" (same path as public/favicon.svg and the Android drawables), in font units.
enum BidzoGlyph {
    static let svgPath = "M46 0V116H138V584H46V700H406Q470 700 517.5 678.5Q565 657 591.5 617.5Q618 578 618 523V513Q618 465 600.0 434.5Q582 404 557.5 387.5Q533 371 511 364V346Q533 340 559.0 323.5Q585 307 603.5 276.0Q622 245 622 195V185Q622 127 595.0 85.5Q568 44 520.5 22.0Q473 0 410 0ZM270 120H394Q437 120 463.5 141.0Q490 162 490 201V211Q490 250 464.0 271.0Q438 292 394 292H270ZM270 412H392Q433 412 459.5 433.0Q486 454 486 491V501Q486 539 460.0 559.5Q434 580 392 580H270Z"

    static let path: CGPath = parse(svgPath)

    // Supports the absolute M, H, V, Q and Z commands the glyph uses.
    private static func parse(_ d: String) -> CGPath {
        var tokens: [String] = []
        var number = ""
        for ch in d {
            if ch.isLetter {
                if !number.isEmpty { tokens.append(number); number = "" }
                tokens.append(String(ch))
            } else if ch == " " || ch == "," {
                if !number.isEmpty { tokens.append(number); number = "" }
            } else {
                number.append(ch)
            }
        }
        if !number.isEmpty { tokens.append(number) }

        let path = CGMutablePath()
        var i = 0
        var x: CGFloat = 0, y: CGFloat = 0
        var command = ""
        func next() -> CGFloat {
            defer { i += 1 }
            return CGFloat(Double(tokens[i]) ?? 0)
        }
        while i < tokens.count {
            if tokens[i].first?.isLetter == true { command = tokens[i]; i += 1 }
            switch command {
            case "M": x = next(); y = next(); path.move(to: CGPoint(x: x, y: y))
            case "H": x = next(); path.addLine(to: CGPoint(x: x, y: y))
            case "V": y = next(); path.addLine(to: CGPoint(x: x, y: y))
            case "Q":
                let cx = next(), cy = next()
                x = next(); y = next()
                path.addQuadCurve(to: CGPoint(x: x, y: y), control: CGPoint(x: cx, y: cy))
            case "Z": path.closeSubpath()
            default: i += 1
            }
        }
        return path
    }
}
