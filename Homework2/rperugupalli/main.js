d3.csv("data/Student Mental health.csv").then(data => {
    console.log("Data loaded:", data);
  
    drawView1(data); // Call bar chart
    drawView2(data); // Call scatter plot
    drawView3(data); // Call Sankey
  });
  
  function drawView1(data) {
    const container = d3.select("#view1 svg");
    container.selectAll("*").remove();
  
    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 30, bottom: 70, left: 70 };
  
    container
      .attr("width", width)
      .attr("height", height);
  
    // Normalize gender and mental health values
    data.forEach(d => {
      d.gender = d["Choose your gender"].trim().toLowerCase();
      d.depression = d["Do you have Depression?"].trim().toLowerCase() === "yes" ? 1 : 0;
      d.anxiety = d["Do you have Anxiety?"].trim().toLowerCase() === "yes" ? 1 : 0;
      d.panic = d["Do you have Panic attack?"].trim().toLowerCase() === "yes" ? 1 : 0;
    });
  
    // Group data by gender and sum conditions
    const grouped = d3.rollups(
      data,
      v => ({
        Depression: d3.sum(v, d => d.depression),
        Anxiety: d3.sum(v, d => d.anxiety),
        Panic: d3.sum(v, d => d.panic)
      }),
      d => d.gender
    );
  
    // Flatten for grouped bar chart
    const mentalHealthTypes = ["Depression", "Anxiety", "Panic"];
    const genders = grouped.map(d => d[0]);
    const processedData = [];
    grouped.forEach(([gender, counts]) => {
      mentalHealthTypes.forEach(type => {
        processedData.push({ gender, condition: type, count: counts[type] });
      });
    });
  
    const svg = container;
  
    const x0 = d3.scaleBand()
      .domain(genders)
      .range([margin.left, width - margin.right])
      .paddingInner(0.2);
  
    const x1 = d3.scaleBand()
      .domain(mentalHealthTypes)
      .range([0, x0.bandwidth()])
      .padding(0.1);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.count)]).nice()
      .range([height - margin.bottom, margin.top]);
  
    const color = d3.scaleOrdinal()
      .domain(mentalHealthTypes)
      .range(["#e41a1c", "#377eb8", "#ffbf00"]);
  
    // Draw X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
        .style("text-transform", "capitalize")  // capitalize gender labels
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");
  
    // Draw Y axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(null, "s"));
    // Add X axis label
    svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", (width + margin.left - margin.right) / 2)
    .attr("y", height - 15)  // slightly below x-axis
    .style("font-size", "14px")
    .style("fill", "black")
    .text("Gender");

    // Add Y axis label
    svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(20, ${(height + margin.top - margin.bottom) / 2}) rotate(-90)`)
    .style("font-size", "14px")
    .style("fill", "black")
    .text("Number of people with the condition");

    // Draw bars
    svg.append("g")
      .selectAll("g")
      .data(processedData)
      .join("rect")
        .attr("x", d => x0(d.gender) + x1(d.condition))
        .attr("y", d => y(d.count))
        .attr("width", x1.bandwidth())
        .attr("height", d => y(0) - y(d.count))
        .attr("fill", d => color(d.condition));
  
    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right - 100},${margin.top})`);
  
    mentalHealthTypes.forEach((type, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(0,${i * 20})`);
      g.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(type));
      g.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(type);
    });
  }

  function drawView2(data) {
    const svg = d3.select("#view2 svg");
    const width = +svg.attr("width") || 600;
    const height = +svg.attr("height") || 460;
    const margin = { top: 40, right: 30, bottom: 100, left: 60 }; // more bottom margin
    svg.selectAll("*").remove();
  
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
  
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // normalized (percentage) data
    const treatmentByGender = d3.rollups(
      data,
      v => {
        const total = v.length;
        const yesCount = v.filter(d => d["Did you seek any specialist for a treatment?"] === "Yes").length;
        const noCount = total - yesCount;
        return {
          Yes: (yesCount / total) * 100,
          No: (noCount / total) * 100
        };
      },
      d => d["Choose your gender"]
    );
  
    const genders = treatmentByGender.map(d => d[0]);
    const treatmentTypes = ["Yes", "No"];
  
    const x0 = d3.scaleBand()
      .domain(genders)
      .rangeRound([0, innerWidth])
      .paddingInner(0.2);
  
    const x1 = d3.scaleBand()
      .domain(treatmentTypes)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.1);
  
    const y = d3.scaleLinear()
      .domain([0, 100])
      .nice()
      .range([innerHeight, 0]);
  
    const color = d3.scaleOrdinal()
      .domain(treatmentTypes)
      .range(["#1f77b4", "#ff7f0e"]);
  
    // drawing bars
    g.selectAll("g")
      .data(treatmentByGender)
      .join("g")
      .attr("transform", d => `translate(${x0(d[0])},0)`)
      .selectAll("rect")
      .data(d => treatmentTypes.map(key => ({ key, value: d[1][key] })))
      .join("rect")
      .attr("x", d => x1(d.key))
      .attr("y", d => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", d => innerHeight - y(d.value))
      .attr("fill", d => color(d.key));
  
    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0));
  
    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => d + "%"));
  
    // Axis labels
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text("Gender");
  
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text("Percentage of Students");
  
    // legend below chart
    const legend = svg.append("g")
      .attr("transform", `translate(${width / 2 - 50}, ${height - 35})`);
  
    treatmentTypes.forEach((treatment, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(${i * 100}, 0)`);
  
      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(treatment));
  
      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(treatment);
    });
  }

  function drawView3(data) {
    const svg = d3.select("#view3 svg");
    svg.selectAll("*").remove();
  
    const width = +svg.attr("width");
    const height = +svg.attr("height");
   
    const sankeyData = {
      nodes: [
        { name: "Depression" },
        { name: "Anxiety" },
        { name: "Panic" },
        { name: "Sought Treatment" },
        { name: "Did Not Seek" }
      ],
      links: []
    };
  
    const conditions = ["Depression", "Anxiety", "Panic"];
    const treatmentKey = "Did you seek any specialist for a treatment?";
  
    // count flows
    conditions.forEach(condition => {
      const yesCount = data.filter(d => d[`Do you have ${condition}?`] === "Yes" && d[treatmentKey] === "Yes").length;
      const noCount = data.filter(d => d[`Do you have ${condition}?`] === "Yes" && d[treatmentKey] === "No").length;
  
      sankeyData.links.push({
        source: condition,
        target: "Sought Treatment",
        value: yesCount
      });
      sankeyData.links.push({
        source: condition,
        target: "Did Not Seek",
        value: noCount
      });
    });
  
    // build index map
    const nameToIndex = new Map(sankeyData.nodes.map((d, i) => [d.name, i]));
    sankeyData.links.forEach(link => {
      link.source = nameToIndex.get(link.source);
      link.target = nameToIndex.get(link.target);
    });
  
    // Sankey layout
    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[1, 1], [width - 1, height - 6]]);
  
    const { nodes, links } = sankey({
      nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
      links: sankeyData.links.map(d => Object.assign({}, d))
    });
  
    // drawing links
    svg.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "#aaa")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("opacity", 0.7);
  
    // drawing nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g");
  
    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => d3.schemeCategory10[d.index % 10]);
  
    node.append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => d.name)
      .filter(d => d.x0 < width / 2)
      .attr("x", d => d.x1 + 6)
      .attr("text-anchor", "start");
  }
  