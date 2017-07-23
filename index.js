"use strict";


function readCSSVariableAsNumber(variableName) {
    return parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--' + variableName), 10);
}


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

        /** @type {{ distance: number[], altitude: number[] }[]} */
        const climbs = promises[0];

        this.climbChart = null;
        this.distanceScale = null;
        this.altitudeScale = null;
        this.lineFunction = null;

        this.prepareChart(climbs);
        for (let climbIndex = 0; climbIndex < climbs.length; climbIndex++) {
            const climb = climbs[climbIndex];
            const climbName = ClimbApp.CLIMB_NAMES[climbIndex];
            this.drawClimb(climb, climbName);
        }
    }

    /**
     * Chart setup stuff.
     * @param {{ distance: number[], altitude: number[] }[]} climbs
     */
    prepareChart(climbs) {
        this.climbChart = d3.select('#climb-chart').append('g').attr('transform', 'translate(0,0)');

        const MARGIN_RIGHT = readCSSVariableAsNumber('margin-right');
        const WIDTH = readCSSVariableAsNumber('width') - MARGIN_RIGHT;
        const HEIGHT = readCSSVariableAsNumber('height');
        const PADDING = readCSSVariableAsNumber('padding');

        const maximumDistance = d3.max(climbs, climb => climb.distance[climb.distance.length - 1]);
        const maximumAltitude = d3.max(climbs, climb => d3.max(climb.altitude));

        console.info(`Maximum distance: ${maximumDistance} meters`);
        console.info(`Maximum altitude: ${maximumAltitude} meters`);

        this.distanceScale = d3.scaleLinear().range([PADDING, WIDTH - PADDING * 2]).domain([0, maximumDistance]);
        this.altitudeScale = d3.scaleLinear().range([HEIGHT - PADDING * 2, PADDING]).domain([0, maximumAltitude]);

        const xAxis = d3.axisBottom(this.distanceScale);
        const yAxis = d3.axisLeft(this.altitudeScale);

        this.climbChart.append('g').attr('transform', `translate(0, ${HEIGHT - PADDING * 2})`).call(xAxis);
        this.climbChart.append('g').attr('transform', `translate(${PADDING}, 0)`).call(yAxis);

        this.lineFunction = d3.line().x(d => this.distanceScale(d[0])).y(d => this.altitudeScale(d[1]));
    }

    /**
     * Draw climb.
     * @param {{ distance: number[], altitude: number[] }} climb
     * @param {string} climbName
     */
    drawClimb(climb, climbName) {
        // convert to [distance, altitude] pairs
        const climbPairs = climb.distance.map((distance, i) => [distance, climb.altitude[i]]);
        this.climbChart.append('path').data([climbPairs]).classed('line', true).attr('d', this.lineFunction);

        const lastPoint = climbPairs[climbPairs.length - 1];
        const nameX = this.distanceScale(lastPoint[0]);
        const nameY = this.altitudeScale(lastPoint[1]);
        this.climbChart.append('text')
            .attr('transform', `translate(${nameX}, ${nameY})`)
            .attr('dx', '10')
            .text(climbName);
    }

    /**
     * Downloads all climb data in parallel, returning a combined promise to the whole thing.
     *
     * @return {Promise<object[]>}
     */
    downloadData() {
        const promises = ClimbApp.CLIMB_URLS
            .map(urlPart => ClimbApp.CLIMB_URL_PREFIX + urlPart + ClimbApp.CLIMB_URL_SUFFIX)
            .map(url => this.downloadJson(url));
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

ClimbApp.CLIMB_URL_PREFIX = 'climbs/';
ClimbApp.CLIMB_URL_SUFFIX = '.json';
ClimbApp.CLIMB_URLS = [
    'alpe-dhuez',
    // 'alto-da-boa-vista-via-itanhanga',
    // 'alto-da-boa-vista-via-tijuca',
    'col-dizoard',
    'col-du-galibier',
    'estrada-das-canoas',
    'mesa-do-imperador',
    // 'serra-de-petropolis',
];
ClimbApp.CLIMB_NAMES = [
    "Alpe d'Huez",
    // "Alto da Boa Vista via Itanhangá",
    // "Alto da Boa Vista via Tijuca",
    "Col d'Izoard",
    "Col du Galibier",
    "Estrada das Canoas",
    "Mesa do Imperador",
    // "Serra de Petropolis",
    // 'Alto da Boa Vista via Tijuca', 'Mesa do Imperador',
];

const app = new ClimbApp();
app.run();
