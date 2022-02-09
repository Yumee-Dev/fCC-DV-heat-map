fetch(
    'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json'
)
    .then((response) => response.json())
    .then((data) => {
        const { baseTemperature: baseT, monthlyVariance: variances } = data;

        // create svg canvas
        const svg = d3.select('.canvas');
        const svgWidth = document.querySelector('.canvas').clientWidth;
        const svgHeight = document.querySelector('.canvas').clientHeight;
        const padding = [20, 60, 120, 100];

        // calculate cells widths and heights
        const cellWidth = Math.floor(
            (svgWidth - padding[1] - padding[3]) /
            (d3.max(variances, (d) => d.year) -
                d3.min(variances, (d) => d.year) +
                1) +
            1
        );
        const cellHeight = Math.floor(
            (svgHeight - padding[0] - padding[2]) / 12 + 3
        );

        // set x and y scales
        const xScale = d3
            .scaleLinear()
            .domain(d3.extent(variances, (d) => d.year))
            .range([padding[3], svgWidth - padding[1]]);
        const yScale = d3
            .scaleLinear()
            .domain(d3.extent(variances, (d) => new Date(0, d.month - 1)))
            .range([padding[0], svgHeight - padding[2]]);

        // create axes
        const xAxis = d3.axisBottom(xScale).tickFormat((x) => x.toString());
        const formatTime = d3.timeFormat('%B');
        const yAxis = d3
            .axisLeft(yScale)
            .tickValues([..._.range(12).map(i => new Date(0, i))])
            .tickFormat((y) => formatTime(y));
        svg
            .append('g')
            .attr('transform', `translate(0, ${svgHeight - padding[2] + cellHeight / 2})`)
            .attr('id', 'x-axis')
            .call(xAxis);
        svg
            .append('g')
            .attr('transform', `translate(${padding[3]}, 0)`)
            .attr('id', 'y-axis')
            .call(yAxis);
        svg.select('#y-axis').select('.domain').attr('stroke', null);

        // add y-axis title
        svg
            .append('text')
            .attr('x', -Math.floor(svgHeight / 2))
            .attr('y', padding[3] - 70)
            .style('font-size', '.8rem')
            .text('Months')
            .style('transform', 'rotate(-90deg)');

        // form temperature scale
        const tScaleN = 9;
        const tScale = d3
            .scaleQuantize()
            .domain(d3.extent(variances, (d) => d.variance))
            .range(_.range(tScaleN));

        // create cells for each data point
        const formatMonth = (month) => {
            switch (month) {
                case 1:
                    return 'January';
                case 2:
                    return 'February';
                case 3:
                    return 'March';
                case 4:
                    return 'April';
                case 5:
                    return 'May';
                case 6:
                    return 'June';
                case 7:
                    return 'July';
                case 8:
                    return 'August';
                case 9:
                    return 'September';
                case 10:
                    return 'October';
                case 11:
                    return 'November';
                case 12:
                    return 'December';
            }
            return '';
        };
        svg
            .selectAll('rect')
            .data(variances)
            .enter()
            .append('rect')
            .attr('x', (d) => xScale(d.year))
            .attr('y', (d) => Math.floor(yScale(new Date(0, d.month - 1)) - cellHeight / 2))
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('class', 'cell')
            .attr('fill', (d) => {
                let hue;
                let lightness;
                if (tScale(d.variance) < (tScaleN - 1) / 2) {
                    hue = Math.floor(240 - tScale(d.variance) * (120 / tScaleN));
                    lightness = 60;
                } else if (tScale(d.variance) === Math.floor((tScaleN - 1) / 2)) {
                    hue = 120;
                    lightness = 100;
                } else {
                    hue = Math.floor(
                        60 - (tScale(d.variance) - (tScaleN - 1) / 2) * (120 / tScaleN)
                    );
                    lightness = 60;
                }
                return `hsl(${hue}, 80%, ${lightness}%)`;
            })
            .attr('data-month', (d) => d.month - 1)
            .attr('data-year', (d) => d.year)
            .attr('data-temp', (d) => baseT + d.variance)

            // show tooltip on bar:hover
            .on('mouseover', (event, d) => {
                const tooltip = d3.select('#tooltip');
                tooltip
                    .style('display', 'block')
                    .style(
                        'left',
                        `calc(${xScale(d.year - 1)}px - ${Math.floor(5 + formatMonth(d.month).length / 2) / 2
                        }rem)`
                    )
                    .style('top', `calc(${yScale(new Date(0, d.month - 1)) - 8 * 2 - 28}px - 3rem)`)
                    .style(
                        'width',
                        Math.floor(5 + formatMonth(d.month).length / 2) + 'rem'
                    )
                    .html(
                        `${d.year} - ${formatMonth(d.month)}<br>${(
                            baseT + d.variance
                        ).toFixed(1)}&deg;C<br>${d.variance.toFixed(1)}&deg;C`
                    )
                    .attr('data-year', d.year);
            })
            .on('mouseout', (event, d) => {
                const tooltip = d3.select('#tooltip');
                tooltip.style('display', 'none');
            });

        // add legend
        const legendSvg = d3.select('#legend');
        const legendWidth = document.querySelector('#legend').clientWidth;
        const legendHeight = document.querySelector('#legend').clientHeight;
        const [minT, maxT] = d3.extent(variances, (d) => baseT + d.variance);
        const step = (maxT - minT) / tScaleN;
        const legendScale = d3
            .scaleLinear()
            .domain([minT, maxT])
            .range([padding[3], Math.floor((legendWidth - padding[1]) / (legendWidth < 500 ? 1 : legendWidth < 800 ? 2 : 4))]);
        const legendAxis = d3
            .axisBottom(legendScale)
            .tickValues(_.range(tScaleN + 1).map((i) => minT + i * step))
            .tickFormat((l) => l.toFixed(1));
        legendSvg
            .append('g')
            .attr(
                'transform',
                `translate(0, ${legendHeight - 50})`
            )
            .attr('id', 'legend-axis')
            .call(legendAxis);
        _.range(tScaleN)
            .map((i) => minT + i * step)
            .forEach((legendStart, index) => {
                let hue;
                let lightness;
                if (index < (tScaleN - 1) / 2) {
                    hue = Math.floor(240 - index * (120 / tScaleN));
                    lightness = 60;
                } else if (index === Math.floor((tScaleN - 1) / 2)) {
                    hue = 120;
                    lightness = 100;
                } else {
                    hue = Math.floor(60 - (index - (tScaleN - 1) / 2) * (120 / tScaleN));
                    lightness = 60;
                }
                legendSvg
                    .append('rect')
                    .attr('x', legendScale(legendStart))
                    .attr('y', legendHeight - 70)
                    .attr(
                        'width',
                        (Math.floor((legendWidth - padding[1]) / (legendWidth < 500 ? 1 : legendWidth < 800 ? 2 : 4)) - padding[3]) / tScaleN
                    )
                    .attr('height', 20)
                    .attr('fill', `hsl(${hue}, 80%, ${lightness}%)`)
                    .attr('stroke', 'black')
                    .attr('stroke-width', '1px');
            });
    })
    .catch((error) => console.log(error));
