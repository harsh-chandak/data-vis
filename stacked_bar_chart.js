document.addEventListener('DOMContentLoaded', function () {
    const margin = { top: 40, right: 20, bottom: 100, left: 80 }
    const chart_width = 300 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom
    const total_width = chart_width * 2 + margin.left + margin.right
    const total_height = height * 2 + margin.top + margin.bottom

    const svg = d3.select("#stacked-bar-chart-svg")
        .attr("width", total_width + 100)
        .attr("height", total_height + margin.top + margin.bottom + 100)
        .style("margin-bottom", "0px")

    d3.csv("./final.csv", row => ({
        weather: row.weather,
        surface_condition: row.surface_condition,
        light: row.light,
        driver_at_fault: String(row.driver_at_fault).trim().toLowerCase() === 'no' ? false : true
    })).then(data => {
        const dataset_arr = data
        const at_fault_data = data.filter(row => row.driver_at_fault === true)
        const not_at_fault_data = data.filter(row => row.driver_at_fault === false)

        function getWeatherAndLight(value) {
            let result = { light: "", weather: "" }
            const dark = ['Dark - Lighted', 'Dark - Not Lighted', 'Dark - Unknown Lighting', 'DARK LIGHTS ON', 'DARK NO LIGHTS', 'DARK -- UNKNOWN LIGHTING']
            const dawn_dusk = ['Dusk', 'Dawn', 'DAWN', 'DUSK']
            const daylight = ['Daylight', 'DAYLIGHT']

            const clear_normal = ['Clear', 'CLEAR', 'Daylight', 'N/A']
            const cloudy = ['Cloudy', 'CLOUDY', 'Overcast']
            const rain = ['Rain', 'RAINING', 'Freezing Rain Or Freezing Drizzle', 'Sleet Or Hail', 'Wintry Mix']
            const low_visibility = ['Fog, Smog, Smoke', 'FOGGY']
            const snow = ['Snow', 'Blowing Snow', 'BLOWING SNOW', 'Blowing Sand, Soil, Dirt', 'Wintry Mix', 'Severe Crosswinds']
            const severe = ['Severe Crosswinds', 'SEVERE WINDS', 'Thunderstorm', 'Hurricane', 'Tornado']

            switch (true) {
                case dark.includes(value.light):
                    result.light = "dark"
                    break
                case dawn_dusk.includes(value.light):
                    result.light = "dawn_dusk"
                    break
                case daylight.includes(value.light):
                    result.light = "daylight"
                    break
                default:
                    result.light = "unknown_light"
            }

            switch (true) {
                case clear_normal.includes(value.weather):
                    result.weather = "clear_normal"
                    break
                case cloudy.includes(value.weather):
                    result.weather = "cloudy"
                    break
                case rain.includes(value.weather):
                    result.weather = "rain"
                    break
                case low_visibility.includes(value.weather):
                    result.weather = "low_visibility"
                    break
                case snow.includes(value.weather):
                    result.weather = "snow"
                    break
                case severe.includes(value.weather):
                    result.weather = "severe"
                    break
                default:
                    result.weather = "unknown_weather"
            }

            return result
        }


        function formatData(input_data) {
            const grouped_data = input_data.map(row => getWeatherAndLight(row))
            const grouped = d3.rollups(
                grouped_data,
                v => v.length,
                d => d.weather,
                d => d.light
            )
            return grouped.flatMap(([weather, light_groups]) =>
                light_groups.map(([light, count]) => ({
                    weather,
                    light,
                    count
                }))
            )
        }

        const at_fault_formatted_data = formatData(at_fault_data)
        const not_at_fault_formatted_data = formatData(not_at_fault_data)

        const common_conditions = ['daylight', 'clear_normal', 'cloudy']
        const rare_conditions = ['severe', 'low_visibility', 'snow']
        const all_categories = Array.from(new Set(at_fault_formatted_data.map(d => d.light)))
        const color_scale = d3.scaleOrdinal()
            .domain(all_categories)
            .range(d3.schemeSet1)
        function createChart(data, x_offset, y_offset, title, condition_type, fault) {
            const filtered_data = data.filter(d =>
                condition_type === "common"
                    ? common_conditions.includes(d.weather)
                    : rare_conditions.includes(d.weather)
            )

            const grouped = d3.group(filtered_data, d => d.weather)
            const categories = Array.from(new Set(filtered_data.map(d => d.light)))

            const x_scale = d3.scaleBand()
                .domain(Array.from(grouped.keys()).sort())
                .range([0, chart_width])
                .padding(0.4)

            const y_scale = d3.scaleLinear()
                .domain([0, d3.max(Array.from(grouped.entries(), ([, items]) =>
                    d3.sum(items.map(item => item.count))
                ))])
                .range([height, 0])


            const stack = d3.stack()
                .keys(all_categories)
                .value(([, items], key) => {
                    const entry = items.find(d => d.light === key)
                    return entry ? entry.count : 0
                })

            const stacked_data = stack(Array.from(grouped.entries()))

            const chart_group = svg.append("g").attr("class", "stacked-bar-chart")
                .attr("transform", `translate(${x_offset + margin.left}, ${y_offset + margin.top})`)

            chart_group.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x_scale))
                .style("opacity", 0)
                .transition()
                .duration(1000)
                .style("opacity", 1)

            chart_group.append("g")
                .call(d3.axisLeft(y_scale))
                .style("opacity", 0)
                .transition()
                .duration(1000)
                .style("opacity", 1)

            const layer = chart_group.selectAll(".layer")
                .data(stacked_data)
                .enter().append("g")
                .attr("fill", d => color_scale(d.key))

            layer.selectAll("rect")
                .data(d => d)
                .enter().append("rect")
                .attr("x", d => x_scale(d.data[0]))
                .attr("width", x_scale.bandwidth())
                .attr("y", height)
                .attr("height", 0)
                .transition()
                .duration(1000)
                .attr("y", d => y_scale(d[1]))
                .attr("height", d => y_scale(d[0]) - y_scale(d[1]))

            const bars = layer.selectAll("rect")

            bars.on("mouseover", function () {
                d3.select(this).transition().duration(300).attr("opacity", 0.7)
            })

            bars.on("mouseleave", function () {
                d3.select(this).transition().duration(300).attr("opacity", 1)
            })

            bars.on("click", function (event, d) {
                const group = d3.select(this.parentNode)
                group.transition()
                    .duration(500)
                    .attr("transform", "translate(20, 0)")
                    .transition()
                    .duration(500)
                    .attr("transform", "translate(0, 0)")
                const weather_condition = d.data[0]
                const light_condition = group.datum().key
                const matchingData = dataset_arr.filter(row => {
                    const conditions = getWeatherAndLight(row)
                    return conditions.weather === weather_condition && conditions.light === light_condition && row.driver_at_fault === fault
                })
                createTreeMap(
                    matchingData,
                    total_width + 20,
                    height + margin.top + 100,
                    chart_width * 0.7, height * 0.5,
                    String(weather_condition).replace(/_/g, " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
                    fault,
                    String(light_condition).replace(/_/g, " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
                )
            })
        }

        function createLegend(svg, categories, color_scale, x_offset, y_offset) {
            const legend_group = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${x_offset}, ${y_offset})`)

            for (let index = 0; index < categories.length; index++) {
                let category = categories[index]
                const legend_row = legend_group.append("g")
                    .attr("transform", `translate(300, ${index * 20})`)

                legend_row.append("rect")
                    .attr("width", 15)
                    .attr("height", 15)
                    .attr("fill", color_scale(category))

                legend_row.append("text")
                    .attr("x", 20)
                    .attr("y", 12)
                    .text(category)
                    .style("font-size", "12px")
                    .attr("fill", "white")
            }
        }

        createChart(at_fault_formatted_data, margin.left, margin.top, "Drivers At Fault - Common", "common", true)
        createChart(at_fault_formatted_data, chart_width + margin.left + 40, margin.top, "Drivers At Fault - Rare", "rare", true)
        createChart(not_at_fault_formatted_data, margin.left, height + margin.top + 60, "Drivers Not At Fault - Common", "common", false)
        createChart(not_at_fault_formatted_data, chart_width + margin.left + 40, height + margin.top + 60, "Drivers Not At Fault - Rare", "rare", false)



        createLegend(svg, all_categories, color_scale, total_width - 150, total_height / 2)

        svg.append("text")
            .attr("class", "column-header")
            .attr("text-anchor", "middle")
            .attr("x", margin.left + chart_width * 1.5 - 150)
            .attr("y", total_height + 80)
            .style("font-size", "16px")
            .style("fill", "white")
            .text("Common Conditions")

        svg.append("text")
            .attr("class", "column-header")
            .attr("text-anchor", "middle")
            .attr("x", margin.left + chart_width * 1.5 + 100)
            .attr("y", total_height + 80)
            .style("font-size", "16px")
            .style("fill", "white")
            .text("Rare Conditions")

        svg.append("text")
            .attr("class", "big-y-axis")
            .attr("text-anchor", "middle")
            .attr("x", margin.top - 100)
            .attr("y", 250)
            .attr("transform", `rotate(-90, ${margin.left - 80}, ${margin.top + height / 2})`)
            .style("font-size", "18px")
            .style("fill", "white")
            .text("Drivers At Fault")

        svg.append("text")
            .attr("class", "big-y-axis")
            .attr("text-anchor", "middle")
            .attr("x", margin.top - 400)
            .attr("y", 250)
            .attr("transform", `rotate(-90, ${margin.left - 80}, ${margin.top + height / 2})`)
            .style("font-size", "18px")
            .style("fill", "white")
            .text("Drivers Not At Fault")

        function addBorder(x, y, width, height) {
            svg.append("rect")
                .attr("x", x)
                .attr("y", y)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", 1)
        }

        addBorder(margin.left + 40, margin.top + 25, chart_width + 50, height + 50)
        addBorder(chart_width + margin.left + 75 + margin.right, margin.top + 25, chart_width + 50, height + 50)
        addBorder(margin.left + 40, height + margin.top + 60 + 20, chart_width + 50, height + 50)
        addBorder(chart_width + margin.left + 75 + margin.right, height + margin.top + 60 + 20, chart_width + 50, height + 50)

        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "white")

        svg.append("defs").append("marker")
            .attr("id", "reverse-arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .append("path")
            .attr("d", "M 0 5 L 5 -5 L 10 5")
            .attr("fill", "white");

        svg.append("defs").append("marker")
            .attr("id", "reverse-arrowhead-h")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .append("path")
            .attr("d", "M 10 -5 L 0 0 L 10 5")
            .attr("fill", "white")

        svg.append("line")
            .attr("x1", margin.left - 50)
            .attr("y1", total_height + 50)
            .attr("x2", total_width + 200)
            .attr("y2", total_height + 50)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("marker-start", "url(#reverse-arrowhead-h)")
            .attr("marker-end", "url(#arrowhead)")

        svg.append("line")
            .attr("x1", margin.left + 15)
            .attr("y1", margin.top - 10)
            .attr("x2", margin.left + 15)
            .attr("y2", total_height + 100)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("marker-start", "url(#reverse-arrowhead)")
            .attr("marker-end", "url(#arrowhead)")

        function createTreeMap(data, x_offset, y_offset, width, height, weather, fault, light) {
            d3.select("#tree-map").remove()
            d3.select("#tree-text").remove()
            d3.select("#stack-container").append("h4").attr("id", "tree-text")
                .html(`Tree-map based on Surface Condition for <strong style="font-weight: bold; font-style: italic; text-decoration: underline;">${weather}</strong> weather, <strong style="font-weight: bold; font-style: italic; text-decoration: underline;">${light}</strong> lights and where driver is <strong style="font-weight: bold; font-style: italic; text-decoration: underline;"> ${fault ? ' At' : ' Not At'} </strong> Fault`)

            const svg = d3.select("#stack-container").append("svg")
                .attr("id", "tree-map")
                .attr("width", width * 2)
                .attr("height", height * 2)
                .style("margin-top", "20px")

            let obj = {}
            data.forEach(d => {
                if (obj[d.surface_condition]) {
                    obj[d.surface_condition]++
                } else {
                    obj[d.surface_condition] = 1
                }
            })

            console.log(obj)
            let treemap_data = Object.keys(obj).map(key => ({
                name: key,
                value: obj[key]
            }))

            const color_scale = d3.scaleOrdinal()
                .domain(Object.keys(obj))
                .range(d3.schemeDark2);

            const treemap = d3.treemap()
                .size([width * 3, height * 3])
                .padding(2)

            const root = d3.hierarchy({ children: treemap_data })
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value)

            treemap(root)

            const chart_group = svg.append("g")
                .attr("class", "tree-map")
                .attr("transform", `translate(${x_offset / 3}, 5)`)

            const nodes = chart_group.selectAll(".node")
                .data(root.leaves())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x0},${d.y0})`)

            nodes.append("rect")
                .attr("width", d => d.x1 - d.x0)
                .attr("height", d => d.y1 - d.y0)
                .attr("fill", d => color_scale(d.data.name))
                .attr("stroke", "white")
                .attr("stroke-width", 1)

            const minArea = 500

            nodes.filter(d => {
                const area = (d.x1 - d.x0) * (d.y1 - d.y0)
                return area > minArea
            })
                .append("text")
                .attr("x", d => (d.x1 - d.x0) / 2)
                .attr("y", d => (d.y1 - d.y0) / 2)
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "8px")
                .text(d => d.data.name)
        }
    })
})
