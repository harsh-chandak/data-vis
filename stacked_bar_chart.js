document.addEventListener('DOMContentLoaded', function () {
    const margin = { top: 40, right: 20, bottom: 50, left: 60 }
    const chart_width = 300 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom
    const total_width = chart_width * 2 + margin.left + margin.right
    const total_height = height * 2 + margin.top + margin.bottom

    const svg = d3.select("#stacked-bar-chart-svg")
        .attr("width", total_width + 100)
        .attr("height", total_height + margin.top + margin.bottom + 100)

    d3.csv("./final.csv", row => ({
        weather: row.weather,
        surface_condition: row.surface_condition,
        light: row.light,
        driver_at_fault: String(row.driver_at_fault).trim().toLowerCase() === 'no' ? false : true
    })).then(data => {
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

        function createChart(data, x_offset, y_offset, title, condition_type, scale_factor = 1) {
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

            const color_scale = d3.scaleOrdinal()
                .domain(categories)
                .range(d3.schemeTableau10)

            const stack = d3.stack()
                .keys(categories)
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

            chart_group.append("g")
                .call(d3.axisLeft(y_scale))

            chart_group.selectAll(".layer")
                .data(stacked_data)
                .enter().append("g")
                .attr("fill", d => color_scale(d.key))
                .selectAll("rect")
                .data(d => d)
                .enter().append("rect")
                .attr("x", d => x_scale(d.data[0]))
                .attr("y", d => y_scale(d[1]) * scale_factor)
                .attr("height", d => (y_scale(d[0]) - y_scale(d[1])) * scale_factor)
                .attr("width", x_scale.bandwidth())
        }

        function createLegend(svg, categories, color_scale, x_offset, y_offset) {
            const legend_group = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${x_offset}, ${y_offset})`)

            categories.forEach((category, index) => {
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
            })
        }

        createChart(at_fault_formatted_data, 0, 0, "Drivers At Fault - Common", "common")
        createChart(at_fault_formatted_data, 0, height + 100, "Drivers At Fault - Rare", "rare")
        createChart(not_at_fault_formatted_data, chart_width + 100, 0, "Drivers Not At Fault - Common", "common")
        createChart(not_at_fault_formatted_data, chart_width + 100, height + 100, "Drivers Not At Fault - Rare", "rare")

        const all_categories = Array.from(new Set(at_fault_formatted_data.map(d => d.light)))
        const color_scale = d3.scaleOrdinal()
            .domain(all_categories)
            .range(d3.schemeTableau10)

        createLegend(svg, all_categories, color_scale, total_width - 150, margin.top)

        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", total_width / 4)
            .attr("y", total_height + margin.top + 50)
            .style("font-size", "16px")
            .text("Driver's Fault: Yes")
            .attr("fill", "white")

        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", (3 * total_width) / 4)
            .attr("y", total_height + margin.top + 50)
            .style("font-size", "16px")
            .text("Driver's Fault: No")
            .attr("fill", "white")

        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(-90)`)
            .attr("x", -total_height / 4)
            .attr("y", margin.left - 40)
            .style("font-size", "16px")
            .text("Common Weather Conditions")
            .attr("fill", "white")

        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(-90)`)
            .attr("x", -((3 * total_height) / 4))
            .attr("y", margin.left - 40)
            .style("font-size", "16px")
            .text("Rare Weather Conditions")
            .attr("fill", "white")
    })
})
