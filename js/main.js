(function(){
        var attrArray = ["alley", "con_ease", "no_till", "conv_till", "cov_crop", "art_dit", "tile", "graze"]; //list of attributes for map
	    var expressed = attrArray[0]; //initial attribute selected in attrArray
        //Chart dimensions
        var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        var yScale= d3.scaleLinear().range([463,0]).domain([0,600]);//Scale bar range; Y scale bar

        window.onload = setMap();//onload the map

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
                .center([0, 42.9])//centered on NY
                .rotate([75.69, 0, 0])
                .parallels([74, 40])//Standard parallels
                .scale(5100)
                .translate([width / 2, height / 2]);

            var path = d3.geoPath()
                .projection(projection);//Applies projection to the data

             //Data for map in Promises variable
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
                    background = data[2]//background data third in array
                    console.log(csvData);//console log to see the data in console
                    console.log(newyork);

                setGraticule(map,path);//graticule for map

                //translate newyorkCounties TopoJSON to geoJson
                var backgroundArea = topojson.feature(background, background.objects.background_Project);
                var nyCounties = topojson.feature(newyork, newyork.objects.FINAL).features;
        
                //add the background states/Canada to the map
                var area = map
                    .append("path")
                    .datum(backgroundArea)
                    .attr("class", "area")
                    .attr("d", path);

                nyCounties = joinData(nyCounties, csvData);//Join county data with csv data

                var colorScale = makeColorScale(csvData);//color scale variable, will make color scale based on csv data

                setEnumerationUnits(nyCounties,map,path,colorScale);

                setChart(csvData,colorScale);

                createDropdown(csvData);
            };
    };
    
    function setGraticule(map,path){//Function to make the graticule
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) 
            .attr("class", "gratBackground") //assign class for styling in css 
            .attr("d", path) //project the graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) 
            .enter() //element for each datum created
            .append("path") //append to svg
            .attr("class", "gratLines") //assign class for styling in css
            .attr("d", path); //graticule line projection
    }
    //function to join new york counties to corresponding csv data
    function joinData(nyCounties,csvData){
        //For loop iterating through csv
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i]; //the current county
            var csvKey = csvCounty.NAME; //the CSV primary key

            console.log(csvCounty);
            //For loop iterating through geoJson
            for (var a = 0; a < nyCounties.length; a++) {
                var geojsonProps = nyCounties[a].properties; //the current county
                var geojsonKey = geojsonProps.NAME; //the geojson primary key

            //for matching primary keys transfer the csv data to geojson
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
    //Make the colorscale
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
        .range(colorClasses);//range of color classes

        var domainArray = [];
        for (var i =0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }
        colorScale.domain(domainArray);

        return colorScale;
        };
    //Function to set enumeration units (counties of New York State)
    function setEnumerationUnits(nyCounties,map,path, colorScale){
        var county = map
            .selectAll(".NAME")
            .data(nyCounties)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "county " + d.properties.NAME;
            })
            .attr("d", path)//d defines the coordinates of path
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(d.properties[expressed]);//if there are no values for attribute, use grey color
                } else {
                    return "#A8A8A8";
                }
            })
                .on("mouseover", function(event,d){
                    highlight(d.properties)
                })
                .on("mouseout", function(event, d){
                    dehighlight()
                })
                .on("mousemove", moveLabel);

            //var desc = county.append("desc").text ('{"stroke": "#000", "strokeowidth": "0.5px"}');

        }
    //Function to create D3 chart 
    function setChart(csvData, colorScale){
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        //rectangle for chart background
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //bars for each county
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

        //Text element for chart title and define title placement
        var chartTitle = chart.append("text")
            .attr("x", 45)
            .attr("y", 35)
            .attr("class", "chartTitle");
    
        updateChart(bars, csvData.length, colorScale);
    
        //Create a vertical axis generator on left (y)
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //Place the axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        //create a frame for border of chart
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        var desc = bars.append("desc").text('{"stroke": "none", "stroke-width": "0px"}');
        }
        //function to create a drop down menu for ny agricultural practice attributes
    function createDropdown(csvData) {
            //Create a dropdown menu
            var dropdown = d3
                .select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function () {//Listening for the drop down menu value to change
                    changeAttribute(this.value, csvData);
                });
            //Create a title for the drop down menu named "Select Attribute"
            var titleOption = dropdown
                .append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute")
                
            
            var attrOptions = dropdown//Adding options for each variable in drop down menu
                
                .selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function (d) {
                    return d;
                })
                .text(function (d) {//Update attribute names in drop down menu
                    return d.replace ("alley", "Alley Cropping & Silvopasture")
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
                    .transition()//transition between two styles
                    .duration(500)//delay transition
                    .style("fill", function (d) {
                        var value = d.properties[expressed];
                        if (value) {
                            return colorScale(value);
                        } else {
                            return "#ccc";//return grey if no value
                }
            });//Adding animation to the bars
                var bars = d3.selectAll(".bar")
                    //Change the order of the bars and adjust timing of bar movement between attribute changes
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
                //size/resize bars based on changing attribute values
                .attr("height", function (d, i) {
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function (d, i) {
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                //recolor bars based on changing attribute values
                .style("fill", function (d) {
                    var value = d[expressed];
                    if (value) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                });
            var chartTitle = d3.select(".chartTitle")//Updating the chart title as attribute selection changes
                .text("Number of Farms Practicing " + expressed.replace("alley", "Alley Cropping & Silvopasture")
                    .replace ("cov_crop", "Cover Cropping")
                    .replace("con_ease", "Conservation Easement")
                    .replace("no_till", "No Tillage")
                    .replace("conv_till", "Conventional Tillage")
                    .replace("art_dit", "Artifical Ditch Drainage")
                    .replace("tile", "Tile Drainage")
                    .replace("graze", "Rotational/Intensive Grazing")
                    + " by county")
            };
    function highlight(props) {//Highlighting function 
       
        var selected = d3
            .selectAll("." + props.NAME)//When selecting bar or county
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    }
    //dehighlight function to prevent highlighting from being permanent
    function dehighlight() {
        var county = d3//dehighlight for map counties
            .selectAll(".county")
            .style("stroke", "black")
            .style("stroke-width", "0.5");
        
        var county = d3
            .selectAll(".bar")//dehighlight for bar counties
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
        //remove info label and allow to change
        d3.select(".infolabel").remove();
    }//Label properties for retrieve
    function setLabel(props) {
        console.log("Hello Label");
        //What the label will say; update label names
        var labelAttribute = "<h1>" + "In " + props.NAME + " County"+ ",  "+ props[expressed]+ " farms practiced: " + expressed.replace("alley", "Alley Cropping & Silvopasture") 
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
    }
    //function to move info label
    function moveLabel() {
        var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
        //range of movement
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