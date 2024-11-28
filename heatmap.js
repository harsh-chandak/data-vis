// heatmap.js
const margin = {top: 50, right: 50, bottom: 100, left: 150};
const width = 900 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

function simplifyLightCondition(light) {
    const lightMap = {
        "DARK - LIGHTED": "Dark - Lighted",
        "DARK - NOT LIGHTED": "Dark - Not Lighted",
        "DAWN": "Dawn",
        "DUSK": "Dusk",
        "DAYLIGHT": "Daylight",
        "UNKNOWN": "Unknown Lighting"
    };
    return lightMap[light] || "Other";
}

function convertSeverityToValue(severity) {
    const severityMap = {
        "NO APPARENT INJURY": 0,
        "POSSIBLE INJURY": 1,
        "SUSPECTED MINOR INJURY": 2,
        "SUSPECTED SERIOUS INJURY": 3,
        "FATAL INJURY": 4
    };
    return severityMap[severity] || 0;
}

d3.csv("final.csv").then(function(data) {
    // Clear existing content
    d3.select("#heatmap-svg").selectAll("*").remove();
    
    // Create base SVG
    const svg = d3.select("#heatmap-svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process and filter data
    const processedData = data.reduce((acc, d) => {
        const date = new Date(d["crash_date_time"]);
        const year = date.getFullYear();
        const light = simplifyLightCondition(d["light"]);
        const severity = convertSeverityToValue(d["injury_severity"]);
        
        if (!acc[year]) acc[year] = {};
        if (!acc[year][light]) acc[year][light] = [];
        
        // Only add valid severity values
        if (severity !== undefined && !isNaN(severity)) {
            acc[year][light].push(severity);
        }
        return acc;
    }, {});

    // Convert to array format and remove empty entries
    const heatmapData = [];
    Object.entries(processedData).forEach(([year, lights]) => {
        Object.entries(lights).forEach(([light, severities]) => {
            if (severities.length > 0) {  // Only include if there's data
                const avgSeverity = d3.mean(severities);
                if (avgSeverity !== undefined && !isNaN(avgSeverity)) {
                    heatmapData.push({
                        Year: parseInt(year),
                        Light: light,
                        Severity: avgSeverity
                    });
                }
            }
        });
    });

    // Get unique years and light conditions from filtered data
    const years = [...new Set(heatmapData.map(d => d.Year))].sort();
    const lightConditions = [...new Set(heatmapData.map(d => d.Light))].sort();

    const x = d3.scaleBand()
        .range([0, width])
        .domain(years)
        .padding(0.05);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(lightConditions)
        .padding(0.05);

    const color = d3.scaleLinear()
        .range(["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"])
        .domain([0, 1, 2, 3, 4]);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.9)")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none");

    // Create cells only for existing data
    const cells = svg.selectAll(".cell")
        .data(heatmapData)
        .join("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.Year))
        .attr("y", d => y(d.Light))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.Severity))
        .style("stroke", "#fff")
        .style("stroke-width", 1);

    // Add hover effects
    cells.on("mouseover", (event, d) => {
        tooltip.style("opacity", 0.9)
            .html(`
                <strong>Year:</strong> ${d.Year}<br>
                <strong>Light:</strong> ${d.Light}<br>
                <strong>Severity:</strong> ${d.Severity.toFixed(2)}
            `)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

    svg.append("g")
        .call(d3.axisLeft(y));

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Accident Severity by Year and Light Condition");

    // Add legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append("g")
        .attr("transform", `translate(${width - legendWidth},${height + 60})`);

    const legendScale = d3.scaleLinear()
        .domain([0, 4])
        .range([0, legendWidth]);

    legend.selectAll("rect")
        .data(color.range())
        .join("rect")
        .attr("x", (d, i) => i * (legendWidth / 5))
        .attr("width", legendWidth / 5)
        .attr("height", legendHeight)
        .style("fill", d => d);

    legend.append("g")
        .attr("transform", `translate(0,${legendHeight})`)
        .call(d3.axisBottom(legendScale)
            .tickValues([0, 1, 2, 3, 4])
            .tickFormat(d => ["No Apparent", "Possible", "Minor", "Serious", "Fatal"][d]))
        .selectAll("text")
        .style("text-anchor", "middle");
});