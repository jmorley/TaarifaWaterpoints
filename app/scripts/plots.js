function updatePlots(region, district) {
  var url = "/api/waterpoints/stats_by/";
  var groupfield;

  if (region && district) {
    groupfield = "ward";
    url += groupfield + "?region=" + region + "&district=" + district;
  } else if (region) {
    groupfield = "district";
    url += groupfield + "?region=" + region;
  } else if (district) {
    //note: technically not 100% correct as different districts in different regions may share the same name (?)
    groupfield = "ward";
    url += groupfield + "?district=" + district;
  } else {
    groupfield = "region";
    url += groupfield;
  }

  var comparator = function(a, b) {
    var af = _.find(a.waterpoints, function(x) {
      return x.status == "Functional";
    });
    var bf = _.find(b.waterpoints, function(x) {
      return x.status == "Functional";
    });

    if (!af) {
      af = {
        status: "Functional",
        count: 0
      };
      a.waterpoints.push(af);
    }
    if (!bf) {
      bf = {
        status: "Functional",
        count: 0
      };
      b.waterpoints.push(bf);
    }
    return (bf.count / b.count) - (af.count / a.count);
  }

  d3.json(url, function(error, data) {
    //sort by % functional waterpoints
    data.sort(comparator);

    plotStatusSummary("#statusSummary", data, groupfield);
    plotSpendSummary("#spendSummary", data, groupfield);
    plotSpendImpact("#spendImpact", data, groupfield);
  });
}

/*
 * Stacked bar chart summarizing the status (functional/non functional)
 * of all the waterpoints in the given region/district (both may be empty)
 */
function plotStatusSummary(selector, data, groupField) {

  data.forEach(function(group) {
    var y0 = 0;
    //status type is not always in the same order due to mongo, sort here
    group.waterpoints = _.sortBy(group.waterpoints, "status");
    group.waterpoints.forEach(function(x) {
      x.y0 = y0;
      x.y1 = (y0 += x.count);
    });
  });
  //data.sort(function(a, b) { return b.count - a.count; });

  // Compensate for well margins (20px)
  var h = d3.select(selector).style('height').replace('px', '') - 40;
  var w = d3.select(selector).style('width').replace('px', '') - 40;

  var margin = {
      top: 20,
      right: 20,
      bottom: 80,
      left: 60
    },
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
    .rangeRound([height, 0]);

  x.domain(_.pluck(data, groupField));
  y.domain([0, d3.max(data, function(d) {
    return d.count;
  })]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var color = d3.scale.category20();

  //create the svg if it does not already exist
  svg = d3.select(selector + " svg g");
  if (!svg[0][0]) {
    svg = d3.select(selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      //transform within the margins
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Number of Waterpoints");
  }

  var state = svg.selectAll(".group")
    .data(data, function(d) {
      return d[groupField];
    });

  var rects = state.selectAll("rect")
    .data(function(d) {
      return d.waterpoints;
    }, function(d) {
      return d.status + "_" + d.count;
    })

  var statesEnter = state.enter()
    .append("g")
    .attr("class", "group")
    .attr("transform", function(d) {
      return "translate(" + x(d[groupField]) + ",0)";
    });

  var rectsEnter = statesEnter.selectAll("rect")
    .data(function(d) {
      return d.waterpoints;
    }, function(d) {
      return d.status + "_" + d.count;
    })

  rects.exit()
    .transition()
    .duration(1000)
    .attr("y", y(0))
    .attr("height", 0)
    .remove();

  state.exit()
    .transition()
    .duration(1000)
    .style("opacity", 0)
    .remove();

  rectsEnter.enter().append("rect")
    .attr("width", x.rangeBand())
    .style("fill", function(d) {
      return color(d.status);
    })
    .attr("y", y(0))
    .attr("height", 0)
    .transition()
    .duration(1000)
    .attr("y", function(d) {
      return y(d.y1);
    })
    .attr("height", function(d) {
      return y(d.y0) - y(d.y1);
    });

  //Update the axes
  svg.select("g.x.axis").transition().duration(1000).call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", function(d) {
      return "rotate(-65)"
    });

  svg.select("g.y.axis").transition().call(yAxis);

  //add a legend
  svg.selectAll(".legend").remove();

  var legend = svg.selectAll(".legend")
    .data(color.domain().slice().reverse());

  legend.enter().append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) {
      return "translate(0," + i * 20 + ")";
    });

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) {
      return d;
    });
}


function plotSpendSummary(selector, data, groupField) {

  //TODO: need real data
  data.forEach(function(x) {
    x.spend = (Math.random() * 10000 / x.count);
  });

  //data.sort(function(a, b) { return a.spend - b.spend; });

  // Compensate for well margins (20px)
  var h = d3.select(selector).style('height').replace('px', '') - 40;
  var w = d3.select(selector).style('width').replace('px', '') - 40;

  var margin = {
      top: 20,
      right: 20,
      bottom: 80,
      left: 60
    },
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
    .rangeRound([height, 0]);

  x.domain(_.pluck(data, groupField));
  y.domain([0, d3.max(data, function(d) {
    return d.spend;
  })]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var color = d3.scale.category20();

  svg = d3.select(selector + " svg g");
  if (!svg[0][0]) {
    svg = d3.select(selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    //transform within the margins
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Spend per Waterpoint ($)");
  }

  var rects = svg.selectAll("rect")
    .data(data, function(d) {
      return d[groupField];
    });

  rects.enter()
    .append("rect")
    .style("fill", function(d) {
      return color(d[groupField]);
    })
    .attr("width", x.rangeBand())
    .attr("x", function(d) {
      return x(d[groupField]);
    })
    .attr("y", y(0))
    .attr("height", 0)
    .transition()
    .duration(1000)
    .attr("y", function(d) {
      return y(0) - y(d.spend);
    })
    .attr("height", function(d) {
      return y(d.spend);
    });

  rects.exit()
    .transition()
    .duration(1000)
    .style("opacity", 0)
    .remove();

  //Update the axes
  svg.select("g.x.axis").transition().duration(1000).call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", function(d) {
      return "rotate(-65)"
    });

  svg.select("g.y.axis").transition().call(yAxis);
}

function plotSpendImpact(selector, wpdata, groupField) {

  //TODO: more made up data
  data = [];
  wpdata.forEach(function(x) {
    var functional = _.find(x.waterpoints, function(x) {
      return x.status == "Functional";
    });
    var d = {
      functional: functional.count / x.count * 100,
      population: d3.sum(_.pluck(x.waterpoints, "population")),
      spend: Math.random() * 10000 / x.count
    };
    d[groupField] = x[groupField];
    data.push(d);
  });

  // Compensate for well margins (20px)
  var h = d3.select(selector).style('height').replace('px', '') - 40;
  var w = d3.select(selector).style('width').replace('px', '') - 40;

  var margin = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 40
    },
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom;

  var x = d3.scale.linear()
    .range([0, width])
    .domain(d3.extent(_.pluck(data, "spend")));

  var y = d3.scale.linear()
    .range([height, 0])
    .domain(d3.extent(_.pluck(data, "functional")));

  var popScale = d3.scale.sqrt()
    .range([5, 15])
    .domain(d3.extent(_.pluck(data, "population")));

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var color = d3.scale.category20();

  svg = d3.select(selector + " svg g");
  if (!svg[0][0]) {
    svg = d3.select(selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    //transform within the margins
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Spend per Waterpoint ($)");

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("% Functional");
  }


  //TODO: use d3.tip
  //TODO: gets added each time
  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var dots = svg.selectAll(".dot")
    .data(data, function(d) {
      return d[groupField]
    });

  dots.enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", function(d) {
      return x(d.spend);
    })
    .attr("cy", function(d) {
      return y(d.functional);
    })
    .style("fill", function(d) {
      return color(d[groupField]);
    })
    .attr("r", 0)
    .transition()
    .duration(1000)
    .attr("r", function(d) {
      return popScale(d.population);
    });

  dots.exit()
    .transition()
    .duration(1000)
    .attr("r", 0)
    .remove();

  dots.on("mouseover", function(d) {
    tooltip.transition()
      .duration(100)
      .style("opacity", .9);
    tooltip.html("<b>" + d[groupField] + "</b>" + "<br/><em>Spend:</em> " + d.spend.toPrecision(3) + "<br/><em>Functional:</em> " + d.functional.toPrecision(3) + " %" + "<br/><em>Population served:</em> " + d.population)
      .style("left", (d3.event.pageX + 15) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
  })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
}
