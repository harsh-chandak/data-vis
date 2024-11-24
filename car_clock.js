
/*
    1. fix injury severity types in lables, proper word and rank wise -- done
    2. transitions
    3. 
*/

var spiderData = [];
var locationInjuryCountMap = new Map(); //to show on hover 
var noOfAccidentsMap = new Map(); //to show on hover 
var selectedVehicleBodyType = "ALL";
var parsedData;
var radarLine; 
var cfg;
var rScale;
var angleSlice;
var g;

const INJURY_SEVERITY = 'injury_severity';
const VEHICLE_FIRST_IMPACT_LOCATION = 'vehicle_first_impact_location';
const VEHICLE_BODY_TYPE = 'vehicle_body_type';
const directions = new Map([
    ['twelve', 'XII'], 
    ['one', 'I'], 
    ['two', 'II'], 
    ['three', 'III'], 
    ['four', 'IV'], 
    ['five', 'V'], 
    ['six', 'VI'], 
    ['seven', 'VII'], 
    ['eight', 'VIII'], 
    ['nine', 'IX'], 
    ['ten', 'X'], 
    ['eleven', 'XI']
]);
const injurySeverityMap = new Map([
    ['fatal', {value:6, label: 'Fatal Injury'}],
    ['serious', {value:5, label: 'Serious Injury'}], 
    ['minor', {value:4, label: 'Minor Injury'}], 
    ['possible', {value:3, label: 'Possible Injury'}], 
    ['no', {value:2, label: 'No Injury'}], 
    ['unknown', {value:1, label: 'Unknown Injury'}] 
]);

$(document).ready(() => {

    d3.csv('final.csv', d => {
        let obj = null;
        for (const key in d) {
            if((key === INJURY_SEVERITY || key === VEHICLE_FIRST_IMPACT_LOCATION || key === VEHICLE_BODY_TYPE) && Object.prototype.hasOwnProperty.call(d, key) && d[key]){
                if(obj == null){
                    obj = {};
                }
                obj[key] = d[key];
            }
        }
        return obj;

    }).then(data =>{

        parsedData = data;

        drawSpiderChart();
        VehicleBodyTypeWheel();
    });
});

function filterData(){

    let noOfAccidentsData = [];
    noOfAccidentsMap = new Map();
    locationInjuryCountMap = new Map();
    let injurySeverityData = [];
    let injuryCountMap = new Map();
    let radarAreaRange = [7, 17];

    parsedData.forEach(d => {
        
        if(d[VEHICLE_FIRST_IMPACT_LOCATION] && (selectedVehicleBodyType === 'ALL' || d[VEHICLE_BODY_TYPE] === selectedVehicleBodyType)){

            let axis = d[VEHICLE_FIRST_IMPACT_LOCATION].split(' ')[0].toLowerCase();
            if(directions.has(axis)){

                //number of accidents
                if(noOfAccidentsMap.has(axis)){
                    noOfAccidentsMap.set(axis, noOfAccidentsMap.get(axis)+1);
                }else{
                    noOfAccidentsMap.set(axis, 1);
                }

                //injury severity
                let injury = Array.from(injurySeverityMap.keys())
                    .map(key => (d[INJURY_SEVERITY] && d[INJURY_SEVERITY].toLowerCase().includes(key) ? key : null))
                    .find(key => key !== null) || 'unknown';

                let injuryKey = axis+'##'+injury;

                if(injuryCountMap.has(injuryKey)){
                    injuryCountMap.set(injuryKey, injuryCountMap.get(injuryKey)+1);
                }else{
                    injuryCountMap.set(injuryKey, 1);
                }
            }
        }
    });

    let countScale = d3.scaleLinear()
        .range(radarAreaRange)
        .domain([d3.min(noOfAccidentsMap.values()), d3.max(noOfAccidentsMap.values())]);

    noOfAccidentsMap.forEach((value, key) => {
        noOfAccidentsData.push({
            axis: key,
            value: parseInt(countScale(value))
        });
    });

    let injuryAxisCountSumMap = new Map();

    injuryCountMap.forEach((value, key) => {

        let axis = key.split('##')[0];
        let injury = key.split('##')[1];

        let product = value * injurySeverityMap.get(injury).value;

        if(injuryAxisCountSumMap.has(axis)){
            let sum = injuryAxisCountSumMap.get(axis).sum + product;
            let count = injuryAxisCountSumMap.get(axis).count + value;
            injuryAxisCountSumMap.set(axis, {
                count: count,
                sum: sum
            });
        }else{
            injuryAxisCountSumMap.set(axis, {
                count: value,
                sum: product
            });
        }
        
        if (locationInjuryCountMap.has(axis)) {
            let obj = locationInjuryCountMap.get(axis);
            obj[injury] = value;
        } else {
            let obj = {};
            obj[injury] = value;
            locationInjuryCountMap.set(axis, obj);
        }
    });

    for (let [key, value] of injuryAxisCountSumMap.entries()) {
        injurySeverityData.push({
            axis: key,
            value: (value.sum / (value.count))
        });
    }

    noOfAccidentsData.forEach(d => d.webType = 'count');
    injurySeverityData.forEach(d => d.webType = 'injury');

    spiderData.push(noOfAccidentsData);
    spiderData.push(injurySeverityData);

    let directionsArr = Array.from(directions.keys());

    spiderData.forEach(arr => {
        arr.sort((a,b) => directionsArr.indexOf(a.axis) - directionsArr.indexOf(b.axis));
    });

    let severityScale = d3.scaleLinear()
        .range(radarAreaRange)
        .domain([d3.min(spiderData[1].map(d => d.value)), d3.max(spiderData[1].map(d => d.value))]);

    spiderData[1].forEach(d => d.value = parseInt(severityScale(d.value)));

    console.log(spiderData);
    console.log(locationInjuryCountMap);
    console.log(noOfAccidentsMap);
}

function drawSpiderChart(){

    filterData();
    RadarChart();
}

function RadarChart() {
	cfg = {
	 w: 500,				//Width of the circle
	 h: 500,				//Height of the circle
	 margin: {top: 60, right: 60, bottom: 60, left: 60}, //The margins of the SVG
	 levels: 1,				//How many levels or inner circles should there be drawn
	 maxValue: 0, 			//What is the value that the biggest circle will represent
	 labelFactor: 1.07, 	//How much farther than the radius of the outer circle should the labels be placed
	 wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
	 opacityArea: 0.4, 	//The opacity of the area of the blob
	 dotRadius: 5, 			//The size of the colored circles of each blog
	 opacityCircles: 0.1, 	//The opacity of the circles of each blob
	 strokeWidth: 2, 		//The width of the stroke around each blob
	 roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
	 color: d3.scaleOrdinal().range(['#1E90FF', '#FF8C00'])	//Color function
	};
	
	//Put all of the options into a variable called cfg
	if('undefined' !== typeof options){
	  for(var i in options){
		if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
	  }//for i
	}//if
	
	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	var maxValue = Math.max(cfg.maxValue, d3.max(spiderData, function(i){return d3.max(i.map(function(o){return o.value;}))}))+1;
		
	var allAxis = (spiderData[0].map(function(i, j){return i.axis})),	//Names of each axis
		total = allAxis.length,					//The number of different axes
		radius = Math.min(cfg.w/2, cfg.h/2); 	//Radius of the outermost circle
    angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
	
	//Scale for the radius
	rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);

	//Remove whatever chart with the same id/class was present before
	d3.select('#car-clock-svg').select("svg").remove();
	
	//Initiate the radar chart SVG
	let svg = d3.select('#car-clock-svg')
			.attr("class", "radar_"+'car-clock-svg');

	//Append a g element		
	g = svg.append("g")
			.attr("transform", "translate(" + ((cfg.w/2 + cfg.margin.left)+100) + "," + ((cfg.h/2 + cfg.margin.top)+40) + ")");
	
	//Filter for the outside glow
	var filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');
	
	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", (d, i) => radius/cfg.levels*d)
		.style("fill", "#BCC6CC")
		.style("stroke", "#808080")
		.style("fill-opacity", 0.06)
		.style("filter" , "url(#glow)"); 

    g.append("image")
        .attr("xlink:href", "grey_car_no_bg.png")  // Replace with your background image path
        .attr("x", -cfg.w/2)
        .attr("y", -cfg.h/2)
        .attr("width", cfg.w)
        .attr("height", cfg.h)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("opacity", "0.4");
	
	//Create the straight lines radiating outward from the center
	var axis = axisGrid.selectAll(".axis")
		.data(allAxis)
		.enter()
		.append("g")
		.attr("class", "axis");
	//Append the lines
	axis.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", (d, i) => rScale(maxValue) * Math.cos(angleSlice*i - Math.PI/2 - Math.PI/12))
		.attr("y2", (d, i) => rScale(maxValue) * Math.sin(angleSlice*i - Math.PI/2 - Math.PI/12))
		.attr("class", "line")
		.style("stroke", "#808080")
		.style("stroke-width", "2px");

	//Append the labels at each axis
	axis.append("text")
		.attr("class", "legend")
		.style("font-size", "20px")
        .style('font-weight', 'bold')
		.attr("text-anchor", "middle")
		.attr("dy", "0.35em")
        .attr("fill", "#FFFFFF")
		.attr("x", (d, i) => rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2))
		.attr("y", (d, i) => rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2))
		.text(d => directions.get(d))
		.call(wrap, cfg.wrapWidth);

    axisGrid.selectAll(".levels2")
        .data(d3.range(1,(cfg.levels+1)).reverse())
        .enter()
        .append("path")
        .attr("class", "gridCircle")
        .attr("d", d => {
            let outerRadius = (radius/cfg.levels*d) + 35;
            let innerRadius = radius/cfg.levels*d; // Adjust the thickness by changing this value
            return d3.arc()({
                innerRadius: innerRadius,
                outerRadius: outerRadius,
                startAngle: 0,
                endAngle: Math.PI * 2
            });
        })
        .style("fill", "#BCC6CC")  // Metallic silver fill
        .style("stroke", "#9BA4AA") // Darker silver stroke
        .style("fill-opacity", 0.15)
        .style("filter", "url(#glow)");
    
	
	//The radial line function
	radarLine = d3.lineRadial().curve(d3.curveBasisClosed)
		.radius(function(d) { return rScale(d.value); })
		.angle(function(d,i) {	return i*angleSlice; });
		
	if(cfg.roundStrokes) {
		radarLine.curve(d3.curveCardinalClosed);
	}
		
    //Wraps SVG text	
    function wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.4, // ems
                y = text.attr("y"),
                x = text.attr("x"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
                
            while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
            }
        });
    }//wrap	
	
    plotRadarChartData();
}

function plotRadarChartData(){

    // Append the backgrounds
    let radarArea = g.selectAll(".radarArea")
        .data(spiderData);

    radarArea.enter()
        .append("path")
        .merge(radarArea)
        .attr("class", "radarArea")
        .style("fill", (d, i) => cfg.color(i))
        .style("fill-opacity", cfg.opacityArea)
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", (d, i) => cfg.color(i))
        .on('mouseover', function (d,i){
            // Dim all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", 0.1); 
            // Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);	
        })
        .on('mouseout', function(){
            // Bring back all blobs
            d3.selectAll(".radarArea")
                .transition().duration(200)
                .style("fill-opacity", cfg.opacityArea);
        })
        .transition()
        .duration(1000)
        .attr("d", (d, i) => radarLine(d));	

    // Append the circles
    let flatMap = spiderData.flatMap((d, i) => d.map(v => ({
        value: v.value, 
        color: cfg.color(i),
        axis: v.axis,
        webType: v.webType
    })));
    let radarCircle = g.selectAll('[class*="radarInvisibleCircle_"]')
        .data(flatMap);

    radarCircle.enter()
        .append("circle")
        .merge(radarCircle)
        .attr("class", (d, i) => "radarInvisibleCircle_"+d.webType)
        .attr("r", cfg.dotRadius)
        .style("fill", d => d.color)
        .attr('stroke-width', cfg.strokeWidth + "px")
        .attr('stroke', d => d.color)
        .style("filter" , "url(#glow)")
        .style("pointer-events", "all")
        .on("mouseover", function(e,i) {
            newX =  parseFloat(d3.select(this).attr('cx'))+ 10;
            newY =  parseFloat(d3.select(this).attr('cy')) - 45;

            let webType = e.target.className.baseVal.split('_')[1];

            let tooltipHtml = '';
            if(webType === 'count'){
                tooltip.attr("width", 170)
                    .attr("height", 30)
                    .attr("rx", 10)      // Rounded corners
                    .attr("ry", 10);
                tooltipHtml = '<tspan style="font-weight:bold;">No. of Accidents:</tspan> '+noOfAccidentsMap.get(i.axis);
            }else{
                tooltip.attr("width", 150)
                    .attr("height", 160)
                    .attr("rx", 10)      // Rounded corners
                    .attr("ry", 10);
                tooltipHtml = `<tspan style="font-weight:bold;">Injury Severity Level</tspan> <tspan x="${newX+10}" dy="1.5em" style="font-weight:bold;">and No. of Accidents:</tspan>`;
                let sortedArr = Object.entries(locationInjuryCountMap.get(i.axis)).sort((a,b) => a[1]-b[1]);
                let sum = 0;
                let count = 0;
                sortedArr.forEach(element => {
                    sum += element[1]*injurySeverityMap.get(element[0]).value;
                    count += element[1];
                    tooltipHtml += `<tspan x="${newX+10}" dy="1.5em">${injurySeverityMap.get(element[0]).label} (${injurySeverityMap.get(element[0]).value}): ${element[1]}</tspan>`;
                });
                let wavg = Number((sum/count).toFixed(2));
                tooltipHtml += `<tspan style="font-weight:bold;" x="${newX+10}" dy="1.5em">Severity Average: ${wavg}</tspan>`;
            }

            tooltip.raise(); 
            tooltipText.raise(); 

            tooltipText.html(tooltipHtml)
                .attr('x', newX+10)
                .attr('y', newY+20)
                .style("opacity", 1);

            tooltip.attr('x', newX)
                .attr('y', newY)
                .transition().duration(200)
                .style('opacity', 1);
        })
        .on("mouseout", function(e, i){
            tooltip.style("opacity", 0);
            tooltipText.html('');
        })
        .transition()
        .duration(1000)
        .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice*(i % (spiderData[0].length)) - Math.PI/2))
        .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice*(i % (spiderData[0].length)) - Math.PI/2));

    radarCircle.exit()
        .transition()
        .duration(1000)
        .remove();

    var tooltip = g.append("rect")
        .attr("class", 'tooltip-box')
        .attr("width", 220)
        .attr("height", 30)
        .attr("rx", 10)      // Rounded corners
        .attr("ry", 10)
        .style("fill", "white")
        .style("stroke", '#808080')
        .style("stroke-width", 2)
        .style("position", "absolute")
        .style("background-color", "#f8f9f9")
        .style("padding", "5px")
        .style('opacity', 0);

    var tooltipText = g.append("text")
        .attr("class", 'tooltip-text')
        .style("font-size", "12px")
        .style("fill", "black")
        .style("color", 'black')
        .attr('fill', 'black')
        .style("opacity", 0);

}

function VehicleBodyTypeWheel(){

    // Initial data
    const options = [];
    options.push(' ');
    options.push('ALL');
    let sortedArr = [...new Set(parsedData.map(d => d[VEHICLE_BODY_TYPE]))].sort();
    options.push(...sortedArr);
    options.push(' ');
    let startIndex = 0;  // Starting index of the visible window
    const visibleCount = 3;

    let svg = d3.select('#car-clock-svg')
        .select('g');

    // Create a group for all elements
    const group = svg.append('g')
        .attr('transform', 'translate(160, -150)');

    group.append('text')
        .text('Vehicle Body Type')
        .attr('fill', 'white')
        .attr('x', 190)
        .attr('y', 50)
        .style('font-weight', 'bold');

    // Create circular wheel background
    group.append("rect")
        .attr("x", 130)      // 150 - width/2 to center
        .attr("y", 110)      // 150 - height/2 to center
        .attr("width", 40)   // Similar scale to the circle (diameter)
        .attr("height", 80)  // Making it square
        .attr("rx", 20)    // Horizontal corner radius
        .attr("ry", 20)
        .style("fill", "#BCC6CC")  // Metallic silver fill
        .style("stroke", "#808080") // Darker silver stroke
        .style("stroke-width", "2px")
        .style("fill-opacity", 0.1)
        .style("filter", "url(#glow)");

    // Add horizontal lines inside rectangle
    group.selectAll(".divider")
        .data([1, 2, 3])  // For two lines dividing into three sections
        .enter()
        .append("line")
        .attr("class", "divider")
        .attr("x1", 130)  // Start from left edge of rectangle
        .attr("x2", 170)  // End at right edge of rectangle
        .attr("y1", d => 110 + (d * 80/4))  // Divide height into 3 equal parts
        .attr("y2", d => 110 + (d * 80/4))
        .attr("stroke", "#808080")
        .attr("stroke-width", 1);


    // Create arrows
    const arrowUp = group.append("path")
        .attr("d", "M150,80 L130,100 L170,100 Z")
        .attr("fill", "#333")
        .style("opacity", 0.7)
        .style("cursor", "pointer");

    const arrowDown = group.append("path")
        .attr("d", "M150,220 L130,200 L170,200 Z")
        .attr("fill", "#333")
        .style("opacity", 0.7)
        .style("cursor", "pointer");

    // Create text elements
    group.selectAll(".option")
        .data(options)
        .join("text")
        .attr("class", "option")
        .attr("x", 190)
        .attr("y", (d, i) => 100 + i*50)
        .text(d => d)
        .style("font-size", "16px")
        .attr('fill', 'white')
        .style("opacity", (d, i) => i === startIndex ? 1 : 0.3);

    function updateVisibleOptions() {
        // Get current visible options
        const visibleOptions = options.slice(startIndex, startIndex + visibleCount);

        // Bind data to the selection
        const texts = group.selectAll(".option").data(visibleOptions);

        // Handle exit (remove elements not in the data)
        texts.exit()
        .remove();

        // Handle enter (create new elements for new data)
        const enter = texts.enter()
            .append("text")
            .attr("class", "option")
            .attr("x", 190)
            .style("opacity", 0)
            .text(d => d)
            .style("font-size", "16px");

        // Handle update (modify existing elements)
        const update = texts
            .attr("x", 190) // Update attributes (optional, ensures consistency)
            .text(d => d); // Update text for existing elements

        // Merge enter and update for transitions
        enter.merge(update)
            .transition()
            .duration(1000)
            .attr("y", (d, i) => 100 + i*50)
            .style("opacity", (d, i) => i === Math.floor(visibleCount / 2) ? 1 : 0.3);

        selectedVehicleBodyType = visibleOptions[Math.floor(visibleOptions.length / 2)];
    }

    // Arrow click handlers
    function moveDown() {
        startIndex = Math.max(0, startIndex - 1);
        updateVisibleOptions();
        updateSpiderChart();
    }

    function moveUp() {
        startIndex = Math.min(options.length - visibleCount, startIndex + 1);
        updateVisibleOptions();
        updateSpiderChart();
    }

    // Add click events to arrows
    arrowUp.on("click", moveUp);
    arrowDown.on("click", moveDown);

    // Add hover effects
    arrowUp.on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("fill", "#666");
    })
    .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("fill", "#333");
    });

    arrowDown.on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("fill", "#666");
    })
    .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("fill", "#333");
    });

    // Initial render
    updateVisibleOptions();

}

function updateSpiderChart(){

    filterData();
    plotRadarChartData();
}