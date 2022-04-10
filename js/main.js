(function(){
        var attrArray = ["alley", "con_ease", "no_till", "conv_till", "cov_crop", "art_dit", "tile", "graze"]; //list of attributes
	    var expressed = attrArray[0]; //initial attribute selected in attrArray

        window.onload = setMap();

        function setMap(){
            //map frame dimensions
            var width = window.innerWidth * 0.5,
            height = 460;

            //create new svg container for the map
            var map = d3
                .select("body")
                .append("svg")
                .attr("class", "map")
                .attr("width", width)
                .attr("height", height);

            //create Albers equal area conic projection centered on New York State
            var projection = d3.geoAlbers()
                .center([0, 42.999])//centered on NY
                .rotate([75.2179, 0, 0])
                .parallels([74, 40])//Standard parallels
                .scale(5000)
                .translate([width / 2, height / 2]);

            var path = d3.geoPath()
                .projection(projection);//Applies projection to the data

             //Data for map
            var promises = [
                d3.csv("data/NY_Agricultural_Practices.csv"),
                d3.json("data/newyorkCounties.topojson"),
                d3.json("data/background.topojson")
                ];
            
            Promise.all(promises).then(callback);//Fetching multiple datasets at once with Promise.All

            //Callback function to retrieve the data
            function callback(data) {
                var csvData = data[0],//csv data is first in array
                    newyork = data[1];//new york is second in array
                    background = data[2]//background data 
                    console.log(csvData);
                    console.log(newyork);

                setGraticule(map,path);
                //translate newyorkCounties TopoJSON to geoJson
                var backgroundArea = topojson.feature(background, background.objects.background_Project);
                var nyCounties = topojson.feature(newyork, newyork.objects.FINAL).features;
        
                //add the background states/Canada to the map
                var area = map
                    .append("path")
                    .datum(backgroundArea)
                    .attr("class", "area")
                    .attr("d", path);

                nyCounties = joinData(nyCounties, csvData);

                var colorScale = makeColorScale(csvData);

                setEnumerationUnits(nyCounties,map,path, colorScale);

                setChart(csvData,colorScale);
            };
    };
    
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 100]);
    
        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.NAME;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });
    
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Farms Utilizing Alley Cropping & Silvapasture in each county");
    
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };
    function setGraticule(map,path){
		    var graticule = d3.geoGraticule()
	            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

	        //create graticule background
	        var gratBackground = map.append("path")
	            .datum(graticule.outline()) //bind graticule background
	            .attr("class", "gratBackground") //assign class for styling
	            .attr("d", path) //project graticule

	            //create graticule lines
	        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
	            .data(graticule.lines()) //bind graticule lines to each element to be created
	            .enter() //create an element for each datum
	            .append("path") //append each element to the svg as a path element
	            .attr("class", "gratLines") //assign class for styling
	            .attr("d", path); //project graticule lines
	}

    function joinData(nyCounties,csvData){
        //For loop iterating through csv
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i]; //the current county
            var csvKey = csvCounty.NAME; //the CSV primary key

            console.log(csvCounty);
            //For loop iterating through geoJson
            for (var a = 0; a < nyCounties.length; a++) {
                var geojsonProps = nyCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.NAME; //the geojson primary key
    
            //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {
                //assign all attributes and values
                    attrArray.forEach(function (attr){
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
              });
            };
          };
        };
        return nyCounties;
    }

    function makeColorScale(data){
        var colorClasses= [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c",
	    ];

        //create color scale generator for Equal Interval
        var colorScale = d3.scaleQuantile()
        .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
        };

    function setEnumerationUnits(nyCounties,map,path, colorScale){
        var county = map
            .selectAll(".county")
            .data(nyCounties)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "county" + d.properties.county;
            })
            .attr("d", path)//d defines the coordinates of path
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
            	    return colorScale(d.properties[expressed]);//if there are no values for attribute, use grey color
                } else {
            	    return "#ccc";
            }})
        }  

})();