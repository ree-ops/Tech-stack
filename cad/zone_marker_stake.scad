// Lowveld Grove — Zone marker stake
//
// A small labeled ground stake for the demo table — push one into each of
// the four pots/soil trays so judges can see "North block", "East block",
// etc. matching the dashboard's zone names at a glance.
//
// Print 4x total: change ZONE_LABEL below, re-render (F6), export STL,
// print, then repeat for the other three zone names.

ZONE_LABEL = "WEST BLOCK";  // change to NORTH BLOCK / EAST BLOCK / SOUTH BLOCK / WEST BLOCK per print

stake_width = 6;     // stake cross-section at its base (mm)
stake_length = 70;   // how far it goes into the soil (mm)
flag_width = 44;
flag_height = 26;
flag_thickness = 3;
text_size = 6.5;

// Tapered stake — square cross-section at the base, narrowing toward the tip.
module stake() {
  linear_extrude(height = stake_length, scale = 0.08)
    square([stake_width, stake_width], center = true);
}

// Flag sits on top of the stake, with the zone name embossed (cut) through it.
module flag() {
  translate([0, 0, stake_length]) {
    difference() {
      translate([-flag_width / 2, -flag_thickness / 2, 0])
        cube([flag_width, flag_thickness, flag_height]);

      translate([0, 0, flag_height / 2])
        rotate([90, 0, 0])
          linear_extrude(height = flag_thickness + 2, center = true)
            text(
              ZONE_LABEL,
              size = text_size,
              halign = "center",
              valign = "center",
              font = "Liberation Sans:style=Bold"
            );
    }
  }
}

stake();
flag();
