import AppKit
import Foundation

guard CommandLine.arguments.count == 2,
      let image = NSImage(contentsOfFile: CommandLine.arguments[1]) else {
    fputs("usage: verify-screen.swift <screenshot.png>\n", stderr)
    exit(2)
}

var proposedRect = CGRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    fputs("could not decode screenshot\n", stderr)
    exit(2)
}

let bitmap = NSBitmapImageRep(cgImage: cgImage)
var redSamples = 0
let stride = 4

for y in Swift.stride(from: 0, to: bitmap.pixelsHigh, by: stride) {
    for x in Swift.stride(from: 0, to: bitmap.pixelsWide, by: stride) {
        guard let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else { continue }
        if color.redComponent > 0.80 && color.greenComponent < 0.20 && color.blueComponent < 0.20 {
            redSamples += 1
        }
    }
}

print("red WebView samples: \(redSamples)")
if redSamples < 2_000 {
    fputs("expected a substantial red WebView region in the screenshot\n", stderr)
    exit(1)
}
