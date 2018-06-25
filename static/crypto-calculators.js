$(document).ready(function() {
    // Set the maximum date to today for the fear-of-missing-out calculator calendar
    $('#fomo-date').prop('max', new Date().format("yyyy-mm-dd"));

    // Set current cryptocurrency prices on page load
    var $bitcoinElem = $('#bitcoin-to-usd');
    var $ethereumElem = $('#ethereum-to-usd');
    var $litecoinElem = $('#litecoin-to-usd');
    setCalculatePriceResult("BTC", 1, $bitcoinElem);
    setCalculatePriceResult("ETH", 1, $ethereumElem);
    setCalculatePriceResult("LTC", 1, $litecoinElem);
});

// Gets current Bitcoin price
$('#current-bitcoin-price-button').on('click',function() {
    var numCoins = $('#number-of-bitcoins').val(); // The number of coins the user wants the value of
    var $result = $('#bitcoin-to-usd'); // Where to put the resulting value of the coins
    var $errorElem = $('#bitcoin-current-price-error');
    var checkForIssues = priceCalculatorHasIssues(numCoins);

    // Check the `number of coins` field for any issues (neg/NaN)
    if (!checkForIssues) {
        $errorElem.html(""); // Clear any previous errors
        setCalculatePriceResult("BTC", numCoins, $result); // Print the resulting price
    } else {
        // Otherwise, there was an issue
        $result.val(""); // Reset the price back to the placeholder `?`
        $errorElem.html(checkForIssues); // Let the user know what the issue is
    }
});

// Gets current Ethereum price
$('#current-ethereum-price-button').on('click',function() {
    var numCoins = $('#number-of-ethereum').val(); // The number of coins the user wants the value of
    var $result = $('#ethereum-to-usd'); // Where to put the resulting value of the coins
    var $errorElem = $('#ethereum-current-price-error');
    var checkForIssues = priceCalculatorHasIssues(numCoins);

    // Check the `number of coins` field for any issues (neg/NaN)
    if (!checkForIssues) {
        $errorElem.html(""); // Clear any previous errors
        setCalculatePriceResult("ETH", numCoins, $result); // Print the resulting price
    } else {
        // Otherwise, there was an issue
        $result.val(""); // Reset the price back to the placeholder `?`
        $errorElem.html(checkForIssues); // Let the user know what the issue is
    }
});

// Gets current Litecoin price
$('#current-litecoin-price-button').on('click',function() {
    var numCoins = $('#number-of-litecoin').val(); // The number of coins the user wants the value of
    var $result = $('#litecoin-to-usd'); // Where to put the resulting value of the coins
    var $errorElem = $('#litecoin-current-price-error');
    var checkForIssues = priceCalculatorHasIssues(numCoins);

    // Check the `number of coins` field for any issues (neg/NaN)
    if (!checkForIssues) {
        $errorElem.html(""); // Clear any previous errors
        setCalculatePriceResult("LTC", numCoins, $result); // Print the resulting price
    } else {
        // Otherwise, there was an issue
        $result.val(""); // Reset the price back to the placeholder `?`
        $errorElem.html(checkForIssues); // Let the user know what the issue is
    }
});

/**
 * Checks the price calculators for issues, letting the user know what the issue is
 * @param {String} numCoins The number of coins the user is checking the price for
 */
function priceCalculatorHasIssues(numCoins) {
    if (numCoins < 0 || isNaN(numCoins)) {
        return "Please enter a positive number!";
    } else {
        return false;
    }
}

/**
 * Sets the resulting price of a specified number of a specific cryptocurrency in a specified
 * HTML element
 * @param {String} currType The currency, Bitcoin, Ethereum, or Litecoin currently
 * @param {String} numCoins The quantity of the specific currency
 * @param {HTMLElement} resultElem The element to set the result in
 */
function setCalculatePriceResult(currType, numCoins, resultElem) {
    // Wait for the JSON parser to return the value
    $.when(getCurrentPrice(currType, true)).then(function(data) {
        // Then fill the result field with the price of the coin, 
        // multiplied by the number of coins they specified
        resultElem.val((numCoins * data.USD).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
    });
}

// Calculates what the user could have made if they invested in Bitcoin sooner
$('#fomo-calculate-button').on('click',function(){
    var investment = $('#fomo-amount-invested').val();
    var $lossElem = $('#fomo-amount-gained');
    var $resultElem = $('#fomo-result'); // Where to put the resulting value
    var checkForIssues = fomoHasIssues(); // Check if there are issues with any field

    // If none of the fields of the calculator have an issue, actually calculate the earnings
    if (!checkForIssues) {
        $resultElem.html(""); // Clear whatever errors existed
        var enteredDate = new Date($('#fomo-date').val()); // The date entered by the user
        var UnixTimeConversion = enteredDate.getTime() / 1000; // Convert that date to unix time

        // Get historic price of Bitcoin at specified date
        $.when(getHistoricalPrice("BTC", UnixTimeConversion)).then(function(data) { 
            var historic_price = data["BTC"].USD; // The price of Bitcoin on the user-specified date

            // Get current price of Bitcoin
            $.when(getCurrentPrice("BTC", true)).then(function(data) {
                var currPriceBitcoin = data.USD; // The current price of Bitcoin
                // Perform calculation to determine how much the investment turns in to
                var missedEarnings = ((investment / historic_price) * currPriceBitcoin);

                // Put the resulting value in the result field. Also, make it pretty
                $lossElem.val(missedEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }));
            
                // The formatted ROI looks pretty, but the unformatted ROI is easy to pass into the ROIMessage function    
                var roi = getROI(missedEarnings, investment);
                var roiPretty = roi.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // Print the ROI to make the user feel even worse
                $resultElem.html(`Thats a ${roiPretty}% ROI! ` + getROIMessage(roi));
            });
        });
    } else {
        // Otherwise, there was an issue, so tell the user what they did wrong
        $resultElem.html(checkForIssues); // Print the error for the user
        $lossElem.val(""); // Clear any previous calculations
    }
});

/**
 * Checks the fear-of-missing-out calculator for various user caused issues, 
 * such as an empty field or a date in the future. 
 */
function fomoHasIssues() {
    var investmentAmount = $('#fomo-amount-invested').val(); // Numeric investment amount
    var unparsedDate = $('#fomo-date').val(); // Used to check if date field is empty

    // Check for various issues that could arise
    if(isNaN(investmentAmount)) {
        return "Your investment is not a number! Make sure you're entering a numeric investment amount.";
    } else if (investmentAmount < 0) {
        return "Your investment is negative! Make sure your investment amount is positive.";
    } else if (investmentAmount === "") {
        return "You forgot to enter an investment! Enter a numeric investment amount.";
    } else if (!unparsedDate) {
        return "You forgot to enter a date! Either enter a date in mm/dd/yyyy format, or use the attached calendar.";
    }

    // We don't need to check for future dates, because the calendar won't allow a user to set a date in the future.

    // There are no more errors to check!
    return false;
}

/**
 * Calculates the return on investment, given the earnings and amount invested
 * @param {Number} earned The total earnings from the investment
 * @param {Number} invested The initial investment
 */
function getROI(earned, invested) {
    return ((earned - invested) / invested) * 100;
}

/**
 * Makes some snarky comments based on the user's potential return on investment so we seem more human
 * @param {Number} roi The return on investment
 */
function getROIMessage(roi) {
    if (roi <= -10) {
        return "Wow, you potentially saved a lot of money by not investing!";
    } else if (roi < 0) {
        return "Not a huge deal as long as you don't have large investments!";
    } else if (roi == 0) {
        return "Seems like it doesn't matter if you invested or not!";
    } else if (roi >= 15) {
        return "Ouch. You should have invested some money into Bitcoin!";
    } else if (roi > 0) {
        return "Not a huge return on investment, but every little bit counts!";
    } else {
        // Should only ever happen if isNaN(roi) == true
        return "ERROR";
    }
}

// Calculates net worth of a user's cryptocurrencies combined with their USD net worth
$('#networth-calculate-button').on('click',function() {
    var checkForIssues = netWorthHasIssues(); // Checks for any issues (negative/non-numeric fields)
    // If there aren't any issues, we can start calculating net worth!
    if (!checkForIssues) {
        $('#networth-result').html(""); // Clear the result element
        var cryptoNetWorth = getCryptoNetWorth(); // The user's net worth in cryptocurrencies
        var usdNetWorth = Number($('#networth-usd').val()); // The user's net worth in USD
        // How much cryptocurrencies make up the user's net worth as a percentage
        var cryptoAsAPercent = ((cryptoNetWorth / (cryptoNetWorth + usdNetWorth)) * 100).toLocaleString(undefined, {
                                                                                        minimumFractionDigits: 2,
                                                                                        maximumFractionDigits: 2 });
        // Occurs if cryptoNetWorth + usdNetWorth = 0 (division by 0)
        if (isNaN(cryptoAsAPercent)) {
            cryptoAsAPercent = "100.00"; // Just set the percent to 100. 0 is 100% of 0 (in my world) just to make things easy
        }
    
        // Set the result field
        $('#networth-result').html(`Your net worth in cryptocurrency is $${cryptoNetWorth.toLocaleString(undefined, {
                                                                                                minimumFractionDigits: 2,
                                                                                                maximumFractionDigits: 2 })}.
                                                    That's ${cryptoAsAPercent}% of your total net worth!`);
    } else {
        // Otherwise, there was an issue, so let the user know what the issue is
        $('#networth-result').html(checkForIssues);
    }
});

/**
 * Checks the net worth calculator for any user errors
 */
function netWorthHasIssues() {
    // All of the elements which should be filled in
    var netWorthElements = ["#networth-bitcoins", "#networth-ethereum",  "#networth-ripple",  "#networth-bitcoin-cash",  "#networth-litecoin",  "#networth-cardano",
                            "#networth-neo",  "#networth-stellar-lumens",  "#networth-eos",  "#networth-monero",  "#networth-dash",  "#networth-iota", "#networth-usd"];

    // Set all empty fields to zero
    for (var i = 0; i < netWorthElements.length; i++) {
        var currElem = $(netWorthElements[i]);

        if (currElem.val() == "") {
            currElem.val("0");
        }
    }
    
    // Check each element for negative or non-numeric values
    for (var i = 0; i < netWorthElements.length; i++) {
        var currElem = $(netWorthElements[i]);

        if (isNaN(currElem.val())) {
            return "One or more elements have non-numeric values!";
        } else if (currElem.val() < 0) {
            return "Make sure all the elements have positive values!";
        }
    }

    return false; // If we made it this far, there aren't any issues
}

/**
 * Calculates the total net worth of a user's cryptocurrency 'collection'
 */
function getCryptoNetWorth() {
    // All of the cryptocurrency fields
    var coinElems = ["#networth-bitcoins", "#networth-ethereum",  "#networth-ripple",  "#networth-bitcoin-cash",  "#networth-litecoin",  "#networth-cardano",
                     "#networth-neo",  "#networth-stellar-lumens",  "#networth-eos",  "#networth-monero",  "#networth-dash",  "#networth-iota"];
    // All of the cryptocurrency ticker symbols, used to craft URL to get value data
    var coinTickers = ["BTC", "ETH", "XRP", "BCH", "LTC", "ADA", "NEO", "XLM", "EOS", "XMR", "DASH", "IOT"];
    var total = 0; // The total cryptocurrency net worth
    
    for (var i = 0; i < coinElems.length; i++) {
        // Get the user's number of coins for that specific cryptocurrency
        var currElemValue = $(coinElems[i]).val();
        // Optimization - Don't calculate the price of "0 btc" (we know it's $0)
        if (currElemValue > 0) {
            // add to the total the number of coins multiplied by its price
            $.when(getCurrentPrice(coinTickers[i], false)).then(function(data) {
                total += (currElemValue * data.USD);
            });
        }
    }

    return total;
}

/**
 * Gets the current price of a specific cryptocurrency
 * @param {String} cryptoType The specific coin to check the value of (BTC/ETH/LTC)
 * @param {Boolean} asyncVal Sets whether the JSON parses asynchronously or not. Kind of a hack for the net worth calculator
 */
function getCurrentPrice(cryptoType, asyncVal) {
    var url = `https://min-api.cryptocompare.com/data/price?fsym=${cryptoType}&tsyms=USD`; // Set URL based on given coin
    
    // Return JSON parse
    return $.ajax({url: url, async: asyncVal});
}

/**
 * Gets the price of a specified cryptocurrency at a specified date (converted to unix time)
 * @param {String} currType The currency, Bitcoin, Ethereum, or Litecoin currently
 * @param {Number} unix_time The Unix timestamp of the historic date entered
 */
function getHistoricalPrice(currType, unix_time) {
    // Set URL based on given coin and the given date
    var url = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${currType}&tsyms=USD&ts=${unix_time}`;
    
    // Return JSON parse
    return $.getJSON(url, function(data) {});
}

