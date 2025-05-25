
d3.csv("survey 605.csv", d3.autoType).then(data => {
    // svg width and height constants
    const svgW = 700, svgH = 450;
    // margins for axes and legends
    const margin = { top: 60, right: 300, bottom: 100, left: 60 };
    // append an svg element to the #chart div
    // this is where all our visual elements will go
    const chart = d3.select('#chart').append('svg')
      .attr('width', svgW)
      .attr('height', svgH);
  

  
    const exerciseCats = [
      'Less than once a week',
      '1-2 times a week',
      '3-4 times a week',
      '5 or more times a week'
    ];
  
    // track whether we are in 'bar' or 'pie' view
    let viewMode = 'bar';
    // grab references to the controls
    const groupSelect = d3.select('#groupSelect');
    const toggleBtn = d3.select('#toggleBtn');
    const clearBtn  = d3.select('#clearBtn');
  
    let brush;
  
    // set up click handler for view toggle button
    toggleBtn.on('click', () => {
      viewMode = viewMode === 'bar' ? 'pie' : 'bar';
      // update the button text to reflect the next action
      toggleBtn.text(viewMode === 'bar' ? 'show pie' : 'show bars');
      // redraw the chart in the new mode
      updateChart();
    });
  
    // set up click handler for clear selection button
    clearBtn.on('click', () => {
      // if a brush exists, move it to null (clears selection)
      if (brush) chart.select('.brush').call(brush.move, null);
      // restore full opacity to all bars
      chart.selectAll('rect').transition().style('opacity', 1);
    });
  
    // when the dropdown value changes, redraw the chart
    groupSelect.on('change', updateChart);
    // initial draw
    updateChart();
  
    // this function decides which chart to draw
    function updateChart() {

      // get the selected field from the dropdown
      const groupField = groupSelect.property('value');

      // clear out any existing shapes or axes
      chart.selectAll('*').remove();

      // call drawPie or drawBar depending on viewMode
      if (viewMode === 'pie') drawPie(data, groupField);
      else drawBar(data, groupField);
    }
  
    // function to draw the bar chart view
    function drawBar(data, groupField) {
      // first prepare the counts array
      let counts;
      if (groupField === 'none') {
        // rollup counts by exercise category
        const roll = d3.rollup(
          data,
          v => v.length,
          d => d['How often do you exercise in a week?']
        );
        // convert to array of {key, val}
        counts = exerciseCats.map(key => ({ key, val: roll.get(key) || 0 }));
      } else {
        // rollup counts by exercise category then by the groupField
        const roll = d3.rollup(
          data,
          v => v.length,
          d => d['How often do you exercise in a week?'],
          d => d[groupField]
        );
        // get unique group values
        const groups = Array.from(new Set(data.map(d => d[groupField])));
        counts = [];
        // for each exercise category, push entries for each subgroup
        exerciseCats.forEach(freq => {
          const sub = roll.get(freq) || new Map();
          groups.forEach(grp => counts.push({ freq, grp, val: sub.get(grp) || 0 }));
        });
      }
  
      // create x-scale for exercise categories
      const x0 = d3.scaleBand()
        .domain(exerciseCats)
        .range([margin.left, svgW - margin.right])
        .padding(0.2);
      let x1, colorDomain;
      if (groupField === 'none') {
        // no subgroup, use exerciseCats for legend
        colorDomain = exerciseCats;
      } else {
        // subgroup, use unique group values
        const groups = Array.from(new Set(counts.map(d => d.grp)));
        x1 = d3.scaleBand()
          .domain(groups)
          .range([0, x0.bandwidth()])
          .padding(0.1);
        colorDomain = groups;
      }
  
      // y-scale for counts, adding 10% headroom
      const maxVal = d3.max(counts, d => d.val) || 0;
      const y = d3.scaleLinear()
        .domain([0, maxVal * 1.1]).nice()
        .range([svgH - margin.bottom, margin.top]);
  
      // color scale for bars
      const color = d3.scaleOrdinal(d3.schemeTableau10).domain(colorDomain);
  
      // append x-axis at bottom
      chart.append('g')
        .attr('transform', `translate(0,${svgH - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
          .attr('transform', 'rotate(-45)')
          .style('text-anchor', 'end');
      // append y-axis on left
      chart.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(Math.ceil(maxVal)));
  
      // group to hold bars
      const barG = chart.append('g');
      // bind data and draw rectangles
      barG.selectAll('rect')
        .data(counts)
        .join('rect')
        .attr('x', d => groupField === 'none'
          ? x0(d.key)
          : x0(d.freq) + x1(d.grp)
        )
        .attr('width', d => groupField === 'none'
          ? x0.bandwidth()
          : x1.bandwidth()
        )
        .attr('y', y(0))           // start at y=0 (bottom)
        .attr('height', 0)         // initial height zero for transition
        .attr('fill', d => groupField === 'none'
          ? color(d.key)
          : color(d.grp)
        )
        .transition().duration(800)
          .attr('y', d => y(d.val))          // transition bar rising
          .attr('height', d => y(0) - y(d.val));
  
      // add brushing to highlight bars
      brush = d3.brushX()
        .extent([[margin.left, margin.top], [svgW - margin.right, svgH - margin.bottom]])
        .on('end', ({selection}) => {
          if (!selection) {
            // no selection, reset opacity
            barG.selectAll('rect').transition().style('opacity', 1);
            return;
          }
          const [x0b, x1b] = selection;
          // fade bars outside selection
          barG.selectAll('rect').transition().style('opacity', d => {
            const cx = groupField === 'none'
              ? x0(d.key) + x0.bandwidth()/2
              : x0(d.freq) + x1(d.grp) + x1.bandwidth()/2;
            return (cx >= x0b && cx <= x1b) ? 1 : 0.2;
          });
        });
      // attach brush to chart
      chart.append('g').attr('class','brush').call(brush);
  
      // draw legend to explain colors
      const legend = chart.append('g')
        .attr('transform', `translate(${svgW - margin.right + 20},${margin.top})`);
      colorDomain.forEach((k, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 20})`);
        row.append('rect').attr('width', 15).attr('height', 15).attr('fill', color(k));
        row.append('text').attr('x', 20).attr('y', 12).text(k);
      });
  
      // add axis labels and chart title
      chart.append('text')
        .attr('class','axis-label')
        .attr('x', svgW/2).attr('y', svgH - 20)
        .attr('text-anchor','middle').text('exercise frequency');
      chart.append('text')
        .attr('class','axis-label')
        .attr('transform','rotate(-90)')
        .attr('x', -svgH/2).attr('y',20)
        .attr('text-anchor','middle').text('count');
      const title = groupField === 'none'
        ? 'exercise frequency overview'
        : `exercise frequency by ${groupField}`;
      chart.append('text')
        .attr('x', svgW/2).attr('y', margin.top/2)
        .attr('text-anchor','middle').style('font-size','18px')
        .style('font-weight','bold').text(title);
    }
  
    // function to draw pie chart view
    function drawPie(data, groupField) {
      let entries;
      // preparing data depending on grouping
      if (groupField === 'none') {
        const roll = d3.rollup(
          data, v => v.length, d => d['How often do you exercise in a week?']
        );
        entries = exerciseCats.map(key => ({ key, value: roll.get(key) || 0 }));
      } else {
        const roll = d3.rollup(data, v => v.length, d => d[groupField]);
        entries = Array.from(roll, ([key, value]) => ({ key, value }));
      }
      // compute total for percentages
      const total = d3.sum(entries, d => d.value);
      // radius for pie slices
      const radius = Math.min(
        svgW - margin.left - margin.right,
        svgH - margin.top - margin.bottom
      ) / 2;
      const pie = d3.pie().value(d => d.value);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
  
      // center the pie chart
      const cx = margin.left + radius;
      const cy = margin.top + radius;
      const g = chart.append('g').attr('transform', `translate(${cx},${cy})`);
  
      // draw slices with tween animation
      g.selectAll('path')
        .data(pie(entries))
        .join('path')
        .attr('fill', (_, i) => d3.schemeTableau10[i])
        .transition().duration(800)
        .attrTween('d', d => {
          const interp = d3.interpolate(
            { startAngle: d.startAngle, endAngle: d.startAngle }, d
          );
          return t => arc(interp(t));
        });
  
      // legend with percentages next to labels
      const legend = chart.append('g')
        .attr('transform', `translate(${svgW - margin.right + 20},${margin.top})`);
      entries.forEach((d, i) => {
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
        const row = legend.append('g').attr('transform', `translate(0,${i * 20})`);
        row.append('rect').attr('width', 15).attr('height', 15).attr('fill', d3.schemeTableau10[i]);
        row.append('text').attr('x', 20).attr('y', 12)
          .text(`${d.key} (${pct}%)`);
      });
  
      // pie chart title
      const title = groupField === 'none'
        ? 'exercise frequency distribution (pie)'
        : `${groupField} distribution (pie)`;
      chart.append('text')
        .attr('x', svgW / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .text(title);
    }
  });