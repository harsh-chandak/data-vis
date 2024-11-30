let dataset;
let width = 1000;
let height = 700;
document.addEventListener('DOMContentLoaded', function () {    

    d3.json("Zip_Code.geojson").then(function(dataset) {

        const svg = d3.select("#geospatial-svg")
                      .attr("width", width)
                      .attr("height", height)
                      .style("display", "block")
                      .style("margin", "0 auto");

        const projection = d3.geoAlbersUsa().fitSize([width, height], dataset); 
        const path = d3.geoPath().projection(projection);

        
        
           
        // const tooltip = d3.select("#geospatial-svg").append("div")
        //                   .attr("class", "tooltip")
        //                   .style("position", "absolute")
        //                   .style("opacity", 0)
        //                   .style("background-color", "black")
        //                   .style("border", "1px solid #ccc")
        //                   .style("border-radius", "5px")
        //                   .style("padding", "5px")
        //                   .style("font-size", "12px");

        const tooltip = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("position", "absolute")
                        .style("opacity", 0)
                        .style("background-color", "rgba(0, 0, 0, 0.7)")
                        .style("color", "#fff")
                        .style("border", "1px solid #ddd")
                        .style("border-radius", "8px")
                        .style("padding", "10px 15px")
                        .style("font-size", "14px")
                        .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.2)")
                        .style("transition", "opacity 0.3s ease-in-out, transform 0.3s ease-in-out")
                        .style("transform", "scale(0.9)")
                        .style("pointer-events", "none");

        

               
        const severityScale = d3.scaleOrdinal()
                .domain(["No Apparent Injury", "Possible Injury", "Suspected Minor Injury", 
                         "Suspected Serious Injury", "Fatal Injury"])
                .range(["#444444", "#4C555F", "#D8C8A2", "#7B7B68", "#5E8D9E"]);

        // const circleSeverityScale = d3.scaleOrdinal()
        //         .domain(["No Apparent Injury", "Possible Injury", "Suspected Minor Injury", 
        //                  "Suspected Serious Injury", "Fatal Injury"])
        //         .range(["#6D9DC5", "#F2C9B2", "#F2B5D4", "#F4A300", "#D84B16"]);

        const dropdown = svg.append("foreignObject")
                    .attr("x", 10)
                    .attr("y", 10)
                    .attr("width", 200)
                    .attr("height", 40)
                    .append("xhtml:select")
                    .attr("id", "severity-filter")
                    .style("padding", "5px")
                    .style("font-size", "14px");

        dropdown.append("option")
        .attr("value", "None")
        .text("None");


        const severities = ["Fatal Injury", "Suspected Serious Injury", "Suspected Minor Injury", 
            "Possible Injury", "No Apparent Injury"];

        severities.forEach(function(severity) {
            dropdown.append("option")
                .attr("value", severity)
                .text(severity);
            });
        
        // dropdown.property("value", "Fatal Injury");
        const spatialIndex = new RBush();
        
        const indexedFeatures = dataset.features.map(feature => {
            const bounds = d3.geoBounds(feature);
            return {
                minX: bounds[0][0],
                minY: bounds[0][1],
                maxX: bounds[1][0],
                maxY: bounds[1][1],
                feature: feature,
            };
        });
        
        spatialIndex.load(indexedFeatures);
            
        // function findZipCode(lat, lon, geoData) {
        //     const point = [lon, lat];
        //     for (const feature of geoData.features) {
        //         const bounds = d3.geoBounds(feature);
        //         const minX = bounds[0][0]; 
        //         const minY = bounds[0][1]; 
        //         const maxX = bounds[1][0];
        //         const maxY = bounds[1][1];
        //         // console.log([minX, minY, maxX, maxY]) 
        //         if (lon >= minX && lon <= maxX && lat >= minY && lat <= maxY) {
                    
        //             if (d3.geoContains(feature, point)) {
        //                 return feature.properties.ZIPCODE;
        //             }
        //         }
        //     }
        //     return null; 
        // }

        function findZipCode(lat, lon) {
            const candidates = spatialIndex.search({
                minX: lon,
                minY: lat,
                maxX: lon,
                maxY: lat
            });
        
            for (const candidate of candidates) {
                if (d3.geoContains(candidate.feature, [lon, lat])) {
                    return {
                        zipcode: candidate.feature.properties.ZIPCODE,
                        postal: candidate.feature.properties.POSTAL
                    };
                }
            }
        
            return null;
        }
        const checkbox = svg.append("foreignObject")
            .attr("x", 10)
            .attr("y", 60)  
            .attr("width", 200)
            .attr("height", 40)
            .append("xhtml:div")
            .html(`
                <label for="show-accidents-checkbox">Show Accident Locations</label>
                <input type="checkbox" id="show-accidents-checkbox" />
            `)
            .style("font-size", "14px")
            .style("padding", "5px")
            .style("display","none");
        d3.csv("final.csv").then(function(data) {
            
        // data.forEach(function(d) {
        //     // console.log(d.injury_severity)
        //     d.latitude = +d.latitude;
        //     d.longitude = +d.longitude;
        //     d.zipcode = findZipCode(d.latitude, d.longitude, dataset);
        // });

        // latitude="39.02738993";
        // longitude="-76.98235396";
        // zipcode = findZipCode(latitude, longitude);
        // console.log(zipcode);
        data.forEach(d => {
            d.latitude = +d.latitude;
            d.longitude = +d.longitude;
            const result = findZipCode(d.latitude, d.longitude);
            if (result) {
                const { zipcode, postal } = result;
                d.zipCode = zipcode;
                d.postal = postal;
            } else {
                d.zipCode = null;
                d.postal = null;
            }
        });

        // const zipSeverityCounts = d3.rollups(
        //     data,
        //     v => d3.rollup(v, group => group.length, d => d.injury_severity),
        //     d => d.zipcode
        // );

        const zipSeverityCounts = d3.rollups(
            data,
            v => {
                
                const severityCountMap = new Map();
                v.forEach(d => {
                    const severity = d.injury_severity;
                    if (severityCountMap.has(severity)) {
                        severityCountMap.set(severity, severityCountMap.get(severity) + 1);
                    } else {
                        severityCountMap.set(severity, 1);
                    }
                });
                return severityCountMap; 
            },
            d => d.zipCode 
        );
        
        const zipPaths =svg.selectAll("path")
           .data(dataset.features)
           .enter()
           .append("path")
           .attr("d", path)
           .attr("fill", "#FAFAF0")
           .attr("stroke", "#B8B8B8")
           .attr("stroke-width", 1)
           .attr("data-zipcode", d => d.properties.ZIPCODE)
           .on("mouseover", function(event, d) {
            //    d3.select(this)
            //      .attr("fill", "red");
                const zipCode = d.properties.ZIPCODE;
                const severityCounts = zipSeverityMap.get(zipCode);
                let tooltipContent = "ZIP Code: " + zipCode + "<br/>" + "Postal: " + d.properties.POSTAL + "<br/><br/>";
                severities.forEach(function(severity) {
                    const count = severityCounts ? severityCounts.get(severity) || 0 : 0;
                    tooltipContent += `${severity}: ${count}<br/>`;
                });
               tooltip.transition().duration(200).style("opacity", .9);
               tooltip.html(tooltipContent)
                      .style("left", (event.pageX + 5) + "px")
                      .style("top", (event.pageY - 28) + "px");
                d3.select(this).transition().duration(200)
                      .style("stroke-width", "5px") 
                      .style("stroke", "#B22222") ;
           })
           .on("mouseout", function(d) {

               tooltip.transition().duration(500).style("opacity", 0);
               d3.select(this).transition().duration(200)
                            .style("stroke-width", "1px")  
                            .style("stroke", "#B8B8B8");
           });
        // console.log(zipSeverityCounts)

        const zipSeverityMap = new Map(zipSeverityCounts);
        // console.log(zipSeverityMap)
        

        const severityImages = {
            "Fatal Injury": "images/death.png", 
            "Suspected Serious Injury": "images/fender-bender.png",
            "Suspected Minor Injury": "images/heartbeat.png",
            "Possible Injury": "images/patient.png",
            "No Apparent Injury": "images/band-aid.png"
        };

        
        let showAccidents = false;

        const legendContainer = svg.append("g")
            .attr("id", "legend")
            .attr("transform", `translate(${width - 320}, ${20})`)
            .style("display", "none"); 

        legendContainer.append("rect")
            .attr("width", 260)
            .attr("height", 40)
            .attr("fill", "white")
            .attr("stroke", "#B8B8B8")
            .attr("rx", 5)
            .attr("ry", 5);

        const defs = svg.append("defs");

        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        linearGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d3.color(severityScale(severities[severities.length - 1])).brighter(-1));

        linearGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.color(severityScale(severities[0])).brighter(1));

        
        legendContainer.append("rect")
            .attr("x", 20)
            .attr("y", 10)
            .attr("width", 220)
            .attr("height", 10)
            .style("fill", "url(#legend-gradient)");

        
        legendContainer.append("text")
            .attr("x", 20)
            .attr("y", 35)
            .attr("font-size", "12px")
            .attr("fill", "#333");
        
        legendContainer.append("text")
            .attr("x", 230)
            .attr("y", 35)
            .attr("font-size", "12px")
            .attr("fill", "#333");
        
        


        dropdown.on("change", function() {
            const selectedSeverity = d3.select(this).property("value");

            legendContainer.style("display", selectedSeverity === "None" ? "none" : "block");

            if (selectedSeverity !== "None" && selectedSeverity !== "") {
                checkbox.style("display", "inline-block");

                linearGradient.select("stop:nth-child(1)")
                              .attr("stop-color", d3.color(severityScale(selectedSeverity)).brighter(1));
                linearGradient.select("stop:nth-child(2)")
                    .attr("stop-color", d3.color(severityScale(selectedSeverity)).brighter(-1));

                const counts = Array.from(zipSeverityMap).map(([zipcode, severityCounts]) => {
                    return severityCounts.get(selectedSeverity) || 0;
                });

                const [minCount, maxCount] = d3.extent(counts);
                const medianCount = d3.median(counts);

                legendContainer.select("text:nth-child(3)").text(`${minCount}`);
                legendContainer.select("text:nth-child(4)").text(`${maxCount}`);
            }
            else{
                checkbox.style("display", "none");
            }

            const counts = Array.from(zipSeverityMap).map(([zipcode, severityCounts]) => {
                const severityCount = severityCounts.get(selectedSeverity) || 0;
                return { zipcode, count: severityCount };
            });

            const severityCounts = counts.map(d => d.count);
            // console.log(counts);
            const countScale = d3.scaleLinear()
                                .domain(d3.extent(severityCounts))
                                .range([1,-1]);
 
            zipPaths.transition().duration(500)
                .attr("fill", function(d) {
                if (selectedSeverity === "None") {
                    return "#FAFAF0"; 
                }
                const zipCode = d.properties.ZIPCODE;
                const severityCount = zipSeverityMap.get(zipCode)?.get(selectedSeverity) || 0;
                const severityColor = severityScale(selectedSeverity); 
                const intensity = countScale(severityCount); 
                return d3.color(severityColor).brighter(intensity); 
            });

            
            document.getElementById("show-accidents-checkbox").checked = false;
            // console.log(checkbox);
            checkbox.on("click", function() {
                let filteredData = selectedSeverity === "ALL" ? data : data.filter(function(d) {
                    return d.injury_severity === selectedSeverity;
                });
                // const isChecked = d3.select(this).property("checked");
                // console.log(isChecked)
                if (event.target.checked) {
                    console.log("check box checked")
                    showAccidents = true;
                    svg.selectAll("image")
                        .data(filteredData)
                        .join("image")
                        .attr("x", function(d) {
                            return projection([d.longitude, d.latitude])[0] - 15;
                        })
                        .attr("y", function(d) {
                            return projection([d.longitude, d.latitude])[1] - 15;
                        })
                        .attr("width", 0) 
                        .attr("height", 0) 
                        .attr("xlink:href", function(d) {
                            return severityImages[d.injury_severity];
                        })
                        .attr("opacity", 0)
                        .transition() 
                        .duration(500)
                        .attr("width", 20)
                        .attr("height", 20)
                        .attr("opacity", 0.8);
                        
                    svg.selectAll("image")
                        .on("mouseover", function(event, d) {
                            tooltip.transition().duration(200).style("opacity", 0.9);
                            tooltip.html(
                                "Place: " + d.postal +
                                "<br/>Collision Type: " + d.collision_type +
                                "<br/>Light: " + d.light +
                                "<br/>Vehicle Make: " + d.vehicle_make +
                                "<br/>Vehicle Model: " + d.vehicle_model +
                                "<br/>Severity: " + d.injury_severity
                            )
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");

                            d3.select(this)
                                .transition().duration(500)
                                .attr("width", 60)
                                .attr("height", 60)
                                .style("stroke-width", "5px")
                                .style("stroke", "#B22222");
                        })
                        .on("mouseout", function() {
                            tooltip.transition().duration(500).style("opacity", 0);

                            d3.select(this)
                                .transition().duration(500)
                                .attr("width", 20)
                                .attr("height", 20)
                                .style("stroke-width", "1px")
                                .style("stroke", "#B8B8B8");
                        });
                }
                else
                {
                    showAccidents = false;
                    svg.selectAll("image")
                        .transition()
                        .duration(500)
                        .attr("width", 0) 
                        .attr("height", 0) 
                        .style("opacity", 0)
                        .remove(); 
                }
            });
            svg.selectAll("image")
                .transition()
                .duration(500)
                .attr("width", 0) 
                .attr("height", 0) 
                .style("opacity", 0)
                .remove(); 
        
                
            
                                    // if (showAccidents) {
            // svg.selectAll("circle")
            //     .data(filteredData)  
            //     .transition()  
            //     .duration(1000)  
            //     .attr("cx", function(d) { 
            //         return projection([d.longitude, d.latitude])[0]; 
            //     })
            //     .attr("cy", function(d) { 
            //         return projection([d.longitude, d.latitude])[1]; 
            //     })
            //     .attr("fill", function(d) {
            //         return circleSeverityScale(d.injury_severity);  
            //     });

            
            // svg.selectAll("circle")
            //     .data(filteredData)
            //     .enter()
            //     .append("circle")
            //     .attr("cx", function(d) { 
            //         return projection([d.longitude, d.latitude])[0]; 
            //     })
            //     .attr("cy", function(d) { 
            //         return projection([d.longitude, d.latitude])[1]; 
            //     })
            //     .attr("r", 7)  
            //     .attr("fill", function(d) {
            //         d.initialColor = circleSeverityScale(d.injury_severity);
            //         return circleSeverityScale(d.injury_severity);  
            //     })
            //     .attr("stroke", "black")
            //     .attr("stroke-width", 0.8)
            //     .attr("opacity", 0.8) 
            //     .on("mouseover", function(event, d) {
            //         tooltip.transition().duration(200).style("opacity", .9);
            //         tooltip.html("Place: " + d.postal+"<br/>Collision Type: " + d.collision_type + "<br/>light: " + d.light + "<br/>Vechical Make: " + d.vehicle_make+ "<br/>Vechical Model: " + d.vehicle_model+ "<br/>Severity: " + d.injury_severity)
            //             .style("left", (event.pageX + 5) + "px")
            //             .style("top", (event.pageY - 28) + "px");
            //         d3.select(this)
            //         .attr("data-initial-color", d3.select(this).attr("fill"))
            //             .transition().duration(200)  
            //             .attr("r", 16)
            //             .attr("opacity", 1) 
            //             .attr("fill", "#B22222");

            //     })
            //     .on("mouseout", function(d) {
            //         const initialColor = d3.select(this).attr("data-initial-color");
            //         tooltip.transition().duration(500).style("opacity", 0);
            //         d3.select(this)
            //         .transition().duration(200) 
            //         .attr("r", 7)
            //         .attr("opacity", 0.8)  
            //         .attr("fill", initialColor);
            //     });

            //     svg.selectAll("circle")
            //         .data(filteredData)
            //         .exit()
            //         .transition()  
            //         .duration(1000)  
            //         .style("opacity", 0)  
            //         .remove();
                                            
                                            
        });

        });
        
    });
});


