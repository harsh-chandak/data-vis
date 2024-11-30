
/*
    1. fix injury severity types in lables, proper word and rank wise -- done
    2. transitions -- pending for webs
    3. legend -- done
    4. images
    5. group vehicles -- done
*/

var spiderData = [];
var locationInjuryCountMap = new Map(); //to show on hover 
var noOfAccidentsMap = new Map(); //to show on hover 
var selectedVehicleGroup = "All";
var parsedData;
var radarLine; 
var cfg;
var rScale;
var angleSlice;
var g;
var showCountWeb = true;
var showInjuryWeb = true;

const INJURY_SEVERITY = 'injury_severity';
const VEHICLE_FIRST_IMPACT_LOCATION = 'vehicle_first_impact_location';
const VEHICLE_BODY_TYPE = 'vehicle_body_type';
const VEHICLE_GROUP = 'vehicle_group';
const commonVehicleGroups = new Map([
    ['bus', {
        label: 'Bus',
        types: ['Bus - Transit']
    }],
    ['motorcycle', {
        label: 'Motorcycle',
        types: ['Moped Or motorized bicycle', 'Motorcycle - 2 Wheeled', 'Motorcycle - 3 Wheeled']
    }],
    ['truck', {
        label: 'Truck',
        types: ['Other Trucks', 'Pickup', 'Single-Unit Truck']
    }],
    ['sport', {
        label: 'Sport Vehicle',
        types: ['All-Terrain Vehicle/All-Terrain Cycle (ATV/ATC)', 'Snowmobile', 'Sport Utility Vehicle']
    }],
    ['passenger', {
        label: 'Passenger Vehicle',
        types: ['Station Wagon', 'Van - Passenger (&lt;9 Seats)', 'Passenger Car']
    }],
]);
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
    ['minor', {value:4, label: 'Minor Injury'}]
]);

$(document).ready(() => {

    d3.csv('final.csv', d => {
        let obj = null;
        if(d[INJURY_SEVERITY] === 'Fatal Injury' || d[INJURY_SEVERITY] === 'Suspected Serious Injury' || d[INJURY_SEVERITY] === 'Suspected Minor Injury'){
            for (const key in d) {
                if((key === INJURY_SEVERITY || key === VEHICLE_FIRST_IMPACT_LOCATION || key === VEHICLE_BODY_TYPE) && Object.prototype.hasOwnProperty.call(d, key) && d[key]){
                    
                    if(obj == null){
                        obj = {};
                    }
                    obj[key] = d[key];

                    if(key === VEHICLE_BODY_TYPE){
                        let vehicleGroup = d[key];
                        outerLoop: for (const [k, v] of commonVehicleGroups) {
                            for (const vehicleType of v.types) {
                                if (vehicleType === d[key]) {
                                    vehicleGroup = k;
                                    break outerLoop; 
                                }
                            }
                        }  
                        obj[VEHICLE_GROUP] = vehicleGroup;                      
                    }
                }
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
    spiderData = [];

    parsedData.forEach(d => {
        
        if(d[VEHICLE_FIRST_IMPACT_LOCATION] && (selectedVehicleGroup === 'All' || d[VEHICLE_GROUP] === selectedVehicleGroup)){

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

    if(showCountWeb){
        
        noOfAccidentsMap.forEach((value, key) => {
            noOfAccidentsData.push({
                axis: key,
                value: parseInt(countScale(value))
            });
        });

        noOfAccidentsData.forEach(d => d.webType = 'count');
    }

    if(showInjuryWeb){

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

        injurySeverityData.forEach(d => d.webType = 'injury');
    }

    //0 => no of accidents, 1 => injury severity
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
		
	var allAxis = Array.from(directions.keys()),	//Names of each axis
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
        .attr("stroke-width", 2)
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
    let radarArea = g.selectAll('[class*="radarArea_"]')
        .data(spiderData);

    radarArea.enter()
        .append("path")
        .merge(radarArea)
        .attr("class", (d, i) => 'radarArea_'+i)
        .style("fill", (d, i) => cfg.color(i))
        .style("fill-opacity", cfg.opacityArea)
        .style("stroke-width", cfg.strokeWidth + "px")
        .style("stroke", (d, i) => cfg.color(i))
        .on('mouseover', function (d,i){
            // Dim all blobs
            d3.selectAll('[class*="radarArea_"]')
                .transition().duration(200)
                .style("fill-opacity", 0.1); 
            // Bring back the hovered over blob
            d3.select(this)
                .transition().duration(200)
                .style("fill-opacity", 0.7);	
        })
        .on('mouseout', function(){
            // Bring back all blobs
            d3.selectAll('[class*="radarArea_"]')
                .transition().duration(200)
                .style("fill-opacity", cfg.opacityArea);
        })
        .transition()
        .duration(1000)
        .attr("d", (d, i) => radarLine(d));	

    radarArea.exit()
        .transition()
        .duration(1000)
        .ease(d3.easeQuadIn)
        .style("opacity", 0)
        .remove();

    // Append the circles
    let flatMap = spiderData.flatMap((d, i) => d.map(v => ({
        value: v.value, 
        color: cfg.color(i),
        axis: v.axis,
        webType: v.webType
    })));

    let radarCircle = g.selectAll('[class*="radarCircle_"]')
        .data(flatMap);

    radarCircle.enter()
        .append("circle")
        .merge(radarCircle)
        .attr("class", (d, i) => "radarCircle_"+d.webType)
        .attr("r", cfg.dotRadius)
        .style("fill", d => d.color)
        .attr('stroke-width', cfg.strokeWidth + "px")
        .attr('stroke', d => d.color)
        .style("filter" , "url(#glow)")
        .style("pointer-events", "all")
        .on("mouseover", function(e,i) {
            tooltip.style("opacity", 0);
            tooltipText.html('');
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
                    .attr("height", 120)
                    .attr("rx", 10)      // Rounded corners
                    .attr("ry", 10);
                tooltipHtml = `<tspan style="font-weight:bold;">Injury Severity Level</tspan> <tspan x="${newX+10}" dy="1.5em" style="font-weight:bold;">and No. of Accidents:</tspan>`;
                let sortedArr = Object.entries(locationInjuryCountMap.get(i.axis)).sort((a,b) => a[1]-b[1]);
                sortedArr.forEach(element => {
                    tooltipHtml += `<tspan x="${newX+10}" dy="1.5em">${injurySeverityMap.get(element[0]).label}: ${element[1]}</tspan>`;
                });
            }

            tooltip.raise(); 
            tooltipText.raise(); 

            tooltip.attr('x', newX)
                .attr('y', newY)
                .style('opacity', 1);

            tooltipText.html(tooltipHtml)
                .attr('x', newX+10)
                .attr('y', newY+20)
                .style("opacity", 1);
            
        })
        .on("mouseout", function(e, i){
            tooltip.style("opacity", 0);
            tooltipText.html('');
        })
        .transition()
        .duration(1000)
        .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice*(i % (Math.max(spiderData[0].length,spiderData[1].length))) - Math.PI/2))
        .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice*(i % (Math.max(spiderData[0].length,spiderData[1].length))) - Math.PI/2));

    radarCircle.exit()
        .transition()
        .duration(1000)
        .attr("cx", 0)
        .attr("cy", 0)
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

var scroll = true;

function VehicleBodyTypeWheel(){

    // Initial data
    const options = [];
    options.push(' ');
    options.push('All');
    let sortedArr = [...new Set(parsedData.map(d => d[VEHICLE_GROUP]))].sort();
    options.push(...sortedArr);
    options.push(' ');
    let startIndex = 0;  // Starting index of the visible window
    const visibleCount = 3;

    let svg = d3.select('#car-clock-svg')
        .select('g');

    // Create a group for all elements
    const group = svg.append('g')
        .attr('transform', 'translate(157, -150)');

    group.append('text')
        .text('Vehicle Body Type')
        .attr('fill', 'white')
        .attr('x', 190)
        .attr('y', 75)
        .style("font-size", "14px")
        .style('font-weight', 'bold')
        .style("opacity", 0.8);

    // Top curved lines
    group.selectAll(".dividerTop")
    .data([1, 2])
    .enter()
    .append("path")
    .attr("class", "dividerTop")
    .attr("d", d => {
        const y = 115 + (d * 60/5);
        const midX = (132 + 168) / 2;
        const controlY = y - 5;
        return `M132,${y} Q${midX},${controlY} 168,${y}`;
    })
    .attr("fill", "none")
    .attr("stroke", "#808080")
    .attr("stroke-width", 1);

    // Middle straight line
    group.append("line")
    .attr("class", "dividerMid")
    .attr("x1", 130)
    .attr("x2", 170)
    .attr("y1", 115 + (3 * 60/5))
    .attr("y2", 115 + (3 * 60/5))
    .attr("stroke", "#808080")
    .attr("stroke-width", 1);

    // Bottom curved lines
    group.selectAll(".dividerBottom")
    .data([4, 5])
    .enter()
    .append("path")
    .attr("class", "dividerBottom")
    .attr("d", d => {
        const y = 115 + (d * 60/5);
        const midX = (132 + 168) / 2;
        const controlY = y + 5;
        return `M132,${y} Q${midX},${controlY} 168,${y}`;
    })
    .attr("fill", "none")
    .attr("stroke", "#808080")
    .attr("stroke-width", 1);

    // Create circular wheel background
    const watchWheel = group.append("rect")
        .attr("x", 130)      // 150 - width/2 to center
        .attr("y", 115)      // 150 - height/2 to center
        .attr("width", 40)   // Similar scale to the circle (diameter)
        .attr("height", 70)  // Making it square
        .attr("rx", 20)    // Horizontal corner radius
        .attr("ry", 20)
        .style("fill", "#BCC6CC")  // Metallic silver fill
        .style("stroke", "#9BA4AA") // Darker silver stroke
        .attr("stroke-width", 2)
        .style("fill-opacity", 0.15)
        .style("filter", "url(#glow)")
        .style('cursor', 'ns-resize');

    // Create arc generator for curved buttons
    const buttonArc = d3.arc()
        .innerRadius(150)
        .outerRadius(170)
        .startAngle(-Math.PI/14)
        .endAngle(Math.PI/14)
        .cornerRadius(7);

    function toggleSpiderWeb(){

        const buttonId = d3.select(this).attr("id");
        
        // You can perform different actions based on which button was clicked
        if (buttonId === 'toggleCountButton') {
            if(!d3.select('.radarArea_0').empty()){
                d3.select('.radarArea_0')
                    // .exit()
                    // .transition()
                    // .duration(1000)
                    // .ease(d3.easeQuadIn)
                    // .attr('transform', `translate(${cfg.w/2},${cfg.h/2}) scale(0.1)`)
                    // .style("opacity", 0)
                    .remove();
                d3.selectAll('.radarCircle_count').remove();
                showCountWeb = false;

                d3.select(this).style("fill", "#BCC6CC");

            }else{
                showCountWeb = true;
                d3.select(this).style("fill", "#1E90FF");
                updateSpiderChart();
            }
            
        } else if (buttonId === "toggleInjuryButton") {
            if(!d3.select('.radarArea_1').empty()){
                d3.select('.radarArea_1').remove();
                d3.selectAll('.radarCircle_injury').remove();
                showInjuryWeb = false;
                d3.select(this).style("fill", "#BCC6CC");
            }else{
                showInjuryWeb = true;
                d3.select(this).style("fill", "#FF8C00");
                updateSpiderChart();
            }
        }
    }

    // Add button at II position (30 degrees)
    svg.append("path")
        .attr('id', 'toggleCountButton')
        .attr("d", buttonArc)
        .attr("transform", `translate(117, -70) rotate(60)`)
        .style("fill", "#1E90FF")  
        .style("stroke", "#1E90FF") 
        .attr("stroke-width", 2)
        .style("fill-opacity", 0.3)
        .style("filter", "url(#glow)")
        .attr("class", "button")
        .style("cursor", "pointer")
        .on('click', toggleSpiderWeb)
        .lower();

    svg.append('text')
        .text('No. of Accidents')
        .attr('fill', 'white')
        .attr('x', 280)
        .attr('y', -160)
        .style("font-size", "14px")
        .style('font-weight', 'bold')
        .style("opacity", 0.8);

    // Add button at IV position (120 degrees)
    svg.append("path")
        .attr('id', 'toggleInjuryButton')
        .attr("d", buttonArc)
        .attr("transform", `translate(119, 67) rotate(120)`)
        .style("fill", "#FF8C00")
        .style("stroke", "#FF8C00")
        .attr("stroke-width", 2)
        .style("fill-opacity", 0.3)
        .style("filter", "url(#glow)")
        .attr("class", "button")
        .style("cursor", "pointer")
        .on('click', toggleSpiderWeb)
        .lower();

    svg.append('text')
        .text('Injury Severity')
        .attr('fill', 'white')
        .attr('x', 280)
        .attr('y', 170)
        .style("font-size", "14px")
        .style('font-weight', 'bold')
        .style("opacity", 0.8);

    // Create text elements
    group.selectAll(".option")
        .data(options)
        .join("text")
        .attr("class", "option")
        .attr("x", 190)
        .attr("y", (d, i) => 100 + i*50)
        .text(d => commonVehicleGroups.get(d) ? commonVehicleGroups.get(d).label : d)
        .style("font-size", "12px")
        .attr('fill', 'white')
        .style("opacity", (d, i) => i === startIndex ? 0.8 : 0.3);

    function updateVisibleOptions() {
        // Get current visible options
        const visibleOptions = options.slice(startIndex, startIndex + visibleCount);

        // Bind data to the selection
        const texts = group.selectAll(".option").data(visibleOptions, d => d);

        // Handle exit (remove elements not in the data)
        texts.exit().remove();

        // Handle enter (create new elements for new data)
        const enter = texts.enter()
            .append("text")
            .attr("class", "option")
            .attr("x", 190)
            .attr("y", (d, i) => 120 + i * 30) // Initial position for new elements
            .style("opacity", 0)
            .text(d => commonVehicleGroups.get(d) ? commonVehicleGroups.get(d).label : d)
            .style("font-size", "12px")
            .attr("fill", "white");

        // Handle update (modify existing elements)
        const update = texts
            .attr("x", 190)
            .text(d => commonVehicleGroups.get(d) ? commonVehicleGroups.get(d).label : d);

        // Merge enter and update for transitions
        enter.merge(update)
            .transition()
            .duration(500)
            .attr("y", (d, i) => 120 + i * 30) // Set the position for visible options
            .style("opacity", (d, i) => i === Math.floor(visibleCount / 2) ? 0.8 : 0.3);

        // Update the selected value based on the middle visible option
        selectedVehicleGroup = visibleOptions[Math.floor(visibleOptions.length / 2)];
    }

    // Scroll handler
    function scrollOptions(event) {
        event.preventDefault(); // Prevent default scroll behavior
        if(!scroll){
            return;
        }
        scroll = false;
        if (event.deltaY > 0) {
            // Scroll down
            startIndex = Math.min(options.length - visibleCount, startIndex + 1);
        } else if (event.deltaY < 0) {
            // Scroll up
            startIndex = Math.max(0, startIndex - 1);
        }
        updateVisibleOptions();
        updateSpiderChart();
        setTimeout(() => scroll = true, 1000);
    }

    // Add mousewheel scroll event to the group
    watchWheel.on("wheel", scrollOptions);

    // Initial render
    updateVisibleOptions();    
}

function updateSpiderChart(){

    filterData();
    plotRadarChartData();
}