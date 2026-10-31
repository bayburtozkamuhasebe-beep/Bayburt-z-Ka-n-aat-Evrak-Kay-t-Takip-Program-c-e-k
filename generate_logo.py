import struct
import zlib
import math

def create_logo_png(filename):
    width, height = 256, 256
    pixels = []

    cx, cy = 128, 140
    circle_r = 95
    navy = (35, 39, 71, 255)       # #232747
    blue_bright = (90, 145, 250, 255) # #5a91fa
    blue_mid = (65, 120, 235, 255)    # #4178eb
    blue_dark = (40, 75, 170, 255)    # #284baa
    white = (255, 255, 255, 255)
    trans = (0, 0, 0, 0)

    for y in range(height):
        row = []
        for x in range(width):
            dist_c = math.hypot(x - cx, y - cy)
            col = trans

            # Base circle
            if dist_c <= circle_r:
                col = navy

            # Towers (rising upwards beyond top of circle)
            # Left tower: x in [95, 120], y from 28 to 140
            if 94 <= x <= 122 and 30 <= y <= 150:
                # Angled roof at top: y < 30 + (x - 94) * 0.4
                if y >= 30 + (122 - x) * 0.5:
                    if x <= 108:
                        col = blue_mid
                    else:
                        col = blue_bright

            # Right tower (taller): x in [126, 148], y from 14 to 150
            if 126 <= x <= 152 and 14 <= y <= 150:
                if y >= 14 + (152 - x) * 0.5:
                    if x <= 138:
                        col = blue_bright
                    else:
                        col = blue_mid

            # Below towers: Chevrons / Arches
            # Peak is at x=128, y=100
            dx = abs(x - 128)
            # Gable roof slope: roof_y = 96 + dx * 0.75
            roof_y = 96 + dx * 0.72

            # Outer white chevron arch (thickness ~ 14px)
            if dist_c <= circle_r:
                if roof_y <= y <= roof_y + 16 and 48 <= x <= 208:
                    col = white
                elif roof_y + 16 < y <= roof_y + 28 and 56 <= x <= 200:
                    col = navy
                elif roof_y + 28 < y <= roof_y + 44 and 68 <= x <= 188:
                    col = blue_bright
                elif roof_y + 44 < y <= roof_y + 54 and 78 <= x <= 178:
                    col = navy

                # Inner arched portal
                if 100 <= x <= 156 and y >= 170:
                    portal_roof = 170 + abs(x - 128) * 0.4
                    if y >= portal_roof:
                        col = blue_mid

            row.extend(col)
        pixels.append(row)

    # Encode to PNG
    raw_data = bytearray()
    for row in pixels:
        raw_data.append(0)  # filter type 0
        raw_data.extend(row)

    compressed = zlib.compress(raw_data, 9)

    def chunk(tag, data):
        c = struct.pack("!I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xffffffff
        return c + struct.pack("!I", crc)

    png = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")

    with open(filename, "wb") as f:
        f.write(png)
    print(f"Generated {filename}")

create_logo_png("public/Adsız.png")
create_logo_png("public/adsiz.png")
create_logo_png("public/logo.png")
