(function(){
        var attrArray = ["alley", "con_ease", "no_till", "conv_till", "cov_crop", "art_dit", "tile", "graze"]; //list of attributes
	    var expressed = attrArray[0]; //initial attribute selected in attrArray

        var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        var yScale= d3.scaleLinear().range([463,0]).domain([0,600]);//Scale bar range

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

                setEnumerationUnits(nyCounties,map,path,colorScale);

                setChart(csvData,colorScale);

                createDropdown(csvData);
            };
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
            "#edf8fb",
            "#ccece6",
            "#99d8c9",
            "#66c2a4",
            "#2ca25f",
            "#006d2c",
	    ];
        //create color scale generator for Quantile scale
        var colorScale = d3.scaleQuantile()
        .range(colorClasses);

        var domainArray = [];
        for (var i =0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }
        colorScale.domain(domainArray);

        return colorScale;
        };
    
    function setEnumerationUnits(nyCounties,map,path, colorScale){
        var county = map
            .selectAll(".county")
            .data(nyCounties)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "county " + d.properties. county;
            })
            .attr("d", path)//d defines the coordinates of path
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);//if there are no values for attribute, use grey color
                } else {
                    return "#ccc";
                }
            })
                .on("mouseover", function(event,d){
                    highlight(d.properties)
                })
                .on("mouseout", function(event, d){
                    dehighlight()
                })
                .on("mousemove", moveLabel);

            var desc = county.append("desc").text ('{"stroke": "#000", "strokeowidth": "0.5px"}');

        }
    
    function setChart(csvData, colorScale){
    
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
            .on("mouseover", function(event,d){
                highlight(d)
            })
            .on("mouseout", function(event, d){
                dehighlight()
            })
            .on("mousemove", moveLabel); 

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle");
    
        updateChart(bars, csvData.length, colorScale);
    
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
        
        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
        }

    function createDropdown(csvData) {
            
            var dropdown = d3
                .select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function () {//Listening for the drop down menu value to change
                    changeAttribute(this.value, csvData);
                });

            var titleOption = dropdown
                .append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute");
            
            var attrOptions = dropdown//Adding options for each variable in drop down menu
                
                .selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function (d) {
                    return d;
                })
                .text(function (d) {//Update attribute names in drop down menu
                    return d.replace ("alley", "Alley Cropping & Silvapasture")
                        .replace ("cov_crop", "Cover Cropping")
                        .replace("con_ease", "Conservation Easement")
                        .replace("no_till", "No Tillage")
                        .replace("conv_till", "Conventional Tillage")
                        .replace("art_dit", "Artifical Ditch Drainage")
                        .replace("tile", "Tile Drainage")
                        .replace("graze", "Rotational/Intensive Grazing")
                })
         };
    function changeAttribute(attribute, csvData) {
                
                expressed = attribute;//Set pseudo global expressed variable to current attribute
        
                //recreate the color scale
                var colorScale = makeColorScale(csvData);

                var county = d3
                    .selectAll(".county")
                    .transition()//transition between two style
                    .duration(500)//delay transition
                    .style("fill", function (d) {
                        var value = d.properties[expressed];
                        if (value) {
                            return colorScale(value);
                        } else {
                            return "#ccc";
                }
            });
                var bars = d3.selectAll(".bar")
                    //re-sort bars
                    .sort(function (a, b) {
                        return b[expressed] - a[expressed];
                    })
                    .transition()
                    .delay(function(d,i){
                        return i *20//Adds 20 milliseconds after each bar is redrawn
                    })
                    .duration(500);

            updateChart(bars, csvData.length, colorScale);
        }

        function updateChart(bars, n, colorScale) {
            //position bars
            bars.attr("x", function (d, i) {
                return i * (chartInnerWidth / n) + leftPadding;
            })
                //size/resize bars
                .attr("height", function (d, i) {
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function (d, i) {
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                //color/recolor bars
                .style("fill", function (d) {
                    var value = d[expressed];
                    if (value) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                });
            var chartTitle = d3.select(".chartTitle")
                .text("Number of Farms Practicing " + expressed.replace("alley", "Alley Cropping")
                    .replace ("cov_crop", "Cover Cropping")
                    .replace("con_ease", "Conservation Easement")
                    .replace("no_till", "No Tillage")
                    .replace("conv_till", "Conventional Tillage")
                    .replace("art_dit", "Artifical Ditch Drainage")
                    .replace("tile", "Tile Drainage")
                    .replace("graze", "Rotational/Intensive Grazing")
                    + " by county")
            };
    function highlight(props) {
        //change stroke
        var selected = d3
            .selectAll("." + props.NAME)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    }

    function dehighlight() {
        var county = d3
            .selectAll(".county")
            .style("stroke", "black")
            .style("stroke-width", "0.5)");
        
        var county = d3
            .selectAll(".bar")
            .style("stroke", "none")
            .style("stroke-width", "0)")
            /*.style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");*/
            

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    }
    function setLabel(props) {
        console.log("Hello Label");
        //label content
        var labelAttribute = "<h1>" + "In " + props.NAME +",  "+ props[expressed]+ " farms practiced: " + expressed.replace("alley", "Alley Cropping & Silvapasture") 
            .replace ("cov_crop", "Cover Cropping")
            .replace("con_ease", "Conservation Easement")
            .replace("no_till", "No Tillage")
            .replace("conv_till", "Conventional Tillage")
            .replace("art_dit", "Artifical Ditch Drainage")
            .replace("tile", "Tile Drainage")
            .replace("graze", "Rotational/Intensive Grazing")
             + "</h1>";

        //create info label div
        var infolabel = d3
            .select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.NAME + "_label")
            .html(labelAttribute);

        var countyName = infolabel.append("div").attr("class", "County").html(props.name);
    }
    //function to move info label with mouse
    function moveLabel() {
        var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
        
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clinentX -labelWidth -10,
            y2 = event.clientY +25
        
        var x =event.clientX > window.innerWidth -labelWidth - 20? x2 :x1;
        var y = event.clientY < 75? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }

})();