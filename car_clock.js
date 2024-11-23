
var spiderData = [];
var locationInjuryCountObj = {}; //to show on hover 
var selectedVehicleBodyType = "ALL";

const INJURY_SEVERITY = 'injury_severity';
const VEHICLE_FIRST_IMPACT_LOCATION = 'vehicle_first_impact_location';
const VEHICLE_BODY_TYPE = 'vehicle_body_type';
const directions = new Set(['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']);
const injurySeverityMap = new Map([
    ['fatal', 6],
    ['serious', 5], 
    ['minor', 4], 
    ['possible', 3], 
    ['no', 2], 
    ['unknown', 1] 
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

        let noOfAccidentsData = [];
        let noOfAccidentsMap = new Map();
        let injurySeverityData = [];
        let injuryCountMap = new Map();

        data.forEach(d => {
            
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

        noOfAccidentsMap.forEach((value, key) => {
            noOfAccidentsData.push({
                axis: key,
                value: value
            });
        });

        let injuryAxisCountSumMap = new Map();

        injuryCountMap.forEach((value, key) => {

            let axis = key.split('##')[0];
            let injury = key.split('##')[1];

            let product = value * injurySeverityMap.get(injury);

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

            if(axis in locationInjuryCountObj){
                let obj = locationInjuryCountObj[axis];
                obj[injury] = value;
            }else{
                let obj = {};
                obj[injury] = value;
                locationInjuryCountObj[axis] = obj;
            }
        });

        for (let [key, value] of injuryAxisCountSumMap.entries()) {
            injurySeverityData.push({
                axis: key,
                value: (value.sum / (value.count*6))*100000
            });
        }

        spiderData.push(noOfAccidentsData);
        spiderData.push(injurySeverityData);

        let directionsArr = Array.from(directions);

        spiderData.forEach(arr => {
            arr.sort((a,b) => directionsArr.indexOf(a.axis) - directionsArr.indexOf(b.axis));
        });

        console.log(spiderData);
        console.log(locationInjuryCountObj);

        drawSpiderChart();
    });
});

function drawSpiderChart(){

    RadarChart("#car-clock-svg", spiderData);
}

function RadarChart(id, data, options) {
	var cfg = {
	 w: 500,				//Width of the circle
	 h: 500,				//Height of the circle
	 margin: {top: 60, right: 60, bottom: 60, left: 60}, //The margins of the SVG
	 levels: 1,				//How many levels or inner circles should there be drawn
	 maxValue: 0, 			//What is the value that the biggest circle will represent
	 labelFactor: 1.07, 	//How much farther than the radius of the outer circle should the labels be placed
	 wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
	 opacityArea: 0.35, 	//The opacity of the area of the blob
	 dotRadius: 4, 			//The size of the colored circles of each blog
	 opacityCircles: 0.1, 	//The opacity of the circles of each blob
	 strokeWidth: 2, 		//The width of the stroke around each blob
	 roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
	 color: d3.scaleOrdinal(d3.schemeCategory10)	//Color function
	};
	
	//Put all of the options into a variable called cfg
	if('undefined' !== typeof options){
	  for(var i in options){
		if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
	  }//for i
	}//if
	
	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	var maxValue = Math.max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));
		
	var allAxis = (data[0].map(function(i, j){return i.axis})),	//Names of each axis
		total = allAxis.length,					//The number of different axes
		radius = Math.min(cfg.w/2, cfg.h/2), 	//Radius of the outermost circle
		angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
	
	//Scale for the radius
	var rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);
		
	/////////////////////////////////////////////////////////
	//////////// Create the container SVG and g /////////////
	/////////////////////////////////////////////////////////

	//Remove whatever chart with the same id/class was present before
	d3.select(id).select("svg").remove();
	
	//Initiate the radar chart SVG
	var svg = d3.select(id).append("svg")
			.attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
			.attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
			.attr("class", "radar"+id);

    svg.append("image")
        .attr("xlink:href", "grey_car_no_bg.png")  // Replace with your background image path
        .attr("x", cfg.margin.top)
        .attr("y", cfg.margin.top)
        .attr("width", cfg.w)
        .attr("height", cfg.h)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("opacity", "0.7");

	//Append a g element		
	var g = svg.append("g")
			.attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");
	
	/////////////////////////////////////////////////////////
	////////// Glow filter for some extra pizzazz ///////////
	/////////////////////////////////////////////////////////
	
	//Filter for the outside glow
	var filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	/////////////////////////////////////////////////////////
	/////////////// Draw the Circular grid //////////////////
	/////////////////////////////////////////////////////////
	
	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", function(d, i){return radius/cfg.levels*d;})
		.style("fill", "#CDCDCD")
		.style("stroke", "#CDCDCD")
		.style("fill-opacity", cfg.opacityCircles)
		.style("filter" , "url(#glow)"); 

	//Text indicating at what % each level is
	axisGrid.selectAll(".axisLabel")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter().append("text")
	   .attr("class", "axisLabel")
	   .attr("x", 4)
	   .attr("y", function(d){return -d*radius/cfg.levels;})
	   .attr("dy", "0.4em")
	   .style("font-size", "10px")
	   .attr("fill", "#CDCDCD")
	   .text(function(d,i) { return maxValue * d/cfg.levels; });

	/////////////////////////////////////////////////////////
	//////////////////// Draw the axes //////////////////////
	/////////////////////////////////////////////////////////
	
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
		.attr("x2", (d, i) => rScale(maxValue) * Math.cos(angleSlice*i - Math.PI/2))
		.attr("y2", (d, i) => rScale(maxValue) * Math.sin(angleSlice*i - Math.PI/2))
		.attr("class", "line")
		.style("stroke", "white")
		.style("stroke-width", "2px");

	//Append the labels at each axis
	axis.append("text")
		.attr("class", "legend")
		.style("font-size", "11px")
		.attr("text-anchor", "middle")
		.attr("dy", "0.35em")
        .attr("fill", "#CDCDCD")
		.attr("x", (d, i) => rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2))
		.attr("y", (d, i) => rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2))
		.text(function(d){return d})
		.call(wrap, cfg.wrapWidth);

	/////////////////////////////////////////////////////////
	///////////// Draw the radar chart blobs ////////////////
	/////////////////////////////////////////////////////////
	
	//The radial line function
	var radarLine = d3.lineRadial().curve(d3.curveBasisClosed)
		.radius(function(d) { return rScale(d.value); })
		.angle(function(d,i) {	return i*angleSlice; });
		
	if(cfg.roundStrokes) {
		radarLine.curve(d3.curveCardinalClosed);
	}
				
	//Create a wrapper for the blobs	
	var blobWrapper = g.selectAll(".radarWrapper")
		.data(data)
		.enter().append("g")
		.attr("class", "radarWrapper");
			
	//Append the backgrounds	
	blobWrapper
		.append("path")
		.attr("class", "radarArea")
		.attr("d", (d, i) => radarLine(d))
		.style("fill", (d, i) => cfg.color(i))
		.style("fill-opacity", cfg.opacityArea)
		.on('mouseover', function (d,i){
			//Dim all blobs
			d3.selectAll(".radarArea")
				.transition().duration(200)
				.style("fill-opacity", 0.1); 
			//Bring back the hovered over blob
			d3.select(this)
				.transition().duration(200)
				.style("fill-opacity", 0.7);	
		})
		.on('mouseout', function(){
			//Bring back all blobs
			d3.selectAll(".radarArea")
				.transition().duration(200)
				.style("fill-opacity", cfg.opacityArea);
		});
		
	//Create the outlines	
	blobWrapper.append("path")
		.attr("class", "radarStroke")
		.attr("d", (d, i) => radarLine(d))
		.style("stroke-width", cfg.strokeWidth + "px")
		.style("stroke", (d, i) => cfg.color(i))
		.style("fill", "none")
		.style("filter" , "url(#glow)");		
	
	//Append the circles
	blobWrapper.selectAll(".radarCircle")
		.data((d, i) => d)
		.enter().append("circle")
		.attr("class", "radarCircle")
		.attr("r", cfg.dotRadius)
		.attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2))
		.attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2))
		.style("fill", (d, i, j) => cfg.color(j))
		.style("fill-opacity", 0.8);

	/////////////////////////////////////////////////////////
	//////// Append invisible circles for tooltip ///////////
	/////////////////////////////////////////////////////////
	
	//Wrapper for the invisible circles on top
	var blobCircleWrapper = g.selectAll(".radarCircleWrapper")
		.data(data)
		.enter().append("g")
		.attr("class", "radarCircleWrapper");
		
	//Append a set of invisible circles on top for the mouseover pop-up
	blobCircleWrapper.selectAll(".radarInvisibleCircle")
		.data(function(d,i) { return d; })
		.enter().append("circle")
		.attr("class", "radarInvisibleCircle")
		.attr("r", cfg.dotRadius*1.5)
		.attr("cx", (d,i) => rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2))
		.attr("cy", (d,i) => rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2))
		.style("fill", "none")
		.style("pointer-events", "all")
		.on("mouseover", function(d,i) {
			newX =  parseFloat(d3.select(this).attr('cx')) - 10;
			newY =  parseFloat(d3.select(this).attr('cy')) - 10;
					
			tooltip
				.attr('x', newX)
				.attr('y', newY)
				.text(i.value)
				.transition().duration(200)
				.style('opacity', 1);
		})
		.on("mouseout", function(){
			tooltip.transition().duration(200)
				.style("opacity", 0);
		});
		
	//Set up the small tooltip for when you hover over a circle
	var tooltip = g.append("text")
		.attr("class", "tooltip")
        .attr("fill", "#CDCDCD")
		.style("opacity", 0);
	
	/////////////////////////////////////////////////////////
	/////////////////// Helper Function /////////////////////
	/////////////////////////////////////////////////////////

	//Taken from http://bl.ocks.org/mbostock/7555321
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
	
}