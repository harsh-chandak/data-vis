
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .tooltip {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    pointer-events: none;
  }
  .details-container {
    background-color: #2c3e50;
    color: white;
    padding: 20px;
    margin: 20px;
    border-radius: 8px;
    max-height: 500px;
    overflow-y: auto;
  }
  .details-container table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }
  .details-container th, .details-container td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #34495e;
  }
  .details-container th {
    background-color: #34495e;
    position: sticky;
    top: 0;
  }
  .year-select {
    margin: 10px;
    padding: 5px;
    font-size: 14px;
    background-color: #2c3e50;
    color: white;
    border: 1px solid #34495e;
    border-radius: 4px;
  }
  .comparison-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
`;
document.head.appendChild(styleSheet);

const margin = {top: 50, right: 100, bottom: 100, left: 100};
const singleWidth = 500;
const tWd = (singleWidth + margin.left + margin.right) * 2;
const height = 600 - margin.top - margin.bottom; 
const minTWd = 20;
const minTHt = 40;

function delnan(light) {
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

function showDetails(d, originalData, selectedYear) {
    const detailsDiv = d3.select("#details");
    detailsDiv.html("");

    const filteredData = originalData.filter(item => {
        const itemYear = new Date(item.crash_date_time).getFullYear();
        return (selectedYear === "All" || itemYear == selectedYear) &&
               delnan(item.light) === d.light &&
               item.injury_severity === d.severity;
    });

    const container = detailsDiv.append("div")
        .attr("class", "details-container");

    
    container.append("h3")
        .text(`Details for ${d.light} - ${d.severity} (${selectedYear})`);

    const stats = container.append("div")
        .attr("class", "stats-container");

    stats.append("p")
        .text(`Total Accidents: ${filteredData.length}`);

    
    const timeData = d3.rollup(filteredData,
        v => v.length,
        d => new Date(d.crash_date_time).getHours()
    );

    const timeChart = container.append("div")
        .attr("class", "time-distribution");
    
    
    const table = container.append("table");
    const headers = ["Date", "Time", "Vehicle Make", "Vehicle Model", "Weather", "Surface Condition"];
    
    table.append("thead")
        .append("tr")
        .selectAll("th")
        .data(headers)
        .enter()
        .append("th")
        .text(d => d);

    const rows = table.append("tbody")
        .selectAll("tr")
        .data(filteredData)
        .enter()
        .append("tr");

    rows.selectAll("td")
        .data(row => [
            new Date(row.crash_date_time).toLocaleDateString(),
            new Date(row.crash_date_time).toLocaleTimeString(),
            row.vehicle_make,
            row.vehicle_model,
            row.weather,
            row.surface_condition
        ])
        .enter()
        .append("td")
        .text(d => d);
}

function processData(data, selectedYear) {
    const lightSeverityMap = {};
    data.forEach(d => {
      const year = new Date(d.crash_date_time).getFullYear();
      if (selectedYear === "All" || year == selectedYear) {
        const light = delnan(d.light);
        const severity = d.injury_severity;
        if (!lightSeverityMap[light]) {
          lightSeverityMap[light] = { total: 0, severities: {} };
        }
        if (!lightSeverityMap[light].severities[severity]) {
          lightSeverityMap[light].severities[severity] = 0;
        }
        lightSeverityMap[light].severities[severity]++;
        lightSeverityMap[light].total++;
      }
    });
    return lightSeverityMap;
  }
  
  function createViz(data) {
    const years = ["All", ...new Set(data.map(d => new Date(d.crash_date_time).getFullYear()))].sort();
  
    
    const yearSelects = d3.selectAll("#year-select-1, #year-select-2")
      .attr("class", "year-select")
      .selectAll("option")
      .data(years)
      .enter()
      .append("option")
      .text(d => d)
      .attr("value", d => d);
  
      function mosaicChart(svg, processedData, xOffset, selectedYear, originalData) {
        const totalAccidents = d3.sum(Object.values(processedData), d => d.total);
        const mosaicData = [];
        let yPosition = 0;
    
        
        Object.entries(processedData)
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([light, data]) => {
                const tHt = Math.max(minTHt, (data.total / totalAccidents) * height);
                let xPosition = 0;
                
                Object.entries(data.severities)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .forEach(([severity, count]) => {
                        const tWd = Math.max(minTWd, (count / data.total) * singleWidth);
                        mosaicData.push({
                            light: light,
                            severity: severity,
                            x: xPosition,
                            y: yPosition,
                            width: tWd,
                            height: tHt,
                            count: count,
                            percentage: (count / totalAccidents * 100).toFixed(1)
                        });
                        xPosition += tWd;
                    });
                yPosition += tHt;
            });
  
      const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + xOffset},${margin.top})`);
  
      const color = d3.scaleOrdinal()
        .domain([
          "NO APPARENT INJURY",
          "POSSIBLE INJURY",
          "SUSPECTED MINOR INJURY",
          "SUSPECTED SERIOUS INJURY",
          "FATAL INJURY"
        ])
        .range([
          "#2ECC71",
          "#F1C40F",
          "#E67E22",
          "#E74C3C",
          "#2C3E50"
        ]);
  
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
  
        chartGroup.selectAll("rect")
        .data(mosaicData)
        .enter()
        .append("rect")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", d => d.width)
        .attr("height", d => d.height)
        .attr("fill", d => color(d.severity))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          tooltip.transition()
            .duration(200)
            .style("opacity", .9);
          tooltip.html(`
            Light Condition: ${d.light}<br>
            Severity: ${d.severity}<br>
            Count: ${d.count}<br>
            Percentage: ${d.percentage}% of total accidents
          `)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        })
        .on("click", (event, d) => {
          showDetails(d, originalData, selectedYear);
        });
  
      
      chartGroup.selectAll(".count-label")
        .data(mosaicData)
        .enter()
        .append("text")
        .attr("class", "count-label")
        .attr("x", d => d.x + d.width / 2)
        .attr("y", d => d.y + d.height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text(d => d.count > 0 ? d.count : "0")
        .style("font-size", "12px")
        .style("fill", "white")
        .style("pointer-events", "none");
  
      
      chartGroup.selectAll(".light-label")
        .data(Object.keys(processedData))
        .enter()
        .append("text")
        .attr("class", "light-label")
        .attr("x", -10)
        .attr("y", (d, i) => {
          const prevHeights = Object.entries(processedData)
            .slice(0, i)
            .reduce((sum, [_, data]) => sum + Math.max(minTHt, (data.total / totalAccidents) * height), 0);
          return prevHeights + Math.max(minTHt, (processedData[d].total / totalAccidents) * height) / 2;
        })
        .attr("text-anchor", "end")
        .text(d => d)
        .style("font-size", "12px")
        .style("fill", "white");
  
     
      chartGroup.append("text")
        .attr("x", singleWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .text(`Distribution (${selectedYear})`);
  
      
chartGroup.append("text")
.attr("x", singleWidth / 2)
.attr("y", height + 120)  
.attr("text-anchor", "middle")
.style("font-size", "14px")
.style("fill", "white")
.text("Injury Severity");


chartGroup.append("text")
.attr("transform", "rotate(-90)")
.attr("x", -height / 2)
.attr("y", -80)  
.attr("text-anchor", "middle")
.style("font-size", "14px")
.style("fill", "white")
.text("Light Condition");
  
      
      if (xOffset === 0) {
        const legend = svg.append("g")
          .attr("transform", `translate(${tWd - margin.right}, ${height - 150})`);
  
        legend.selectAll("rect")
          .data(color.domain())
          .enter()
          .append("rect")
          .attr("y", (d, i) => i * 25)
          .attr("width", 18)
          .attr("height", 18)
          .attr("fill", d => color(d))
          .attr("stroke", "#000")
          .attr("stroke-width", 0.5);
  
        legend.selectAll("text")
          .data(color.domain())
          .enter()
          .append("text")
          .attr("x", 25)
          .attr("y", (d, i) => i * 25 + 14)
          .text(d => d.toLowerCase())
          .style("font-size", "12px")
          .style("fill", "white");
      }
    }
  
    function updateViz(selectedYear1, selectedYear2) {
      const processedData1 = processData(data, selectedYear1);
      const processedData2 = processData(data, selectedYear2);
  
      d3.select("#heatmap-svg").selectAll("*").remove();
  
      const svg = d3.select("#heatmap-svg")
        .attr("width", tWd)
        .attr("height", height + margin.top + margin.bottom);
  
      mosaicChart(svg, processedData1, 0, selectedYear1, data);
      mosaicChart(svg, processedData2, singleWidth + margin.left, selectedYear2, data);
    }
  
    d3.select("#year-select-1").on("change", function() {
      updateViz(this.value, d3.select("#year-select-2").property("value"));
    });
  
    d3.select("#year-select-2").on("change", function() {
      updateViz(d3.select("#year-select-1").property("value"), this.value);
    });
  
    updateViz("All", "All");
  }
  
  d3.csv("final.csv").then(function(data) {
    createViz(data);
  });