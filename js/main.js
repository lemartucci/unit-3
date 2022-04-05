window.onload = setMap();

//Example 1.3 line 4...set up choropleth map
function setMap() {
    //map frame dimensions
    var width = 960,
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
        .center([0, 43.2994])//centered on NY (75 W, 43N) latitude and longitude
        .rotate([-74.2179, 0, 0])
        .parallels([74, 40])//Standard parallels
        .scale(2500)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);//Applies projection to the data

    //Data for map
    var promises = [
        d3.csv("data/NY_Agricultural_Practices.csv"),
        d3.json("data/newyorkCounties.topojson")
    ];
    Promise.all(promises).then(callback);//Fetching multiple datasets at once with Promise.All

    //Callback function to retrieve the data
    function callback(data) {
        var csvData = data[0],//csv data is first in array
            newyork = data[1];//new york is second in array
            console.log(csvData);
            console.log(newyork);

        //translate newyorkCounties TopoJSON to geoJson
        var nyCounties = topojson.feature(newyork, newyork.objects.newyorkCounties).features;

        var county = map
            .selectAll(".county")
            .data(nyCounties)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "county" + d.properties.county;
            })
            .attr("d", path);//d defines the coordinates of path
    
             /*
        var graticule = d3.geoGraticule().step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

       //create graticule background
        var gratBackground = map
            .append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path); //project graticule
        
        //create graticule lines
        var gratLines = map
            .selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines*/

        }

}