// Lowveld Grove — Electronics enclosure (base + lid)
//
// A project box for the Uno/ESP32 + breadboard rig. The whole point is to
// stop wires from being disturbed by hand contact — which has been the
// single biggest source of the flaky/intermittent sensor readings during
// testing. Boxing the wiring in reduces exactly that risk.
//
// IMPORTANT: measure your actual breadboard/board footprint before
// printing — the numbers below are reasonable guesses for a standard
// full-size breadboard, not measurements of your specific hardware. Open
// this in OpenSCAD (openscad.org, free), adjust the parameters, preview
// with F5, render with F6, then File > Export > Export as STL.
//
// Prints as two separate parts (base and lid) laid out side by side —
// slice and print both.

// ---- Parameters (mm) — measure and adjust these ----
board_length = 170;      // breadboard length
board_width  = 65;       // breadboard width
board_height = 12;       // clearance above the board for the tallest component (e.g. the servo horn or relay)
wall = 2.4;              // wall thickness — 2-2.5mm is a good default for most printers
lid_lip = 1.4;           // how far the lid's inner lip overlaps the base wall (fit tolerance)
usb_notch_width = 14;
usb_notch_height = 9;
wire_notch_width = 24;
wire_notch_height = 7;
corner_radius = 4;

base_height = board_height + 6; // extra clearance for wires routed underneath/beside the board

module rounded_box(l, w, h, r) {
  hull() {
    for (x = [r, l - r])
      for (y = [r, w - r])
        translate([x, y, 0])
          cylinder(h = h, r = r, $fn = 32);
  }
}

module base() {
  difference() {
    rounded_box(board_length + 2 * wall, board_width + 2 * wall, base_height, corner_radius);

    // hollow interior
    translate([wall, wall, wall])
      rounded_box(board_length, board_width, base_height, corner_radius - 1);

    // USB cable notch — one side wall, for programming/power without opening the box
    translate([-1, board_width / 2 - usb_notch_width / 2 + wall, wall])
      cube([wall + 2, usb_notch_width, usb_notch_height]);

    // Sensor/servo/relay wire notch — opposite side wall
    translate([board_length + wall - 1, board_width / 2 - wire_notch_width / 2 + wall, wall])
      cube([wall + 2, wire_notch_width, wire_notch_height]);
  }
}

module lid() {
  lid_height = 4;
  difference() {
    rounded_box(board_length + 2 * wall, board_width + 2 * wall, lid_height, corner_radius);
    translate([wall - lid_lip, wall - lid_lip, -1])
      rounded_box(
        board_length + 2 * lid_lip,
        board_width + 2 * lid_lip,
        lid_height - 1.5,
        corner_radius - 1
      );
  }
}

base();
translate([0, board_width + 2 * wall + 12, 0]) lid();
