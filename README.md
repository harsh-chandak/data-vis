<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/card-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/card-light.png">
  <img src="assets/card-light.png" alt="Maryland Crash Atlas. Linked D3 views over public crash reports, where selecting in any chart filters the map with it. 32 thousand crash records, five linked view types, ZIP code boundaries from GeoJSON. Built with D3.js, Node.js, GeoJSON and data.gov.">
</picture>

# Mapping Accident Trends and Patterns in Maryland

Montgomery County publishes every reported crash: where it happened, the weather,
the light, the road surface, who was at fault and how badly people were hurt.
That is 32,429 records across 20 fields, which is far too many to read and far
too few dimensions to hold in your head at once.

This is that dataset as five views that are wired together. Brush a region of the
map and every chart redraws for those crashes only. Pick a severity band in the
mosaic and the map keeps just those points. The question the project is built
around is not "how many crashes" but "which conditions travel together" — and
that is a question you answer by moving between views, not by reading one.

## The views

| View | What it answers |
| --- | --- |
| **Geospatial map** | Where crashes cluster, with severity encoded on each point, over ZIP code boundaries from GeoJSON |
| **Pie chart matrix** | How crash outcomes differ between vehicle makes |
| **Mosaic chart** | Injury severity against light conditions, sized by how common each combination is |
| **Stacked bar matrix** | Weather and light conditions against crash counts, side by side |
| **Car in a clock** | A radial chart putting time of day against severity, laid out on a car silhouette |

Selections propagate across all five. The shared filter state lives in the page,
so no view owns the current selection and any of them can set it.

## Data

[Crash Reporting — Drivers Data](https://catalog.data.gov/dataset/crash-reporting-drivers-data),
Montgomery County, via data.gov.

The raw export is not usable as published: inconsistent casing in the categorical
columns, rows without coordinates, and no ZIP code on the records at all. The
cleaning pass normalizes the categories, drops rows that cannot be placed on a
map, and assigns each remaining crash a ZIP by point-in-polygon against
`Zip_Code.geojson` using Turf. The result is `final.csv`, which is what the page
loads.

## Running it

```bash
npm install
npm run dev
```

The visualization is `index.html`, served statically. To regenerate `final.csv`
from a fresh download of the raw dataset, start the server and call the cleaning
endpoint once:

```bash
curl http://localhost:5000/data-cleaning
```

Port 5000 is hardcoded in `server.js`.

## Credits

Group project, Data Visualization, Fall 2024: Aman, Anirudh, Ashutosh, Harsh and
Soumya.
