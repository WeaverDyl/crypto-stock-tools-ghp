$(document).ready(function() {
    generateBitcoinChart();
});

/**
 * Fills an array with the past 30 days represented as strings
 */
function dateAxis() {
    var past30Days = [];
    var dateString = new Date().toISOString().split('T')[0].split('-');

    var date = new Date(dateString[0], dateString[1] - 1, dateString[2]);

    // Add the past 30 days for the x-axis in 'mm-dd' format
    for (var i = 30; i > 0; i--) {
        past30Days.push(new Date(date.getFullYear(), date.getMonth(), date.getDate() - i).format('mm-dd'))
    }
    return past30Days;
}

/**
 * Gets price data for various cryptocurrencies
 * @param {String} coin The specific cryptocurrency to get price data for
 * @param {Number} limit The number of days to return data for
 */
function getCoinValue(coin, limit) {
    // Set URL based on given coin and the given limit
    var url = `https://min-api.cryptocompare.com/data/histoday?fsym=${coin}&tsym=USD&limit=${limit}&aggregate=1`;

    // Return JSON parse
    return $.ajax({
        url: url,
        async: false
    });
}

function generateBitcoinChart() {
    var limit = 30; // Only get the past 30 days of data
    var bitcoinValues = [];
    var ethereumValues = [];
    var litecoinValues = [];
    var bitcoinCashValues = [];
    var dashValues = [];

    // Get Bitcoin prices for past 30 days
    $.when(getCoinValue("BTC", limit)).then(function(data) {
        for (var i = 0; i < limit; i++) {
            bitcoinValues.push((data["Data"][i]).close);
        }
    });

    // Get Ethereum prices for past 30 days
    $.when(getCoinValue("ETH", limit)).then(function(data) {
        for (var i = 0; i < limit; i++) {
            ethereumValues.push((data["Data"][i]).close);
        }
    });

    // Get Litecoin prices for past 30 days
    $.when(getCoinValue("LTC", limit)).then(function(data) {
        for (var i = 0; i < limit; i++) {
            litecoinValues.push((data["Data"][i]).close);
        }
    });

    // Get Bitcoin Cash prices for past 30 days
    $.when(getCoinValue("BCH", limit)).then(function(data) {
        for (var i = 0; i < limit; i++) {
            bitcoinCashValues.push((data["Data"][i]).close);
        }
    });

    // Get Dash prices for past 30 days
    $.when(getCoinValue("DASH", limit)).then(function(data) {
        for (var i = 0; i < limit; i++) {
            dashValues.push((data["Data"][i]).close);
        }
    });

    new Chart(document.getElementById("bitcoinChart"), {
        type: 'line',
        data: {
            labels: dateAxis(),
            datasets: [{
                    data: bitcoinValues,
                    label: "Bitcoin",
                    borderColor: "#FF9900",
                    fill: false
                },
                {
                    data: ethereumValues,
                    label: "Ethereum",
                    borderColor: "#3C3C3D",
                    fill: false
                },
                {
                    data: litecoinValues,
                    label: "Litecoin",
                    borderColor: "#00aeff",
                    fill: false
                },
                {
                    data: bitcoinCashValues,
                    label: "Bitcoin Cash",
                    borderColor: "#ee8c28",
                    fill: false
                },
                {
                    data: dashValues,
                    label: "Dash",
                    borderColor: "#787878",
                    fill: false
                },
            ]
        },
        options: {
            scales: {
                yAxes: [{
                    type: 'logarithmic',
                    ticks: {
                        beginAtZero: true,
                        min: 0,
                        callback: function(tick, index, ticks) {
                            return tick.toLocaleString();
                        },
                    },
                    afterBuildTicks: function(chart) {
                        var maxTicks = 20;
                        var maxLog = Math.log(chart.ticks[0]);
                        var minLogDensity = maxLog / maxTicks;

                        var ticks = [];
                        var currLog = -Infinity;
                        _.each(chart.ticks.reverse(), function(tick) {
                            var log = Math.max(0, Math.log(tick));
                            if (log - currLog > minLogDensity) {
                                ticks.push(tick);
                                currLog = log;
                            }
                        });
                        chart.ticks = ticks;
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Price (USD)'
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Date'
                    }
                }]
            }
        }
    });
}