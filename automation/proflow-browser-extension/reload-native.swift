#!/usr/bin/env swift
import AppKit
import CoreGraphics
import Darwin
import Foundation

let contract = "proflow.browser-extension.native-reload.v1"
let templateBase64 = "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAABXUlEQVR4nM1TMauCUBjVx/MvNAVeCIwmuY46uKW4BPYHrN/R6i64BE6COQaNOgiCk04NYhCEtNTSapqCbwh6V3u+92jqjIdz7vedw3fxuq6xV/HxsvPdzFVVmabJ8zwAgGEYRVEMw6iqStM0AACqxFuFnU6n+XyeJAnHcRRFFUURRdF+v4cQjkYj27bTNP1W1whut5soihDCIAhQ3nVdiqJIkiRJEuU/0bGWZSVJYhgGx3EPUtM0DMNomg7DsBWwsbYkSQRBbDYbVNHKia7dmHw4HKbTaev5RsgmGm3jeLs/FI7jLJfLTjMAII7jLrOqqp7ndZplWd5ut47jPDtXq9XxeByPxw0WrT7Pc0EQIIS+7z/I6/Wq6/pgMJhMJmVZovofjmQ2m+12O5Zlh8Ph+Xz2fT/Lsl6vt16v+/1+5+Q7iqIwTZNl2ftVQAgXi8XlcnlW/lbvn3irL/l/fAGF4gIKrqfIoQAAAABJRU5ErkJggg=="

struct GrayImage {
    let width: Int
    let height: Int
    var pixels: [UInt8]
    subscript(_ x: Int, _ y: Int) -> UInt8 { pixels[y * width + x] }
}

struct MatchResult {
    let x: Int
    let y: Int
    let score: Double
    let runnerUpScore: Double
}

enum NativeReloadError: Error, CustomStringConvertible {
    case message(String)
    var description: String {
        switch self { case .message(let value): return value }
    }
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data(("BROWSER_EXTENSION_NATIVE_RELOAD=FAIL " + message + "\n").utf8))
    exit(1)
}

func grayImage(from image: NSImage) throws -> GrayImage {
    var rect = NSRect(origin: .zero, size: image.size)
    guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw NativeReloadError.message("NATIVE_IMAGE_CGIMAGE_MISSING")
    }
    let width = cg.width
    let height = cg.height
    var rgba = [UInt8](repeating: 0, count: width * height * 4)
    guard let context = CGContext(
        data: &rgba,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        throw NativeReloadError.message("NATIVE_IMAGE_CONTEXT_FAILED")
    }
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)
    context.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    var gray = [UInt8](repeating: 0, count: width * height)
    for index in 0..<(width * height) {
        let base = index * 4
        let value = (
            Int(rgba[base]) * 299 +
            Int(rgba[base + 1]) * 587 +
            Int(rgba[base + 2]) * 114
        ) / 1000
        gray[index] = UInt8(clamping: value)
    }
    return GrayImage(width: width, height: height, pixels: gray)
}

func loadImage(path: String) throws -> GrayImage {
    guard let image = NSImage(contentsOfFile: path) else {
        throw NativeReloadError.message("NATIVE_SCREENSHOT_UNREADABLE")
    }
    return try grayImage(from: image)
}

func loadTemplate() throws -> GrayImage {
    guard let data = Data(base64Encoded: templateBase64), let image = NSImage(data: data) else {
        throw NativeReloadError.message("NATIVE_TEMPLATE_INVALID")
    }
    return try grayImage(from: image)
}

func findMatch(
    screen: GrayImage,
    template: GrayImage,
    minX: Int,
    maxX: Int,
    minY: Int,
    maxY: Int
) throws -> MatchResult {
    let mask: [(Int, Int, Int)] = (0..<template.height).flatMap { y in
        (0..<template.width).compactMap { x in
            let value = Int(template[x, y])
            return value < 180 ? (x, y, value) : nil
        }
    }
    guard mask.count >= 40 else {
        throw NativeReloadError.message("NATIVE_TEMPLATE_MASK_TOO_SMALL")
    }

    let x0 = max(0, minX)
    let y0 = max(0, minY)
    let x1 = min(screen.width - template.width, maxX)
    let y1 = min(screen.height - template.height, maxY)
    guard x0 <= x1 && y0 <= y1 else {
        throw NativeReloadError.message("NATIVE_SEARCH_RECT_INVALID")
    }

    var bestX = -1
    var bestY = -1
    var bestScore = Double.infinity
    for y in y0...y1 {
        for x in x0...x1 {
            var sum = 0
            for (tx, ty, expected) in mask {
                sum += abs(Int(screen[x + tx, y + ty]) - expected)
            }
            let score = Double(sum) / Double(mask.count)
            if score < bestScore {
                bestScore = score
                bestX = x
                bestY = y
            }
        }
    }
    guard bestX >= 0 && bestY >= 0 else {
        throw NativeReloadError.message("NATIVE_TEMPLATE_NOT_FOUND")
    }

    let exclusionX = max(8, template.width / 2)
    let exclusionY = max(8, template.height / 2)
    var runnerUp = Double.infinity
    for y in y0...y1 {
        for x in x0...x1 {
            if abs(x - bestX) <= exclusionX && abs(y - bestY) <= exclusionY { continue }
            var sum = 0
            for (tx, ty, expected) in mask {
                sum += abs(Int(screen[x + tx, y + ty]) - expected)
            }
            let score = Double(sum) / Double(mask.count)
            if score < runnerUp { runnerUp = score }
        }
    }

    return MatchResult(x: bestX, y: bestY, score: bestScore, runnerUpScore: runnerUp)
}

func argument(_ name: String) -> String? {
    let args = CommandLine.arguments
    guard let index = args.firstIndex(of: name), index + 1 < args.count else { return nil }
    return args[index + 1]
}

func selfTest() throws {
    let template = try loadTemplate()
    guard template.width == 20 && template.height == 20 else {
        throw NativeReloadError.message("NATIVE_TEMPLATE_DIMENSIONS_INVALID")
    }

    let width = 100
    let height = 80
    var synthetic = GrayImage(
        width: width,
        height: height,
        pixels: [UInt8](repeating: 255, count: width * height)
    )
    let expectedX = 42
    let expectedY = 23
    for y in 0..<template.height {
        for x in 0..<template.width {
            synthetic.pixels[(expectedY + y) * width + expectedX + x] = template[x, y]
        }
    }

    let match = try findMatch(
        screen: synthetic,
        template: template,
        minX: 0,
        maxX: width - template.width,
        minY: 0,
        maxY: height - template.height
    )
    guard
        match.x == expectedX,
        match.y == expectedY,
        match.score == 0,
        match.runnerUpScore > 20
    else {
        throw NativeReloadError.message("NATIVE_MATCHER_SELF_TEST_FAILED")
    }
    print("BROWSER_EXTENSION_NATIVE_RELOAD_SELF_TEST=PASS")
}

func main() throws {
    if CommandLine.arguments.contains("--self-test") {
        try selfTest()
        return
    }

    guard
        let screenshotPath = argument("--screenshot"),
        let rawBounds = argument("--window-bounds")
    else {
        throw NativeReloadError.message("NATIVE_RELOAD_ARGUMENTS_REQUIRED")
    }

    let parts = rawBounds.split(separator: ",").compactMap { Double(String($0)) }
    guard parts.count == 4 else {
        throw NativeReloadError.message("NATIVE_WINDOW_BOUNDS_INVALID")
    }

    let windowBounds = CGRect(
        x: parts[0],
        y: parts[1],
        width: parts[2] - parts[0],
        height: parts[3] - parts[1]
    )
    guard windowBounds.width > 500 && windowBounds.height > 300 else {
        throw NativeReloadError.message("NATIVE_WINDOW_BOUNDS_TOO_SMALL")
    }

    let screen = try loadImage(path: screenshotPath)
    let template = try loadTemplate()
    let displayBounds = CGDisplayBounds(CGMainDisplayID())
    guard
        windowBounds.minX >= displayBounds.minX - 1,
        windowBounds.minY >= displayBounds.minY - 1,
        windowBounds.maxX <= displayBounds.maxX + 1,
        windowBounds.maxY <= displayBounds.maxY + 1
    else {
        throw NativeReloadError.message("NATIVE_DETAIL_WINDOW_NOT_ON_MAIN_DISPLAY")
    }

    let scaleX = Double(screen.width) / Double(displayBounds.width)
    let scaleY = Double(screen.height) / Double(displayBounds.height)
    guard scaleX > 0 && scaleY > 0 else {
        throw NativeReloadError.message("NATIVE_SCREEN_SCALE_INVALID")
    }

    let windowPixelX = Int((windowBounds.minX - displayBounds.minX) * scaleX)
    let windowPixelY = Int((windowBounds.minY - displayBounds.minY) * scaleY)
    let windowPixelWidth = Int(windowBounds.width * scaleX)
    let windowPixelHeight = Int(windowBounds.height * scaleY)

    let searchMinX = windowPixelX + Int(Double(windowPixelWidth) * 0.45)
    let searchMaxX = windowPixelX + Int(Double(windowPixelWidth) * 0.85)
    let searchMinY = windowPixelY + Int(Double(windowPixelHeight) * 0.12)
    let searchMaxY = windowPixelY + Int(Double(windowPixelHeight) * 0.38)

    let match = try findMatch(
        screen: screen,
        template: template,
        minX: searchMinX,
        maxX: searchMaxX,
        minY: searchMinY,
        maxY: searchMaxY
    )
    let scoreGap = match.runnerUpScore - match.score
    guard match.score <= 18 else {
        throw NativeReloadError.message(
            String(format: "NATIVE_RELOAD_TEMPLATE_SCORE:%.2f", match.score)
        )
    }
    guard scoreGap >= 12 else {
        throw NativeReloadError.message(
            String(format: "NATIVE_RELOAD_TEMPLATE_AMBIGUOUS:%.2f", scoreGap)
        )
    }

    let centerPixelX = Double(match.x) + Double(template.width) / 2.0
    let centerPixelY = Double(match.y) + Double(template.height) / 2.0
    let target = CGPoint(
        x: displayBounds.minX + centerPixelX / scaleX,
        y: displayBounds.minY + centerPixelY / scaleY
    )
    guard windowBounds.contains(target) else {
        throw NativeReloadError.message("NATIVE_RELOAD_TARGET_OUTSIDE_WINDOW")
    }

    let original = CGEvent(source: nil)?.location ?? target
    func post(_ type: CGEventType, _ point: CGPoint) {
        let event = CGEvent(
            mouseEventSource: nil,
            mouseType: type,
            mouseCursorPosition: point,
            mouseButton: .left
        )
        event?.post(tap: .cghidEventTap)
    }

    post(.mouseMoved, target)
    Thread.sleep(forTimeInterval: 0.06)
    post(.leftMouseDown, target)
    Thread.sleep(forTimeInterval: 0.05)
    post(.leftMouseUp, target)
    Thread.sleep(forTimeInterval: 0.06)
    post(.mouseMoved, original)

    let payload: [String: Any] = [
        "contract": contract,
        "status": "DISPATCHED",
        "templateScore": match.score,
        "runnerUpScore": match.runnerUpScore,
        "scoreGap": scoreGap,
        "templateTopLeft": ["x": match.x, "y": match.y],
        "target": ["x": target.x, "y": target.y],
        "windowBounds": [
            "x": windowBounds.minX,
            "y": windowBounds.minY,
            "width": windowBounds.width,
            "height": windowBounds.height,
        ],
        "screenPixels": ["width": screen.width, "height": screen.height],
    ]
    let data = try JSONSerialization.data(withJSONObject: payload, options: [])
    print(String(data: data, encoding: .utf8)!)
}

do {
    try main()
} catch {
    fail(String(describing: error))
}
