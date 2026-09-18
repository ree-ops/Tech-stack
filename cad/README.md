# cad

3D-printable parts for the demo, written as OpenSCAD (`.scad`) source files
rather than pre-rendered STLs — free, text-based, and easy to tweak.

## Setup

1. Install [OpenSCAD](https://openscad.org/downloads.html) (free, macOS/Windows/Linux).
2. Open a `.scad` file below.
3. Press **F5** to preview, **F6** to fully render.
4. **File → Export → Export as STL**, then slice and print as usual.

These have not been test-printed — preview and check dimensions against your
actual hardware before committing filament to a print.

## Files

- **`electronics_enclosure.scad`** — a two-part project box (base + lid) for
  the Uno/ESP32 + breadboard rig, with cutouts for the USB cable and sensor
  wiring. **Measure your actual breadboard's length/width before printing**
  — the defaults at the top of the file are reasonable guesses for a
  standard full-size breadboard, not measurements of your specific setup.
  Boxing the wiring in also helps with the loose-connection issues we've
  been chasing during testing — less chance of a wire getting bumped.

- **`zone_marker_stake.scad`** — a small labeled ground stake for the demo
  table. Print 4 of these, changing `ZONE_LABEL` at the top of the file
  each time (`NORTH BLOCK`, `EAST BLOCK`, `SOUTH BLOCK`, `WEST BLOCK`) to
  match the dashboard's zone names — push one into each pot/soil tray so
  judges can see which physical section corresponds to which zone on
  screen.
