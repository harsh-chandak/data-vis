document.addEventListener('DOMContentLoaded', function () {
    const svgWidth = 800, svgHeight = 600;
    const svg = d3.select("#splom-svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    d3.csv("final.csv").then(rawData => {
        // Step 1: Define a mapping of variations to standard brand names
        const brandMappings = {
            "CHEVROLET": ["CHEVY", "CHEV", "CHEVORLET"],
            "MERCEDES-BENZ": ["MERCEDES", "MERCEDES BENZ", "MERCEDEZ", "MERZ", "MERC"],
            "TOYOTA": ["TOY", "TOYO", "TOYT", "TOYTA"],
            "NISSAN": ["NISS"],
            "HONDA": ["HOND"],
            "HYUNDAI": ["HYUND", "HYUNDIA", "HYUN"],
            "VOLKSWAGEN": ["VW", "VOLK", "VOLKS", "VOLKSWAGON"],
            "LEXUS": ["LEXS", "LEXU"],
            "SUBARU": ["SUBA"],
            "INFINITI": ["INFI", "INFINITY"],
            "ACURA": ["ACUR"],
            "BUICK": ["BUIC"],
            "MAZDA": ["MAZD"],
            "DODGE": ["DODG"],
            "LAND ROVER": ["LANDROVER"],
            "THOMAS BUILT": ["THMS", "THOM", "THOMAS"],
            "GILLIG": ["GILL", "GILG"],
            "FREIGHTLINER": ["FRHT"],
            "CADILLAC": ["CADI"],
            "PONTIAC": ["PONT"],
            "VOLVO": ["VOLV"],
            "TESLA": ["TESL"],
            "PORSCHE": ["PORS"],
            "UNKNOWN": ["UNK"],
            "HARLEY DAVIDSON": ["SPAR"],
            "MITSUBISHI": ["MITS"],
            "LINCOLN": ["LINC"]
            // Add more mappings as needed
        };

        // Reverse the mapping for easier lookup
        const reverseMapping = Object.entries(brandMappings).reduce((acc, [key, values]) => {
            values.forEach(value => acc[value.toUpperCase()] = key);
            acc[key.toUpperCase()] = key; // Include the standard name as well
            return acc;
        }, {});

        // Step 2: Normalize car brands in the data
        const normalizedData = rawData.map(record => {
            const originalBrand = record["vehicle_make"]?.toUpperCase() || "UNKNOWN";
            record["vehicle_make"] = reverseMapping[originalBrand] || originalBrand; // Map or keep original
            return record;
        });

        // Group and process as needed
        const groupedData = d3.group(normalizedData, d => d["vehicle_make"]);

        // Process each group to calculate required values
        const processedData = Array.from(groupedData, ([brand, records]) => {
            const totalAccidents = records.length;
            if (totalAccidents <= 15) return null; // Exclude small groups

            const faultCount = records.filter(r => r["driver_at_fault"] === "Yes").length;
            const noFaultCount = totalAccidents - faultCount;

            return {
                brand: brand,
                accidents: totalAccidents,
                fault: faultCount,
                noFault: noFaultCount
            };
        }).filter(d => d !== null);

        console.log(processedData)

        // Step 3: Create a hierarchical layout for bubbles
        const pack = d3.pack()
            .size([svgWidth, svgHeight])
            .padding(5);

        const root = d3.hierarchy({ children: processedData })
            .sum(d => d.accidents);

        const nodes = pack(root).leaves();

        // Draw bubbles
        const bubbles = svg.selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        // Outer circle for bubble
        bubbles.append("circle")
            .attr("r", d => d.r)
            .attr("fill", "lightblue")
            .attr("stroke", "steelblue");

        // Embedded pie charts
        bubbles.each(function (d) {
            const arcGen = d3.arc()
                .innerRadius(0)
                .outerRadius(d.r);

            const pieGen = d3.pie()
                .value(d => d.value);

            const pieData = pieGen([
                { value: d.data.fault, label: "At Fault" },
                { value: d.data.noFault, label: "Not at Fault" }
            ]);

            d3.select(this).selectAll("path")
                .data(pieData)
                .enter().append("path")
                .attr("d", arcGen)
                .attr("fill", (d, i) => i === 0 ? "red" : "green");
        });

        // Add labels
        bubbles.append("text")
            .attr("dy", ".3em")
            .style("text-anchor", "middle")
            .style("font-size", "10px")
            .text(d => d.data.brand);
    });
});
