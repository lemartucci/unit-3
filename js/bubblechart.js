window.onload = function(){

	//weight and height values for SVG
    var w = 900, h = 500;
    //Creating a container 
    var container = d3.select("body") 
        .append("svg") //add svg to body
        .attr("width", w) //width
        .attr("height", h) //height
        .attr("class", "container") //class name
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color
    //Creating an inner rectangle block within the container
    var innerRect = container.append("rect")
        .datum(400) //datum value (400)
        .attr("width", function(d){ //width of the rectangle
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function(d){ //rectangle height
            return d; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color
    //cityPop data variable and array
    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];
    //Linear scale to take circles and space them evenly across the chart
    var x = d3.scaleLinear() //create the scale
        .range([90, 810]) //output min and max values
        .domain([0, 3]); //input min and max values


    //find the minimum value of the cityPop array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the cityPop array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //scale the axis so it extends the length of the inner rectangle/ y axis
    var y = d3.scaleLinear()
        .range([450,50])//pixel values
        .domain([0, 700000]);

    //color scale generator 
    var color = d3.scaleLinear()
        .range([
            "#009933",
            "#004d1a",
        ])
        .domain([
            minPop, 
            maxPop
        ]);

   //Creating circles
    var circles = container.selectAll(".circles") //create an empty selection
        .data(cityPop) //cityPop array passed through .data
        .enter() 
        .append("circle") //add circles
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;//city name as circle ID
        })
        .attr("r", function(d){
            //calculate the radius based on population value as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);//convert the area to the radius
        })
        .attr("cx", function(d, i){
            //use the index to place each circle horizontally
            return x(i);
        })
        .attr("cy", function(d){
            return y(d.population);
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator above
            return color(d.population);
        })
        .style("stroke", "#000"); //black border of circle 

        //adding vertical left axis
        var yAxis = d3.axisLeft(y);

        //create the axis g element and add axis so it's visible on the container
        var axis = container.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(50, 0)")//50 pixels in from left edge
                .call(yAxis);

        //create a title for the bubble chart
        var title = container.append("text")
            .attr("class", "title")
            .attr("text-anchor", "middle")
            .attr("x", "450")
            .attr("y", "30")
            .text ("City Populations");
        
            var labels = container.selectAll(".labels")
            .data(cityPop)
            .enter()
            .append("text")
            .attr("class", "labels")
            .attr("text-anchor", "left")
            .attr("y", function(d){
                //vertical position centered on each circle
                return y(d.population) + 5;
            });
    
        //city name labels
        var nameLine = labels.append("tspan")
            .attr("class", "nameLine")
            .attr("x", function(d,i){
                //place label to the right of each circle
                return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
            })
            .text(function(d){
                return d.city;
            });
    
        //population label
        var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") //vertical offset so appears below city name label
        .text(function(d){
            return "Pop. " + d.population;
        });

};