document.addEventListener('DOMContentLoaded', function () {
    const svgWidth = 1200, svgHeight = 600;
    const svg = d3.select("#splom-svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    d3.csv("final.csv", (row) => ({
        injury_severity: row.injury_severity,
        vehicle_year: row.vehicle_year,
        vehicle_make: row.vehicle_make
    })).then(rawData => {
        let makeCount = {};

        rawData.forEach(row => {
            let make = row.vehicle_make;
            makeCount[make] = (makeCount[make] || 0) + 1; // Increment count for each vehicle_make
        });

        // Step 2: Filter makes that have a count greater than 20
        let filteredMakes = Object.keys(makeCount).filter(make => makeCount[make] > 10);

        // Step 3: Output the filtered makes
        console.log(filteredMakes);
        const data = processData(rawData);
        createPieChartMatrix(data);
    });

    function processData(rawData) {
        const car_country = {
            "SUBARU": "Japanese",
            "AUDI": "German",
            "HONDA": "Japanese",
            "FORD": "American",
            "GILLIG": "American",
            "TOYOTA": "Japanese",
            "NISSAN": "Japanese",
            "ACURA": "Japanese",
            "JEEP": "American",
            "BUICK": "American",
            "KIA": "Korean",
            "LAND ROVER": "European", // British
            "MAZDA": "Japanese",
            "DODGE": "American",
            "BMW": "German",
            "CHEVROLET": "American",
            "HYUNDAI": "Korean",
            "RAM": "American",
            "VOLKSWAGEN": "German",
            "LEXUS": "Japanese",
            "MACK": "American",
            "MITSUBISHI": "Japanese",
            "MERCEDES-BENZ": "German",
            "TESLA": "American",
            "VOLVO": "European", // Swedish
            "FREIGHTLINER": "American",
            "LINCOLN": "American",
            "INTERNATIONAL": "American",
            "THOMAS BUILT": "American",
            "NEW FLYER": "American",
            "NABI": "American",
            "FIAT": "European",
            "MINI": "European", // British
            "other": "other",
            "CADILLAC": "American",
            "CHRYSLER": "American",
            "GMC": "American",
            "INFINITI": "Japanese",
            "JAGUAR": "European", // British
            "MERCURY": "American",
            "SUZUKI": "Japanese",
            "HARLEY DAVIDSON": "American",
            "HINO": "Japanese",
            "SATURN": "American",
            "PETERBILT": "American",
            "ISUZU": "Japanese",
            "KENWORTH": "American",
            "KAWASAKI": "Japanese",
            "SAAB": "European", // Swedish
            "NISS": "Japanese",
            "HOND": "Japanese",
            "FRHT": "American",
            "CHEV": "American",
            "GILG": "American",
            "INFI": "Japanese",
            "TOYT": "Japanese",
            "CHEVY": "American",
            "MERC": "German",
            "PONTIAC": "American",
            "NWFL": "American",
            "MERCEDES": "German",
            "HYUN": "Korean",
            "THOMAS": "American",
            "TOYTA": "Japanese",
            "MITS": "Japanese",
            "LEXS": "Japanese",
            "SUBA": "Japanese",
            "MERZ": "German",
            "TBU": "American",
            "VOLKS": "German",
            "CADI": "American",
            "NFLY": "American",
            "INTL": "American",
            "VOLK": "German",
            "VOLKSWAGON": "German",
            "DODG": "American",
            "THMS": "American",
            "THOM": "American",
            "CHRY": "American",
            "LANDROVER": "European", // British
            "CHEVORLET": "American",
            "TESL": "American",
            "SCION": "Japanese",
            "LINC": "American",
            "ACUR": "Japanese",
            "MAZD": "Japanese",
            "YAMAHA": "Japanese",
            "BUIC": "American",
            "INFINITY": "Japanese",
            "GILL": "American",
            "PORS": "German",
            "NISSIAN": "Japanese",
            "TOYO": "Japanese",
            "ISU": "Japanese",
            "VW": "German",
            "PORSCHE": "German",
            "SPAR": "American",
            "UU": "other",
            "MERCEDEZ": "German",
            "UNK": "other",
            "LEXU": "Japanese",
            "PIERCE": "American",
            "TOYOT": "Japanese",
            "MERCEDES BENZ": "German",
            "HYUND": "Korean",
            "VOLV": "European", // Swedish
            "HYUNDIA": "Korean",
            "CHEVEROLET": "American",
            "TOY": "Japanese",
            "SUZI": "Japanese",
            "FREIGHT": "American",
            "SPARTAN": "American",
            "PTRB": "American",
            "PONT": "American",
            "PETERBUILT": "American",
            "STERLING": "American",
            "ORIO": "other",
            "ORION": "other"
        };



        const years = {
            '1900': 'Before 2000', '1901': 'Before 2000', '1966': 'Before 2000', '1969': 'Before 2000', '1971': 'Before 2000', '1974': 'Before 2000', '1977': 'Before 2000',
            '1978': 'Before 2000', '1980': 'Before 2000', '1981': 'Before 2000', '1982': 'Before 2000', '1983': 'Before 2000', '1985': 'Before 2000', '1986': 'Before 2000',
            '1987': 'Before 2000', '1988': 'Before 2000', '1989': 'Before 2000', '1990': 'Before 2000', '1991': 'Before 2000', '1992': 'Before 2000', '1993': 'Before 2000',
            '1994': 'Before 2000', '1995': 'Before 2000', '1996': 'Before 2000', '1997': 'Before 2000', '1998': 'Before 2000', '1999': 'Before 2000', '2000': 'Before 2000',
            '2001': '2000-2015', '2002': '2000-2015', '2003': '2000-2015', '2004': '2000-2015', '2005': '2000-2015', '2006': '2000-2015', '2007': '2000-2015', '2008': '2000-2015',
            '2009': '2000-2015', '2010': '2000-2015', '2011': '2000-2015', '2012': '2000-2015', '2013': '2000-2015', '2014': '2000-2015', '2015': '2000-2015',
            '2016': 'After 2015', '2017': 'After 2015', '2018': 'After 2015', '2019': 'After 2015', '2020': 'After 2015', '2021': 'After 2015', '2022': 'After 2015', '2023': 'After 2015',
            '2024': 'After 2015', "1": "other"
        }

        let final_data = [];
        rawData.map(row => {
            if (car_country[String(row.vehicle_make).trim().toUpperCase()]) {
                const country = car_country[String(row.vehicle_make).trim().toUpperCase()] || 'other';
                const year_group = years[row.vehicle_year] || 'other';
                const injury = String(row.injury_severity).trim().toUpperCase()
                const injury_severity = injury.toUpperCase().includes("NO APPARENT INJURY") ? "None" :
                    injury.toUpperCase().includes("SUSPECTED MINOR INJURY") ? "Minor" :
                        (injury.toUpperCase().includes("POSSIBLE INJURY") || injury.toUpperCase().includes("SUSPECTED SERIOUS INJURY")) ? "Moderate" :
                            injury.toUpperCase().includes("FATAL INJURY") ? "Serious" :
                                "other";
                final_data.push({ injury_severity: injury_severity, car_country: country, make_year: year_group });
            }
        });

        let country_group = [...new Set(Object.values(car_country))];
        let year_group = [...new Set(Object.values(years))];

        return { final_data, year_group, country_group };
    }

    function createPieChartMatrix(data) {
        const pieWidth = 80, pieHeight = 80;
        const margin = { top: 20, right: 20, bottom: 20, left: 120 };

        const { final_data, year_group, country_group } = data;

        const colorMapping = {
            "None": "#9467bd",
            "Minor": "#1f77b4",  // Blue
            "Moderate": "#ff7f0e",  // Orange
            "Serious": "#2ca02c"  // Green
            
        };
        

        // Scales for positioning
        const xScale = d3.scaleBand()
            .domain(year_group)
            .range([margin.left, svgWidth - margin.right])
            .padding(0.1);

        const yScale = d3.scaleBand()
            .domain(country_group)
            .range([margin.top, svgHeight - margin.bottom])
            .padding(0.1);

        // Axes
        const xAxis = d3.axisBottom(xScale).tickSize(0);
        const yAxis = d3.axisLeft(yScale).tickSize(0);

        // Append axes
        svg.append("g")
            .attr("transform", `translate(0,${svgHeight - margin.bottom})`)
            .call(xAxis)
            .selectAll("text")
            .attr("fill", "white")
            .style("font-size", "20px");

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(yAxis)
            .selectAll("text")
            .attr("fill", "white")
            .style("font-size", "20px");

        // Create an overlay for the enlarged chart
        const overlay = d3.select("body").append("div")
            .attr("id", "overlay")
            .style("position", "absolute")
            .style("display", "none")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("border-radius", "10px")
            .style("padding", "20px")
            .style("width", "400px")  // Set the width of the overlay
            .style("height", "400px") // Set the height of the overlay
            .style("z-index", 10);


        overlay.append("svg")
            .attr("width", 320)
            .attr("height", 320)
            .attr("id", "overlay-pie");

        // Create pie charts
        year_group.forEach(year => {
            country_group.forEach(country => {
                const groupData = final_data.filter(d => d.make_year === year && d.car_country === country);

                const injurySeverityCount = d3.rollup(groupData, v => v.length, d => d.injury_severity);
                const pieData = Array.from(injurySeverityCount, ([injury, count]) => ({ injury, count }));

                const pie = d3.pie().value(d => d.count)(pieData);
                const arc = d3.arc().innerRadius(0).outerRadius(pieWidth / 2);

                const pieGroup = svg.append("g")
                    .attr("transform", `translate(${xScale(year) + xScale.bandwidth() / 2}, ${yScale(country) + yScale.bandwidth() / 2})`);

                // Draw pie slices
                const paths = pieGroup.selectAll("path")
                    .data(pie)
                    .enter().append("path")
                    .attr("d", arc)
                    .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
                    .attr("stroke", "white")
                    .attr("stroke-width", 1);

                
                paths.on("mouseover", function (event, d) {
                    d3.select(this)
                        .attr("stroke", "yellow")
                        .attr("stroke-width", 3);

                    
                    const overlayPie = d3.select("#overlay-pie");

                    
                    overlayPie.selectAll("path").remove();
                    overlayPie.selectAll("text").remove();

                    
                    const overlayWidth = +overlayPie.attr("width");
                    const overlayHeight = +overlayPie.attr("height");
                    const centerX = overlayWidth / 2;
                    const centerY = overlayHeight / 2;

                    
                    const enlargedArc = d3.arc()
                        .innerRadius(0)
                        .outerRadius(Math.min(overlayWidth, overlayHeight) / 2 - 20); 

                    
                    const total = pie.reduce((sum, p) => sum + p.data.count, 0);

                
                    overlayPie.selectAll("path")
                        .data(pie)
                        .enter().append("path")
                        .attr("d", enlargedArc)
                        .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
                        .attr("stroke", "white")
                        .attr("stroke-width", 2)
                        .attr("transform", `translate(${centerX}, ${centerY})`); 

                    overlayPie.selectAll("text")
                        .data(pie)
                        .enter().append("text")
                        .attr("transform", d => {
                            
                            const [x, y] = enlargedArc.centroid(d);
                            const scaleFactor = 1.5;
                            return `translate(${x * scaleFactor + centerX}, ${y * scaleFactor + centerY})`;
                        })
                        .attr("text-anchor", "middle")
                        .attr("fill", "white")
                        .attr("font-size", "14px")
                        .text(d => {
                            const percentage = Math.round((d.data.count / total) * 100);
                            return percentage > 0 ? `${percentage}%` : ""; 
                        });


                    overlay
                        .style("display", "block")
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`);

                }).on("mouseout", function () {
                    d3.select(this)
                        .attr("stroke", "white")
                        .attr("stroke-width", 1);

                    overlay.style("display", "none");
                });


            });
        });

        // Draw legend
        const legendData = [...new Set(final_data.map(d => d.injury_severity))];
        const legend = svg.append("g")
            .attr("transform", `translate(${svgWidth - margin.right - 20}, ${margin.top})`);

        legendData.forEach((severity, i) => {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 20)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", d3.schemeCategory10[i % 10]);

            legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 12)
                .attr("fill", "white")
                .text(severity);
        });
    }


});
