"use strict";


function readCSSVariableAsNumber(variableName) {
    return parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--' + variableName), 10);
}


class Climb {
    /**
     * @param {string} name
     * @param {string} url
     * @param {boolean} visible
     */
    constructor (name, url, visible = true) {
        this.name = name;
        this.url = Climb.CLIMB_URL_PREFIX + url + Climb.CLIMB_URL_SUFFIX;
        this.visible = visible;
        /** @type {{ distance: number[], altitude: number[] }[]} */
        this.data = null;
    }
}
Climb.CLIMB_URL_PREFIX = 'climbs/';
Climb.CLIMB_URL_SUFFIX = '.json';


class ClimbApp {

    constructor () {
        this.pageLoadingPromise = null;
    }

    /**
     * @return {void}
     */
    async run() {
        const downloadPromise = this.downloadData();
        const domPromise = this.waitForDomContentLoaded();
        const promises = await Promise.all([downloadPromise, domPromise]);

        /** @type {Climb[]} */
        const climbs = promises[0];

        this.climbChart = null;
        this.climbChartContainer = null;
        this.distanceScale = null;
        this.altitudeScale = null;
        this.lineFunction = null;

        this.checkBoxTemplate = document.getElementById('climb-checkbox-template');
        this.checkBoxContainer = document.getElementById('climb-checkbox-container');
        this.prepareChart(climbs);

        for (const climb of climbs) {
            this.loadClimbComponents(climb);
        }
    }

    /**
     * Chart setup stuff.
     * @param {Climb[]} climbs
     */
    prepareChart(climbs) {
        this.climbChart = d3.select('#climb-chart').append('g').attr('transform', 'translate(0,0)');

        const MARGIN_RIGHT = readCSSVariableAsNumber('margin-right');
        const WIDTH = readCSSVariableAsNumber('width') - MARGIN_RIGHT;
        const HEIGHT = readCSSVariableAsNumber('height');
        const PADDING = readCSSVariableAsNumber('padding');

        // domain extent
        const visibleClimbs = climbs.filter(climb => climb.visible);
        const maximumDistance = d3.max(visibleClimbs, climb => climb.data.distance[climb.data.distance.length - 1]);
        const maximumAltitude = d3.max(visibleClimbs, climb => d3.max(climb.data.altitude));

        // scales
        this.distanceScale = d3.scaleLinear().range([PADDING, WIDTH - PADDING]).domain([0, maximumDistance]);
        this.altitudeScale = d3.scaleLinear().range([HEIGHT - PADDING * 2, PADDING]).domain([0, maximumAltitude]);

        // x axis
        const xAxis = d3.axisBottom(this.distanceScale);
        this.climbChart.append('g').attr('transform', `translate(0, ${HEIGHT - PADDING * 2})`)
            .classed('axis x-axis', true)
            .call(xAxis)
            .append('text')
            .classed('axis-description', true)
            .attr('transform', `translate(${this.distanceScale(maximumDistance / 2)}, 40)`)
            .attr('text-anchor', 'middle')
            .text('Distance (meters)');

        // y axis
        const yAxis = d3.axisLeft(this.altitudeScale);
        this.climbChart.append('g').attr('transform', `translate(${PADDING}, 0)`)
            .classed('axis y-axis', true)
            .call(yAxis)
            .append('text')
            .classed('axis-description', true)
            .attr('transform', `translate(${0},${this.altitudeScale(maximumAltitude / 2)}) rotate(270)`)
            .attr('dy', '-45')
            .attr('text-anchor', 'middle')
            .text('Altitude (meters)');

        // prepare line function for every climb that will be drawn
        this.lineFunction = d3.line().x(d => this.distanceScale(d[0])).y(d => this.altitudeScale(d[1]));

        this.climbChartContainer = this.climbChart.append('g');
    }

    /**
     * @param {Climb} climb
     */
    loadClimbComponents(climb) {
        this.makeCheckbox(climb);
        this.drawClimb(climb);
    }

    /**
     * @param {Climb} climb
     */
    makeCheckbox(climb) {
        const component = d3.select(this.checkBoxTemplate.cloneNode(true));
        component.select('input').attr('checked', climb.visible ? '' : null);
        component.select('span').text(climb.name);
        this.checkBoxContainer.appendChild(component.node());
    }

    /**
     * Draw climb.
     * @param {Climb} climb
     */
    drawClimb(climb) {
        // convert to [distance, altitude] pairs
        const climbPairs = climb.data.distance.map((distance, i) => [distance, climb.data.altitude[i]]);
        const group = this.climbChartContainer.append('g');
        group.classed('hidden', !climb.visible);

        group.append('path').data([climbPairs]).classed('line', true).attr('d', this.lineFunction);

        const lastPoint = climbPairs[climbPairs.length - 1];
        const nameX = this.distanceScale(lastPoint[0]);
        const nameY = this.altitudeScale(lastPoint[1]);
        group.append('text')
            .attr('transform', `translate(${nameX}, ${nameY})`)
            .attr('dx', '10')
            .text(climb.name);
    }

    /**
     * Downloads all climb data in parallel, returning a combined promise to the whole thing.
     *
     * @return {Promise<object[]>}
     */
    downloadData() {
        const promises = ClimbApp.CLIMBS
            .map(climb => this.downloadJson(climb.url)
                .then(data => {climb.data = data; return climb}));
        return Promise.all(promises);
    }

    /**
     * Downloads a single JSON file, returning a promise to its content.
     *
     * @param {string} url - url of the file to fetch
     * @return {Promise<object>} json object if success, error in case of failure
     */
    downloadJson(url) {
        return new Promise((resolve, reject) => {
            d3.json(url, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Waits for DOM to load. We don't need window `load` event (which takes place after all scripts and stylesheets
     * have been downloaded), that's why we listen for `DOMContentLoaded`, which takes place right after DOM has
     * finished loading page elements.
     * @returns {Promise}
     */
    waitForDomContentLoaded() {
        if (!this.pageLoadingPromise) {
            // this is the first call; prepare the promise
            this.pageLoadingPromise = new Promise(resolve => {
                if (document.readyState === 'loading') {
                    // document is still loading, so listen for event
                    document.addEventListener("DOMContentLoaded", resolve);
                } else {
                    // we are past loading, at least "interactive" level, and that's just what we need
                    resolve();
                }
            });
        }
        // subsequent calls are just going to return the original promise, be it fulfilled or not
        return this.pageLoadingPromise;
    }
}

ClimbApp.CLIMBS = [
    new Climb("Alpe d'Huez", 'alpe-dhuez'),
    new Climb("Alto de Letras", 'alto-de-letras', false),
    new Climb("Alto da Boa Vista via Itanhangá", 'alto-da-boa-vista-via-itanhanga', false),
    new Climb("Alto da Boa Vista via Tijuca", 'alto-da-boa-vista-via-tijuca', false),
    new Climb("Col d'Izoard", 'col-dizoard'),
    new Climb("Col du Galibier", 'col-du-galibier'),
    new Climb("Estrada das Canoas", 'estrada-das-canoas'),
    new Climb("Mauna Kea", 'mauna-kea', false),
    new Climb("Mesa do Imperador", 'mesa-do-imperador'),
    new Climb("Passo dello Stelvio", 'passo-dello-stelvio', false),
    new Climb("Serra de Petrópolis", 'serra-de-petropolis', false),
    new Climb("Serra do Rio do Rastro", 'serra-do-rio-do-rastro'),
];

const app = new ClimbApp();
app.run();
