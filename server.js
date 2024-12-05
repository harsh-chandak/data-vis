const express = require('express');
const csvtojson = require('csvtojson');
const fs = require('fs');
const json2csv = require('json2csv').parse;
const app = express();
const port = 5000;
const turf = require('@turf/turf');
const geoData = JSON.parse(fs.readFileSync('./Zip_Code.geojson'));

function findZipCode(lat, lon) {
    const point = turf.point([lon, lat]);
    for (const feature of geoData.features) {
        if (turf.booleanPointInPolygon(point, feature)) {
            return {
                zipcode: feature.properties.ZIPCODE || null,
                place: feature.properties.POSTAL || null
            };
        }
    }
    return { zipcode: null, place: null };
}
app.get('/data-cleaning', async (req, res) => {
    try {
        const csvFilePath = "./raw_data.csv"
        const jsonArray = await csvtojson().fromFile(csvFilePath);
        jsonArray.sort((a, b) => new Date(b['Crash Date/Time']) - new Date(a['Crash Date/Time']));
        const final_json = []
        let i = 0
        while(i<jsonArray.length){
            let data = jsonArray[i]
            const locationInfo = findZipCode(+data['Latitude'], +data['Longitude']);
            if (
                data['Crash Date/Time'] && String(data['Crash Date/Time']).trim().toLowerCase() != 'na' &&
                data['Collision Type'] && String(data['Collision Type']).trim().toLowerCase() != 'na' &&
                data['Weather'] && String(data['Weather']).trim().toLowerCase() != 'na' &&
                data['Surface Condition'] && String(data['Surface Condition']).trim().toLowerCase() != 'na' &&
                data['Light'] && String(data['Light']).trim().toLowerCase() != 'na' &&
                data['Driver At Fault'] && String(data['Driver At Fault']).trim().toLowerCase() != 'na' &&
                data['Injury Severity'] && String(data['Injury Severity']).trim().toLowerCase() != 'na' &&
                data['Vehicle First Impact Location'] && String(data['Vehicle First Impact Location']).trim().toLowerCase() != 'na' &&
                data['Vehicle Body Type'] && String(data['Vehicle Body Type']).trim().toLowerCase() != 'na' &&
                data['Vehicle Movement'] && String(data['Vehicle Movement']).trim().toLowerCase() != 'na' &&
                data['Vehicle Going Dir'] && String(data['Vehicle Going Dir']).trim().toLowerCase() != 'na' &&
                data['Speed Limit'] && String(data['Speed Limit']).trim().toLowerCase() != 'na' &&
                data['Vehicle Year'] && String(data['Vehicle Year']).trim().toLowerCase() != 'na' &&
                data['Vehicle Make'] && String(data['Vehicle Make']).trim().toLowerCase() != 'na' &&
                data['Vehicle Model'] && String(data['Vehicle Model']).trim().toLowerCase() != 'na' &&
                data['Latitude'] && String(data['Latitude']).trim().toLowerCase() != 'na' &&
                data['Longitude'] && String(data['Longitude']).trim().toLowerCase() != 'na' &&
                data['Location'] && String(data['Location']).trim().toLowerCase() != 'na'
            ) {
                final_json.push({
                    crash_date_time: data['Crash Date/Time'],
                    collision_type: data['Collision Type'],
                    weather: data['Weather'],
                    surface_condition: data['Surface Condition'],
                    light: data['Light'],
                    driver_at_fault: data['Driver At Fault'],
                    injury_severity: data['Injury Severity'],
                    vehicle_first_impact_location: data['Vehicle First Impact Location'],
                    vehicle_body_type: data['Vehicle Body Type'],
                    vehicle_movement: data['Vehicle Movement'],
                    vehicle_going_dir: data['Vehicle Going Dir'],
                    speed_limit: data['Speed Limit'],
                    vehicle_year: data['Vehicle Year'],
                    vehicle_make: data['Vehicle Make'],
                    vehicle_model: data['Vehicle Model'],
                    latitude: data['Latitude'],
                    longitude: data['Longitude'],
                    location: data['Location'],
                    zipcode: locationInfo.zipcode,
                    place: locationInfo.place
                })
            }
            i += 5
        }
        const csv = json2csv(final_json);
        const filename = 'final.csv';
        fs.writeFileSync(filename, csv);
        res.json({
            success: true,
            message: "Data processed successfully, new csv file at final.csv is ready, let's go!!!"
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});