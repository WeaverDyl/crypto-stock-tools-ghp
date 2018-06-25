$(document).ready(function() {
    // Elements for stock price calculator info
    var allElements = ["#stock-info", "#daily-high-div", "#daily-low-div", "#daily-change-div", "#yearly-change-div", "#52-week-high-div", "#52-week-low-div",
                        "#up-daily", "#down-daily", "#steady-daily", "#up-yearly", "#down-yearly", "#steady-yearly"];

    // Hide all of the above elements (only shown when a stock ticker symbol is calculated)
    for (var i = 0; i < allElements.length; i++) {
        $(allElements[i]).hide();
    }

    // Handles the autocomplete forms
    function autoComplete() {
        $(".autocompleted").each(function(){
            $(this).autocomplete({
                minLength: 0, // The minimum string length for the autocomplete to kick in
                source: function(request, response) {
                    var results = [];
                    $.each(tickers, function(k, v) {
                        if (v.label.toLowerCase().indexOf(request.term.toLowerCase()) != -1) {
                            results.push(v);
                            return;
                        }
                        if (v.value.toLowerCase().indexOf(request.term.toLowerCase()) != -1) {
                            results.push(v);
                        }
                    });
                    response(results.slice(0, 5)); // Limit result set to 5 results. Significant speedup
                },
                select: function(event, ui) {
                    $(this).val(ui.item.value);
                    return false;
                }
            }).autocomplete("instance")._renderItem = function(ul, item) { // Adds value (ticker symbol) to autocomplete
                return $("<li>")
                .append("<div>" + item.value + "<br>" + item.label + "</div>")
                .appendTo(ul);
            };
        });
    }
    autoComplete(); // Set up the already existing autocompleted forms

    var portfolioFieldCounter = 2; // The value of portfolio field to add ('1' is the default one)    
    // Add a new portfolio entry field
    $("#portfolio-add-button").click(function () {
        // If the user tries to add too many entry (10, right now), alert them that they can't add more
        if (portfolioFieldCounter > 10) {
            $('#portfolio-result').html("You can't add any more fields!");
            return false;
        }   
        $('#portfolio-result').html(""); // Clear the result
            
        // Creates div with id and CSS styling
        var newPortfolioEntry = $(document.createElement('div')).attr("id", "portfolio-entry-" + portfolioFieldCounter).attr("class", 'center vertical-bottom');
                    
        // Template for new entry with variable counter
        newPortfolioEntry.after().html(
            '<input id="portfolio-quantity-' + portfolioFieldCounter + '"class="form-control text-center" type="text" value="1" style="width: 100px" autocomplete="off">' +
            '<h3 class="horizontal lead">x</h3>' + 
            '<input id="portfolio-company-' + portfolioFieldCounter + '" class="form-control text-center autocompleted" type="text" style="width: 200px" placeholder="MSFT, AAPL, AMZN" autocomplete="off">'
        );
                
        // Adds the new entry to the portfolio-fields div
        newPortfolioEntry.appendTo("#portfolio-fields");
        autoComplete(); // Makes the new form use autocomplete
       
        portfolioFieldCounter++;
    });

    // Remove a field. One must remain (can't remove all)
    $("#portfolio-remove-button").click(function () {
        // If there's only one entry remaining, don't delete it. Always leave at least one
        if (portfolioFieldCounter == 2) {
            $('#portfolio-result').html("You can't remove any more fields!");
            return false;
        }
        $('#portfolio-result').html(""); // Clear the result
	    portfolioFieldCounter--;
            
        // Actually remove the entry
        $("#portfolio-entry-" + portfolioFieldCounter).remove();
    });

    // Calculates total portfolio worth
    $("#portfolio-calculate-button").click(function () {
        var checkForIssues = portfolioHasIssues(); // Check for errors (negative quantity, invalid ticker, etc)

        // If there aren't any issues, calculate the total and print the result
        if (!checkForIssues) {
            // Set each stock quantity to be its integer value
            for (var i = 1; i < portfolioFieldCounter; i++) {
                $('#portfolio-quantity-' + i).val(parseInt($('#portfolio-quantity-' + i).val()));
            }

            var total = getPortfolioNetWorth().toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            $('#portfolio-result').html(`Your portfolio is worth $${total}!`); // Print the formatted price
        } else {
            // Otherwise, if there was an issue, let the user know what it was
            $('#portfolio-result').html(checkForIssues);
        }
    });

    /**
     * Checks portfolio adder for issues (negative/non-numeric fields)
     */
    function portfolioHasIssues() {
        // Check each individual entry for the same issues
        for (var i = 1; i < portfolioFieldCounter; i++) {
            var numberOfStocks = parseInt($('#portfolio-quantity-' + i).val()); // The quantity of stocks for the current element
            var userTicker = $('#portfolio-company-' + i).val(); // the ticker symbol for the current element

            if (numberOfStocks < 0) {
                return "Make sure all entries have a positive stock quantity!";
            } else if (isNaN(numberOfStocks)) {
                return "Make sure all entries have a numeric stock quantity!";
            } else if (userTicker == "") {
                return "Make sure all entries have a ticker symbol!";
            } else if (!validTicker(userTicker)) {
                // Checks if the ticker that the user entered is actually a valid ticker in the above array
                return "Make sure all entries have a valid ticker symbol!";
            }
        }

        return false; // There were no issues, so return false
    }

    /**
     * Calculates the net worth of a user's stock portfolio
     */
    function getPortfolioNetWorth() {
        var result = 0; // Represents the user's net worth

        // Go through each stock entry that the user has
        for (var i = 1; i < portfolioFieldCounter; i++) {
            numberOfStocks = $('#portfolio-quantity-' + i).val(); // The quantity of stocks for the current entry
            userTicker = $('#portfolio-company-' + i).val(); // The ticker symbol for the current entry
            $('#portfolio-company-' + i).val(userTicker.toUpperCase()); // Change the ticker to uppercase for A E S T H E T I C S

            //Get the stock price, and add it to the total net worth
            $.when(getStockPrice(userTicker, false)).then(function(data) { 
                result += ((numberOfStocks * data.latestPrice));
            });   
        }

        // The result now contains the sum of each stock multiplied by its quantity. Return it
        return result;
    }
});

// Calculates the given ticker's stock price
$('#stock-price-calculate-button').on('click',function() {
    var numberOfStocks = parseInt($('#stock-price-quantity').val());
    var userTicker = $('#stock-price-ticker').val(); // The ticker symbol that was input
    var $resultElem = $('#stock-price-cost'); // Where to put the resulting value from the calculation
    var $errorElem = $('#stock-price-error'); // Where to print any errors that occur
    var checkForIssues = stockCalculatorHasIssues(numberOfStocks, userTicker); // Check for any issues the user may have made
    var allElements = ["#stock-info", "#daily-high-div", "#daily-low-div", "#daily-change-div", "#yearly-change-div", "#52-week-high-div", "#52-week-low-div",
                        "#up-daily", "#down-daily", "#steady-daily", "#up-yearly", "#down-yearly", "#steady-yearly"];
    
    // If there aren't issues, perform the calculation and print the result
    if (!checkForIssues) {
        $('#stock-price-quantity').val(numberOfStocks); // Convert any decimal stocks to their integer value (1.9 becomes 1)
        $('#stock-price-ticker').val(userTicker.toUpperCase()); // Change the ticker to uppercase
        // Get the stock price, and print the output
        $.when(getStockPrice(userTicker, true)).then(function(data) { 
            // Format the result to look nice
            var result = (numberOfStocks * data.latestPrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            $('#stock-price-error').html(""); // If there was a previous error, clear it
            $resultElem.val(`${result}`); // Print the formatted price

            showStockInformation(userTicker.toUpperCase()); // Show various information about the selected stock (highs/lows/pct change)
        });   
    } else {
        // Hide any previous stock information
        for (var i = 0; i < allElements.length; i++) {
            $(allElements[i]).hide();
        }
        $errorElem.html(checkForIssues); // Otherwise, there were issues, so let the user know what they did wrong
    }
});

/**
 * Checks the stock price calculator fields to make sure everything was input correctly by the user
 * @param {HTMLElement} numberOfStocks The field containing the number of stocks to calculate the price for
 * @param {HTMLElement} userTicker The company we're calculating the price of stocks for
 */
function stockCalculatorHasIssues(numberOfStocks, userTicker) {
    if (numberOfStocks < 0 || isNaN(numberOfStocks)) {
        return "Please enter a positive number of stocks!";
    } else if (userTicker == "") {
        return "Please enter a ticker symbol!";
    } else if (!validTicker(userTicker)) {
        return "Please enter a valid ticker symbol!";
    }

    return false;
}

/**
 * Checks the ticker list to make sure the user entered a valid ticker symbol
 * @param {String} ticker The ticker symbol entered by the user
 */
function validTicker(ticker) {
    var tickerExists = false; // Assume the ticker symbol is invalid
    
    for (var i = 0; i < tickers.length; i++) {
        if (tickers[i].value == ticker.toUpperCase()) {
            tickerExists = true; // The ticker is valid
        }
    }
    // If the ticker isn't in the list, the ticker is invalid
    if (!tickerExists) { 
        return false;
    } else {
        return true; // The ticker is valid
    }
}

/**
 * Shows various information for the ticker symbol the user selected
 * @param {String} userTicker The ticker symbol selected by the user
 */
function showStockInformation(userTicker) {
    var ticker = $('#stock-price-ticker').val(); // The ticker symbol input by the user
    // Every non-dynamic element (all but images)
    var nonImageElements = [$('#stock-info'), $('#daily-high-div'), $('#daily-low-div'), $('#daily-change-div'), $('#yearly-change-div'), 
                            $('#52-week-high-div'), $('#52-week-low-div')];
    // Every non-dynamic and dynamic elements (all elements, plus images)
    var allElements = [$('#stock-info'), $('#daily-high-div'), $('#daily-low-div'), $('#daily-change-div'), $('#yearly-change-div'), 
                        $('#52-week-high-div'), $('#52-week-low-div'), $('#up-daily'), $('#down-daily'), $('#steady-daily'), $('#up-yearly'), 
                        $('#down-yearly'), $('#steady-yearly')];

    $('#stock-info').html(""); // Clear the "Stock Information For 'XYZ':" text

    // Hide all elements if they weren't already
    $.each(allElements, function() {
        $(this).hide();
    })

    // Get all information needed from IEX API (daily high/low, 52 week high/low, daily/yearly percentage change)
    $.when(getStockPrice(ticker, false)).then(function(data) {
        $('#daily-high-text').val((data.high).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        $('#daily-low-text').val((data.low).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        $('#daily-change-pct').val((data.changePercent * 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        $('#yearly-change-pct').val((data.ytdChange * 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        $('#52-week-high-text').val((data.week52High).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        $('#52-week-low-text').val((data.week52Low).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));

        // If market is closed, let the user know that the data is as of last close
        if (data.latestSource == "Close") {
            // Set the "Stock Information For 'XYZ':" text
            $('#stock-info').append("Stock Information For '" + userTicker + "' (As of Last Close):");
        } else {
            // Otherwise, display as normal
            $('#stock-info').append("Stock Information For '" + userTicker + "':");
        }
    });
    
    // Un-hide everything but images (which need to be shown dynamically) with the updated information
    $.each(nonImageElements, function() {
        $(this).css('display', 'inline-flex');
    })
    // Decide which image to show for daily change, based on the change percentage
    if (Number($('#daily-change-pct').val()) > 0) {
        $('#up-daily').css('display', 'inline-flex');
    } else if (Number($('#daily-change-pct').val()) < 0) {
        $('#down-daily').css('display', 'inline-flex');
    } else {
        $('#steady-daily').css('display', 'inline-flex');
    }

    // Decide which image to show for yearly change, based on the change percentage
    if (Number($('#yearly-change-pct').val()) > 0) {
        $('#up-yearly').css('display', 'inline-flex');
    } else if (Number($('#yearly-change-pct').val()) < 0) {
        $('#down-yearly').css('display', 'inline-flex');
    } else {
        $('#steady-yearly').css('display', 'inline-flex');
    }
}

/**
 * Gets the current price of one stock for a given companies ticker symbol
 * @param {string} tickerSymbol The ticker symbol for the company
 * @param {Boolean} asyncVal Where the function should run asynchronously or not
 */
function getStockPrice(tickerSymbol, asyncVal) {
    var url = `https://api.iextrading.com/1.0/stock/${tickerSymbol}/quote`;
    
    // Return JSON parse
    return $.ajax({url: url, async: asyncVal});
}

// Ticker symbols and company names, used in autocomplete 
var tickers = [            
    {
        value: "A",
        label: "Agilent Technologies Inc."
    },
    {
        value: "AA",
        label: "Alcoa Corporation"
    },
    {
        value: "AABA",
        label: "Altaba Inc."
    },
    {
        value: "AAC",
        label: "AAC Holdings Inc."
    },
    {
        value: "AADR",
        label: "AdvisorShares Dorsey Wright ADR"
    },
    {
        value: "AAL",
        label: "American Airlines Group Inc."
    },
    {
        value: "AAMC",
        label: "Altisource Asset Management Corp Com"
    },
    {
        value: "AAME",
        label: "Atlantic American Corporation"
    },
    {
        value: "AAN",
        label: "Aaron's Inc."
    },
    {
        value: "AAOI",
        label: "Applied Optoelectronics Inc."
    },
    {
        value: "AAON",
        label: "AAON Inc."
    },
    {
        value: "AAP",
        label: "Advance Auto Parts Inc W/I"
    },
    {
        value: "AAPL",
        label: "Apple Inc."
    },
    {
        value: "AAT",
        label: "American Assets Trust Inc."
    },
    {
        value: "AAU",
        label: "Almaden Minerals Ltd."
    },
    {
        value: "AAV",
        label: "Advantage Oil & Gas Ltd"
    },
    {
        value: "AAWW",
        label: "Atlas Air Worldwide Holdings"
    },
    {
        value: "AAXJ",
        label: "iShares MSCI All Country Asia ex Japan Index Fund"
    },
    {
        value: "AAXN",
        label: "Axon Enterprise Inc."
    },
    {
        value: "AB",
        label: "AllianceBernstein Holding L.P. Units"
    },
    {
        value: "ABAC",
        label: "Renmin Tianli Group Inc."
    },
    {
        value: "ABAX",
        label: "ABAXIS Inc."
    },
    {
        value: "ABB",
        label: "ABB Ltd"
    },
    {
        value: "ABBV",
        label: "AbbVie Inc."
    },
    {
        value: "ABC",
        label: "AmerisourceBergen Corporation"
    },
    {
        value: "ABCB",
        label: "Ameris Bancorp"
    },
    {
        value: "ABCD",
        label: "Cambium Learning Group Inc."
    },
    {
        value: "ABDC",
        label: "Alcentra Capital Corp."
    },
    {
        value: "ABEO",
        label: "Abeona Therapeutics Inc."
    },
    {
        value: "ABEOW",
        label: ""
    },
    {
        value: "ABEV",
        label: "Ambev S.A. American Depositary Shares (Each representing 1)"
    },
    {
        value: "ABG",
        label: "Asbury Automotive Group Inc"
    },
    {
        value: "ABIL",
        label: "Ability Inc."
    },
    {
        value: "ABIO",
        label: "ARCA biopharma Inc."
    },
    {
        value: "ABLX",
        label: "Ablynx NV"
    },
    {
        value: "ABM",
        label: "ABM Industries Incorporated"
    },
    {
        value: "ABMD",
        label: "ABIOMED Inc."
    },
    {
        value: "ABR",
        label: "Arbor Realty Trust"
    },
    {
        value: "ABR-A",
        label: "Arbor Realty Trust Preferred Series A"
    },
    {
        value: "ABR-B",
        label: "Arbor Realty Trust Cumulative Redeemable Preferred Series B"
    },
    {
        value: "ABR-C",
        label: "Arbor Realty Trust Cumulative Redeemable Preferred Series C"
    },
    {
        value: "ABT",
        label: "Abbott Laboratories"
    },
    {
        value: "ABTX",
        label: "Allegiance Bancshares Inc."
    },
    {
        value: "ABUS",
        label: "Arbutus Biopharma Corporation"
    },
    {
        value: "ABX",
        label: "Barrick Gold Corporation"
    },
    {
        value: "AC",
        label: "Associated Capital Group Inc."
    },
    {
        value: "ACAD",
        label: "ACADIA Pharmaceuticals Inc."
    },
    {
        value: "ACBI",
        label: "Atlantic Capital Bancshares Inc."
    },
    {
        value: "ACC",
        label: "American Campus Communities Inc"
    },
    {
        value: "ACCO",
        label: "Acco Brands Corporation"
    },
    {
        value: "ACER",
        label: "Acer Therapeutics Inc."
    },
    {
        value: "ACET",
        label: "Aceto Corporation"
    },
    {
        value: "ACGL",
        label: "Arch Capital Group Ltd."
    },
    {
        value: "ACGLO",
        label: "Arch Capital Group Ltd. Depositary Shares Each Representing 1/1000th Interest in a Share of5.45% Non-Cumulative Preferred Shares Series F"
    },
    {
        value: "ACGLP",
        label: "Arch Capital Group Ltd. Depositary Shares Representing Interest in 5.25% Non-Cumulative Preferred Series E Shrs"
    },
    {
        value: "ACH",
        label: "Aluminum Corporation of China Limited American Depositary Shares"
    },
    {
        value: "ACHC",
        label: "Acadia Healthcare Company Inc."
    },
    {
        value: "ACHN",
        label: "Achillion Pharmaceuticals Inc."
    },
    {
        value: "ACHV",
        label: "Achieve Life Sciences Inc."
    },
    {
        value: "ACIA",
        label: "Acacia Communications Inc."
    },
    {
        value: "ACIM",
        label: "SPDR MSCI ACWI IMI"
    },
    {
        value: "ACIU",
        label: "AC Immune SA"
    },
    {
        value: "ACIW",
        label: "ACI Worldwide Inc."
    },
    {
        value: "ACLS",
        label: "Axcelis Technologies Inc."
    },
    {
        value: "ACM",
        label: "AECOM"
    },
    {
        value: "ACMR",
        label: "ACM Research Inc."
    },
    {
        value: "ACN",
        label: "Accenture plc Class A (Ireland)"
    },
    {
        value: "ACNB",
        label: "ACNB Corporation"
    },
    {
        value: "ACOR",
        label: "Acorda Therapeutics Inc."
    },
    {
        value: "ACP",
        label: "Aberdeen Income Credit Strategies Fund"
    },
    {
        value: "ACRE",
        label: "Ares Commercial Real Estate Corporation"
    },
    {
        value: "ACRS",
        label: "Aclaris Therapeutics Inc."
    },
    {
        value: "ACRX",
        label: "AcelRx Pharmaceuticals Inc."
    },
    {
        value: "ACSF",
        label: "American Capital Senior Floating Ltd."
    },
    {
        value: "ACSI",
        label: "American Customer Satisfaction"
    },
    {
        value: "ACST",
        label: "Acasti Pharma Inc."
    },
    {
        value: "ACT",
        label: "AdvisorShares Vice ETF"
    },
    {
        value: "ACTG",
        label: "Acacia Research Corporation"
    },
    {
        value: "ACU",
        label: "Acme United Corporation."
    },
    {
        value: "ACV",
        label: "AllianzGI Diversified Income & Convertible Fund of Beneficial Interest"
    },
    {
        value: "ACWF",
        label: "iShares Edge MSCI Multifactor Global"
    },
    {
        value: "ACWI",
        label: "iShares MSCI ACWI Index Fund"
    },
    {
        value: "ACWV",
        label: "iShares Edge MSCI Min Vol Global"
    },
    {
        value: "ACWX",
        label: "iShares MSCI ACWI ex US Index Fund"
    },
    {
        value: "ACXM",
        label: "Acxiom Corporation"
    },
    {
        value: "ACY",
        label: "AeroCentury Corp."
    },
    {
        value: "ADAP",
        label: "Adaptimmune Therapeutics plc"
    },
    {
        value: "ADBE",
        label: "Adobe Systems Incorporated"
    },
    {
        value: "ADC",
        label: "Agree Realty Corporation"
    },
    {
        value: "ADES",
        label: "Advanced Emissions Solutions Inc."
    },
    {
        value: "ADI",
        label: "Analog Devices Inc."
    },
    {
        value: "ADM",
        label: "Archer-Daniels-Midland Company"
    },
    {
        value: "ADMA",
        label: "ADMA Biologics Inc"
    },
    {
        value: "ADMP",
        label: "Adamis Pharmaceuticals Corporation"
    },
    {
        value: "ADMS",
        label: "Adamas Pharmaceuticals Inc."
    },
    {
        value: "ADNT",
        label: "Adient plc"
    },
    {
        value: "ADOM",
        label: "ADOMANI Inc."
    },
    {
        value: "ADP",
        label: "Automatic Data Processing Inc."
    },
    {
        value: "ADRA",
        label: "Invesco BLDRS Asia 50 ADR Index Fund"
    },
    {
        value: "ADRD",
        label: "Invesco BLDRS Developed Markets 100 ADR Index Fund"
    },
    {
        value: "ADRE",
        label: "Invesco BLDRS Emerging Markets 50 ADR Index Fund"
    },
    {
        value: "ADRO",
        label: "Aduro Biotech Inc."
    },
    {
        value: "ADRU",
        label: "Invesco BLDRS Europe Select ADR Index Fund"
    },
    {
        value: "ADS",
        label: "Alliance Data Systems Corporation"
    },
    {
        value: "ADSK",
        label: "Autodesk Inc."
    },
    {
        value: "ADSW",
        label: "Advanced Disposal Services Inc."
    },
    {
        value: "ADT",
        label: "ADT Inc."
    },
    {
        value: "ADTN",
        label: "ADTRAN Inc."
    },
    {
        value: "ADUS",
        label: "Addus HomeCare Corporation"
    },
    {
        value: "ADVM",
        label: "Adverum Biotechnologies Inc."
    },
    {
        value: "ADX",
        label: "Adams Diversified Equity Fund Inc."
    },
    {
        value: "ADXS",
        label: "Advaxis Inc."
    },
    {
        value: "ADXSW",
        label: "Advaxis Inc. Warrants"
    },
    {
        value: "ADZ",
        label: "DB Agriculture Short ETN due April 1 2038"
    },
    {
        value: "AE",
        label: "Adams Resources & Energy Inc."
    },
    {
        value: "AEB",
        label: "AEGON N.V. Perp. Cap. Secs. Floating Rate (Netherlands)"
    },
    {
        value: "AED",
        label: "AEGON N.V. Perp. Cap. Securities (Netherlands)"
    },
    {
        value: "AEE",
        label: "Ameren Corporation"
    },
    {
        value: "AEF",
        label: "Aberdeen Emerging Markets Equity Income Fund Inc."
    },
    {
        value: "AEG",
        label: "AEGON N.V."
    },
    {
        value: "AEGN",
        label: "Aegion Corp"
    },
    {
        value: "AEH",
        label: "AEGON N.V. Perp. Cap Secs."
    },
    {
        value: "AEHR",
        label: "Aehr Test Systems"
    },
    {
        value: "AEIS",
        label: "Advanced Energy Industries Inc."
    },
    {
        value: "AEL",
        label: "American Equity Investment Life Holding Company"
    },
    {
        value: "AEM",
        label: "Agnico Eagle Mines Limited"
    },
    {
        value: "AEMD",
        label: "Aethlon Medical Inc."
    },
    {
        value: "AEO",
        label: "American Eagle Outfitters Inc."
    },
    {
        value: "AEP",
        label: "American Electric Power Company Inc."
    },
    {
        value: "AER",
        label: "Aercap Holdings N.V."
    },
    {
        value: "AERI",
        label: "Aerie Pharmaceuticals Inc."
    },
    {
        value: "AES",
        label: "The AES Corporation"
    },
    {
        value: "AET",
        label: "Aetna Inc."
    },
    {
        value: "AETI",
        label: "American Electric Technologies Inc."
    },
    {
        value: "AEUA",
        label: "Anadarko Petroleum Corporation 7.50% Tangible Equity Units"
    },
    {
        value: "AEY",
        label: "ADDvantage Technologies Group Inc."
    },
    {
        value: "AEZS",
        label: "Aeterna Zentaris Inc."
    },
    {
        value: "AFB",
        label: "AllianceBernstein National Municipal Income Fund Inc"
    },
    {
        value: "AFC",
        label: "Allied Capital Corporation 6.875% Notes due April 15 2047"
    },
    {
        value: "AFG",
        label: "American Financial Group Inc."
    },
    {
        value: "AFGE",
        label: ""
    },
    {
        value: "AFGH",
        label: ""
    },
    {
        value: "AFH",
        label: "Atlas Financial Holdings Inc."
    },
    {
        value: "AFHBL",
        label: "Atlas Financial Holdings Inc. 6.625% Senior Unsecured Notes Due 2022"
    },
    {
        value: "AFI",
        label: "Armstrong Flooring Inc."
    },
    {
        value: "AFK",
        label: "VanEck Vectors-Africa Index"
    },
    {
        value: "AFL",
        label: "AFLAC Incorporated"
    },
    {
        value: "AFMD",
        label: "Affimed N.V."
    },
    {
        value: "AFSI",
        label: "AmTrust Financial Services Inc."
    },
    {
        value: "AFSI-A",
        label: "AmTrust Financial Services Inc. Preferred Series A"
    },
    {
        value: "AFSI-B",
        label: "AmTrust Financial Services Inc. Depository Shares Series B"
    },
    {
        value: "AFSI-C",
        label: "AmTrust Financial Services Inc. Depository Shares Series C"
    },
    {
        value: "AFSI-D",
        label: "AmTrust Financial Services Inc. Depositary Shares Series D"
    },
    {
        value: "AFSI-E",
        label: "AmTrust Financial Services Inc. Depositary Shares Series E"
    },
    {
        value: "AFSI-F",
        label: "AmTrust Financial Services Inc. Depositary Shares Series F"
    },
    {
        value: "AFSS",
        label: ""
    },
    {
        value: "AFST",
        label: ""
    },
    {
        value: "AFT",
        label: "Apollo Senior Floating Rate Fund Inc."
    },
    {
        value: "AFTY",
        label: "CSOP FTSE China A50"
    },
    {
        value: "AG",
        label: "First Majestic Silver Corp. (Canada)"
    },
    {
        value: "AGC",
        label: "Advent Claymore Convertible Securities and Income Fund of Beneficial Interest"
    },
    {
        value: "AGCO",
        label: "AGCO Corporation"
    },
    {
        value: "AGD",
        label: "Aberdeen Global Dynamic Dividend Fund"
    },
    {
        value: "AGEN",
        label: "Agenus Inc."
    },
    {
        value: "AGF",
        label: "DB Agriculture Long ETN due April 1 2038"
    },
    {
        value: "AGFS",
        label: "AgroFresh Solutions Inc."
    },
    {
        value: "AGFSW",
        label: "AgroFresh Solutions Inc. Warrants"
    },
    {
        value: "AGG",
        label: "iShares Core U.S. Aggregate Bond"
    },
    {
        value: "AGGE",
        label: "IQ Enhanced Core Bond U.S."
    },
    {
        value: "AGGP",
        label: "IQ Enhanced Core Plus Bond U.S."
    },
    {
        value: "AGGY",
        label: "WisdomTree Barclays Yield Enhanced U.S. Aggregate Bond Fund"
    },
    {
        value: "AGI",
        label: "Alamos Gold Inc. Class A"
    },
    {
        value: "AGIO",
        label: "Agios Pharmaceuticals Inc."
    },
    {
        value: "AGLE",
        label: "Aeglea BioTherapeutics Inc."
    },
    {
        value: "AGM",
        label: "Federal Agricultural Mortgage Corporation"
    },
    {
        value: "AGM-A",
        label: "Federal Agricultural Mortgage Corporation 5.875% Non-CUmulative Preferred Stock Series A"
    },
    {
        value: "AGM-B",
        label: "Federal Agricultural Mortgage Corporation Non Cumulative Preferred Stock Series B"
    },
    {
        value: "AGM-C",
        label: "Federal Agricultural Mortgage Corporation Preferred Series C Fixed to Fltg"
    },
    {
        value: "AGM.A",
        label: "Federal Agricultural Mortgage Corporation"
    },
    {
        value: "AGMH",
        label: "AGM Group Holdings Inc."
    },
    {
        value: "AGN",
        label: "Allergan plc"
    },
    {
        value: "AGNC",
        label: "AGNC Investment Corp."
    },
    {
        value: "AGNCB",
        label: "AGNC Investment Corp. Depositary Shares representing 1/1000th Series B Preferred Stock"
    },
    {
        value: "AGNCN",
        label: "AGNC Investment Corp. Depositary Shares Each Representing a 1/1000th Interest in a Share of 7.00% Series C Fixed-To-Floating Rate Cumulative Redeemable Preferre"
    },
    {
        value: "AGND",
        label: "WisdomTree Barclays Negative Duration U.S. Aggregate Bond Fund"
    },
    {
        value: "AGO",
        label: "Assured Guaranty Ltd."
    },
    {
        value: "AGO-B",
        label: "Assured Guaranty Ltd."
    },
    {
        value: "AGO-E",
        label: "Assured Guaranty Ltd."
    },
    {
        value: "AGO-F",
        label: "Assured Guaranty Ltd."
    },
    {
        value: "AGQ",
        label: "ProShares Ultra Silver"
    },
    {
        value: "AGR",
        label: "Avangrid Inc."
    },
    {
        value: "AGRO",
        label: "Adecoagro S.A."
    },
    {
        value: "AGRX",
        label: "Agile Therapeutics Inc."
    },
    {
        value: "AGS",
        label: "PlayAGS Inc."
    },
    {
        value: "AGT",
        label: "iShares MSCI Argentina and Global Exposure"
    },
    {
        value: "AGTC",
        label: "Applied Genetic Technologies Corporation"
    },
    {
        value: "AGX",
        label: "Argan Inc."
    },
    {
        value: "AGYS",
        label: "Agilysys Inc."
    },
    {
        value: "AGZ",
        label: "iShares Agency Bond"
    },
    {
        value: "AGZD",
        label: "WisdomTree Barclays Interest Rate Hedged U.S. Aggregate Bond Fund"
    },
    {
        value: "AHC",
        label: "A.H. Belo Corporation"
    },
    {
        value: "AHH",
        label: "Armada Hoffler Properties Inc."
    },
    {
        value: "AHL",
        label: "Aspen Insurance Holdings Limited"
    },
    {
        value: "AHL-C",
        label: "Aspen Insurance Holdings Limited 5.95% Fixed-to-Floating Rate Perpetual Non-Cumulative Preference Shares"
    },
    {
        value: "AHL-D",
        label: "Aspen Insurance Holdings Limited 5.625% Perpetual Non-Cumulative Preference Shares"
    },
    {
        value: "AHPA",
        label: "Avista Healthcare Public Acquisition Corp."
    },
    {
        value: "AHPAU",
        label: "Avista Healthcare Public Acquisition Corp. Unit"
    },
    {
        value: "AHPAW",
        label: "Avista Healthcare Public Acquisition Corp. Warrants"
    },
    {
        value: "AHPI",
        label: "Allied Healthcare Products Inc."
    },
    {
        value: "AHT",
        label: "Ashford Hospitality Trust Inc"
    },
    {
        value: "AHT-D",
        label: "Ashford Hospitality Trust Inc 8.45% Series D Cumulative Preferred Stock"
    },
    {
        value: "AHT-F",
        label: "Ashford Hospitality Trust Inc 7.375% Series F Cumulative Preferred Stock"
    },
    {
        value: "AHT-G",
        label: "Ashford Hospitality Trust Inc 7.375% Series G Cumulative Preferred Stock"
    },
    {
        value: "AHT-H",
        label: "Ashford Hospitality Trust Inc 7.50% Series H Cumulative Preferred Stock"
    },
    {
        value: "AHT-I",
        label: "Ashford Hospitality Trust Inc 7.50% Series I Cumulative Preferred Stock"
    },
    {
        value: "AI",
        label: "Arlington Asset Investment Corp Class A (new)"
    },
    {
        value: "AI-B",
        label: "Arlington Asset Investment Corp 7.00% Series B Cumulative Perpetual Redeemable Preferred Stock"
    },
    {
        value: "AIA",
        label: "iShares Asia 50 ETF"
    },
    {
        value: "AIC",
        label: ""
    },
    {
        value: "AIEQ",
        label: "AI Powered Equity"
    },
    {
        value: "AIF",
        label: "Apollo Tactical Income Fund Inc."
    },
    {
        value: "AIG",
        label: "American International Group Inc."
    },
    {
        value: "AIG+",
        label: "American International Group Inc. Warrant expiring January 19 2021"
    },
    {
        value: "AIHS",
        label: "Senmiao Technology Limited"
    },
    {
        value: "AIIQ",
        label: ""
    },
    {
        value: "AIMC",
        label: "Altra Industrial Motion Corp."
    },
    {
        value: "AIMT",
        label: "Aimmune Therapeutics Inc."
    },
    {
        value: "AIN",
        label: "Albany International Corporation"
    },
    {
        value: "AINC",
        label: "Ashford Inc."
    },
    {
        value: "AINV",
        label: "Apollo Investment Corporation"
    },
    {
        value: "AIPT",
        label: "Precision Therapeutics Inc."
    },
    {
        value: "AIQ",
        label: "Global X Future Analytics Tech ETF"
    },
    {
        value: "AIR",
        label: "AAR Corp."
    },
    {
        value: "AIRG",
        label: "Airgain Inc."
    },
    {
        value: "AIRI",
        label: "Air Industries Group"
    },
    {
        value: "AIRR",
        label: "First Trust RBA American Industrial Renaissance ETF"
    },
    {
        value: "AIRT",
        label: "Air T Inc."
    },
    {
        value: "AIT",
        label: "Applied Industrial Technologies Inc."
    },
    {
        value: "AIV",
        label: "Apartment Investment and Management Company"
    },
    {
        value: "AIV-A",
        label: "Apartment Investment and Management Company Preferred Series Class A"
    },
    {
        value: "AIW",
        label: "Arlington Asset Investment Corp 6.625% Notes due 2023"
    },
    {
        value: "AIY",
        label: "Apollo Investment Corporation 6.875% Senior Notes due 2043"
    },
    {
        value: "AIZ",
        label: "Assurant Inc."
    },
    {
        value: "AIZP",
        label: "Assurant Inc. 6.50% Series D Mandatory Convertible Preferred Stock $1.00 par value"
    },
    {
        value: "AJG",
        label: "Arthur J. Gallagher & Co."
    },
    {
        value: "AJRD",
        label: "Aerojet Rocketdyne Holdings Inc."
    },
    {
        value: "AJX",
        label: "Great Ajax Corp."
    },
    {
        value: "AJXA",
        label: "Great Ajax Corp. 7.25% Convertible Senior Notes due 2024"
    },
    {
        value: "AKAM",
        label: "Akamai Technologies Inc."
    },
    {
        value: "AKAO",
        label: "Achaogen Inc."
    },
    {
        value: "AKBA",
        label: "Akebia Therapeutics Inc."
    },
    {
        value: "AKCA",
        label: "Akcea Therapeutics Inc."
    },
    {
        value: "AKER",
        label: "Akers Biosciences Inc"
    },
    {
        value: "AKG",
        label: "Asanko Gold Inc."
    },
    {
        value: "AKO.A",
        label: "Embotelladora Andina S.A."
    },
    {
        value: "AKO.B",
        label: "Embotelladora Andina S.A."
    },
    {
        value: "AKP",
        label: "Alliance California Municipal Income Fund Inc"
    },
    {
        value: "AKR",
        label: "Acadia Realty Trust"
    },
    {
        value: "AKRX",
        label: "Akorn Inc."
    },
    {
        value: "AKS",
        label: "AK Steel Holding Corporation"
    },
    {
        value: "AKTS",
        label: "Akoustis Technologies Inc."
    },
    {
        value: "AKTX",
        label: "Akari Therapeutics Plc"
    },
    {
        value: "AL",
        label: "Air Lease Corporation Class A"
    },
    {
        value: "ALB",
        label: "Albemarle Corporation"
    },
    {
        value: "ALBO",
        label: "Albireo Pharma Inc."
    },
    {
        value: "ALCO",
        label: "Alico Inc."
    },
    {
        value: "ALD",
        label: "WisdomTree Asia Local Debt Fund"
    },
    {
        value: "ALDR",
        label: "Alder BioPharmaceuticals Inc."
    },
    {
        value: "ALDX",
        label: "Aldeyra Therapeutics Inc."
    },
    {
        value: "ALE",
        label: "Allete Inc."
    },
    {
        value: "ALEX",
        label: "Alexander & Baldwin Inc. REIT Holding Company"
    },
    {
        value: "ALFA",
        label: "AlphaClone Alternative Alpha"
    },
    {
        value: "ALFI",
        label: "AlphaClone International"
    },
    {
        value: "ALG",
        label: "Alamo Group Inc."
    },
    {
        value: "ALGN",
        label: "Align Technology Inc."
    },
    {
        value: "ALGT",
        label: "Allegiant Travel Company"
    },
    {
        value: "ALIM",
        label: "Alimera Sciences Inc."
    },
    {
        value: "ALJJ",
        label: "ALJ Regional Holdings Inc."
    },
    {
        value: "ALK",
        label: "Alaska Air Group Inc."
    },
    {
        value: "ALKS",
        label: "Alkermes plc"
    },
    {
        value: "ALL",
        label: "Allstate Corporation (The)"
    },
    {
        value: "ALL-A",
        label: "Allstate Corporation (The) Dep Shs Repstg 1/1000th Perp Pfd Ser A"
    },
    {
        value: "ALL-B",
        label: "Allstate Corporation (The) 5.100% Fixed-to-Floating Rate Subordinated Debentures due 2053"
    },
    {
        value: "ALL-C",
        label: "Allstate Corporation (The) Dep Shs Repstg 1/1000th Int Shs Pfd Stk Ser C"
    },
    {
        value: "ALL-D",
        label: "The Allstate Corporation Leopards Each Representing A 1/1000th Interest In A Share Of Fixed Rate Noncumulative Perpetual Preferred Stock Series D"
    },
    {
        value: "ALL-E",
        label: "Allstate Corporation Depositary Shares Series E"
    },
    {
        value: "ALL-F",
        label: "Allstate Corporation (The) Leopards Dep Shares Representing 1/1000th Perp Pfd"
    },
    {
        value: "ALL-G",
        label: "Allstate Corporation (The) Depositary Shares Series G"
    },
    {
        value: "ALLE",
        label: "Allegion plc"
    },
    {
        value: "ALLT",
        label: "Allot Communications Ltd."
    },
    {
        value: "ALLY",
        label: "Ally Financial Inc."
    },
    {
        value: "ALLY-A",
        label: "GMAC Capital Trust I Fixed Rate Floating Rate Trust Preferred Securities Series 2"
    },
    {
        value: "ALN",
        label: "American Lorain Corporation"
    },
    {
        value: "ALNA",
        label: "Allena Pharmaceuticals Inc."
    },
    {
        value: "ALNY",
        label: "Alnylam Pharmaceuticals Inc."
    },
    {
        value: "ALO",
        label: "Alio Gold Inc. (Canada)"
    },
    {
        value: "ALOG",
        label: "Analogic Corporation"
    },
    {
        value: "ALOT",
        label: "AstroNova Inc."
    },
    {
        value: "ALP-Q",
        label: "Alabama Power Company 5.00% Class A Preferred Stock Cumulative Par Value $1 Per Share (Stated Capital $25 Per Share)"
    },
    {
        value: "ALPN",
        label: "Alpine Immune Sciences Inc."
    },
    {
        value: "ALQA",
        label: "Alliqua BioMedical Inc."
    },
    {
        value: "ALRM",
        label: "Alarm.com Holdings Inc."
    },
    {
        value: "ALRN",
        label: "Aileron Therapeutics Inc."
    },
    {
        value: "ALSK",
        label: "Alaska Communications Systems Group Inc."
    },
    {
        value: "ALSN",
        label: "Allison Transmission Holdings Inc."
    },
    {
        value: "ALT",
        label: "Altimmune Inc."
    },
    {
        value: "ALTR",
        label: "Altair Engineering Inc."
    },
    {
        value: "ALTS",
        label: "ProShares Morningstar Alternatives Solution"
    },
    {
        value: "ALTY",
        label: "Global X SuperDividend Alternatives ETF"
    },
    {
        value: "ALV",
        label: "Autoliv Inc."
    },
    {
        value: "ALX",
        label: "Alexander's Inc."
    },
    {
        value: "ALXN",
        label: "Alexion Pharmaceuticals Inc."
    },
    {
        value: "AM",
        label: "Antero Midstream Partners LP representing limited partner interests"
    },
    {
        value: "AMAG",
        label: "AMAG Pharmaceuticals Inc."
    },
    {
        value: "AMAT",
        label: "Applied Materials Inc."
    },
    {
        value: "AMBA",
        label: "Ambarella Inc."
    },
    {
        value: "AMBC",
        label: "Ambac Financial Group Inc."
    },
    {
        value: "AMBCW",
        label: "Ambac Financial Group Inc. Warrants"
    },
    {
        value: "AMBO",
        label: "AMBOW EDUCATION HOLDING-ADR"
    },
    {
        value: "AMBR",
        label: "Amber Road Inc."
    },
    {
        value: "AMC",
        label: "AMC Entertainment Holdings Inc. Class A"
    },
    {
        value: "AMCA",
        label: "iShares Russell 1000 Pure U.S. Revenue ETF"
    },
    {
        value: "AMCN",
        label: "AirMedia Group Inc"
    },
    {
        value: "AMCX",
        label: "AMC Networks Inc."
    },
    {
        value: "AMD",
        label: "Advanced Micro Devices Inc."
    },
    {
        value: "AMDA",
        label: "Amedica Corporation"
    },
    {
        value: "AME",
        label: "AMETEK Inc."
    },
    {
        value: "AMED",
        label: "Amedisys Inc"
    },
    {
        value: "AMEH",
        label: "Apollo Medical Holdings Inc."
    },
    {
        value: "AMG",
        label: "Affiliated Managers Group Inc."
    },
    {
        value: "AMGN",
        label: "Amgen Inc."
    },
    {
        value: "AMGP",
        label: "Antero Midstream GP LP of Beneficial Interests"
    },
    {
        value: "AMH",
        label: "American Homes 4 Rent of Beneficial Interest"
    },
    {
        value: "AMH-D",
        label: "American Homes 4 Rent 6.5% Series D Cumulative Perpetual Preferred Shares of Beneficial Interest"
    },
    {
        value: "AMH-E",
        label: "American Homes 4 Rent 6.35% Series E Cumulative Redeemable Perpetual Preferred Shares of Beneficial Interest"
    },
    {
        value: "AMH-F",
        label: "American Homes 4 Rent 5.875% Series F Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "AMH-G",
        label: "American Homes 4 Rent Series G cumulative redeemable perpetual preferred shares of beneficial interest"
    },
    {
        value: "AMID",
        label: "American Midstream Partners LP representing Limited Partner Interests"
    },
    {
        value: "AMJ",
        label: "JPMorgan Chase Capital XVI JP Morgan Alerian MLP ETN"
    },
    {
        value: "AMJL",
        label: "Credit Suisse X-Links Monthly Pay 2xLeveraged Alerian MLP Index Exchange Traded Notes due May 16 2036"
    },
    {
        value: "AMKR",
        label: "Amkor Technology Inc."
    },
    {
        value: "AMLP",
        label: "Alerian MLP"
    },
    {
        value: "AMMA",
        label: "Alliance MMA Inc."
    },
    {
        value: "AMN",
        label: "AMN Healthcare Services Inc"
    },
    {
        value: "AMNB",
        label: "American National Bankshares Inc."
    },
    {
        value: "AMOT",
        label: "Allied Motion Technologies Inc."
    },
    {
        value: "AMOV",
        label: "America Movil S.A.B. de C.V. Class An Depositary Shares"
    },
    {
        value: "AMP",
        label: "Ameriprise Financial Inc."
    },
    {
        value: "AMPE",
        label: "Ampio Pharmaceuticals Inc."
    },
    {
        value: "AMPH",
        label: "Amphastar Pharmaceuticals Inc."
    },
    {
        value: "AMR",
        label: "Alta Mesa Resources Inc."
    },
    {
        value: "AMRB",
        label: "American River Bankshares"
    },
    {
        value: "AMRC",
        label: "Ameresco Inc. Class A"
    },
    {
        value: "AMRH",
        label: "Ameri Holdings Inc."
    },
    {
        value: "AMRHW",
        label: "Ameri Holdings Inc. Warrant"
    },
    {
        value: "AMRK",
        label: "A-Mark Precious Metals Inc."
    },
    {
        value: "AMRN",
        label: "Amarin Corporation plc"
    },
    {
        value: "AMRS",
        label: "Amyris Inc."
    },
    {
        value: "AMRWW",
        label: "Alta Mesa Resources Inc. Warrant"
    },
    {
        value: "AMRX",
        label: "Amneal Pharmaceuticals Inc. Class A"
    },
    {
        value: "AMS",
        label: "American Shared Hospital Services"
    },
    {
        value: "AMSC",
        label: "American Superconductor Corporation"
    },
    {
        value: "AMSF",
        label: "AMERISAFE Inc."
    },
    {
        value: "AMSWA",
        label: "American Software Inc. Class A Common Stock"
    },
    {
        value: "AMT",
        label: "American Tower Corporation (REIT)"
    },
    {
        value: "AMTD",
        label: "TD Ameritrade Holding Corporation"
    },
    {
        value: "AMTX",
        label: "Aemetis Inc"
    },
    {
        value: "AMU",
        label: "ETRACS Alerian MLP Index ETN"
    },
    {
        value: "AMUB",
        label: "ETRACS Alerian MLP Index ETN Series B due July 18 2042"
    },
    {
        value: "AMWD",
        label: "American Woodmark Corporation"
    },
    {
        value: "AMX",
        label: "America Movil S.A.B. de C.V.n Depository Receipt Series L"
    },
    {
        value: "AMZA",
        label: "InfraCap MLP"
    },
    {
        value: "AMZN",
        label: "Amazon.com Inc."
    },
    {
        value: "AN",
        label: "AutoNation Inc."
    },
    {
        value: "ANAB",
        label: "AnaptysBio Inc."
    },
    {
        value: "ANAT",
        label: "American National Insurance Company"
    },
    {
        value: "ANCB",
        label: "Anchor Bancorp"
    },
    {
        value: "ANCX",
        label: "Access National Corporation"
    },
    {
        value: "ANDE",
        label: "The Andersons Inc."
    },
    {
        value: "ANDV",
        label: "Andeavor"
    },
    {
        value: "ANDX",
        label: "Andeavor Logistics LP representing Limited Partner Interests"
    },
    {
        value: "ANET",
        label: "Arista Networks Inc."
    },
    {
        value: "ANF",
        label: "Abercrombie & Fitch Company"
    },
    {
        value: "ANFI",
        label: "Amira Nature Foods Ltd"
    },
    {
        value: "ANGI",
        label: "ANGI Homeservices Inc."
    },
    {
        value: "ANGL",
        label: "VanEck Vectors Fallen Angel High Yield Bond"
    },
    {
        value: "ANGO",
        label: "AngioDynamics Inc."
    },
    {
        value: "ANH",
        label: "Anworth Mortgage Asset Corporation"
    },
    {
        value: "ANH-A",
        label: "Anworth Mortgage Asset Corporation Series A Preferred Stock"
    },
    {
        value: "ANH-B",
        label: "Anworth Mortgage Asset Corporation Preferred Stock Series B 6.25%"
    },
    {
        value: "ANH-C",
        label: "Anworth Mortgage Asset Corporation 7.625% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "ANIK",
        label: "Anika Therapeutics Inc."
    },
    {
        value: "ANIP",
        label: "ANI Pharmaceuticals Inc."
    },
    {
        value: "ANSS",
        label: "ANSYS Inc."
    },
    {
        value: "ANTH",
        label: "Anthera Pharmaceuticals Inc."
    },
    {
        value: "ANTM",
        label: "Anthem Inc."
    },
    {
        value: "ANW",
        label: "Aegean Marine Petroleum Network Inc."
    },
    {
        value: "ANY",
        label: "Sphere 3D Corp."
    },
    {
        value: "AOA",
        label: "iShares Core Aggressive Allocation"
    },
    {
        value: "AOBC",
        label: "American Outdoor Brands Corporation"
    },
    {
        value: "AOD",
        label: "Aberdeen Total Dynamic Dividend Fund"
    },
    {
        value: "AOI",
        label: "Alliance One International Inc."
    },
    {
        value: "AOK",
        label: "iShares Core Conservative Allocation"
    },
    {
        value: "AOM",
        label: "iShares Core Moderate Allocation"
    },
    {
        value: "AON",
        label: "Aon plc Class A (UK)"
    },
    {
        value: "AOR",
        label: "iShares Core Growth Allocation"
    },
    {
        value: "AOS",
        label: "A.O. Smith Corporation"
    },
    {
        value: "AOSL",
        label: "Alpha and Omega Semiconductor Limited"
    },
    {
        value: "AP",
        label: "Ampco-Pittsburgh Corporation"
    },
    {
        value: "APA",
        label: "Apache Corporation"
    },
    {
        value: "APAM",
        label: "Artisan Partners Asset Management Inc. Class A"
    },
    {
        value: "APB",
        label: "Asia Pacific Fund Inc. (The)"
    },
    {
        value: "APC",
        label: "Anadarko Petroleum Corporation"
    },
    {
        value: "APD",
        label: "Air Products and Chemicals Inc."
    },
    {
        value: "APDN",
        label: "Applied DNA Sciences Inc"
    },
    {
        value: "APDNW",
        label: ""
    },
    {
        value: "APEI",
        label: "American Public Education Inc."
    },
    {
        value: "APEN",
        label: "Apollo Endosurgery Inc."
    },
    {
        value: "APF",
        label: "Morgan Stanley Asia-Pacific Fund Inc."
    },
    {
        value: "APH",
        label: "Amphenol Corporation"
    },
    {
        value: "APHB",
        label: "AmpliPhi Biosciences Corporation"
    },
    {
        value: "APLE",
        label: "Apple Hospitality REIT Inc."
    },
    {
        value: "APLS",
        label: "Apellis Pharmaceuticals Inc."
    },
    {
        value: "APO",
        label: "Apollo Global Management LLC Class A Representing Class A Limitied Liability Company Interests"
    },
    {
        value: "APO-A",
        label: "Apollo Global Management LLC 6.375% Series A Preferred Shares"
    },
    {
        value: "APO-B",
        label: "Apollo Global Management LLC 6.375% Series B Preferred Shares"
    },
    {
        value: "APOG",
        label: "Apogee Enterprises Inc."
    },
    {
        value: "APOP",
        label: "Cellect Biotechnology Ltd."
    },
    {
        value: "APOPW",
        label: "Cellect Biotechnology Ltd. Warrants to Purchase ADR (1 WT and $7.50 to purchase 1 ADS)"
    },
    {
        value: "APPF",
        label: "AppFolio Inc."
    },
    {
        value: "APPN",
        label: "Appian Corporation"
    },
    {
        value: "APPS",
        label: "Digital Turbine Inc."
    },
    {
        value: "APRI",
        label: "Apricus Biosciences Inc."
    },
    {
        value: "APRN",
        label: "Blue Apron Holdings Inc. Class A"
    },
    {
        value: "APT",
        label: "Alpha Pro Tech Ltd."
    },
    {
        value: "APTI",
        label: "Apptio Inc."
    },
    {
        value: "APTO",
        label: "Aptose Biosciences Inc."
    },
    {
        value: "APTS",
        label: "Preferred Apartment Communities Inc."
    },
    {
        value: "APTV",
        label: "Aptiv PLC"
    },
    {
        value: "APU",
        label: "AmeriGas Partners L.P."
    },
    {
        value: "APVO",
        label: "Aptevo Therapeutics Inc."
    },
    {
        value: "APWC",
        label: "Asia Pacific Wire & Cable Corporation Limited"
    },
    {
        value: "APY",
        label: "Apergy Corporation"
    },
    {
        value: "AQ",
        label: "Aquantia Corp."
    },
    {
        value: "AQB",
        label: "AquaBounty Technologies Inc."
    },
    {
        value: "AQMS",
        label: "Aqua Metals Inc."
    },
    {
        value: "AQN",
        label: "Algonquin Power & Utilities Corp."
    },
    {
        value: "AQUA",
        label: "Evoqua Water Technologies Corp."
    },
    {
        value: "AQXP",
        label: "Aquinox Pharmaceuticals Inc."
    },
    {
        value: "AR",
        label: "Antero Resources Corporation"
    },
    {
        value: "ARA",
        label: "American Renal Associates Holdings Inc"
    },
    {
        value: "ARAY",
        label: "Accuray Incorporated"
    },
    {
        value: "ARC",
        label: "ARC Document Solutions Inc."
    },
    {
        value: "ARCB",
        label: "ArcBest Corporation"
    },
    {
        value: "ARCC",
        label: "Ares Capital Corporation"
    },
    {
        value: "ARCH",
        label: "Arch Coal Inc. Class A"
    },
    {
        value: "ARCI",
        label: "Appliance Recycling Centers of America Inc."
    },
    {
        value: "ARCM",
        label: "Arrow Reserve Capital Management"
    },
    {
        value: "ARCO",
        label: "Arcos Dorados Holdings Inc. Class A Shares"
    },
    {
        value: "ARCT",
        label: "Arcturus Therapeutics Ltd."
    },
    {
        value: "ARCW",
        label: "ARC Group Worldwide Inc."
    },
    {
        value: "ARD",
        label: "Ardagh Group S.A."
    },
    {
        value: "ARDC",
        label: "Ares Dynamic Credit Allocation Fund Inc."
    },
    {
        value: "ARDM",
        label: "Aradigm Corporation"
    },
    {
        value: "ARDX",
        label: "Ardelyx Inc."
    },
    {
        value: "ARE",
        label: "Alexandria Real Estate Equities Inc."
    },
    {
        value: "ARE-D",
        label: "Alexandria Real Estate Equities Inc. 7.00% Series D Cumulative Convertible Preferred Stock"
    },
    {
        value: "ARES",
        label: "Ares Management L.P. representing Limited Partner Interests"
    },
    {
        value: "ARES-A",
        label: "Ares Management L.P. 7.00% Series A Preferred Shares Representing Limited Partner Interests"
    },
    {
        value: "AREX",
        label: "Approach Resources Inc."
    },
    {
        value: "ARGD",
        label: "Argo Group International Holdings Ltd. 6.5% Senior Notes Due 2042"
    },
    {
        value: "ARGO",
        label: "Argo Group International Holdings Ltd."
    },
    {
        value: "ARGT",
        label: "Global X MSCI Argentina"
    },
    {
        value: "ARGX",
        label: "argenx SE"
    },
    {
        value: "ARI",
        label: "Apollo Commercial Real Estate Finance Inc"
    },
    {
        value: "ARI-C",
        label: "Apollo Commercial Real Estate Finance 8.00% Series C Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "ARII",
        label: "American Railcar Industries Inc."
    },
    {
        value: "ARKG",
        label: "ARK Genomic Revolution Multi-Sector"
    },
    {
        value: "ARKK",
        label: "ARK Innovation"
    },
    {
        value: "ARKQ",
        label: "ARK Industrial Innovation"
    },
    {
        value: "ARKR",
        label: "Ark Restaurants Corp."
    },
    {
        value: "ARKW",
        label: "ARK Web x.0"
    },
    {
        value: "ARL",
        label: "American Realty Investors Inc."
    },
    {
        value: "ARLP",
        label: "Alliance Resource Partners L.P."
    },
    {
        value: "ARLZ",
        label: "Aralez Pharmaceuticals Inc."
    },
    {
        value: "ARMK",
        label: "Aramark"
    },
    {
        value: "ARMO",
        label: "ARMO BioSciences Inc."
    },
    {
        value: "ARNA",
        label: "Arena Pharmaceuticals Inc."
    },
    {
        value: "ARNC",
        label: "Arconic Inc."
    },
    {
        value: "ARNC-",
        label: ""
    },
    {
        value: "AROC",
        label: "Archrock Inc."
    },
    {
        value: "AROW",
        label: "Arrow Financial Corporation"
    },
    {
        value: "ARQL",
        label: "ArQule Inc."
    },
    {
        value: "ARR",
        label: "ARMOUR Residential REIT Inc."
    },
    {
        value: "ARR-A",
        label: "Armour Residential REIT INC Preferred Series A"
    },
    {
        value: "ARR-B",
        label: "ARMOUR Residential REIT Inc. Preferred Series B"
    },
    {
        value: "ARRS",
        label: "ARRIS International plc"
    },
    {
        value: "ARRY",
        label: "Array BioPharma Inc."
    },
    {
        value: "ARTNA",
        label: "Artesian Resources Corporation Class A Non-Voting Common Stock"
    },
    {
        value: "ARTW",
        label: "Art's-Way Manufacturing Co. Inc."
    },
    {
        value: "ARTX",
        label: "Arotech Corporation"
    },
    {
        value: "ARW",
        label: "Arrow Electronics Inc."
    },
    {
        value: "ARWR",
        label: "Arrowhead Pharmaceuticals Inc."
    },
    {
        value: "ASA",
        label: "ASA Gold and Precious Metals Limited"
    },
    {
        value: "ASB",
        label: "Associated Banc-Corp"
    },
    {
        value: "ASB+",
        label: "Associated Banc-Corp Warrants"
    },
    {
        value: "ASB-C",
        label: "Associated Banc-Corp Depositary shares Series C"
    },
    {
        value: "ASB-D",
        label: "Associated Banc-Corp Depositary Shares Series D"
    },
    {
        value: "ASC",
        label: "Ardmore Shipping Corporation"
    },
    {
        value: "ASCMA",
        label: "Ascent Capital Group Inc. Series A Common Stock"
    },
    {
        value: "ASEA",
        label: "Global X FTSE Southeast Asia"
    },
    {
        value: "ASET",
        label: "FlexShares Real Assets Allocation Index Fund"
    },
    {
        value: "ASFI",
        label: "Asta Funding Inc."
    },
    {
        value: "ASG",
        label: "Liberty All-Star Growth Fund Inc."
    },
    {
        value: "ASGN",
        label: "ASGN Incorporated"
    },
    {
        value: "ASH",
        label: "Ashland Global Holdings Inc."
    },
    {
        value: "ASHR",
        label: "Xtrackers Harvest CSI 300 China A-Shares"
    },
    {
        value: "ASHS",
        label: "Xtrackers Harvest CSI 500 China A-Shares Small Cap"
    },
    {
        value: "ASHX",
        label: "Xtrackers MSCI China A Inclusion Equity"
    },
    {
        value: "ASIX",
        label: "AdvanSix Inc."
    },
    {
        value: "ASLN",
        label: "ASLAN Pharmaceuticals Limited"
    },
    {
        value: "ASM",
        label: "Avino Silver & Gold Mines Ltd. (Canada)"
    },
    {
        value: "ASMB",
        label: "Assembly Biosciences Inc."
    },
    {
        value: "ASML",
        label: "ASML Holding N.V."
    },
    {
        value: "ASNA",
        label: "Ascena Retail Group Inc."
    },
    {
        value: "ASND",
        label: "Ascendis Pharma A/S"
    },
    {
        value: "ASNS",
        label: "Arsanis Inc."
    },
    {
        value: "ASPN",
        label: "Aspen Aerogels Inc."
    },
    {
        value: "ASPS",
        label: "Altisource Portfolio Solutions S.A."
    },
    {
        value: "ASPU",
        label: "Aspen Group Inc."
    },
    {
        value: "ASR",
        label: "Grupo Aeroportuario del Sureste S.A. de C.V."
    },
    {
        value: "ASRV",
        label: "AmeriServ Financial Inc."
    },
    {
        value: "ASRVP",
        label: "AmeriServ Financial Inc. AmeriServ Financial Trust I"
    },
    {
        value: "AST",
        label: "Asterias Biotherapeutics Inc. Common Series A"
    },
    {
        value: "ASTC",
        label: "Astrotech Corporation"
    },
    {
        value: "ASTE",
        label: "Astec Industries Inc."
    },
    {
        value: "ASUR",
        label: "Asure Software Inc"
    },
    {
        value: "ASV",
        label: "ASV Holdings Inc."
    },
    {
        value: "ASX",
        label: "ASE Industrial Holding Co. Ltd. American Depositary Shares (each representing Two)"
    },
    {
        value: "ASYS",
        label: "Amtech Systems Inc."
    },
    {
        value: "AT",
        label: "Atlantic Power Corporation (Canada)"
    },
    {
        value: "ATAC",
        label: "Atlantic Acquisition Corp."
    },
    {
        value: "ATACR",
        label: "Atlantic Acquisition Corp. Right"
    },
    {
        value: "ATACU",
        label: "Atlantic Acquisition Corp. Unit"
    },
    {
        value: "ATAI",
        label: "ATA Inc."
    },
    {
        value: "ATAX",
        label: "America First Multifamily Investors L.P."
    },
    {
        value: "ATEC",
        label: "Alphatec Holdings Inc."
    },
    {
        value: "ATEN",
        label: "A10 Networks Inc."
    },
    {
        value: "ATGE",
        label: "Adtalem Global Education Inc."
    },
    {
        value: "ATH",
        label: "Athene Holding Ltd. Class A"
    },
    {
        value: "ATHM",
        label: "Autohome Inc. American Depositary Shares each representing one class A."
    },
    {
        value: "ATHN",
        label: "athenahealth Inc."
    },
    {
        value: "ATHX",
        label: "Athersys Inc."
    },
    {
        value: "ATI",
        label: "Allegheny Technologies Incorporated"
    },
    {
        value: "ATIS",
        label: "Attis Industries Inc."
    },
    {
        value: "ATISW",
        label: "Attis Industries Inc. Warrants"
    },
    {
        value: "ATKR",
        label: "Atkore International Group Inc."
    },
    {
        value: "ATLC",
        label: "Atlanticus Holdings Corporation"
    },
    {
        value: "ATLO",
        label: "Ames National Corporation"
    },
    {
        value: "ATMP",
        label: "Barclays ETN Plus Select MLP"
    },
    {
        value: "ATNI",
        label: "ATN International Inc."
    },
    {
        value: "ATNM",
        label: "Actinium Pharmaceuticals Inc. (Delaware)"
    },
    {
        value: "ATNX",
        label: "Athenex Inc."
    },
    {
        value: "ATO",
        label: "Atmos Energy Corporation"
    },
    {
        value: "ATOM",
        label: "Atomera Incorporated"
    },
    {
        value: "ATOS",
        label: "Atossa Genetics Inc."
    },
    {
        value: "ATR",
        label: "AptarGroup Inc."
    },
    {
        value: "ATRA",
        label: "Atara Biotherapeutics Inc."
    },
    {
        value: "ATRC",
        label: "AtriCure Inc."
    },
    {
        value: "ATRI",
        label: "Atrion Corporation"
    },
    {
        value: "ATRO",
        label: "Astronics Corporation"
    },
    {
        value: "ATRS",
        label: "Antares Pharma Inc."
    },
    {
        value: "ATSG",
        label: "Air Transport Services Group Inc"
    },
    {
        value: "ATTO",
        label: "Atento S.A."
    },
    {
        value: "ATTU",
        label: "Attunity Ltd."
    },
    {
        value: "ATU",
        label: "Actuant Corporation"
    },
    {
        value: "ATUS",
        label: "Altice USA Inc. Class A"
    },
    {
        value: "ATUS#",
        label: "ALTICE USA INC-WHEN ISSUED"
    },
    {
        value: "ATV",
        label: "Acorn International Inc. ADS"
    },
    {
        value: "ATVI",
        label: "Activision Blizzard Inc"
    },
    {
        value: "ATXI",
        label: "Avenue Therapeutics Inc."
    },
    {
        value: "AU",
        label: "AngloGold Ashanti Limited"
    },
    {
        value: "AUBN",
        label: "Auburn National Bancorporation Inc."
    },
    {
        value: "AUDC",
        label: "AudioCodes Ltd."
    },
    {
        value: "AUG",
        label: "Auryn Resources Inc."
    },
    {
        value: "AUMN",
        label: "Golden Minerals Company"
    },
    {
        value: "AUO",
        label: "AU Optronics Corp American Depositary Shares"
    },
    {
        value: "AUPH",
        label: "Aurinia Pharmaceuticals Inc"
    },
    {
        value: "AUSE",
        label: "WisdomTree Australia Dividend Index"
    },
    {
        value: "AUTO",
        label: "AutoWeb Inc."
    },
    {
        value: "AUY",
        label: "Yamana Gold Inc. (Canada)"
    },
    {
        value: "AVA",
        label: "Avista Corporation"
    },
    {
        value: "AVAL",
        label: "Grupo Aval Acciones y Valores S.A. ADR (Each representing 20 preferred shares)"
    },
    {
        value: "AVAV",
        label: "AeroVironment Inc."
    },
    {
        value: "AVB",
        label: "AvalonBay Communities Inc."
    },
    {
        value: "AVD",
        label: "American Vanguard Corporation ($0.10 Par Value)"
    },
    {
        value: "AVDL",
        label: "Avadel Pharmaceuticals plc"
    },
    {
        value: "AVEO",
        label: "AVEO Pharmaceuticals Inc."
    },
    {
        value: "AVGO",
        label: "Broadcom Inc."
    },
    {
        value: "AVGR",
        label: "Avinger Inc."
    },
    {
        value: "AVH",
        label: "Avianca Holdings S.A. American Depositary Shares (Each representing 8 preferred Shares)"
    },
    {
        value: "AVHI",
        label: "A V Homes Inc."
    },
    {
        value: "AVID",
        label: "Avid Technology Inc."
    },
    {
        value: "AVK",
        label: "Advent Claymore Convertible Securities and Income Fund"
    },
    {
        value: "AVNW",
        label: "Aviat Networks Inc."
    },
    {
        value: "AVP",
        label: "Avon Products Inc."
    },
    {
        value: "AVT",
        label: "Avnet Inc."
    },
    {
        value: "AVX",
        label: "AVX Corporation"
    },
    {
        value: "AVXL",
        label: "Anavex Life Sciences Corp."
    },
    {
        value: "AVY",
        label: "Avery Dennison Corporation"
    },
    {
        value: "AVYA",
        label: "Avaya Holdings Corp."
    },
    {
        value: "AWF",
        label: "Alliancebernstein Global High Income Fund"
    },
    {
        value: "AWI",
        label: "Armstrong World Industries Inc"
    },
    {
        value: "AWK",
        label: "American Water Works Company Inc."
    },
    {
        value: "AWP",
        label: "Aberdeen Global Premier Properties Fund of Beneficial Interest"
    },
    {
        value: "AWR",
        label: "American States Water Company"
    },
    {
        value: "AWRE",
        label: "Aware Inc."
    },
    {
        value: "AWX",
        label: "Avalon Holdings Corporation"
    },
    {
        value: "AXAS",
        label: "Abraxas Petroleum Corporation"
    },
    {
        value: "AXDX",
        label: "Accelerate Diagnostics Inc."
    },
    {
        value: "AXE",
        label: "Anixter International Inc."
    },
    {
        value: "AXGN",
        label: "AxoGen Inc."
    },
    {
        value: "AXJL",
        label: "WisdomTree Asia Pacific ex-Japan Total Dividend Fund"
    },
    {
        value: "AXJV",
        label: "iShares Edge MSCI A Min Vol Asia ex Japan"
    },
    {
        value: "AXL",
        label: "American Axle & Manufacturing Holdings Inc."
    },
    {
        value: "AXON",
        label: "Axovant Sciences Ltd."
    },
    {
        value: "AXP",
        label: "American Express Company"
    },
    {
        value: "AXR",
        label: "AMREP Corporation"
    },
    {
        value: "AXS",
        label: "Axis Capital Holdings Limited"
    },
    {
        value: "AXS-D",
        label: "Axis Capital Holdings Limited Preferred Series D (Bermuda)"
    },
    {
        value: "AXS-E",
        label: "Axis Capital Holdings Limited Depositary Shares Series E"
    },
    {
        value: "AXSM",
        label: "Axsome Therapeutics Inc."
    },
    {
        value: "AXTA",
        label: "Axalta Coating Systems Ltd."
    },
    {
        value: "AXTI",
        label: "AXT Inc"
    },
    {
        value: "AXU",
        label: "Alexco Resource Corp (Canada)"
    },
    {
        value: "AY",
        label: "Atlantica Yield plc"
    },
    {
        value: "AYI",
        label: "Acuity Brands Inc (Holding Company)"
    },
    {
        value: "AYR",
        label: "Aircastle Limited"
    },
    {
        value: "AYTU",
        label: "Aytu BioScience Inc."
    },
    {
        value: "AYX",
        label: "Alteryx Inc. Class A"
    },
    {
        value: "AZN",
        label: "Astrazeneca PLC"
    },
    {
        value: "AZO",
        label: "AutoZone Inc."
    },
    {
        value: "AZPN",
        label: "Aspen Technology Inc."
    },
    {
        value: "AZRE",
        label: "Azure Power Global Limited Equity Shares"
    },
    {
        value: "AZRX",
        label: "AzurRx BioPharma Inc."
    },
    {
        value: "AZUL",
        label: "Azul S.A. American Depositary Shares (each representing three preferred shares)"
    },
    {
        value: "AZZ",
        label: "AZZ Inc."
    },
    {
        value: "B",
        label: "Barnes Group Inc."
    },
    {
        value: "BA",
        label: "The Boeing Company"
    },
    {
        value: "BAB",
        label: "Invesco Taxable Municipal Bond"
    },
    {
        value: "BABA",
        label: "Alibaba Group Holding Limited"
    },
    {
        value: "BABY",
        label: "Natus Medical Incorporated"
    },
    {
        value: "BAC",
        label: "Bank of America Corporation"
    },
    {
        value: "BAC+A",
        label: "Bank of America Corporation Class A Warrant expiring January 16 2019"
    },
    {
        value: "BAC+B",
        label: "Bank of America Corporation Class B Warrants expiring 10/28/2018"
    },
    {
        value: "BAC-A",
        label: "Bank of America Corporation Depositary Shares each representing a 1/1000 th interest in a share of 6.000% Non-Cumulative"
    },
    {
        value: "BAC-B",
        label: "Bank of America Corporation Depositary Shares Series G"
    },
    {
        value: "BAC-C",
        label: "Bank of America Corporation Depositary Shares Series C"
    },
    {
        value: "BAC-D",
        label: "Bank of America Corporation Depositary Shares Rpstg 1/1000th Interest in Sh of Non Cum Pfd Stk Ser D"
    },
    {
        value: "BAC-E",
        label: "Bank of America Corporation Depositary Sh repstg 1/1000th Perp Pfd Ser E"
    },
    {
        value: "BAC-I*",
        label: "Bank Amer Corp Dep Sh Repstg 1/1000th Pfd Ser I"
    },
    {
        value: "BAC-L",
        label: "Bank of America Corporation Non Cumulative Perpetual Conv Pfd Ser L"
    },
    {
        value: "BAC-W",
        label: "Bank of America Corporation Depository Shares Series W"
    },
    {
        value: "BAC-Y",
        label: "Bank of America Corporation Depositary Shares Series Y"
    },
    {
        value: "BAF",
        label: "BlackRock Municipal Income Investment Quality Trust"
    },
    {
        value: "BAH",
        label: "Booz Allen Hamilton Holding Corporation"
    },
    {
        value: "BAK",
        label: "Braskem SA ADR"
    },
    {
        value: "BALB",
        label: "iPathA Series B Bloomberg Cotton Subindex Total Return ETN"
    },
    {
        value: "BAM",
        label: "Brookfield Asset Management Inc."
    },
    {
        value: "BANC",
        label: "Banc of California Inc."
    },
    {
        value: "BANC-C",
        label: "Banc of California Inc. Depositary Shares"
    },
    {
        value: "BANC-D",
        label: "Banc of California Inc. Depositary Shares Series D"
    },
    {
        value: "BANC-E",
        label: "Banc of California Inc. Depositary Shares Series E"
    },
    {
        value: "BAND",
        label: "Bandwidth Inc."
    },
    {
        value: "BANF",
        label: "BancFirst Corporation"
    },
    {
        value: "BANFP",
        label: "BancFirst Corporation 7.2% Cumulative Trust Preferred Securities"
    },
    {
        value: "BANR",
        label: "Banner Corporation"
    },
    {
        value: "BANX",
        label: "StoneCastle Financial Corp"
    },
    {
        value: "BAP",
        label: "Credicorp Ltd."
    },
    {
        value: "BAR",
        label: "GraniteShares Gold Trust Shares of Beneficial Interest"
    },
    {
        value: "BAS",
        label: "Basic Energy Services Inc."
    },
    {
        value: "BASI",
        label: "Bioanalytical Systems Inc."
    },
    {
        value: "BATRA",
        label: "Liberty Media Corporation Series A Liberty Braves Common Stock"
    },
    {
        value: "BATRK",
        label: "Liberty Media Corporation Series C Liberty Braves Common Stock"
    },
    {
        value: "BATT",
        label: ""
    },
    {
        value: "BAX",
        label: "Baxter International Inc."
    },
    {
        value: "BB",
        label: "BlackBerry Limited"
    },
    {
        value: "BBBY",
        label: "Bed Bath & Beyond Inc."
    },
    {
        value: "BBC",
        label: "Virtus LifeSci Biotech Clinical Trials"
    },
    {
        value: "BBD",
        label: "Banco Bradesco Sa American Depositary Shares"
    },
    {
        value: "BBDO",
        label: "Banco Bradesco Sa American Depositary Shares (each representing one)"
    },
    {
        value: "BBF",
        label: "BlackRock Municipal Income Investment Trust"
    },
    {
        value: "BBGI",
        label: "Beasley Broadcast Group Inc."
    },
    {
        value: "BBH",
        label: "VanEck Vectors Biotech ETF"
    },
    {
        value: "BBK",
        label: "Blackrock Municipal Bond Trust"
    },
    {
        value: "BBL",
        label: "BHP Billiton plc Sponsored ADR"
    },
    {
        value: "BBN",
        label: "BlackRock Taxable Municipal Bond Trust of Beneficial Interest"
    },
    {
        value: "BBOX",
        label: "Black Box Corporation"
    },
    {
        value: "BBP",
        label: "Virtus LifeSci Biotech Products"
    },
    {
        value: "BBRC",
        label: "Columbia Beyond BRICs"
    },
    {
        value: "BBSI",
        label: "Barrett Business Services Inc."
    },
    {
        value: "BBT",
        label: "BB&T Corporation"
    },
    {
        value: "BBT-D",
        label: "BB&T Corporation Depositary Shares Series D"
    },
    {
        value: "BBT-E",
        label: "BB&T Corporation Depositary Shares Series E"
    },
    {
        value: "BBT-F",
        label: "BB&T Corporation Depositary Shares Series F"
    },
    {
        value: "BBT-G",
        label: "BB&T Corporation Depositary Shares Series G"
    },
    {
        value: "BBT-H",
        label: "BB&T Corporation Depositary shares Series H"
    },
    {
        value: "BBU",
        label: "Brookfield Business Partners L.P. Limited Partnership Units"
    },
    {
        value: "BBVA",
        label: "Banco Bilbao Vizcaya Argentaria S.A."
    },
    {
        value: "BBW",
        label: "Build-A-Bear Workshop Inc."
    },
    {
        value: "BBX",
        label: "BBX Capital Corporation Class A"
    },
    {
        value: "BBY",
        label: "Best Buy Co. Inc."
    },
    {
        value: "BC",
        label: "Brunswick Corporation"
    },
    {
        value: "BCAC",
        label: "Bison Capital Acquisition Corp."
    },
    {
        value: "BCACR",
        label: "Bison Capital Acquisition Corp. Rights"
    },
    {
        value: "BCACU",
        label: "Bison Capital Acquisition Corp. Units Consisting of 1 OS 1/2 WT and 1 RT"
    },
    {
        value: "BCACW",
        label: "Bison Capital Acquisition Corp. Warrant"
    },
    {
        value: "BCBP",
        label: "BCB Bancorp Inc. (NJ)"
    },
    {
        value: "BCC",
        label: "Boise Cascade L.L.C."
    },
    {
        value: "BCD",
        label: "ETFS Bloomberg All Commodity Longer Dated Strategy K-1 Free"
    },
    {
        value: "BCE",
        label: "BCE Inc."
    },
    {
        value: "BCEI",
        label: "Bonanza Creek Energy Inc."
    },
    {
        value: "BCH",
        label: "Banco De Chile ADS"
    },
    {
        value: "BCI",
        label: "ETFS Bloomberg All Commodity Strategy K-1 Free"
    },
    {
        value: "BCLI",
        label: "Brainstorm Cell Therapeutics Inc."
    },
    {
        value: "BCM",
        label: "iPath Pure Beta Broad Commodity ETN"
    },
    {
        value: "BCML",
        label: "BayCom Corp"
    },
    {
        value: "BCO",
        label: "Brinks Company (The)"
    },
    {
        value: "BCOM",
        label: "B Communications Ltd."
    },
    {
        value: "BCOR",
        label: "Blucora Inc."
    },
    {
        value: "BCOV",
        label: "Brightcove Inc."
    },
    {
        value: "BCPC",
        label: "Balchem Corporation"
    },
    {
        value: "BCRH",
        label: "Blue Capital Reinsurance Holdings Ltd."
    },
    {
        value: "BCRX",
        label: "BioCryst Pharmaceuticals Inc."
    },
    {
        value: "BCS",
        label: "Barclays PLC"
    },
    {
        value: "BCS-D",
        label: "Barclays PLC American Depositary Shares Series 5"
    },
    {
        value: "BCTF",
        label: "Bancorp 34 Inc."
    },
    {
        value: "BCV",
        label: "Bancroft Fund Ltd."
    },
    {
        value: "BCV-A",
        label: "Bancroft Fund Limited 5.375% Series A Cumulative Preferred Shares"
    },
    {
        value: "BCX",
        label: "BlackRock Resources of Beneficial Interest"
    },
    {
        value: "BDC",
        label: "Belden Inc"
    },
    {
        value: "BDC-B",
        label: "Belden Inc Depositary Shares Series B"
    },
    {
        value: "BDCL",
        label: "2xLeveraged Long Exchange Traded Access Securities (E-TRACS) Linked to the Wells Fargo Business Development Company Index due May 24 2041"
    },
    {
        value: "BDCS",
        label: "UBS AG Exchange Traded Access Securities (E TRACS) Linked to the Wells Fargo Business Development Company Index due April 26 2041"
    },
    {
        value: "BDCZ",
        label: "ETRACS Wells Fargo Business Development Company Index ETN Series B due April 26 2041"
    },
    {
        value: "BDD",
        label: "DB Base Metals Double Long Exchange Traded Notes due June 1 2038"
    },
    {
        value: "BDGE",
        label: "Bridge Bancorp Inc."
    },
    {
        value: "BDJ",
        label: "Blackrock Enhanced Equity Dividend Trust"
    },
    {
        value: "BDL",
        label: "Flanigan's Enterprises Inc."
    },
    {
        value: "BDN",
        label: "Brandywine Realty Trust"
    },
    {
        value: "BDR",
        label: "Blonder Tongue Laboratories Inc."
    },
    {
        value: "BDRY",
        label: "Breakwave Dry Bulk Shipping"
    },
    {
        value: "BDSI",
        label: "BioDelivery Sciences International Inc."
    },
    {
        value: "BDX",
        label: "Becton Dickinson and Company"
    },
    {
        value: "BDXA",
        label: "Becton Dickinson and Company Depositary Shares each Representing a 1/20th Interest in a Share of 6.125% Mandatory Convertible Preferred Stock Series A $1.00 par"
    },
    {
        value: "BEAT",
        label: "BioTelemetry Inc."
    },
    {
        value: "BECN",
        label: "Beacon Roofing Supply Inc."
    },
    {
        value: "BEDU",
        label: "Bright Scholar Education Holdings Limited American Depositary Shares each representing one Class A"
    },
    {
        value: "BEF",
        label: "ETFS Bloomberg Energy Commodity Longer Dated Strategy K-1 Free"
    },
    {
        value: "BEL",
        label: "Belmond Ltd. Class A"
    },
    {
        value: "BELFA",
        label: "Bel Fuse Inc. Class A Common Stock"
    },
    {
        value: "BELFB",
        label: "Bel Fuse Inc. Class B Common Stock"
    },
    {
        value: "BEMO",
        label: "Aptus Behavioral Momentum"
    },
    {
        value: "BEN",
        label: "Franklin Resources Inc."
    },
    {
        value: "BEP",
        label: "Brookfield Renewable Partners L.P."
    },
    {
        value: "BERN",
        label: "Bernstein U.S. Research Fund"
    },
    {
        value: "BERY",
        label: "Berry Global Group Inc."
    },
    {
        value: "BF.A",
        label: "Brown Forman Inc Class A"
    },
    {
        value: "BF.B",
        label: "Brown Forman Inc Class B"
    },
    {
        value: "BFAM",
        label: "Bright Horizons Family Solutions Inc."
    },
    {
        value: "BFIN",
        label: "BankFinancial Corporation"
    },
    {
        value: "BFIT",
        label: "Global X Health & Wellness Thematic ETF"
    },
    {
        value: "BFK",
        label: "BlackRock Municipal Income Trust"
    },
    {
        value: "BFO",
        label: "Blackrock Florida Municipal 2020 Term Trust"
    },
    {
        value: "BFOR",
        label: "Barron's 400"
    },
    {
        value: "BFR",
        label: "BBVA Banco Frances S.A."
    },
    {
        value: "BFRA",
        label: "Biofrontera AG"
    },
    {
        value: "BFS",
        label: "Saul Centers Inc."
    },
    {
        value: "BFS-C",
        label: "Saul Centers Inc. Depositary Shares Series C"
    },
    {
        value: "BFS-D",
        label: "Saul Centers Inc. Depositary Shares Series D"
    },
    {
        value: "BFST",
        label: "Business First Bancshares Inc."
    },
    {
        value: "BFY",
        label: "BlackRock New York Municipal Income Trust II"
    },
    {
        value: "BFZ",
        label: "BlackRock California Municipal Income Trust"
    },
    {
        value: "BG",
        label: "Bunge Limited"
    },
    {
        value: "BGB",
        label: "Blackstone / GSO Strategic Credit Fund"
    },
    {
        value: "BGC",
        label: "General Cable Corporation"
    },
    {
        value: "BGCA",
        label: "BGC Partners Inc. 8.125% Senior Notes due 2042"
    },
    {
        value: "BGCP",
        label: "BGC Partners Inc."
    },
    {
        value: "BGFV",
        label: "Big 5 Sporting Goods Corporation"
    },
    {
        value: "BGG",
        label: "Briggs & Stratton Corporation"
    },
    {
        value: "BGH",
        label: "Barings Global Short Duration High Yield Fund of Beneficial Interests"
    },
    {
        value: "BGI",
        label: "Birks Group Inc."
    },
    {
        value: "BGIO",
        label: "BlackRock 2022 Global Income Opportunity Trust of Beneficial Interest"
    },
    {
        value: "BGNE",
        label: "BeiGene Ltd."
    },
    {
        value: "BGR",
        label: "BlackRock Energy and Resources Trust"
    },
    {
        value: "BGS",
        label: "B&G Foods Inc."
    },
    {
        value: "BGSF",
        label: "BG Staffing Inc"
    },
    {
        value: "BGT",
        label: "BlackRock Floating Rate Income Trust"
    },
    {
        value: "BGX",
        label: "Blackstone GSO Long Short Credit Income Fund"
    },
    {
        value: "BGY",
        label: "Blackrock Enhanced International Dividend Trust"
    },
    {
        value: "BH",
        label: "Biglari Holdings Inc. Class B"
    },
    {
        value: "BH.A",
        label: "Biglari Holdings Inc. Class A"
    },
    {
        value: "BHAC",
        label: "Barington/Hilco Acquisition Corp."
    },
    {
        value: "BHACR",
        label: "BARINGTON/HILCO ACQUIS-RIGHT"
    },
    {
        value: "BHACU",
        label: "Barington/Hilco Acquisition Corp. Unit"
    },
    {
        value: "BHACW",
        label: ""
    },
    {
        value: "BHB",
        label: "Bar Harbor Bankshares Inc."
    },
    {
        value: "BHBK",
        label: "Blue Hills Bancorp Inc."
    },
    {
        value: "BHE",
        label: "Benchmark Electronics Inc."
    },
    {
        value: "BHF",
        label: "Brighthouse Financial Inc."
    },
    {
        value: "BHGE",
        label: "Baker Hughes a GE company Class A"
    },
    {
        value: "BHK",
        label: "Blackrock Core Bond Trust"
    },
    {
        value: "BHLB",
        label: "Berkshire Hills Bancorp Inc."
    },
    {
        value: "BHP",
        label: "BHP Billiton Limited"
    },
    {
        value: "BHR",
        label: "Braemar Hotels & Resorts Inc."
    },
    {
        value: "BHR-B",
        label: "Braemar Hotels & Resorts Inc. 5.50% Series B Cumulative Convertible Preferred Stock par value $0.01 per share"
    },
    {
        value: "BHTG",
        label: "BioHiTech Global Inc."
    },
    {
        value: "BHV",
        label: "BlackRock Virginia Municipal Bond Trust"
    },
    {
        value: "BHVN",
        label: "Biohaven Pharmaceutical Holding Company Ltd."
    },
    {
        value: "BIB",
        label: "ProShares Ultra Nasdaq Biotechnology"
    },
    {
        value: "BIBL",
        label: "Inspire 100"
    },
    {
        value: "BICK",
        label: "First Trust BICK Index Fund"
    },
    {
        value: "BID",
        label: "Sotheby's"
    },
    {
        value: "BIDU",
        label: "Baidu Inc."
    },
    {
        value: "BIF",
        label: "Boulder Growth & Income Fund Inc."
    },
    {
        value: "BIG",
        label: "Big Lots Inc."
    },
    {
        value: "BIIB",
        label: "Biogen Inc."
    },
    {
        value: "BIL",
        label: "SPDR Bloomberg Barclays 1-3 Month T-Bill"
    },
    {
        value: "BILI",
        label: "Bilibili Inc."
    },
    {
        value: "BIO",
        label: "Bio-Rad Laboratories Inc. Class A"
    },
    {
        value: "BIO.B",
        label: "Bio-Rad Laboratories Inc. Class B"
    },
    {
        value: "BIOC",
        label: "Biocept Inc."
    },
    {
        value: "BIOL",
        label: "Biolase Inc."
    },
    {
        value: "BIOS",
        label: "BioScrip Inc."
    },
    {
        value: "BIP",
        label: "Brookfield Infrastructure Partners LP Limited Partnership Units"
    },
    {
        value: "BIS",
        label: "ProShares UltraShort Nasdaq Biotechnology"
    },
    {
        value: "BIT",
        label: "BlackRock Multi-Sector Income Trust of Beneficial Interest"
    },
    {
        value: "BITA",
        label: "Bitauto Holdings Limited American Depositary Shares (each representing one)"
    },
    {
        value: "BIV",
        label: "Vanguard Intermediate-Term Bond"
    },
    {
        value: "BIZD",
        label: "VanEck Vectors BDC Income"
    },
    {
        value: "BJJN",
        label: "iPathA Series B Bloomberg Nickel Subindex Total Return ETN"
    },
    {
        value: "BJK",
        label: "VanEck Vectors Gaming"
    },
    {
        value: "BJO",
        label: "iPathA Series B Bloomberg Coffee Subindex Total Return ETN"
    },
    {
        value: "BJRI",
        label: "BJ's Restaurants Inc."
    },
    {
        value: "BJZ",
        label: "Blackrock California Municipal 2018 Term Trust"
    },
    {
        value: "BK",
        label: "Bank of New York Mellon Corporation (The)"
    },
    {
        value: "BK-C",
        label: "Bank Of New York Mellon Corporation (The) Dep Shs Repstg 1/4000th Perp Pfd Ser C"
    },
    {
        value: "BKC",
        label: "REX BKCM"
    },
    {
        value: "BKCC",
        label: "BlackRock Capital Investment Corporation"
    },
    {
        value: "BKD",
        label: "Brookdale Senior Living Inc."
    },
    {
        value: "BKE",
        label: "Buckle Inc. (The)"
    },
    {
        value: "BKEP",
        label: "Blueknight Energy Partners L.P. L.L.C."
    },
    {
        value: "BKEPP",
        label: "Blueknight Energy Partners L.P. L.L.C. Series A Preferred Units"
    },
    {
        value: "BKF",
        label: "iShares MSCI BRIC Index Fund"
    },
    {
        value: "BKH",
        label: "Black Hills Corporation"
    },
    {
        value: "BKHU",
        label: "Black Hills Corporation Corporate Units"
    },
    {
        value: "BKI",
        label: "Black Knight Inc."
    },
    {
        value: "BKJ",
        label: "Bancorp of New Jersey Inc"
    },
    {
        value: "BKK",
        label: "Blackrock Municipal 2020 Term Trust"
    },
    {
        value: "BKLN",
        label: "Invesco Senior Loan"
    },
    {
        value: "BKN",
        label: "BlackRock Investment Quality Municipal Trust Inc. (The)"
    },
    {
        value: "BKNG",
        label: "Booking Holdings Inc."
    },
    {
        value: "BKS",
        label: "Barnes & Noble Inc."
    },
    {
        value: "BKSC",
        label: "Bank of South Carolina Corp."
    },
    {
        value: "BKT",
        label: "BlackRock Income Trust Inc. (The)"
    },
    {
        value: "BKTI",
        label: ""
    },
    {
        value: "BKU",
        label: "BankUnited Inc."
    },
    {
        value: "BKYI",
        label: "BIO-key International Inc."
    },
    {
        value: "BL",
        label: "BlackLine Inc."
    },
    {
        value: "BLBD",
        label: "Blue Bird Corporation"
    },
    {
        value: "BLCM",
        label: "Bellicum Pharmaceuticals Inc."
    },
    {
        value: "BLCN",
        label: "Reality Shares Nasdaq NextGen Economy ETF"
    },
    {
        value: "BLD",
        label: "TopBuild Corp."
    },
    {
        value: "BLDP",
        label: "Ballard Power Systems Inc."
    },
    {
        value: "BLDR",
        label: "Builders FirstSource Inc."
    },
    {
        value: "BLE",
        label: "BlackRock Municipal Income Trust II"
    },
    {
        value: "BLES",
        label: "Inspire Global Hope"
    },
    {
        value: "BLFS",
        label: "BioLife Solutions Inc."
    },
    {
        value: "BLH",
        label: "Blackrock New York Municipal 2018 Term Trust"
    },
    {
        value: "BLHY",
        label: "Virtus Newfleet Dynamic Credit"
    },
    {
        value: "BLIN",
        label: "Bridgeline Digital Inc."
    },
    {
        value: "BLJ",
        label: "Blackrock New Jersey Municipal Bond Trust"
    },
    {
        value: "BLK",
        label: "BlackRock Inc."
    },
    {
        value: "BLKB",
        label: "Blackbaud Inc."
    },
    {
        value: "BLL",
        label: "Ball Corporation"
    },
    {
        value: "BLMN",
        label: "Bloomin' Brands Inc."
    },
    {
        value: "BLMT",
        label: "BSB Bancorp Inc."
    },
    {
        value: "BLNK",
        label: "Blink Charging Co."
    },
    {
        value: "BLNKW",
        label: "Blink Charging Co. Warrant"
    },
    {
        value: "BLOK",
        label: "Amplify Transformational Data Sharing"
    },
    {
        value: "BLPH",
        label: "Bellerophon Therapeutics Inc."
    },
    {
        value: "BLRX",
        label: "BioLineRx Ltd."
    },
    {
        value: "BLUE",
        label: "bluebird bio Inc."
    },
    {
        value: "BLV",
        label: "Vanguard Long-Term Bond"
    },
    {
        value: "BLW",
        label: "Blackrock Limited Duration Income Trust"
    },
    {
        value: "BLX",
        label: "Banco Latinoamericano de Comercio Exterior S.A."
    },
    {
        value: "BMA",
        label: "Banco Macro S.A. ADR (representing Ten Class B)"
    },
    {
        value: "BMCH",
        label: "BMC Stock Holdings Inc."
    },
    {
        value: "BME",
        label: "Blackrock Health Sciences Trust"
    },
    {
        value: "BMI",
        label: "Badger Meter Inc."
    },
    {
        value: "BML-G",
        label: "Bank of America Corporation Depositary Shares Series 1"
    },
    {
        value: "BML-H",
        label: "Bank of America Corporation Depositary Shares Series 2"
    },
    {
        value: "BML-I",
        label: "Bank of America Corporation Depositary Shares Series 3"
    },
    {
        value: "BML-J",
        label: "Bank of America Corporation Depositary Shares Series 4"
    },
    {
        value: "BML-L",
        label: "Bank of America Corporation Depositary Shares Series 5"
    },
    {
        value: "BMLP",
        label: "BMO Elkhorn DWA MLP Select Index Exchange Traded Notes due December 10 2036"
    },
    {
        value: "BMO",
        label: "Bank Of Montreal"
    },
    {
        value: "BMRA",
        label: "Biomerica Inc."
    },
    {
        value: "BMRC",
        label: "Bank of Marin Bancorp"
    },
    {
        value: "BMRN",
        label: "BioMarin Pharmaceutical Inc."
    },
    {
        value: "BMS",
        label: "Bemis Company Inc."
    },
    {
        value: "BMTC",
        label: "Bryn Mawr Bank Corporation"
    },
    {
        value: "BMY",
        label: "Bristol-Myers Squibb Company"
    },
    {
        value: "BNCL",
        label: "Beneficial Bancorp Inc."
    },
    {
        value: "BND",
        label: "Vanguard Total Bond Market"
    },
    {
        value: "BNDC",
        label: "FlexShares Core Select Bond Fund"
    },
    {
        value: "BNDX",
        label: "Vanguard Total International Bond ETF"
    },
    {
        value: "BNED",
        label: "Barnes & Noble Education Inc"
    },
    {
        value: "BNFT",
        label: "Benefitfocus Inc."
    },
    {
        value: "BNJ",
        label: "BlackRock New Jersey Municipal Income Trust"
    },
    {
        value: "BNO",
        label: "United States Brent Oil Fund LP ETV"
    },
    {
        value: "BNS",
        label: "Bank Nova Scotia Halifax Pfd 3"
    },
    {
        value: "BNSO",
        label: "Bonso Electronics International Inc."
    },
    {
        value: "BNTC",
        label: "Benitec Biopharma Limited"
    },
    {
        value: "BNTCW",
        label: ""
    },
    {
        value: "BNY",
        label: "BlackRock New York Municipal Income Trust"
    },
    {
        value: "BOCH",
        label: "Bank of Commerce Holdings (CA)"
    },
    {
        value: "BOE",
        label: "Blackrock Enhanced Global Dividend Trust of Beneficial Interest"
    },
    {
        value: "BOFI",
        label: "BofI Holding Inc."
    },
    {
        value: "BOFIL",
        label: "BofI Holding Inc. 6.25% Subordinated Notes Due 2026"
    },
    {
        value: "BOH",
        label: "Bank of Hawaii Corporation"
    },
    {
        value: "BOIL",
        label: "ProShares Ultra Bloomberg Natural Gas"
    },
    {
        value: "BOJA",
        label: "Bojangles' Inc."
    },
    {
        value: "BOKF",
        label: "BOK Financial Corporation"
    },
    {
        value: "BOKFL",
        label: "BOK Financial Corporation 5.375% Subordinated Notes due 2056"
    },
    {
        value: "BOLD",
        label: "Audentes Therapeutics Inc."
    },
    {
        value: "BOM",
        label: "DB Base Metals Double Short Exchange Traded Notes due June 1 2038"
    },
    {
        value: "BOMN",
        label: "Boston Omaha Corporation"
    },
    {
        value: "BOND",
        label: "PIMCO Active Bond Exchange-Traded Fund Exchange-Traded Fund"
    },
    {
        value: "BOOM",
        label: "DMC Global Inc."
    },
    {
        value: "BOON",
        label: "NYSE Pickens Oil Response"
    },
    {
        value: "BOOT",
        label: "Boot Barn Holdings Inc."
    },
    {
        value: "BORN",
        label: "China New Borun Corporation American Depositary Shares"
    },
    {
        value: "BOS",
        label: "DB Base Metals Short Exchange Traded Notes due June 1 2038"
    },
    {
        value: "BOSC",
        label: "B.O.S. Better Online Solutions"
    },
    {
        value: "BOSS",
        label: "Global X Funds Founder-Run Companies"
    },
    {
        value: "BOTJ",
        label: "Bank of the James Financial Group Inc."
    },
    {
        value: "BOTZ",
        label: "Global X Robotics & Artificial Intelligence ETF"
    },
    {
        value: "BOX",
        label: "Box Inc. Class A"
    },
    {
        value: "BOXL",
        label: "Boxlight Corporation"
    },
    {
        value: "BP",
        label: "BP p.l.c."
    },
    {
        value: "BPFH",
        label: "Boston Private Financial Holdings Inc."
    },
    {
        value: "BPFHP",
        label: "Boston Private Financial Holdings Inc. Depositary Shares representing 1/40th Interest in a Share of 6.95% Non-Cumulative Perpetual Preferred Stock Series D"
    },
    {
        value: "BPFHW",
        label: "Boston Private Financial Holdings Inc. Warrants to purchase 1 share of common stock @ $8.00/share"
    },
    {
        value: "BPI",
        label: "Bridgepoint Education Inc."
    },
    {
        value: "BPK",
        label: "Blackrock Municipal 2018 Term Trust"
    },
    {
        value: "BPL",
        label: "Buckeye Partners L.P."
    },
    {
        value: "BPMC",
        label: "Blueprint Medicines Corporation"
    },
    {
        value: "BPMP",
        label: "BP Midstream Partners LP representing Limited Partner Interests"
    },
    {
        value: "BPMX",
        label: "BioPharmX Corporation. Common"
    },
    {
        value: "BPOP",
        label: "Popular Inc."
    },
    {
        value: "BPOPM",
        label: "Popular Inc. Popular Capital Trust II"
    },
    {
        value: "BPOPN",
        label: "Popular Inc. Popular Capital Trust I -6.70% Cumulative Monthly Income Trust Preferred Securities"
    },
    {
        value: "BPRN",
        label: "The Bank of Princeton"
    },
    {
        value: "BPT",
        label: "BP Prudhoe Bay Royalty Trust"
    },
    {
        value: "BPTH",
        label: "Bio-Path Holdings Inc."
    },
    {
        value: "BPY",
        label: "Brookfield Property Partners L.P."
    },
    {
        value: "BQH",
        label: "Blackrock New York Municipal Bond Trust of Beneficial Interest"
    },
    {
        value: "BR",
        label: "Broadridge Financial Solutions Inc.Common Stock"
    },
    {
        value: "BRAC",
        label: "Black Ridge Acquisition Corp."
    },
    {
        value: "BRACR",
        label: "Black Ridge Acquisition Corp. Right"
    },
    {
        value: "BRACU",
        label: "Black Ridge Acquisition Corp. Unit"
    },
    {
        value: "BRACW",
        label: "Black Ridge Acquisition Corp. Warrant"
    },
    {
        value: "BRC",
        label: "Brady Corporation"
    },
    {
        value: "BREW",
        label: "Craft Brew Alliance Inc."
    },
    {
        value: "BRF",
        label: "VanEck Vectors Brazil Small-Cap"
    },
    {
        value: "BRFS",
        label: "BRF S.A."
    },
    {
        value: "BRG",
        label: "Bluerock Residential Growth REIT Inc. Class A"
    },
    {
        value: "BRG-A",
        label: "Bluerock Residential Growth REIT Inc. 8.250% Series A Cumulative Redeemable Preferred Stock ($0.01 par value per share)"
    },
    {
        value: "BRG-C",
        label: "Bluerock Residential Growth REIT Inc. 7.625% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "BRG-D",
        label: "Bluerock Residential Growth REIT Inc. 7.125% Series D Cumulative Preferred Stock ($0.01 par value per share)"
    },
    {
        value: "BRGL",
        label: "Bernstein Global Research Fund"
    },
    {
        value: "BRID",
        label: "Bridgford Foods Corporation"
    },
    {
        value: "BRK.A",
        label: "Berkshire Hathaway Inc."
    },
    {
        value: "BRK.B",
        label: "Berkshire Hathaway Inc."
    },
    {
        value: "BRKL",
        label: "Brookline Bancorp Inc."
    },
    {
        value: "BRKR",
        label: "Bruker Corporation"
    },
    {
        value: "BRKS",
        label: "Brooks Automation Inc."
    },
    {
        value: "BRN",
        label: "Barnwell Industries Inc."
    },
    {
        value: "BRO",
        label: "Brown & Brown Inc."
    },
    {
        value: "BRPA",
        label: "Big Rock Partners Acquisition Corp."
    },
    {
        value: "BRPAR",
        label: "Big Rock Partners Acquisition Corp. Right"
    },
    {
        value: "BRPAU",
        label: "Big Rock Partners Acquisition Corp. Unit"
    },
    {
        value: "BRPAW",
        label: "Big Rock Partners Acquisition Corp. Warrant"
    },
    {
        value: "BRQS",
        label: "Borqs Technologies Inc."
    },
    {
        value: "BRS",
        label: "Bristow Group Inc."
    },
    {
        value: "BRSS",
        label: "Global Brass and Copper Holdings Inc."
    },
    {
        value: "BRT",
        label: "BRT Apartments Corp. (MD)"
    },
    {
        value: "BRX",
        label: "Brixmor Property Group Inc."
    },
    {
        value: "BRZU",
        label: "Direxion Daily Brazil Bull 3X Shares"
    },
    {
        value: "BSA",
        label: "BrightSphere Investment Group plc 5.125% Notes due 2031"
    },
    {
        value: "BSAC",
        label: "Banco Santander - Chile ADS"
    },
    {
        value: "BSBR",
        label: "Banco Santander Brasil SA American Depositary Shares each representing one unit"
    },
    {
        value: "BSCI",
        label: "Invesco BulletShares 2018 Corporate Bond"
    },
    {
        value: "BSCJ",
        label: "Invesco BulletShares 2019 Corporate Bond"
    },
    {
        value: "BSCK",
        label: "Invesco BulletShares 2020 Corporate Bond"
    },
    {
        value: "BSCL",
        label: "Invesco BulletShares 2021 Corporate Bond"
    },
    {
        value: "BSCM",
        label: "Invesco BulletShares 2022 Corporate Bond"
    },
    {
        value: "BSCN",
        label: "Invesco BulletShares 2023 Corporate Bond"
    },
    {
        value: "BSCO",
        label: "Invesco BulletShares 2024 Corporate Bond"
    },
    {
        value: "BSCP",
        label: "Invesco BulletShares 2025 Corporate Bond"
    },
    {
        value: "BSCQ",
        label: "Invesco BulletShares 2026 Corporate Bond"
    },
    {
        value: "BSCR",
        label: "Invesco BulletShares 2027 Corporate Bond"
    },
    {
        value: "BSD",
        label: "BlackRock Strategic Municipal Trust Inc. (The)"
    },
    {
        value: "BSE",
        label: "Blackrock New York Municipal Income Quality Trust of Beneficial Interest"
    },
    {
        value: "BSET",
        label: "Bassett Furniture Industries Incorporated"
    },
    {
        value: "BSIG",
        label: "BrightSphere Investment Group plc"
    },
    {
        value: "BSJI",
        label: "Invesco BulletShares 2018 High Yield Corporate Bond"
    },
    {
        value: "BSJJ",
        label: "Invesco BulletShares 2019 High Yield Corporate Bond"
    },
    {
        value: "BSJK",
        label: "Invesco BulletShares 2020 High Yield Corporate Bond"
    },
    {
        value: "BSJL",
        label: "Invesco BulletShares 2021 High Yield Corporate Bond"
    },
    {
        value: "BSJM",
        label: "Invesco BulletShares 2022 High Yield Corporate Bond"
    },
    {
        value: "BSJN",
        label: "Invesco BulletShares 2023 High Yield Corporate Bond"
    },
    {
        value: "BSJO",
        label: "Invesco BulletShares 2024 High Yield Corporate Bond"
    },
    {
        value: "BSJP",
        label: "Invesco BulletShares 2025 High Yield Corporate Bond"
    },
    {
        value: "BSL",
        label: "Blackstone GSO Senior Floating Rate Term Fund of Beneficial Interest"
    },
    {
        value: "BSM",
        label: "Black Stone Minerals L.P. representing limited partner interests"
    },
    {
        value: "BSMX",
        label: "Banco Santander (M?xico) S.A. Instituci?n de Banca M?ltiple Grupo Financiero Santander M?xico"
    },
    {
        value: "BSPM",
        label: "Biostar Pharmaceuticals Inc."
    },
    {
        value: "BSQR",
        label: "BSQUARE Corporation"
    },
    {
        value: "BSRR",
        label: "Sierra Bancorp"
    },
    {
        value: "BST",
        label: "BlackRock Science and Technology Trust of Beneficial Interest"
    },
    {
        value: "BSTC",
        label: "BioSpecifics Technologies Corp"
    },
    {
        value: "BSTI",
        label: "BEST Inc. American Depositary Shares each representing one Class A"
    },
    {
        value: "BSV",
        label: "Vanguard Short-Term Bond"
    },
    {
        value: "BSWN",
        label: "UBS AG VelocityShares VIX Tail Risk ETN linked to the S&P 500 VIX Futures Tail Risk Index Short Term due July 18 2046"
    },
    {
        value: "BSX",
        label: "Boston Scientific Corporation"
    },
    {
        value: "BT",
        label: "BT Group plc American Depositary Shares"
    },
    {
        value: "BTA",
        label: "BlackRock Long-Term Municipal Advantage Trust of Beneficial Interest"
    },
    {
        value: "BTAI",
        label: "BioXcel Therapeutics Inc."
    },
    {
        value: "BTAL",
        label: "AGFiQ U.S. Market Neutral Anti-Beta Fund"
    },
    {
        value: "BTE",
        label: "Baytex Energy Corp"
    },
    {
        value: "BTEC",
        label: "Principal Healthcare Innovators Index ETF"
    },
    {
        value: "BTG",
        label: "B2Gold Corp (Canada)"
    },
    {
        value: "BTI",
        label: "British American Tobacco Industries p.l.c. ADR"
    },
    {
        value: "BTN",
        label: "Ballantyne Strong Inc."
    },
    {
        value: "BTO",
        label: "John Hancock Financial Opportunities Fund"
    },
    {
        value: "BTT",
        label: "BlackRock Municipal 2030 Target Term Trust"
    },
    {
        value: "BTU",
        label: "Peabody Energy Corporation"
    },
    {
        value: "BTX",
        label: "BioTime Inc."
    },
    {
        value: "BTX+",
        label: ""
    },
    {
        value: "BTZ",
        label: "BlackRock Credit Allocation Income Trust"
    },
    {
        value: "BUD",
        label: "Anheuser-Busch Inbev SA Sponsored ADR (Belgium)"
    },
    {
        value: "BUI",
        label: "BlackRock Utility Infrastructure & Power Opportunities Trust"
    },
    {
        value: "BURG",
        label: "Chanticleer Holdings Inc."
    },
    {
        value: "BURL",
        label: "Burlington Stores Inc."
    },
    {
        value: "BUSE",
        label: "First Busey Corporation"
    },
    {
        value: "BUY",
        label: "USCF SummerHaven SHPEI Index Fund"
    },
    {
        value: "BUYN",
        label: "USCF SummerHaven SHPEN Index Fund"
    },
    {
        value: "BUZ",
        label: "Buzz US Sentiment Leaders"
    },
    {
        value: "BVAL",
        label: "Brand Value"
    },
    {
        value: "BVN",
        label: "Buenaventura Mining Company Inc."
    },
    {
        value: "BVNSC",
        label: "Brandes Investment Trust"
    },
    {
        value: "BVSN",
        label: "BroadVision Inc."
    },
    {
        value: "BVX",
        label: "Bovie Medical Corporation"
    },
    {
        value: "BVXV",
        label: "BiondVax Pharmaceuticals Ltd."
    },
    {
        value: "BVXVW",
        label: ""
    },
    {
        value: "BW",
        label: "Babcock & Wilcox Enterprises Inc."
    },
    {
        value: "BWA",
        label: "BorgWarner Inc."
    },
    {
        value: "BWB",
        label: "Bridgewater Bancshares Inc."
    },
    {
        value: "BWEN",
        label: "Broadwind Energy Inc."
    },
    {
        value: "BWFG",
        label: "Bankwell Financial Group Inc."
    },
    {
        value: "BWG",
        label: "BrandywineGLOBAL Global Income Opportunities Fund Inc."
    },
    {
        value: "BWINA",
        label: "Baldwin & Lyons Inc. Class A (voting) Common Stock"
    },
    {
        value: "BWINB",
        label: "Baldwin & Lyons Inc. Class B (nonvoting) Common Stock"
    },
    {
        value: "BWL.A",
        label: "Bowl America Inc. Class A"
    },
    {
        value: "BWP",
        label: "Boardwalk Pipeline Partners LP"
    },
    {
        value: "BWX",
        label: "SPDR Bloomberg Barclays Intl Treasury Bd"
    },
    {
        value: "BWXT",
        label: "BWX Technologies Inc."
    },
    {
        value: "BWZ",
        label: "SPDR Bloomberg Barclays Short Term International Treasury Bond"
    },
    {
        value: "BX",
        label: "The Blackstone Group L.P. Representing Limited Partnership Interests"
    },
    {
        value: "BXC",
        label: "Bluelinx Holdings Inc."
    },
    {
        value: "BXE",
        label: "Bellatrix Exploration Ltd (Canada)"
    },
    {
        value: "BXG",
        label: "Bluegreen Vacations Corporation"
    },
    {
        value: "BXMT",
        label: "Blackstone Mortgage Trust Inc."
    },
    {
        value: "BXMX",
        label: "Nuveen S&P 500 Buy-Write Income Fund of Beneficial Interest"
    },
    {
        value: "BXP",
        label: "Boston Properties Inc."
    },
    {
        value: "BXP-B",
        label: "Boston Properties Inc. Depositary Shares each representing 1/100th of a share of the Issuer's 5.25% Sockeries B Cumulative Redeemable Preferred St"
    },
    {
        value: "BXS",
        label: "BancorpSouth Bank"
    },
    {
        value: "BY",
        label: "Byline Bancorp Inc."
    },
    {
        value: "BYD",
        label: "Boyd Gaming Corporation"
    },
    {
        value: "BYFC",
        label: "Broadway Financial Corporation"
    },
    {
        value: "BYLD",
        label: "iShares Yield Optimized Bond"
    },
    {
        value: "BYM",
        label: "Blackrock Municipal Income Quality Trust of Beneficial Interest"
    },
    {
        value: "BYSI",
        label: "BeyondSpring Inc."
    },
    {
        value: "BZF",
        label: "WisdomTree Brazilian Real Strategy Fund"
    },
    {
        value: "BZH",
        label: "Beazer Homes USA Inc."
    },
    {
        value: "BZM",
        label: "BlackRock Maryland Municipal Bond Trust of beneficial interest"
    },
    {
        value: "BZQ",
        label: "ProShares UltraShort MSCI Brazil Capped"
    },
    {
        value: "BZUN",
        label: "Baozun Inc."
    },
    {
        value: "C",
        label: "Citigroup Inc."
    },
    {
        value: "C+A",
        label: "Citigroup Inc. Warrants Class A expiring January 4 2019"
    },
    {
        value: "C-C",
        label: "Citigroup Inc. Depositary Shares Series C"
    },
    {
        value: "C-J",
        label: "Citigroup Inc. Dep Shs Repstg 1/1000 Pfd Ser J Fixed/Fltg"
    },
    {
        value: "C-K",
        label: "Citigroup Inc. Dep Shs Repstg 1/1000th Pfd Ser K"
    },
    {
        value: "C-L",
        label: "Citigroup Inc. Depositary Share representing 1/1000 interest in a share of noncumulative series L"
    },
    {
        value: "C-N",
        label: "Citigroup Capital VIII 7.875% Fixed rate Floating Rate trust Preferred Securities (TruPS)"
    },
    {
        value: "C-S",
        label: "Citigroup Inc. Depositary Shares Series S"
    },
    {
        value: "CA",
        label: "CA Inc."
    },
    {
        value: "CAAP",
        label: "Corporacion America Airports SA"
    },
    {
        value: "CAAS",
        label: "China Automotive Systems Inc."
    },
    {
        value: "CABO",
        label: "Cable One Inc."
    },
    {
        value: "CAC",
        label: "Camden National Corporation"
    },
    {
        value: "CACC",
        label: "Credit Acceptance Corporation"
    },
    {
        value: "CACG",
        label: "ClearBridge All Cap Growth ETF"
    },
    {
        value: "CACI",
        label: "CACI International Inc. Class A"
    },
    {
        value: "CADC",
        label: "China Advanced Construction Materials Group Inc."
    },
    {
        value: "CADE",
        label: "Cadence Bancorporation Class A"
    },
    {
        value: "CAE",
        label: "CAE Inc."
    },
    {
        value: "CAF",
        label: "Morgan Stanley China A Share Fund Inc."
    },
    {
        value: "CAFD",
        label: "8point3 Energy Partners LP"
    },
    {
        value: "CAG",
        label: "ConAgra Brands Inc."
    },
    {
        value: "CAH",
        label: "Cardinal Health Inc."
    },
    {
        value: "CAI",
        label: "CAI International Inc."
    },
    {
        value: "CAI-A",
        label: "CAI International Inc. 8.50% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "CAJ",
        label: "Canon Inc. American Depositary Shares"
    },
    {
        value: "CAKE",
        label: "The Cheesecake Factory Incorporated"
    },
    {
        value: "CAL",
        label: "Caleres Inc."
    },
    {
        value: "CALA",
        label: "Calithera Biosciences Inc."
    },
    {
        value: "CALF",
        label: "Pacer US Small Cap Cash Cows 100"
    },
    {
        value: "CALI",
        label: "China Auto Logistics Inc."
    },
    {
        value: "CALL",
        label: "magicJack VocalTec Ltd"
    },
    {
        value: "CALM",
        label: "Cal-Maine Foods Inc."
    },
    {
        value: "CALX",
        label: "Calix Inc"
    },
    {
        value: "CAMP",
        label: "CalAmp Corp."
    },
    {
        value: "CAMT",
        label: "Camtek Ltd."
    },
    {
        value: "CANE",
        label: "Teucrium Sugar Fund ETV"
    },
    {
        value: "CANF",
        label: "Can-Fite Biopharma Ltd Sponsored ADR (Israel)"
    },
    {
        value: "CAPE",
        label: "Barclays ETN Schiller CAPE"
    },
    {
        value: "CAPL",
        label: "CrossAmerica Partners LP representing limited partner interests"
    },
    {
        value: "CAPR",
        label: "Capricor Therapeutics Inc."
    },
    {
        value: "CAR",
        label: "Avis Budget Group Inc."
    },
    {
        value: "CARA",
        label: "Cara Therapeutics Inc."
    },
    {
        value: "CARB",
        label: "Carbonite Inc."
    },
    {
        value: "CARG",
        label: "CarGurus Inc."
    },
    {
        value: "CARO",
        label: "Carolina Financial Corporation"
    },
    {
        value: "CARS",
        label: "Cars.com Inc."
    },
    {
        value: "CART",
        label: "Carolina Trust BancShares Inc."
    },
    {
        value: "CARV",
        label: "Carver Bancorp Inc."
    },
    {
        value: "CARZ",
        label: "First Trust NASDAQ Global Auto Index Fund"
    },
    {
        value: "CASA",
        label: "Casa Systems Inc."
    },
    {
        value: "CASH",
        label: "Meta Financial Group Inc."
    },
    {
        value: "CASI",
        label: "CASI Pharmaceuticals Inc."
    },
    {
        value: "CASM",
        label: "CAS Medical Systems Inc."
    },
    {
        value: "CASS",
        label: "Cass Information Systems Inc"
    },
    {
        value: "CASY",
        label: "Caseys General Stores Inc."
    },
    {
        value: "CAT",
        label: "Caterpillar Inc."
    },
    {
        value: "CATB",
        label: "Catabasis Pharmaceuticals Inc."
    },
    {
        value: "CATC",
        label: "Cambridge Bancorp"
    },
    {
        value: "CATH",
        label: "Global X S&P 500 Catholic Values ETF"
    },
    {
        value: "CATM",
        label: "Cardtronics plc"
    },
    {
        value: "CATO",
        label: "Cato Corporation (The) Class A"
    },
    {
        value: "CATS",
        label: "Catasys Inc."
    },
    {
        value: "CATY",
        label: "Cathay General Bancorp"
    },
    {
        value: "CATYW",
        label: "Cathay General Bancorp Warrant"
    },
    {
        value: "CAVM",
        label: "Cavium Inc."
    },
    {
        value: "CAW",
        label: "CCA Industries Inc."
    },
    {
        value: "CB",
        label: "Chubb Limited"
    },
    {
        value: "CBA",
        label: "ClearBridge American Energy MLP Fund Inc."
    },
    {
        value: "CBAK",
        label: "CBAK Energy Technology Inc."
    },
    {
        value: "CBAN",
        label: "Colony Bankcorp Inc."
    },
    {
        value: "CBAY",
        label: "CymaBay Therapeutics Inc."
    },
    {
        value: "CBB",
        label: "Cincinnati Bell Inc."
    },
    {
        value: "CBB-B",
        label: "Cincinnati Bell Inc. Preferred Stock"
    },
    {
        value: "CBD",
        label: "Companhia Brasileira de Distribuicao ADS"
    },
    {
        value: "CBFV",
        label: "CB Financial Services Inc."
    },
    {
        value: "CBH",
        label: "AllianzGI Convertible & Income 2024 Target Term Fund of Beneficial Interest"
    },
    {
        value: "CBIO",
        label: "Catalyst Biosciences Inc."
    },
    {
        value: "CBK",
        label: "Christopher & Banks Corporation"
    },
    {
        value: "CBL",
        label: "CBL & Associates Properties Inc."
    },
    {
        value: "CBL-D",
        label: "CBL & Associates Properties Inc. Dep Shares Repstg 1/10th Preferred Series D"
    },
    {
        value: "CBL-E",
        label: "CBL & Associates Properties Inc. Depositary Shs Repstg 1/10 6.625% Ser E Cum Redeemable (Pfd Stk)"
    },
    {
        value: "CBLI",
        label: "Cleveland BioLabs Inc."
    },
    {
        value: "CBLK",
        label: "Carbon Black Inc."
    },
    {
        value: "CBM",
        label: "Cambrex Corporation"
    },
    {
        value: "CBMG",
        label: "Cellular Biomedicine Group Inc."
    },
    {
        value: "CBND",
        label: "SPDR Bloomberg Barclays Issuer Scored Corporate Bond"
    },
    {
        value: "CBO",
        label: ""
    },
    {
        value: "CBOE",
        label: "Cboe Global Markets Inc."
    },
    {
        value: "CBON",
        label: "VanEck Vectors ChinaAMC China Bond"
    },
    {
        value: "CBPO",
        label: "China Biologic Products Holdings Inc."
    },
    {
        value: "CBPX",
        label: "Continental Building Products Inc."
    },
    {
        value: "CBRE",
        label: "CBRE Group Inc Class A"
    },
    {
        value: "CBRL",
        label: "Cracker Barrel Old Country Store Inc."
    },
    {
        value: "CBS",
        label: "CBS Corporation Class B"
    },
    {
        value: "CBS.A",
        label: "CBS Corporation Class A"
    },
    {
        value: "CBSH",
        label: "Commerce Bancshares Inc."
    },
    {
        value: "CBSHP",
        label: "Commerce Bancshares Inc. Depositary Shares each representing a 1/1000th interest of 6.00% Series B Non-Cumulative Perpetual Preferred Stock"
    },
    {
        value: "CBT",
        label: "Cabot Corporation"
    },
    {
        value: "CBTX",
        label: "CBTX Inc."
    },
    {
        value: "CBU",
        label: "Community Bank System Inc."
    },
    {
        value: "CBX",
        label: ""
    },
    {
        value: "CBZ",
        label: "CBIZ Inc."
    },
    {
        value: "CC",
        label: "Chemours Company (The)"
    },
    {
        value: "CCA",
        label: "MFS California Municipal Fund of Beneficial Interest"
    },
    {
        value: "CCBG",
        label: "Capital City Bank Group"
    },
    {
        value: "CCCL",
        label: "China Ceramics Co. Ltd."
    },
    {
        value: "CCCR",
        label: "China Commercial Credit Inc."
    },
    {
        value: "CCD",
        label: "Calamos Dynamic Convertible & Income Fund"
    },
    {
        value: "CCE",
        label: "Coca-Cola European Partners plc"
    },
    {
        value: "CCF",
        label: "Chase Corporation"
    },
    {
        value: "CCI",
        label: "Crown Castle International Corp. (REIT)"
    },
    {
        value: "CCI-A",
        label: "Crown Castle International Corporation 6.875% Mandatory Convertible Preferred Stock Series A"
    },
    {
        value: "CCIH",
        label: "ChinaCache International Holdings Ltd."
    },
    {
        value: "CCJ",
        label: "Cameco Corporation"
    },
    {
        value: "CCK",
        label: "Crown Holdings Inc."
    },
    {
        value: "CCL",
        label: "Carnival Corporation"
    },
    {
        value: "CCLP",
        label: "CSI Compressco LP"
    },
    {
        value: "CCM",
        label: "Concord Medical Services Holdings Limited ADS (Each represents three)"
    },
    {
        value: "CCMP",
        label: "Cabot Microelectronics Corporation"
    },
    {
        value: "CCNE",
        label: "CNB Financial Corporation"
    },
    {
        value: "CCNI",
        label: ""
    },
    {
        value: "CCO",
        label: "Clear Channel Outdoor Holdings Inc. Class A"
    },
    {
        value: "CCOI",
        label: "Cogent Communications Holdings Inc."
    },
    {
        value: "CCOR",
        label: "Cambria Core Equity"
    },
    {
        value: "CCR",
        label: "CONSOL Coal Resources LP representing limited partner interests"
    },
    {
        value: "CCRC",
        label: "China Customer Relations Centers Inc."
    },
    {
        value: "CCRN",
        label: "Cross Country Healthcare Inc."
    },
    {
        value: "CCS",
        label: "Century Communities Inc."
    },
    {
        value: "CCT",
        label: "Corporate Capital Trust Inc."
    },
    {
        value: "CCU",
        label: "Compania Cervecerias Unidas S.A."
    },
    {
        value: "CCXI",
        label: "ChemoCentryx Inc."
    },
    {
        value: "CCZ",
        label: "Comcast Holdings ZONES"
    },
    {
        value: "CDAY",
        label: "Ceridian HCM Holding Inc."
    },
    {
        value: "CDC",
        label: "VictoryShares US EQ Income Enhanced Volatility Wtd ETF"
    },
    {
        value: "CDE",
        label: "Coeur Mining Inc."
    },
    {
        value: "CDEV",
        label: "Centennial Resource Development Inc."
    },
    {
        value: "CDK",
        label: "CDK Global Inc."
    },
    {
        value: "CDL",
        label: "VictoryShares US Large Cap High Div Volatility Wtd ETF"
    },
    {
        value: "CDLX",
        label: "Cardlytics Inc."
    },
    {
        value: "CDMO",
        label: "Avid Bioservices Inc."
    },
    {
        value: "CDMOP",
        label: "Avid Bioservices Inc. 10.50% Series E Convertible Preferred Stock"
    },
    {
        value: "CDNA",
        label: "CareDx Inc."
    },
    {
        value: "CDNS",
        label: "Cadence Design Systems Inc."
    },
    {
        value: "CDOR",
        label: "Condor Hospitality Trust Inc."
    },
    {
        value: "CDR",
        label: "Cedar Realty Trust Inc."
    },
    {
        value: "CDR-B",
        label: "Cedar Realty Trust Inc. 7.25% Series B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CDR-C",
        label: "Cedar Realty Trust Inc. 6.50% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CDTI",
        label: "CDTI Advanced Materials Inc."
    },
    {
        value: "CDTX",
        label: "Cidara Therapeutics Inc."
    },
    {
        value: "CDW",
        label: "CDW Corporation"
    },
    {
        value: "CDXC",
        label: "ChromaDex Corporation"
    },
    {
        value: "CDXS",
        label: "Codexis Inc."
    },
    {
        value: "CDZI",
        label: "Cadiz Inc."
    },
    {
        value: "CE",
        label: "Celanese Corporation Series A"
    },
    {
        value: "CEA",
        label: "China Eastern Airlines Corporation Ltd."
    },
    {
        value: "CECE",
        label: "CECO Environmental Corp."
    },
    {
        value: "CECO",
        label: "Career Education Corporation"
    },
    {
        value: "CEE",
        label: "The Central and Eastern Europe Fund Inc. (The)"
    },
    {
        value: "CEF",
        label: "Sprott Physical Gold and Silver Trust Units"
    },
    {
        value: "CEFL",
        label: "ETRACS Monthly Pay 2X Leveraged Closed-End Fund ETN"
    },
    {
        value: "CEFS",
        label: "Exchange Listed Funds Trust"
    },
    {
        value: "CEI",
        label: "Camber Energy Inc."
    },
    {
        value: "CEIX",
        label: "CONSOL Energy Inc."
    },
    {
        value: "CEL",
        label: "Cellcom Israel Ltd."
    },
    {
        value: "CELC",
        label: "Celcuity Inc."
    },
    {
        value: "CELG",
        label: "Celgene Corporation"
    },
    {
        value: "CELGZ",
        label: "Celgene Corporation Contingent Value Right"
    },
    {
        value: "CELH",
        label: "Celsius Holdings Inc."
    },
    {
        value: "CELP",
        label: "Cypress Energy Partners L.P. representing limited partner interests"
    },
    {
        value: "CEM",
        label: "ClearBridge Energy MLP Fund Inc."
    },
    {
        value: "CEMB",
        label: "iShares J.P. Morgan EM Corporate Bond"
    },
    {
        value: "CEMI",
        label: "Chembio Diagnostics Inc."
    },
    {
        value: "CEN",
        label: "Center Coast Brookfield MLP & Energy Infrastructure Fund"
    },
    {
        value: "CENT",
        label: "Central Garden & Pet Company"
    },
    {
        value: "CENTA",
        label: "Central Garden & Pet Company Class A Common Stock Nonvoting"
    },
    {
        value: "CENX",
        label: "Century Aluminum Company"
    },
    {
        value: "CEO",
        label: "CNOOC Limited"
    },
    {
        value: "CEPU",
        label: "Central Puerto S.A. American Depositary Shares (each represents ten)"
    },
    {
        value: "CEQP",
        label: "Crestwood Equity Partners LP"
    },
    {
        value: "CERC",
        label: "Cerecor Inc."
    },
    {
        value: "CERCW",
        label: ""
    },
    {
        value: "CERN",
        label: "Cerner Corporation"
    },
    {
        value: "CERS",
        label: "Cerus Corporation"
    },
    {
        value: "CET",
        label: "Central Securities Corporation"
    },
    {
        value: "CETV",
        label: "Central European Media Enterprises Ltd."
    },
    {
        value: "CETX",
        label: "Cemtrex Inc."
    },
    {
        value: "CETXP",
        label: "Cemtrex Inc. Series 1 Preferred Stock"
    },
    {
        value: "CETXW",
        label: "Cemtrex Inc. Series 1 Warrant"
    },
    {
        value: "CEV",
        label: "Eaton Vance California Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "CEVA",
        label: "CEVA Inc."
    },
    {
        value: "CEW",
        label: "WisdomTree Emerging Currency Strategy Fund"
    },
    {
        value: "CEY",
        label: "VictoryShares Emerging Market High Div Volatility Wtd ETF"
    },
    {
        value: "CEZ",
        label: "VictoryShares Emerging Market Volatility Wtd ETF"
    },
    {
        value: "CF",
        label: "CF Industries Holdings Inc."
    },
    {
        value: "CFA",
        label: "VictoryShares US 500 Volatility Wtd ETF"
    },
    {
        value: "CFBI",
        label: "Community First Bancshares Inc."
    },
    {
        value: "CFBK",
        label: "Central Federal Corporation"
    },
    {
        value: "CFFI",
        label: "C&F Financial Corporation"
    },
    {
        value: "CFFN",
        label: "Capitol Federal Financial Inc."
    },
    {
        value: "CFG",
        label: "Citizens Financial Group Inc."
    },
    {
        value: "CFMS",
        label: "Conformis Inc."
    },
    {
        value: "CFO",
        label: "VictoryShares US 500 Enhanced Volatility Wtd ETF"
    },
    {
        value: "CFR",
        label: "Cullen/Frost Bankers Inc."
    },
    {
        value: "CFR-A",
        label: "Cullen/Frost Bankers Inc. Perpetual Preferred Series A"
    },
    {
        value: "CFRX",
        label: "ContraFect Corporation"
    },
    {
        value: "CFX",
        label: "Colfax Corporation"
    },
    {
        value: "CG",
        label: "The Carlyle Group L.P."
    },
    {
        value: "CGA",
        label: "China Green Agriculture Inc."
    },
    {
        value: "CGBD",
        label: "TCG BDC Inc."
    },
    {
        value: "CGC",
        label: "Canopy Growth Corporation"
    },
    {
        value: "CGEN",
        label: "Compugen Ltd."
    },
    {
        value: "CGG",
        label: "CGG"
    },
    {
        value: "CGIX",
        label: "Cancer Genetics Inc."
    },
    {
        value: "CGNX",
        label: "Cognex Corporation"
    },
    {
        value: "CGO",
        label: "Calamos Global Total Return Fund"
    },
    {
        value: "CGVIC",
        label: "Causeway ETMF Trust"
    },
    {
        value: "CGW",
        label: "Invesco S&P Global Water Index"
    },
    {
        value: "CHA",
        label: "China Telecom Corp Ltd ADS"
    },
    {
        value: "CHAD",
        label: "Direxion Daily CSI 300 China A Shares Bear 1X Shares"
    },
    {
        value: "CHAU",
        label: "Direxion Daily CSI 300 China A Share Bull 2X Shares"
    },
    {
        value: "CHCI",
        label: "Comstock Holding Companies Inc."
    },
    {
        value: "CHCO",
        label: "City Holding Company"
    },
    {
        value: "CHCT",
        label: "Community Healthcare Trust Incorporated"
    },
    {
        value: "CHD",
        label: "Church & Dwight Company Inc."
    },
    {
        value: "CHDN",
        label: "Churchill Downs Incorporated"
    },
    {
        value: "CHE",
        label: "Chemed Corp"
    },
    {
        value: "CHEF",
        label: "The Chefs' Warehouse Inc."
    },
    {
        value: "CHEK",
        label: "Check-Cap Ltd."
    },
    {
        value: "CHEKW",
        label: ""
    },
    {
        value: "CHEKZ",
        label: "Check-Cap Ltd. Series C Warrant"
    },
    {
        value: "CHEP",
        label: "AGFiQ U.S. Market Neutral Value Fund"
    },
    {
        value: "CHFC",
        label: "Chemical Financial Corporation"
    },
    {
        value: "CHFN",
        label: "Charter Financial Corp."
    },
    {
        value: "CHFS",
        label: "CHF Solutions Inc."
    },
    {
        value: "CHGG",
        label: "Chegg Inc."
    },
    {
        value: "CHGX",
        label: "Change Finance U.S. Large Cap Fossil Fuel Free"
    },
    {
        value: "CHH",
        label: "Choice Hotels International Inc."
    },
    {
        value: "CHI",
        label: "Calamos Convertible Opportunities and Income Fund"
    },
    {
        value: "CHIE",
        label: "Global X China Energy"
    },
    {
        value: "CHII",
        label: "Global X China Industrials"
    },
    {
        value: "CHIM",
        label: "Global X China Materials"
    },
    {
        value: "CHIQ",
        label: "Global X China Consumer"
    },
    {
        value: "CHIX",
        label: "Global X China Financials"
    },
    {
        value: "CHK",
        label: "Chesapeake Energy Corporation"
    },
    {
        value: "CHK-D",
        label: "Chesapeake Energy Corporation Convertible Preferred"
    },
    {
        value: "CHKE",
        label: "Cherokee Inc."
    },
    {
        value: "CHKP",
        label: "Check Point Software Technologies Ltd."
    },
    {
        value: "CHKR",
        label: "Chesapeake Granite Wash Trust representing beneficial interests in the Trust"
    },
    {
        value: "CHL",
        label: "China Mobile Limited"
    },
    {
        value: "CHMA",
        label: "Chiasma Inc."
    },
    {
        value: "CHMG",
        label: "Chemung Financial Corp"
    },
    {
        value: "CHMI",
        label: "Cherry Hill Mortgage Investment Corporation"
    },
    {
        value: "CHMI-A",
        label: "Cherry Hill Mortgage Investment Corporation 8.20% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CHN",
        label: "China Fund Inc. (The)"
    },
    {
        value: "CHNR",
        label: "China Natural Resources Inc."
    },
    {
        value: "CHRS",
        label: "Coherus BioSciences Inc."
    },
    {
        value: "CHRW",
        label: "C.H. Robinson Worldwide Inc."
    },
    {
        value: "CHS",
        label: "Chico's FAS Inc."
    },
    {
        value: "CHSCL",
        label: "CHS Inc Class B Cumulative Redeemable Preferred Stock Series 4"
    },
    {
        value: "CHSCM",
        label: "CHS Inc Class B Reset Rate Cumulative Redeemable Preferred Stock Series 3"
    },
    {
        value: "CHSCN",
        label: "CHS Inc Preferred Class B Series 2 Reset Rate"
    },
    {
        value: "CHSCO",
        label: "CHS Inc Class B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CHSCP",
        label: "CHS Inc 8%  Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CHSP",
        label: "Chesapeake Lodging Trust of Beneficial Interest"
    },
    {
        value: "CHT",
        label: "Chunghwa Telecom Co. Ltd."
    },
    {
        value: "CHTR",
        label: "Charter Communications Inc."
    },
    {
        value: "CHU",
        label: "China Unicom (Hong Kong) Ltd"
    },
    {
        value: "CHUY",
        label: "Chuy's Holdings Inc."
    },
    {
        value: "CHW",
        label: "Calamos Global Dynamic Income Fund"
    },
    {
        value: "CHY",
        label: "Calamos Convertible and High Income Fund"
    },
    {
        value: "CI",
        label: "Cigna Corporation"
    },
    {
        value: "CIA",
        label: "Citizens Inc. Class A ($1.00 Par)"
    },
    {
        value: "CIB",
        label: "BanColombia S.A."
    },
    {
        value: "CIBR",
        label: "First Trust NASDAQ Cybersecurity ETF"
    },
    {
        value: "CIC",
        label: "Capitol Investment Corp. IV Class A"
    },
    {
        value: "CIC+",
        label: ""
    },
    {
        value: "CIC=",
        label: "Capitol Investment Corp. IV Units each consisting of One Class A Ordinary Share and One-Third of One redeemable Warrant"
    },
    {
        value: "CID",
        label: "VictoryShares International High Div Volatility Wtd ETF"
    },
    {
        value: "CIDM",
        label: "Cinedigm Corp"
    },
    {
        value: "CIEN",
        label: "Ciena Corporation"
    },
    {
        value: "CIF",
        label: "MFS Intermediate High Income Fund"
    },
    {
        value: "CIFS",
        label: "China Internet Nationwide Financial Services Inc."
    },
    {
        value: "CIG",
        label: "Comp En De Mn Cemig ADS American Depositary Shares"
    },
    {
        value: "CIG.C",
        label: "Comp En De Mn Cemig ADS American Depositary Receipts"
    },
    {
        value: "CIGI",
        label: "Colliers International Group Inc."
    },
    {
        value: "CII",
        label: "Blackrock Capital and Income Fund Inc."
    },
    {
        value: "CIK",
        label: "Credit Suisse Asset Management Income Fund Inc."
    },
    {
        value: "CIL",
        label: "VictoryShares International Volatility Wtd ETF"
    },
    {
        value: "CIM",
        label: "Chimera Investment Corporation"
    },
    {
        value: "CIM-A",
        label: "Chimera Investment Corporation 8.00% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CIM-B",
        label: "Chimera Investment Corporation 8.00% Series B Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CINF",
        label: "Cincinnati Financial Corporation"
    },
    {
        value: "CINR",
        label: "Ciner Resources LP representing Limited Partner Interests"
    },
    {
        value: "CIO",
        label: "City Office REIT Inc."
    },
    {
        value: "CIO-A",
        label: "City Office REIT Inc. 6.625% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "CIR",
        label: "CIRCOR International Inc."
    },
    {
        value: "CISN",
        label: "Cision Ltd."
    },
    {
        value: "CIT",
        label: "CIT Group Inc (DEL)"
    },
    {
        value: "CIU",
        label: "iShares Intermediate Credit Bond ETF"
    },
    {
        value: "CIVB",
        label: "Civista Bancshares Inc."
    },
    {
        value: "CIVBP",
        label: "Civista Bancshares Inc. Depositary Shares Each Representing a 1/40th Interest in a 6.50% Noncumulative Redeemable Convertible Perpetual Preferred Share Series B"
    },
    {
        value: "CIVEC",
        label: "Causeway ETMF Trust"
    },
    {
        value: "CIVI",
        label: "Civitas Solutions Inc."
    },
    {
        value: "CIX",
        label: "CompX International Inc."
    },
    {
        value: "CIZ",
        label: "VictoryShares Developed Enhanced Volatility Wtd ETF"
    },
    {
        value: "CIZN",
        label: "Citizens Holding Company"
    },
    {
        value: "CJ",
        label: "C&J Energy Services Inc."
    },
    {
        value: "CJJD",
        label: "China Jo-Jo Drugstores Inc."
    },
    {
        value: "CJNK",
        label: "SPDR ICE BofAML Crossover Corporate Bond"
    },
    {
        value: "CKH",
        label: "SEACOR Holdings Inc."
    },
    {
        value: "CKPT",
        label: "Checkpoint Therapeutics Inc."
    },
    {
        value: "CKX",
        label: "CKX Lands Inc."
    },
    {
        value: "CL",
        label: "Colgate-Palmolive Company"
    },
    {
        value: "CLAR",
        label: "Clarus Corporation"
    },
    {
        value: "CLB",
        label: "Core Laboratories N.V."
    },
    {
        value: "CLBK",
        label: "Columbia Financial Inc."
    },
    {
        value: "CLBS",
        label: "Caladrius Biosciences Inc."
    },
    {
        value: "CLCT",
        label: "Collectors Universe Inc."
    },
    {
        value: "CLD",
        label: "Cloud Peak Energy Inc"
    },
    {
        value: "CLDC",
        label: "China Lending Corporation"
    },
    {
        value: "CLDR",
        label: "Cloudera Inc."
    },
    {
        value: "CLDT",
        label: "Chatham Lodging Trust (REIT) of Beneficial Interest"
    },
    {
        value: "CLDX",
        label: "Celldex Therapeutics Inc."
    },
    {
        value: "CLF",
        label: "Cleveland-Cliffs Inc."
    },
    {
        value: "CLFD",
        label: "Clearfield Inc."
    },
    {
        value: "CLGN",
        label: "CollPlant Holdings Ltd."
    },
    {
        value: "CLGX",
        label: "CoreLogic Inc."
    },
    {
        value: "CLH",
        label: "Clean Harbors Inc."
    },
    {
        value: "CLI",
        label: "Mack-Cali Realty Corporation"
    },
    {
        value: "CLIR",
        label: "ClearSign Combustion Corporation"
    },
    {
        value: "CLIRW",
        label: "ClearSign Combustion Corporation Warrant"
    },
    {
        value: "CLIX",
        label: "ProShares Long Online/Short Stores"
    },
    {
        value: "CLLS",
        label: "Cellectis S.A."
    },
    {
        value: "CLM",
        label: "Cornerstone Strategic Value Fund Inc."
    },
    {
        value: "CLMT",
        label: "Calumet Specialty Products Partners L.P."
    },
    {
        value: "CLNC",
        label: "Colony NorthStar Credit Real Estate Inc. Class A"
    },
    {
        value: "CLNE",
        label: "Clean Energy Fuels Corp."
    },
    {
        value: "CLNS",
        label: "Colony NorthStar Inc."
    },
    {
        value: "CLNS-B",
        label: "Colony NorthStar Inc. 8.25% Series B cumulative redeemable perpetual preferred stock"
    },
    {
        value: "CLNS-D*",
        label: ""
    },
    {
        value: "CLNS-E",
        label: "Colony NorthStar Inc. 8.75% Series E cumulative redeemable perpetual preferred stock"
    },
    {
        value: "CLNS-G",
        label: "NorthStar Asset Management Group Inc. 7.50% Series G cumulative redeemable perpetual preferred stock"
    },
    {
        value: "CLNS-H",
        label: "Colony NorthStar Inc. 7.125% Series H cumulative redeemable perpetual preferred stock"
    },
    {
        value: "CLNS-I",
        label: "Colony NorthStar Inc. 7.15% Series I Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "CLNS-J",
        label: "Colony NorthStar Inc. 7.125% Series J Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "CLPR",
        label: "Clipper Realty Inc."
    },
    {
        value: "CLPS",
        label: "CLPS Incorporation"
    },
    {
        value: "CLR",
        label: "Continental Resources Inc."
    },
    {
        value: "CLRB",
        label: "Cellectar Biosciences Inc."
    },
    {
        value: "CLRBW",
        label: "Cellectar Biosciences Inc. Warrants"
    },
    {
        value: "CLRBZ",
        label: "Cellectar Biosciences Inc. Series A Warrants"
    },
    {
        value: "CLRG",
        label: "IQ Chaikin U.S. Large Cap ETF"
    },
    {
        value: "CLRO",
        label: "ClearOne Inc."
    },
    {
        value: "CLS",
        label: "Celestica Inc."
    },
    {
        value: "CLSD",
        label: "Clearside Biomedical Inc."
    },
    {
        value: "CLSN",
        label: "Celsion Corporation"
    },
    {
        value: "CLTL",
        label: "Invesco Treasury Collateral"
    },
    {
        value: "CLUB",
        label: "Town Sports International Holdings Inc."
    },
    {
        value: "CLVS",
        label: "Clovis Oncology Inc."
    },
    {
        value: "CLW",
        label: "Clearwater Paper Corporation"
    },
    {
        value: "CLWT",
        label: "Euro Tech Holdings Company Limited"
    },
    {
        value: "CLX",
        label: "Clorox Company (The)"
    },
    {
        value: "CLXT",
        label: "Calyxt Inc."
    },
    {
        value: "CLY",
        label: "iShares 10 Year Credit Bond"
    },
    {
        value: "CLYH",
        label: "iShares Interest Rate Hedged 10 Year Credit Bond"
    },
    {
        value: "CM",
        label: "Canadian Imperial Bank of Commerce"
    },
    {
        value: "CMA",
        label: "Comerica Incorporated"
    },
    {
        value: "CMA+",
        label: "Comerica Incorporated Warrant expiring November 14 2018"
    },
    {
        value: "CMBS",
        label: "iShares CMBS Bond"
    },
    {
        value: "CMC",
        label: "Commercial Metals Company"
    },
    {
        value: "CMCL",
        label: "Caledonia Mining Corporation Plc"
    },
    {
        value: "CMCM",
        label: "Cheetah Mobile Inc. American Depositary Shares each representing 10 Class"
    },
    {
        value: "CMCO",
        label: "Columbus McKinnon Corporation"
    },
    {
        value: "CMCSA",
        label: "Comcast Corporation Class A Common Stock"
    },
    {
        value: "CMCT",
        label: "CIM Commercial Trust Corporation"
    },
    {
        value: "CMCTP",
        label: "CIM Commercial Trust Corporation Series L Preferred Stock"
    },
    {
        value: "CMD",
        label: "Cantel Medical Corp."
    },
    {
        value: "CMDT",
        label: "iShares Commodity Optimized Trust"
    },
    {
        value: "CMDY",
        label: "iShares Bloomberg Roll Select Commodity Strategy"
    },
    {
        value: "CME",
        label: "CME Group Inc."
    },
    {
        value: "CMF",
        label: "iShares California Muni Bond"
    },
    {
        value: "CMFN",
        label: "CM Finance Inc"
    },
    {
        value: "CMG",
        label: "Chipotle Mexican Grill Inc."
    },
    {
        value: "CMI",
        label: "Cummins Inc."
    },
    {
        value: "CMO",
        label: "Capstead Mortgage Corporation"
    },
    {
        value: "CMO-E",
        label: "Capstead Mortgage Corporation Pfd Ser E"
    },
    {
        value: "CMP",
        label: "Compass Minerals Intl Inc"
    },
    {
        value: "CMPR",
        label: "Cimpress N.V"
    },
    {
        value: "CMRE",
        label: "Costamare Inc. $0.0001 par value"
    },
    {
        value: "CMRE-B",
        label: "Costamare Inc. Perpetual Preferred Stock Series B (Marshall Islands)"
    },
    {
        value: "CMRE-C",
        label: "Costamare Inc. Perpetual Preferred Series C (Marshall Islands)"
    },
    {
        value: "CMRE-D",
        label: "Costamare Inc. 8.75% Series D Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "CMRE-E",
        label: "Costamare Inc. 8.875% Series E Cumulative Redeemable Perpetual Preferred Stock par value $0.0001"
    },
    {
        value: "CMRX",
        label: "Chimerix Inc."
    },
    {
        value: "CMS",
        label: "CMS Energy Corporation"
    },
    {
        value: "CMS-B",
        label: "CMS Energy Corporation Preferred Stock"
    },
    {
        value: "CMSA",
        label: "CMS Energy Corporation 5.625% Junior Subordinated Notes due 2078"
    },
    {
        value: "CMSS",
        label: "CM Seven Star Acquisition Corporation"
    },
    {
        value: "CMSSR",
        label: "CM Seven Star Acquisition Corporation Right"
    },
    {
        value: "CMSSU",
        label: "CM Seven Star Acquisition Corporation Unit"
    },
    {
        value: "CMSSW",
        label: "CM Seven Star Acquisition Corporation Warrant"
    },
    {
        value: "CMT",
        label: "Core Molding Technologies Inc"
    },
    {
        value: "CMTA",
        label: "Clementia Pharmaceuticals Inc."
    },
    {
        value: "CMTL",
        label: "Comtech Telecommunications Corp."
    },
    {
        value: "CMU",
        label: "MFS Municipal Income Trust"
    },
    {
        value: "CN",
        label: "Xtrackers MSCI All China Equity"
    },
    {
        value: "CNA",
        label: "CNA Financial Corporation"
    },
    {
        value: "CNAC",
        label: "Constellation Alpha Capital Corp."
    },
    {
        value: "CNACR",
        label: "Constellation Alpha Capital Corp. Right"
    },
    {
        value: "CNACU",
        label: "Constellation Alpha Capital Corp. Unit"
    },
    {
        value: "CNACW",
        label: "Constellation Alpha Capital Corp. Warrant"
    },
    {
        value: "CNAT",
        label: "Conatus Pharmaceuticals Inc."
    },
    {
        value: "CNBKA",
        label: "Century Bancorp Inc. Class A Common Stock"
    },
    {
        value: "CNC",
        label: "Centene Corporation"
    },
    {
        value: "CNCE",
        label: "Concert Pharmaceuticals Inc."
    },
    {
        value: "CNCR",
        label: "Loncar Cancer Immunotherapy ETF"
    },
    {
        value: "CNDF",
        label: "iShares Edge MSCI Multifactor Consumer Discretionary"
    },
    {
        value: "CNDT",
        label: "Conduent Incorporated"
    },
    {
        value: "CNET",
        label: "ChinaNet Online Holdings Inc."
    },
    {
        value: "CNFR",
        label: "Conifer Holdings Inc."
    },
    {
        value: "CNHI",
        label: "CNH Industrial N.V."
    },
    {
        value: "CNHX",
        label: "CSOP MSCI China A International Hedged"
    },
    {
        value: "CNI",
        label: "Canadian National Railway Company"
    },
    {
        value: "CNK",
        label: "Cinemark Holdings Inc Inc."
    },
    {
        value: "CNMD",
        label: "CONMED Corporation"
    },
    {
        value: "CNNE",
        label: "Cannae Holdings Inc."
    },
    {
        value: "CNO",
        label: "CNO Financial Group Inc."
    },
    {
        value: "CNOB",
        label: "ConnectOne Bancorp Inc."
    },
    {
        value: "CNP",
        label: "CenterPoint Energy Inc (Holding Co)"
    },
    {
        value: "CNQ",
        label: "Canadian Natural Resources Limited"
    },
    {
        value: "CNS",
        label: "Cohen & Steers Inc"
    },
    {
        value: "CNSF",
        label: "iShares Edge MSCI Multifactor Consumer Staples"
    },
    {
        value: "CNSL",
        label: "Consolidated Communications Holdings Inc."
    },
    {
        value: "CNTF",
        label: "China TechFaith Wireless Communication Technology Limited"
    },
    {
        value: "CNTY",
        label: "Century Casinos Inc."
    },
    {
        value: "CNX",
        label: "CNX Resources Corporation"
    },
    {
        value: "CNXM",
        label: "CNX Midstream Partners LP representing limited partner interests"
    },
    {
        value: "CNXN",
        label: "PC Connection Inc."
    },
    {
        value: "CNXT",
        label: "VanEck Vectors ChinaAMC SME-ChNext"
    },
    {
        value: "CNY",
        label: "Market Vectors Chinese Renminbi/USD ETN"
    },
    {
        value: "CNYA",
        label: "iShares MSCI China A"
    },
    {
        value: "CO",
        label: "Global Cord Blood Corporation"
    },
    {
        value: "COBZ",
        label: "CoBiz Financial Inc."
    },
    {
        value: "COCP",
        label: "Cocrystal Pharma Inc."
    },
    {
        value: "CODA",
        label: "Coda Octopus Group Inc."
    },
    {
        value: "CODI",
        label: "Compass Diversified Holdings Shares of Beneficial Interest"
    },
    {
        value: "CODI-A",
        label: "Compass Diversified Holdings 7.250% Series A Preferred Shares representing beneficial interest in"
    },
    {
        value: "CODI-B",
        label: "Compass Diversified Holdings 7.875% Series B Fixed-to-Floating Rate Cumulative Preferred Shares representing beneficial interests in"
    },
    {
        value: "CODX",
        label: "Co-Diagnostics Inc."
    },
    {
        value: "COE",
        label: "China Online Education Group American depositary shares each representing 15 Class A"
    },
    {
        value: "COF",
        label: "Capital One Financial Corporation"
    },
    {
        value: "COF+",
        label: "Capital One Financial Corporation Warrants expiring November 14 2018"
    },
    {
        value: "COF-C",
        label: "Capital One Financial Corp Depository Shares Representing 1/40th Int Perp Pfd Ser C%"
    },
    {
        value: "COF-D",
        label: "Capital One Financial Corp Depository Shares Series D"
    },
    {
        value: "COF-F",
        label: "Capital One Financial Corporation Depositary Shares Series F"
    },
    {
        value: "COF-G",
        label: "Capital One Financial Corporation Depositary Shares Series G"
    },
    {
        value: "COF-H",
        label: "Capital One Financial Corporation Depositary Shares Series H"
    },
    {
        value: "COF-P",
        label: "Capital One Financial Corp Pfd Ser B"
    },
    {
        value: "COG",
        label: "Cabot Oil & Gas Corporation"
    },
    {
        value: "COHN",
        label: "Cohen & Company Inc."
    },
    {
        value: "COHR",
        label: "Coherent Inc."
    },
    {
        value: "COHU",
        label: "Cohu Inc."
    },
    {
        value: "COKE",
        label: "Coca-Cola Bottling Co. Consolidated"
    },
    {
        value: "COL",
        label: "Rockwell Collins Inc."
    },
    {
        value: "COLB",
        label: "Columbia Banking System Inc."
    },
    {
        value: "COLD",
        label: "Americold Realty Trust"
    },
    {
        value: "COLL",
        label: "Collegium Pharmaceutical Inc."
    },
    {
        value: "COLM",
        label: "Columbia Sportswear Company"
    },
    {
        value: "COM",
        label: "Direxion Auspice Broad Commodity Strategy"
    },
    {
        value: "COMB",
        label: "GraniteShares Bloomberg Commodity Broad Strategy No K-1"
    },
    {
        value: "COMG",
        label: "GraniteShares S&P GSCI Commodity Broad Strategy No K-1"
    },
    {
        value: "COMM",
        label: "CommScope Holding Company Inc."
    },
    {
        value: "COMT",
        label: "iShares Commodities Select Strategy ETF"
    },
    {
        value: "CONE",
        label: "CyrusOne Inc"
    },
    {
        value: "CONN",
        label: "Conn's Inc."
    },
    {
        value: "COO",
        label: "The Cooper Companies Inc."
    },
    {
        value: "COOL",
        label: "PolarityTE Inc."
    },
    {
        value: "COP",
        label: "ConocoPhillips"
    },
    {
        value: "COPX",
        label: "Global X Copper Miners"
    },
    {
        value: "COR",
        label: "CoreSite Realty Corporation"
    },
    {
        value: "CORE",
        label: "Core-Mark Holding Company Inc."
    },
    {
        value: "CORI",
        label: "Corium International Inc."
    },
    {
        value: "CORN",
        label: "Teucrium Corn Fund ETV"
    },
    {
        value: "CORP",
        label: "Pimco Investment Grade Corporate Bond Index Exchange-Traded Fund"
    },
    {
        value: "CORR",
        label: "CorEnergy Infrastructure Trust Inc."
    },
    {
        value: "CORR-A",
        label: "CorEnergy Infrastructure Trust Inc. Depositary Shares Series A"
    },
    {
        value: "CORT",
        label: "Corcept Therapeutics Incorporated"
    },
    {
        value: "CORV",
        label: "Correvio Pharma Corp."
    },
    {
        value: "COST",
        label: "Costco Wholesale Corporation"
    },
    {
        value: "COT",
        label: "Cott Corporation"
    },
    {
        value: "COTV",
        label: "Cotiviti Holdings Inc."
    },
    {
        value: "COTY",
        label: "Coty Inc. Class A"
    },
    {
        value: "COUP",
        label: "Coupa Software Incorporated"
    },
    {
        value: "COWB",
        label: "iPathA Series B Bloomberg Livestock Subindex Total Return ETN"
    },
    {
        value: "COWN",
        label: "Cowen Inc."
    },
    {
        value: "COWNZ",
        label: "Cowen Inc. 7.35% Senior Notes Due 2027"
    },
    {
        value: "COWZ",
        label: "Pacer US Cash Cows 100"
    },
    {
        value: "CP",
        label: "Canadian Pacific Railway Limited"
    },
    {
        value: "CPA",
        label: "Copa Holdings S.A. Class A"
    },
    {
        value: "CPAC",
        label: "Cementos Pacasmayo S.A.A. American Depositary Shares (Each representing five)"
    },
    {
        value: "CPAH",
        label: "CounterPath Corporation"
    },
    {
        value: "CPB",
        label: "Campbell Soup Company"
    },
    {
        value: "CPE",
        label: "Callon Petroleum Company"
    },
    {
        value: "CPE-A",
        label: "Callon Petroleum Company Preferred Shares Series A 10%"
    },
    {
        value: "CPER",
        label: "United States Copper Index Fund ETV"
    },
    {
        value: "CPF",
        label: "Central Pacific Financial Corp New"
    },
    {
        value: "CPG",
        label: "Crescent Point Energy Corporation (Canada)"
    },
    {
        value: "CPHC",
        label: "Canterbury Park Holding Corporation"
    },
    {
        value: "CPHI",
        label: "China Pharma Holdings Inc."
    },
    {
        value: "CPI",
        label: "IQ Real Return"
    },
    {
        value: "CPIX",
        label: "Cumberland Pharmaceuticals Inc."
    },
    {
        value: "CPK",
        label: "Chesapeake Utilities Corporation"
    },
    {
        value: "CPL",
        label: "CPFL Energia S.A. American Depositary Shares"
    },
    {
        value: "CPLA",
        label: "Capella Education Company"
    },
    {
        value: "CPLG",
        label: "COREPOINT LODGING INC"
    },
    {
        value: "CPLP",
        label: "Capital Product Partners L.P."
    },
    {
        value: "CPRT",
        label: "Copart Inc."
    },
    {
        value: "CPRX",
        label: "Catalyst Pharmaceuticals Inc."
    },
    {
        value: "CPS",
        label: "Cooper-Standard Holdings Inc."
    },
    {
        value: "CPSH",
        label: "CPS Technologies Corp."
    },
    {
        value: "CPSI",
        label: "Computer Programs and Systems Inc."
    },
    {
        value: "CPSS",
        label: "Consumer Portfolio Services Inc."
    },
    {
        value: "CPST",
        label: "Capstone Turbine Corporation"
    },
    {
        value: "CPT",
        label: "Camden Property Trust"
    },
    {
        value: "CPTA",
        label: "Capitala Finance Corp."
    },
    {
        value: "CPTAG",
        label: "Capitala Finance Corp. 5.75% Convertible Notes Due 2022"
    },
    {
        value: "CPTAL",
        label: "Capitala Finance Corp. 6% Notes Due 2022"
    },
    {
        value: "CQH",
        label: "Cheniere Energy Partners LP Holdings LLC"
    },
    {
        value: "CQP",
        label: "Cheniere Energy Partners LP"
    },
    {
        value: "CQQQ",
        label: "Invesco China Technology"
    },
    {
        value: "CR",
        label: "Crane Company"
    },
    {
        value: "CRAI",
        label: "CRA InternationalInc."
    },
    {
        value: "CRAK",
        label: "VanEck Vectors Oil Refiners"
    },
    {
        value: "CRAY",
        label: "Cray Inc"
    },
    {
        value: "CRBN",
        label: "iShares MSCI ACWI Low Carbon Target"
    },
    {
        value: "CRBP",
        label: "Corbus Pharmaceuticals Holdings Inc."
    },
    {
        value: "CRC",
        label: "California Resources Corporation"
    },
    {
        value: "CRCM",
        label: "Care.com Inc."
    },
    {
        value: "CRD.A",
        label: "Crawford & Company"
    },
    {
        value: "CRD.B",
        label: "Crawford & Company"
    },
    {
        value: "CRED",
        label: "iShares U.S. Credit Bond ETF"
    },
    {
        value: "CREE",
        label: "Cree Inc."
    },
    {
        value: "CREG",
        label: "China Recycling Energy Corporation"
    },
    {
        value: "CRESY",
        label: "Cresud S.A.C.I.F. y A. American Depositary Shares each representing ten shares of Common Stock"
    },
    {
        value: "CRF",
        label: "Cornerstone Total Return Fund Inc. (The)"
    },
    {
        value: "CRH",
        label: "CRH PLC American Depositary Shares"
    },
    {
        value: "CRHM",
        label: "CRH Medical Corporation of Beneficial Interest"
    },
    {
        value: "CRI",
        label: "Carter's Inc."
    },
    {
        value: "CRIS",
        label: "Curis Inc."
    },
    {
        value: "CRK",
        label: "Comstock Resources Inc."
    },
    {
        value: "CRL",
        label: "Charles River Laboratories International Inc."
    },
    {
        value: "CRM",
        label: "Salesforce.com Inc"
    },
    {
        value: "CRMD",
        label: "CorMedix Inc"
    },
    {
        value: "CRMT",
        label: "America's Car-Mart Inc."
    },
    {
        value: "CRNT",
        label: "Ceragon Networks Ltd."
    },
    {
        value: "CROC",
        label: "ProShares UltraShort Australian Dollar"
    },
    {
        value: "CRON",
        label: "Cronos Group Inc."
    },
    {
        value: "CROP",
        label: "IQ Global Agribusiness Small Cap"
    },
    {
        value: "CROX",
        label: "Crocs Inc."
    },
    {
        value: "CRR",
        label: "Carbo Ceramics Inc."
    },
    {
        value: "CRS",
        label: "Carpenter Technology Corporation"
    },
    {
        value: "CRSP",
        label: "CRISPR Therapeutics AG"
    },
    {
        value: "CRT",
        label: "Cross Timbers Royalty Trust"
    },
    {
        value: "CRTO",
        label: "Criteo S.A."
    },
    {
        value: "CRUS",
        label: "Cirrus Logic Inc."
    },
    {
        value: "CRUSC",
        label: "Calvert Management Series"
    },
    {
        value: "CRVL",
        label: "CorVel Corp."
    },
    {
        value: "CRVS",
        label: "Corvus Pharmaceuticals Inc."
    },
    {
        value: "CRWS",
        label: "Crown Crafts Inc."
    },
    {
        value: "CRY",
        label: "CryoLife Inc."
    },
    {
        value: "CRZO",
        label: "Carrizo Oil & Gas Inc."
    },
    {
        value: "CS",
        label: "Credit Suisse Group American Depositary Shares"
    },
    {
        value: "CSA",
        label: "VictoryShares US Small Cap Volatility Wtd ETF"
    },
    {
        value: "CSB",
        label: "VictoryShares US Small Cap High Div Volatility Wtd ETF"
    },
    {
        value: "CSBR",
        label: "Champions Oncology Inc."
    },
    {
        value: "CSCO",
        label: "Cisco Systems Inc."
    },
    {
        value: "CSD",
        label: "Invesco S&P Spin-Off"
    },
    {
        value: "CSF",
        label: "VictoryShares US Discovery Enhanced Volatility Wtd ETF"
    },
    {
        value: "CSFL",
        label: "CenterState Bank Corporation"
    },
    {
        value: "CSGP",
        label: "CoStar Group Inc."
    },
    {
        value: "CSGS",
        label: "CSG Systems International Inc."
    },
    {
        value: "CSII",
        label: "Cardiovascular Systems Inc."
    },
    {
        value: "CSIQ",
        label: "Canadian Solar Inc."
    },
    {
        value: "CSJ",
        label: "iShares 1-3 Year Credit Bond ETF"
    },
    {
        value: "CSL",
        label: "Carlisle Companies Incorporated"
    },
    {
        value: "CSLT",
        label: "Castlight Health Inc. Class B"
    },
    {
        value: "CSM",
        label: "ProShares Large Cap Core Plus"
    },
    {
        value: "CSML",
        label: "IQ Chaikin U.S. Small Cap ETF"
    },
    {
        value: "CSOD",
        label: "Cornerstone OnDemand Inc."
    },
    {
        value: "CSPI",
        label: "CSP Inc."
    },
    {
        value: "CSQ",
        label: "Calamos Strategic Total Return Fund"
    },
    {
        value: "CSS",
        label: "CSS Industries Inc."
    },
    {
        value: "CSSE",
        label: "Chicken Soup for the Soul Entertainment Inc."
    },
    {
        value: "CSTE",
        label: "Caesarstone Ltd."
    },
    {
        value: "CSTM",
        label: "Constellium N.V."
    },
    {
        value: "CSTR",
        label: "CapStar Financial Holdings Inc."
    },
    {
        value: "CSU",
        label: "Capital Senior Living Corporation"
    },
    {
        value: "CSV",
        label: "Carriage Services Inc."
    },
    {
        value: "CSWC",
        label: "Capital Southwest Corporation"
    },
    {
        value: "CSWCL",
        label: "Capital Southwest Corporation 5.95% Notes due 2022"
    },
    {
        value: "CSWI",
        label: "CSW Industrials Inc."
    },
    {
        value: "CSX",
        label: "CSX Corporation"
    },
    {
        value: "CTAA",
        label: ""
    },
    {
        value: "CTAS",
        label: "Cintas Corporation"
    },
    {
        value: "CTB",
        label: "Cooper Tire & Rubber Company"
    },
    {
        value: "CTBB",
        label: "Qwest Corporation 6.5% Notes due 2056"
    },
    {
        value: "CTBI",
        label: "Community Trust Bancorp Inc."
    },
    {
        value: "CTDD",
        label: "Qwest Corporation 6.75% Notes due 2057"
    },
    {
        value: "CTEK",
        label: "CynergisTek Inc."
    },
    {
        value: "CTG",
        label: "Computer Task Group Incorporated"
    },
    {
        value: "CTHR",
        label: "Charles & Colvard Ltd."
    },
    {
        value: "CTIB",
        label: "CTI Industries Corporation"
    },
    {
        value: "CTIC",
        label: "CTI BioPharma Corp."
    },
    {
        value: "CTL",
        label: "CenturyLink Inc."
    },
    {
        value: "CTLT",
        label: "Catalent Inc."
    },
    {
        value: "CTMX",
        label: "CytomX Therapeutics Inc."
    },
    {
        value: "CTO",
        label: "Consolidated-Tomoka Land Co."
    },
    {
        value: "CTR",
        label: "ClearBridge Energy MLP Total Return Fund Inc."
    },
    {
        value: "CTRE",
        label: "CareTrust REIT Inc."
    },
    {
        value: "CTRL",
        label: "Control4 Corporation"
    },
    {
        value: "CTRN",
        label: "Citi Trends Inc."
    },
    {
        value: "CTRP",
        label: "Ctrip.com International Ltd."
    },
    {
        value: "CTRV",
        label: "ContraVir Pharmaceuticals Inc."
    },
    {
        value: "CTS",
        label: "CTS Corporation"
    },
    {
        value: "CTSH",
        label: "Cognizant Technology Solutions Corporation"
    },
    {
        value: "CTSO",
        label: "CytoSorbents Corporation"
    },
    {
        value: "CTT",
        label: "CatchMark Timber Trust Inc. Class A"
    },
    {
        value: "CTU",
        label: "Qwest Corporation 7.00% Notes due 2025"
    },
    {
        value: "CTV",
        label: ""
    },
    {
        value: "CTW",
        label: "Qwest Corporation 7.50% Notes due 2051"
    },
    {
        value: "CTWS",
        label: "Connecticut Water Service Inc."
    },
    {
        value: "CTX",
        label: "Qwest Corporation 7.00% Notes due 2052"
    },
    {
        value: "CTXR",
        label: "Citius Pharmaceuticals Inc."
    },
    {
        value: "CTXRW",
        label: "Citius Pharmaceuticals Inc. Warrant"
    },
    {
        value: "CTXS",
        label: "Citrix Systems Inc."
    },
    {
        value: "CTY",
        label: "Qwest Corporation 6.125% Notes due 2053"
    },
    {
        value: "CTZ",
        label: ""
    },
    {
        value: "CUB",
        label: "Cubic Corporation"
    },
    {
        value: "CUBA",
        label: "The Herzfeld Caribbean Basin Fund Inc."
    },
    {
        value: "CUBE",
        label: "CubeSmart"
    },
    {
        value: "CUBI",
        label: "Customers Bancorp Inc"
    },
    {
        value: "CUBI-C",
        label: "Customers Bancorp Inc Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series C"
    },
    {
        value: "CUBI-D",
        label: "Customers Bancorp Inc Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series D"
    },
    {
        value: "CUBI-E",
        label: "Customers Bancorp Inc Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series E"
    },
    {
        value: "CUBI-F",
        label: "Customers Bancorp Inc Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series F"
    },
    {
        value: "CUBS",
        label: "Customers Bancorp Inc 6.375% Senior Notes due 2018"
    },
    {
        value: "CUE",
        label: "Cue Biopharma Inc."
    },
    {
        value: "CUI",
        label: "CUI Global Inc."
    },
    {
        value: "CUK",
        label: "Carnival Plc ADS ADS"
    },
    {
        value: "CULP",
        label: "Culp Inc."
    },
    {
        value: "CUMB",
        label: "Virtus Cumberland Municipal Bond"
    },
    {
        value: "CUO",
        label: "Continental Materials Corporation"
    },
    {
        value: "CUR",
        label: "Neuralstem Inc."
    },
    {
        value: "CURE",
        label: "Direxion Daily Healthcare Bull 3X Shares"
    },
    {
        value: "CURO",
        label: "CURO Group Holdings Corp."
    },
    {
        value: "CUT",
        label: "Invesco MSCI Global Timber"
    },
    {
        value: "CUTR",
        label: "Cutera Inc."
    },
    {
        value: "CUZ",
        label: "Cousins Properties Incorporated"
    },
    {
        value: "CVA",
        label: "Covanta Holding Corporation"
    },
    {
        value: "CVBF",
        label: "CVB Financial Corporation"
    },
    {
        value: "CVCO",
        label: "Cavco Industries Inc."
    },
    {
        value: "CVCY",
        label: "Central Valley Community Bancorp"
    },
    {
        value: "CVE",
        label: "Cenovus Energy Inc"
    },
    {
        value: "CVEO",
        label: "Civeo Corporation (Canada)"
    },
    {
        value: "CVG",
        label: "Convergys Corporation"
    },
    {
        value: "CVGI",
        label: "Commercial Vehicle Group Inc."
    },
    {
        value: "CVGW",
        label: "Calavo Growers Inc."
    },
    {
        value: "CVI",
        label: "CVR Energy Inc."
    },
    {
        value: "CVIA",
        label: "COVIA HOLDINGS CORP"
    },
    {
        value: "CVLT",
        label: "Commvault Systems Inc."
    },
    {
        value: "CVLY",
        label: "Codorus Valley Bancorp Inc"
    },
    {
        value: "CVM",
        label: "Cel-Sci Corporation ($0.001 Par Value)"
    },
    {
        value: "CVM+",
        label: "Cel-Sci Corporation Warrants Exp 10/11/2018"
    },
    {
        value: "CVNA",
        label: "Carvana Co. Class A"
    },
    {
        value: "CVON",
        label: "ConvergeOne Holdings Inc."
    },
    {
        value: "CVONW",
        label: ""
    },
    {
        value: "CVR",
        label: "Chicago Rivet & Machine Co."
    },
    {
        value: "CVRR",
        label: "CVR Refining LP Representing Limited Partner Interests"
    },
    {
        value: "CVRS",
        label: "Corindus Vascular Robotics Inc. (DE)"
    },
    {
        value: "CVS",
        label: "CVS Health Corporation"
    },
    {
        value: "CVTI",
        label: "Covenant Transportation Group Inc."
    },
    {
        value: "CVU",
        label: "CPI Aerostructures Inc."
    },
    {
        value: "CVV",
        label: "CVD Equipment Corporation"
    },
    {
        value: "CVX",
        label: "Chevron Corporation"
    },
    {
        value: "CVY",
        label: "Invesco Zacks Multi-Asset Income"
    },
    {
        value: "CW",
        label: "Curtiss-Wright Corporation"
    },
    {
        value: "CWAI",
        label: "CWA Income"
    },
    {
        value: "CWAY",
        label: "Coastway Bancorp Inc."
    },
    {
        value: "CWB",
        label: "SPDR Bloomberg Barclays Convertible Securities"
    },
    {
        value: "CWBC",
        label: "Community West Bancshares"
    },
    {
        value: "CWBR",
        label: "CohBar Inc."
    },
    {
        value: "CWCO",
        label: "Consolidated Water Co. Ltd."
    },
    {
        value: "CWEB",
        label: "Direxion Daily CSI China Internet Index Bull 2X Shares"
    },
    {
        value: "CWH",
        label: "Camping World Holdings Inc. Class A Commom Stock"
    },
    {
        value: "CWI",
        label: "SPDR MSCI ACWI ex-US"
    },
    {
        value: "CWS",
        label: "AdvisorShares Focused Equity"
    },
    {
        value: "CWST",
        label: "Casella Waste Systems Inc."
    },
    {
        value: "CWT",
        label: "California Water Service Group"
    },
    {
        value: "CX",
        label: "Cemex S.A.B. de C.V. Sponsored ADR"
    },
    {
        value: "CXDC",
        label: "China XD Plastics Company Limited"
    },
    {
        value: "CXE",
        label: "MFS High Income Municipal Trust"
    },
    {
        value: "CXH",
        label: "MFS Investment Grade Municipal Trust"
    },
    {
        value: "CXO",
        label: "Concho Resources Inc."
    },
    {
        value: "CXP",
        label: "Columbia Property Trust Inc."
    },
    {
        value: "CXRX",
        label: "Concordia International Corp."
    },
    {
        value: "CXSE",
        label: "WisdomTree China ex-State-Owned Enterprises Fund"
    },
    {
        value: "CXW",
        label: "CoreCivic Inc."
    },
    {
        value: "CY",
        label: "Cypress Semiconductor Corporation"
    },
    {
        value: "CYAD",
        label: "Celyad SA"
    },
    {
        value: "CYAN",
        label: "Cyanotech Corporation"
    },
    {
        value: "CYB",
        label: "WisdomTree Chinese Yuan Strategy Fund"
    },
    {
        value: "CYBE",
        label: "CyberOptics Corporation"
    },
    {
        value: "CYBR",
        label: "CyberArk Software Ltd."
    },
    {
        value: "CYCC",
        label: "Cyclacel Pharmaceuticals Inc."
    },
    {
        value: "CYCCP",
        label: "Cyclacel Pharmaceuticals Inc. 6% Convertible Preferred Stock"
    },
    {
        value: "CYD",
        label: "China Yuchai International Limited"
    },
    {
        value: "CYH",
        label: "Community Health Systems Inc."
    },
    {
        value: "CYHHZ",
        label: "Community Health Systems Inc. Series A Contingent Value Rights"
    },
    {
        value: "CYOU",
        label: "Changyou.com Limited"
    },
    {
        value: "CYRN",
        label: "CYREN Ltd."
    },
    {
        value: "CYRX",
        label: "CryoPort Inc."
    },
    {
        value: "CYRXW",
        label: ""
    },
    {
        value: "CYS",
        label: "CYS Investments Inc."
    },
    {
        value: "CYS-A",
        label: "CYS Investments Inc Cumulative Redeemable Preferred Series A"
    },
    {
        value: "CYS-B",
        label: "CYS Investments Inc. Preferred Series B"
    },
    {
        value: "CYTK",
        label: "Cytokinetics Incorporated"
    },
    {
        value: "CYTR",
        label: "CytRx Corporation"
    },
    {
        value: "CYTX",
        label: "Cytori Therapeutics Inc."
    },
    {
        value: "CYTXW",
        label: "Cytori Therapeutics Inc. Warrant"
    },
    {
        value: "CYTXZ",
        label: "Cytori Therapeutics Inc. Series S Warrant"
    },
    {
        value: "CZA",
        label: "Invesco Zacks Mid-Cap"
    },
    {
        value: "CZFC",
        label: "Citizens First Corporation"
    },
    {
        value: "CZNC",
        label: "Citizens & Northern Corp"
    },
    {
        value: "CZR",
        label: "Caesars Entertainment Corporation"
    },
    {
        value: "CZWI",
        label: "Citizens Community Bancorp Inc."
    },
    {
        value: "CZZ",
        label: "Cosan Limited Class A"
    },
    {
        value: "D",
        label: "Dominion Energy Inc."
    },
    {
        value: "DAC",
        label: "Danaos Corporation"
    },
    {
        value: "DAG",
        label: "DB Agriculture Double Long ETN due April 1 2038"
    },
    {
        value: "DAIO",
        label: "Data I/O Corporation"
    },
    {
        value: "DAKT",
        label: "Daktronics Inc."
    },
    {
        value: "DAL",
        label: "Delta Air Lines Inc."
    },
    {
        value: "DALI",
        label: "First Trust DorseyWright DALI 1 ETF"
    },
    {
        value: "DALT",
        label: "Anfield Capital Diversified Alternatives ETF"
    },
    {
        value: "DAN",
        label: "Dana Incorporated"
    },
    {
        value: "DAR",
        label: "Darling Ingredients Inc."
    },
    {
        value: "DARE",
        label: "Dare Bioscience Inc."
    },
    {
        value: "DATA",
        label: "Tableau Software Inc. Class A"
    },
    {
        value: "DAUD",
        label: "ETNs linked to the VelocityShares Daily 4X Long USD vs. AUD Index"
    },
    {
        value: "DAVE",
        label: "Famous Dave's of America Inc."
    },
    {
        value: "DAX",
        label: "Horizons DAX Germany ETF"
    },
    {
        value: "DB",
        label: "Deutsche Bank AG"
    },
    {
        value: "DBA",
        label: "Invesco DB Agriculture Fund"
    },
    {
        value: "DBAP",
        label: "Xtrackers MSCI Asia Pacific ex Japan Hedged Equity"
    },
    {
        value: "DBAW",
        label: "Xtrackers MSCI All World ex US Hedged Equity"
    },
    {
        value: "DBB",
        label: "Invesco DB Base Metals Fund"
    },
    {
        value: "DBC",
        label: "Invesco DB Commodity Index Tracking Fund"
    },
    {
        value: "DBD",
        label: "Diebold Nixdorf Incorporated"
    },
    {
        value: "DBE",
        label: "Invesco DB Energy Fund"
    },
    {
        value: "DBEF",
        label: "Xtrackers MSCI EAFE Hedged Equity"
    },
    {
        value: "DBEM",
        label: "Xtrackers MSCI Emerging Markets Hedged Equity"
    },
    {
        value: "DBEU",
        label: "Xtrackers MSCI Europe Hedged Equity"
    },
    {
        value: "DBEZ",
        label: "Xtrackers MSCI Eurozone Hedged Equity"
    },
    {
        value: "DBGR",
        label: "Xtrackers MSCI Germany Hedged Equity"
    },
    {
        value: "DBJP",
        label: "Xtrackers MSCI Japan Hedged Equity"
    },
    {
        value: "DBKO",
        label: "Xtrackers MSCI South Korea Hedged Equity"
    },
    {
        value: "DBL",
        label: "DoubleLine Opportunistic Credit Fund of Beneficial Interest"
    },
    {
        value: "DBO",
        label: "Invesco DB Oil Fund"
    },
    {
        value: "DBP",
        label: "Invesco DB Precious Metals Fund"
    },
    {
        value: "DBRT",
        label: "Credit Suisse AxelaTrader 3x Inverse Brent Crude Oil ETN"
    },
    {
        value: "DBS",
        label: "Invesco DB Silver Fund"
    },
    {
        value: "DBUK",
        label: "Xtrackers MSCI United Kingdom Hedged Equity"
    },
    {
        value: "DBV",
        label: "Invesco DB G10 Currency Harvest Fund"
    },
    {
        value: "DBVT",
        label: "DBV Technologies S.A."
    },
    {
        value: "DBX",
        label: "Dropbox Inc"
    },
    {
        value: "DCAR",
        label: "DropCar Inc."
    },
    {
        value: "DCF",
        label: "Dreyfus Alcentra Global Credit Income 2024 Target Term Fund Inc."
    },
    {
        value: "DCHF",
        label: "ETNs linked to the VelocityShares Daily 4X Long USD vs. CHF Index"
    },
    {
        value: "DCI",
        label: "Donaldson Company Inc."
    },
    {
        value: "DCIX",
        label: "Diana Containerships Inc."
    },
    {
        value: "DCO",
        label: "Ducommun Incorporated"
    },
    {
        value: "DCOM",
        label: "Dime Community Bancshares Inc."
    },
    {
        value: "DCP",
        label: "DCP Midstream LP"
    },
    {
        value: "DCP-B",
        label: "DCP Midstream LP 7.875% Series B Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "DCPH",
        label: "Deciphera Pharmaceuticals Inc."
    },
    {
        value: "DCT",
        label: "DCT Industrial Trust Inc"
    },
    {
        value: "DCUD",
        label: "Dominion Energy Inc. 2016 Series A Corporate Units"
    },
    {
        value: "DD-A",
        label: "E.I. du Pont de Nemours and Company Preferred Stock"
    },
    {
        value: "DD-B",
        label: "E.I. du Pont de Nemours and Company Preferred Stock"
    },
    {
        value: "DDBI",
        label: "Legg Mason Developed EX-US Diversified Core ETF"
    },
    {
        value: "DDD",
        label: "3D Systems Corporation"
    },
    {
        value: "DDE",
        label: "Dover Downs Gaming & Entertainment Inc"
    },
    {
        value: "DDEZ",
        label: "WisdomTree Dynamic Currency Hedged Europe Equity Fund"
    },
    {
        value: "DDF",
        label: "Delaware Investments Dividend & Income Fund Inc."
    },
    {
        value: "DDG",
        label: "ProShares Short Oil & Gas"
    },
    {
        value: "DDJP",
        label: "WisdomTree Dynamic Currency Hedged Japan Equity Fund"
    },
    {
        value: "DDLS",
        label: "WisdomTree Dynamic Currency Hedged International SmallCap Equity Fund"
    },
    {
        value: "DDM",
        label: "ProShares Ultra Dow30"
    },
    {
        value: "DDP",
        label: "DB Commodity Short ETN due April 1 2038"
    },
    {
        value: "DDR",
        label: "DDR Corp."
    },
    {
        value: "DDR-A",
        label: "DDR Corp. Depositary Shares each representing a 1/20th interest in a share of 6.375% Class A Cumulative Redeemable Preferred Shares"
    },
    {
        value: "DDR-J",
        label: "DDR Corporation Dep Shs Repstg 1/20th Pfd Cl J"
    },
    {
        value: "DDR-K",
        label: "DDR Corp. DEPOSITARY SH REPSTG 1/20TH PDF CL K % (United States)"
    },
    {
        value: "DDS",
        label: "Dillard's Inc."
    },
    {
        value: "DDT",
        label: "Dillard's Capital Trust I"
    },
    {
        value: "DDWM",
        label: "WisdomTree Dynamic Currency Hedged International Equity Fund"
    },
    {
        value: "DE",
        label: "Deere & Company"
    },
    {
        value: "DEA",
        label: "Easterly Government Properties Inc."
    },
    {
        value: "DECK",
        label: "Deckers Outdoor Corporation"
    },
    {
        value: "DEE",
        label: "DB Commodity Double Short ETN due April 1 2038"
    },
    {
        value: "DEEF",
        label: "Xtrackers FTSE Developed ex US Comprehensive Factor"
    },
    {
        value: "DEF",
        label: "Invesco Defensive Equity"
    },
    {
        value: "DEFA",
        label: "iShares Adaptive Currency Hedged MSCI EAFE"
    },
    {
        value: "DEI",
        label: "Douglas Emmett Inc."
    },
    {
        value: "DELT",
        label: "Delta Technology Holdings Limited"
    },
    {
        value: "DEM",
        label: "WisdomTree Emerging Markets High Dividend Fund"
    },
    {
        value: "DEMG",
        label: "Xtrackers FTSE Emerging Comprehensive Factor"
    },
    {
        value: "DENN",
        label: "Denny's Corporation"
    },
    {
        value: "DEO",
        label: "Diageo plc"
    },
    {
        value: "DEPO",
        label: "Depomed Inc."
    },
    {
        value: "DERM",
        label: "Dermira Inc."
    },
    {
        value: "DES",
        label: "WisdomTree U.S. SmallCap Dividend Fund"
    },
    {
        value: "DESC",
        label: "Xtrackers Russell 2000 Comprehensive Factor"
    },
    {
        value: "DESP",
        label: "Despegar.com Corp."
    },
    {
        value: "DEST",
        label: "Destination Maternity Corporation"
    },
    {
        value: "DEUR",
        label: "ETNs linked to the VelocityShares Daily 4X Long USD vs. EUR Index"
    },
    {
        value: "DEUS",
        label: "Xtrackers Russell 1000 Comprehensive Factor"
    },
    {
        value: "DEW",
        label: "WisdomTree Global High Dividend Fund"
    },
    {
        value: "DEWJ",
        label: "iShares Adaptive Currency Hedged MSCI Japan"
    },
    {
        value: "DEX",
        label: "Delaware Enhanced Global Dividend of Beneficial Interest"
    },
    {
        value: "DEZU",
        label: "iShares Adaptive Currency Hedged MSCI Eurozone"
    },
    {
        value: "DF",
        label: "Dean Foods Company"
    },
    {
        value: "DFBG",
        label: "Differential Brands Group Inc."
    },
    {
        value: "DFBH",
        label: "DFB Healthcare Acquisitions Corp."
    },
    {
        value: "DFBHU",
        label: "DFB Healthcare Acquisitions Corp. Unit"
    },
    {
        value: "DFBHW",
        label: "DFB Healthcare Acquisitions Corp. Warrant"
    },
    {
        value: "DFE",
        label: "WisdomTree Europe SmallCap Dividend Fund"
    },
    {
        value: "DFEN",
        label: "Direxion Daily Aerospace & Defense Bull 3X Shares"
    },
    {
        value: "DFFN",
        label: "Diffusion Pharmaceuticals Inc."
    },
    {
        value: "DFIN",
        label: "Donnelley Financial Solutions Inc."
    },
    {
        value: "DFJ",
        label: "WisdomTree Japan SmallCap Fund"
    },
    {
        value: "DFND",
        label: "Realty Shares DIVCON Dividend Defender"
    },
    {
        value: "DFNL",
        label: "Davis Select Financial ETF"
    },
    {
        value: "DFP",
        label: "Flaherty & Crumrine Dynamic Preferred and Income Fund Inc."
    },
    {
        value: "DFRG",
        label: "Del Frisco's Restaurant Group Inc."
    },
    {
        value: "DFS",
        label: "Discover Financial Services"
    },
    {
        value: "DFVL",
        label: "iPath US Treasury 5 Year Bull ETN"
    },
    {
        value: "DFVS",
        label: "iPath US Treasury 5-year Bear ETN"
    },
    {
        value: "DG",
        label: "Dollar General Corporation"
    },
    {
        value: "DGAZ",
        label: "VelocityShares 3X Inverse Natural Gas ETN linked to the S&P GSCI Natural Gas INdex Excess Return"
    },
    {
        value: "DGBP",
        label: "ETNs linked to the VelocityShares Daily 4X Long USD vs. GBP Index"
    },
    {
        value: "DGICA",
        label: "Donegal Group Inc. Class A Common Stock"
    },
    {
        value: "DGICB",
        label: "Donegal Group Inc. Class B Common Stock"
    },
    {
        value: "DGII",
        label: "Digi International Inc."
    },
    {
        value: "DGL",
        label: "Invesco DB Gold Fund"
    },
    {
        value: "DGLD",
        label: "VelocityShares 3x Inverse Gold ETN"
    },
    {
        value: "DGLY",
        label: "Digital Ally Inc."
    },
    {
        value: "DGP",
        label: "DB Gold Double Long ETN due February 15 2038"
    },
    {
        value: "DGRE",
        label: "WisdomTree Emerging Markets Quality Dividend Growth Fund"
    },
    {
        value: "DGRO",
        label: "iShares Core Dividend Growth"
    },
    {
        value: "DGRS",
        label: "WisdomTree U.S. SmallCap Quality Dividend Growth Fund"
    },
    {
        value: "DGRW",
        label: "WisdomTree U.S. Quality Dividend Growth Fund"
    },
    {
        value: "DGS",
        label: "WisdomTree Emerging Market SmallCap Fund"
    },
    {
        value: "DGSE",
        label: "DGSE Companies Inc."
    },
    {
        value: "DGT",
        label: "SPDR Global Dow ETF (based on The Global Dow)"
    },
    {
        value: "DGX",
        label: "Quest Diagnostics Incorporated"
    },
    {
        value: "DGZ",
        label: "DB Gold Short ETN due February 15 2038"
    },
    {
        value: "DHCP",
        label: "Ditech Holding Corporation"
    },
    {
        value: "DHDG",
        label: "WisdomTree Dynamic Currency Hedged International Quality Dividend Growth Fund"
    },
    {
        value: "DHF",
        label: "Dreyfus High Yield Strategies Fund"
    },
    {
        value: "DHI",
        label: "D.R. Horton Inc."
    },
    {
        value: "DHIL",
        label: "Diamond Hill Investment Group Inc."
    },
    {
        value: "DHR",
        label: "Danaher Corporation"
    },
    {
        value: "DHS",
        label: "WisdomTree U.S. High Dividend Fund"
    },
    {
        value: "DHT",
        label: "DHT Holdings Inc."
    },
    {
        value: "DHVW",
        label: "Diamond Hill Valuation-Weighted 500"
    },
    {
        value: "DHX",
        label: "DHI Group Inc."
    },
    {
        value: "DHXM",
        label: "DHX Media Ltd."
    },
    {
        value: "DHY",
        label: "Credit Suisse High Yield Bond Fund"
    },
    {
        value: "DIA",
        label: "SPDR Dow Jones Industrial Average"
    },
    {
        value: "DIAL",
        label: "Columbia Diversified Fixed Income Allocation"
    },
    {
        value: "DIAX",
        label: "Nuveen Dow 30SM Dynamic Overwrite Fund of Beneficial Interest"
    },
    {
        value: "DIG",
        label: "ProShares Ultra Oil & Gas"
    },
    {
        value: "DIM",
        label: "WisdomTree International MidCap Dividend Fund"
    },
    {
        value: "DIN",
        label: "Dine Brands Global Inc."
    },
    {
        value: "DINT",
        label: "Davis Select International ETF"
    },
    {
        value: "DIOD",
        label: "Diodes Incorporated"
    },
    {
        value: "DIS",
        label: "The Walt Disney Company"
    },
    {
        value: "DISCA",
        label: "Discovery Inc. Series A Common Stock"
    },
    {
        value: "DISCB",
        label: "Discovery Inc. Series B Common Stock"
    },
    {
        value: "DISCK",
        label: "Discovery Inc."
    },
    {
        value: "DISH",
        label: "DISH Network Corporation"
    },
    {
        value: "DIT",
        label: "AMCON Distributing Company"
    },
    {
        value: "DIV",
        label: "Global X Super Dividend"
    },
    {
        value: "DIVA",
        label: "AGFiQ Hedged Dividend Income Fund"
    },
    {
        value: "DIVB",
        label: "iShares U.S. Dividend and Buyback"
    },
    {
        value: "DIVC",
        label: "Citigroup Inc. C-Tracks ETN Miller/Howard Strategic Dividend Reinvestors Due 9/16/2014"
    },
    {
        value: "DIVO",
        label: "Amplify YieldShares CWP Dividend & Option Income"
    },
    {
        value: "DIVY",
        label: "Realty Shares DIVS"
    },
    {
        value: "DJCI",
        label: "E-TRACS Linked to the Bloomberg Commodity Index Total Return due October 31 2039"
    },
    {
        value: "DJCO",
        label: "Daily Journal Corp. (S.C.)"
    },
    {
        value: "DJD",
        label: "Invesco Dow Jones Industrial Average Dividend"
    },
    {
        value: "DJP",
        label: "iPath Bloomberg Commodity Index Total Return ETN"
    },
    {
        value: "DJPY",
        label: "ETNs linked to the VelocityShares Daily 4X Long USD vs. JPY Index"
    },
    {
        value: "DK",
        label: "Delek US Holdings Inc."
    },
    {
        value: "DKL",
        label: "Delek Logistics Partners L.P. representing Limited Partner Interests"
    },
    {
        value: "DKS",
        label: "Dick's Sporting Goods Inc"
    },
    {
        value: "DKT",
        label: "Deutsch Bk Contingent Cap Tr V Tr Pfd Secs"
    },
    {
        value: "DL",
        label: "China Distance Education Holdings Limited American Depositary Shares"
    },
    {
        value: "DLA",
        label: "Delta Apparel Inc."
    },
    {
        value: "DLB",
        label: "Dolby Laboratories"
    },
    {
        value: "DLBL",
        label: "iPath US Treasury Long Bond Bull ETN"
    },
    {
        value: "DLBR",
        label: "Citigroup Global Markets Holdings Inc VelocityShares Short LIBOR ETN"
    },
    {
        value: "DLBS",
        label: "iPath US Treasury Long Bond Bear ETN"
    },
    {
        value: "DLHC",
        label: "DLH Holdings Corp."
    },
    {
        value: "DLN",
        label: "WisdomTree U.S. LargeCap Dividend Fund"
    },
    {
        value: "DLNG",
        label: "Dynagas LNG Partners LP"
    },
    {
        value: "DLNG-A",
        label: "Dynagas LNG Partners LP 9.00% Series A Cumulative Redeemable Preferred Units"
    },
    {
        value: "DLPH",
        label: "Delphi Technologies PLC"
    },
    {
        value: "DLPN",
        label: "Dolphin Entertainment Inc."
    },
    {
        value: "DLPNW",
        label: "Dolphin Entertainment Inc. Warrant"
    },
    {
        value: "DLR",
        label: "Digital Realty Trust Inc."
    },
    {
        value: "DLR-C",
        label: "Digital Realty Trust Inc. 6.625% Series C Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "DLR-G",
        label: "Digital Realty Trust Inc. Preferred Series G"
    },
    {
        value: "DLR-H",
        label: "Digital Realty Trust Inc. Redeemable Preferred Stock Series H"
    },
    {
        value: "DLR-I",
        label: "Digital Realty Trust Inc. 6.350% Series I Cumulative Redeemable Preferred Stock par value $0.01 per share"
    },
    {
        value: "DLR-J",
        label: "Digital Realty Trust Inc. 5.250% Series J Cumulative Redeemable Preferred Stock"
    },
    {
        value: "DLS",
        label: "WisdomTree International SmallCap Fund"
    },
    {
        value: "DLTH",
        label: "Duluth Holdings Inc."
    },
    {
        value: "DLTR",
        label: "Dollar Tree Inc."
    },
    {
        value: "DLX",
        label: "Deluxe Corporation"
    },
    {
        value: "DM",
        label: "Dominion Energy Midstream Partners LP representing Limited Partner Interests"
    },
    {
        value: "DMB",
        label: "Dreyfus Municipal Bond Infrastructure Fund Inc."
    },
    {
        value: "DMF",
        label: "Dreyfus Municipal Income Inc."
    },
    {
        value: "DMLP",
        label: "Dorchester Minerals L.P."
    },
    {
        value: "DMO",
        label: "Western Asset Mortgage Defined Opportunity Fund Inc"
    },
    {
        value: "DMPI",
        label: "DelMar Pharmaceuticals Inc."
    },
    {
        value: "DMRC",
        label: "Digimarc Corporation"
    },
    {
        value: "DMRI",
        label: "DeltaShares S&P International Managed Risk"
    },
    {
        value: "DMRL",
        label: "DeltaShares S&P 500 Managed Risk"
    },
    {
        value: "DMRM",
        label: "DeltaShares S&P 400 Managed Risk"
    },
    {
        value: "DMRS",
        label: "DeltaShares S&P 600 Managed Risk"
    },
    {
        value: "DNB",
        label: "Dun & Bradstreet Corporation (The)"
    },
    {
        value: "DNBF",
        label: "DNB Financial Corp"
    },
    {
        value: "DNI",
        label: "Dividend and Income Fund"
    },
    {
        value: "DNJR",
        label: "Golden Bull Limited"
    },
    {
        value: "DNKN",
        label: "Dunkin' Brands Group Inc."
    },
    {
        value: "DNL",
        label: "WisdomTree Global ex-US Quality Dividend Growth Fund"
    },
    {
        value: "DNLI",
        label: "Denali Therapeutics Inc."
    },
    {
        value: "DNN",
        label: "Denison Mines Corp (Canada)"
    },
    {
        value: "DNO",
        label: "United States Short Oil Fund"
    },
    {
        value: "DNOW",
        label: "NOW Inc."
    },
    {
        value: "DNP",
        label: "DNP Select Income Fund Inc."
    },
    {
        value: "DNR",
        label: "Denbury Resources Inc."
    },
    {
        value: "DO",
        label: "Diamond Offshore Drilling Inc."
    },
    {
        value: "DOC",
        label: "Physicians Realty Trust of Beneficial Interest"
    },
    {
        value: "DOCU",
        label: "DocuSign Inc."
    },
    {
        value: "DOD",
        label: "Deutsche Bank AG ELEMENTS Dogs of the Dow Total Return Index Note ELEMENTS Dogs of the Dow Linked to the Dow Jones High Yield Select 10 Total Return Index due N"
    },
    {
        value: "DOG",
        label: "ProShares Short Dow30"
    },
    {
        value: "DOGS",
        label: "Arrow Dogs of the World"
    },
    {
        value: "DOGZ",
        label: "Dogness (International) Corporation"
    },
    {
        value: "DOL",
        label: "WisdomTree International LargeCap Dividend Fund"
    },
    {
        value: "DON",
        label: "WisdomTree U.S. MidCap Dividend Fund"
    },
    {
        value: "DOO",
        label: "WisdomTree International Dividend Top 100 Fund"
    },
    {
        value: "DOOR",
        label: "Masonite International Corporation (Canada)"
    },
    {
        value: "DORM",
        label: "Dorman Products Inc."
    },
    {
        value: "DOTA",
        label: "Draper Oakwood Technology Acquisition Inc."
    },
    {
        value: "DOTAR",
        label: "Draper Oakwood Technology Acquisition Inc. Right"
    },
    {
        value: "DOTAU",
        label: "Draper Oakwood Technology Acquisition Inc. Unit"
    },
    {
        value: "DOTAW",
        label: "Draper Oakwood Technology Acquisition Inc. Warrant"
    },
    {
        value: "DOV",
        label: "Dover Corporation"
    },
    {
        value: "DOVA",
        label: "Dova Pharmaceuticals Inc."
    },
    {
        value: "DOX",
        label: "Amdocs Limited"
    },
    {
        value: "DPG",
        label: "Duff & Phelps Global Utility Income Fund Inc."
    },
    {
        value: "DPK",
        label: "Direxion Developed Markets Bear 3x Shares"
    },
    {
        value: "DPLO",
        label: "Diplomat Pharmacy Inc."
    },
    {
        value: "DPS",
        label: "Dr Pepper Snapple Group Inc"
    },
    {
        value: "DPST",
        label: "Direxion Daily Regional Banks Bull 3X Shares"
    },
    {
        value: "DPW",
        label: "DPW Holdings Inc."
    },
    {
        value: "DPZ",
        label: "Domino's Pizza Inc"
    },
    {
        value: "DQ",
        label: "DAQO New Energy Corp. American Depositary Shares each representing five"
    },
    {
        value: "DRAD",
        label: "Digirad Corporation"
    },
    {
        value: "DRD",
        label: "DRDGOLD Limited American Depositary Shares"
    },
    {
        value: "DRE",
        label: "Duke Realty Corporation"
    },
    {
        value: "DRH",
        label: "Diamondrock Hospitality Company"
    },
    {
        value: "DRI",
        label: "Darden Restaurants Inc."
    },
    {
        value: "DRIO",
        label: "DarioHealth Corp."
    },
    {
        value: "DRIOW",
        label: ""
    },
    {
        value: "DRIP",
        label: "Direxion Daily S&P Oil & Gas Exp. & Prod. Bear 3X Shares"
    },
    {
        value: "DRIV",
        label: "Global X Autonomous & Electric Vehicles ETF"
    },
    {
        value: "DRN",
        label: "Direxion Daily Real Estate Bull 3x Shares"
    },
    {
        value: "DRNA",
        label: "Dicerna Pharmaceuticals Inc."
    },
    {
        value: "DRQ",
        label: "Dril-Quip Inc."
    },
    {
        value: "DRR",
        label: "Market Vectors Double Short Euro ETN"
    },
    {
        value: "DRRX",
        label: "DURECT Corporation"
    },
    {
        value: "DRUA",
        label: "Dominion Energy Inc. 2016 Series A 5.25% Enhanced Junior Subordinated Notes due 2076"
    },
    {
        value: "DRV",
        label: "Drexion Daily Real Estate Bear 3x Shares"
    },
    {
        value: "DRW",
        label: "WisdomTree Global ex-US Real Estate Index"
    },
    {
        value: "DRYS",
        label: "DryShips Inc."
    },
    {
        value: "DS",
        label: "Drive Shack Inc."
    },
    {
        value: "DS-B",
        label: "Drive Shack Inc. Preferred Series B"
    },
    {
        value: "DS-C",
        label: "Drive Shack Inc. Preferred Series C"
    },
    {
        value: "DS-D",
        label: "Drive Shack Inc. Pfd Ser D"
    },
    {
        value: "DSE",
        label: "Duff & Phelps Select Energy MLP Fund Inc."
    },
    {
        value: "DSGX",
        label: "The Descartes Systems Group Inc."
    },
    {
        value: "DSI",
        label: "iShares MSCI KLD 400 Social"
    },
    {
        value: "DSKE",
        label: "Daseke Inc."
    },
    {
        value: "DSKEW",
        label: ""
    },
    {
        value: "DSL",
        label: "DoubleLine Income Solutions Fund of Beneficial Interests"
    },
    {
        value: "DSLV",
        label: "VelocityShares 3x Inverse Silver ETN"
    },
    {
        value: "DSM",
        label: "Dreyfus Strategic Municipal Bond Fund Inc."
    },
    {
        value: "DSPG",
        label: "DSP Group Inc."
    },
    {
        value: "DSS",
        label: "Document Security Systems Inc."
    },
    {
        value: "DSU",
        label: "Blackrock Debt Strategies Fund Inc."
    },
    {
        value: "DSUM",
        label: "Invesco Chinese Yuan Dim Sum Bond"
    },
    {
        value: "DSW",
        label: "DSW Inc."
    },
    {
        value: "DSWL",
        label: "Deswell Industries Inc."
    },
    {
        value: "DSX",
        label: "Diana Shipping inc."
    },
    {
        value: "DSX-B",
        label: "Diana Shipping Inc. Perpetual Preferred Shares Series B (Marshall Islands)"
    },
    {
        value: "DSXN",
        label: ""
    },
    {
        value: "DTD",
        label: "WisdomTree U.S. Total Dividend Fund"
    },
    {
        value: "DTE",
        label: "DTE Energy Company"
    },
    {
        value: "DTEA",
        label: "DAVIDsTEA Inc."
    },
    {
        value: "DTEC",
        label: "ALPS ETF Trust Disruptive Technologies"
    },
    {
        value: "DTF",
        label: "DTF Tax-Free Income Inc."
    },
    {
        value: "DTH",
        label: "WisdomTree International High Dividend Fund"
    },
    {
        value: "DTJ",
        label: "DTE Energy Company 2016 Series B 5.375% Junior Subordinated Debentures due 2076"
    },
    {
        value: "DTLA-",
        label: ""
    },
    {
        value: "DTN",
        label: "WisdomTree U.S. Dividend ex-Financials Fund"
    },
    {
        value: "DTO",
        label: "DB Crude Oil Double Short ETN due June 1 2038"
    },
    {
        value: "DTQ",
        label: "DTE Energy Company 2012 Series C 5.25% Junior Subordinate Debentures due December 1 2062"
    },
    {
        value: "DTRM",
        label: "Determine Inc."
    },
    {
        value: "DTUL",
        label: "iPath US Treasury 2 Yr Bull ETN"
    },
    {
        value: "DTUS",
        label: "iPath US Treasury 2-year Bear ETN"
    },
    {
        value: "DTV",
        label: "DTE Energy Company 2016 Corporate Units"
    },
    {
        value: "DTW",
        label: "DTE Energy Company 2017 Series E 5.25% Junior Subordinated Debentures due 2077"
    },
    {
        value: "DTY",
        label: "DTE Energy Company 2016 Series F 6.00% Junior Subordinated Debentures due 2076"
    },
    {
        value: "DTYL",
        label: "iPath US Treasury 10 Year Bull ETN"
    },
    {
        value: "DTYS",
        label: "iPath US Treasury 10-year Bear ETN"
    },
    {
        value: "DUC",
        label: "Duff & Phelps Utility & Corporate Bond Trust Inc."
    },
    {
        value: "DUG",
        label: "ProShares UltraShort Oil & Gas"
    },
    {
        value: "DUK",
        label: "Duke Energy Corporation (Holding Company)"
    },
    {
        value: "DUKH",
        label: "Duke Energy Corporation 5.125% Junior Subordinated Debentures due 2073"
    },
    {
        value: "DUSA",
        label: "Davis Select U.S. Equity ETF"
    },
    {
        value: "DUSL",
        label: "Direxion Daily Industrials Bull 3X Shares"
    },
    {
        value: "DUST",
        label: "Direxion Daily Gold Miners Index Bear 3X Shares"
    },
    {
        value: "DVA",
        label: "DaVita Inc."
    },
    {
        value: "DVAX",
        label: "Dynavax Technologies Corporation"
    },
    {
        value: "DVCR",
        label: "Diversicare Healthcare Services Inc."
    },
    {
        value: "DVD",
        label: "Dover Motorsports Inc."
    },
    {
        value: "DVEM",
        label: "WisdomTree Emerging Markets Dividend Fund"
    },
    {
        value: "DVHL",
        label: "ETRACS 2xLeveraged Diversified High Income ETN"
    },
    {
        value: "DVMT",
        label: "Dell Technologies Inc. Class V"
    },
    {
        value: "DVN",
        label: "Devon Energy Corporation"
    },
    {
        value: "DVP",
        label: "Deep Value"
    },
    {
        value: "DVY",
        label: "iShares Select Dividend ETF"
    },
    {
        value: "DVYA",
        label: "iShares Asia / Pacific Dividend 30 Index Fund Exchange Traded Fund"
    },
    {
        value: "DVYE",
        label: "iShares Emerging Markets Dividend Index Fund Exchange Traded Fund"
    },
    {
        value: "DVYL",
        label: "ETRACS Monthly Pay 2x Leveraged Dow Jones Select Dividend Index ETN"
    },
    {
        value: "DWAQ",
        label: "Invesco DWA NASDAQ Momentum ETF"
    },
    {
        value: "DWAS",
        label: "Invesco DWA SmallCap Momentum ETF"
    },
    {
        value: "DWAT",
        label: "Arrow DWA Tactical ETF"
    },
    {
        value: "DWCH",
        label: "Datawatch Corporation"
    },
    {
        value: "DWCR",
        label: "Arrow DWA Country Rotation ETF"
    },
    {
        value: "DWDP",
        label: "DowDuPont Inc."
    },
    {
        value: "DWFI",
        label: "SPDR Dorsey Wright Fixed Income Allocation ETF"
    },
    {
        value: "DWIN",
        label: "Invesco DWA Tactical Multi-Asset Income ETF"
    },
    {
        value: "DWLD",
        label: "Davis Select Worldwide ETF"
    },
    {
        value: "DWLV",
        label: "Invesco DWA Momentum & Low Volatility Rotation ETF"
    },
    {
        value: "DWM",
        label: "WisdomTree International Equity Fund"
    },
    {
        value: "DWPP",
        label: "First Trust Dorsey Wright People's Portfolio ETF"
    },
    {
        value: "DWSN",
        label: "Dawson Geophysical Company"
    },
    {
        value: "DWT",
        label: "VelocityShares 3x Inverse Crude Oil ETNs linked to the S&P GSCI Crude Oil Index ER"
    },
    {
        value: "DWTR",
        label: "Invesco DWA Tactical Sector Rotation ETF"
    },
    {
        value: "DWX",
        label: "SPDR S&P International Dividend"
    },
    {
        value: "DX",
        label: "Dynex Capital Inc."
    },
    {
        value: "DX-A",
        label: "Dynex Capital Inc. Preferred Stock Series A"
    },
    {
        value: "DX-B",
        label: "Dynex Capital Inc. Preferred Series B"
    },
    {
        value: "DXB",
        label: "Deutsche Bk Contingent Cap TR II Tr Pfd Sec"
    },
    {
        value: "DXC",
        label: "DXC Technology Company"
    },
    {
        value: "DXCM",
        label: "DexCom Inc."
    },
    {
        value: "DXD",
        label: "ProShares UltraShort Dow30"
    },
    {
        value: "DXF",
        label: "Dunxin Financial Holdings Limited American Depositary Shares"
    },
    {
        value: "DXGE",
        label: "WisdomTree Germany Hedged Equity Fund"
    },
    {
        value: "DXJ",
        label: "WisdomTree Japan Hedged Equity Fund"
    },
    {
        value: "DXJF",
        label: "WisdomTree Japan Hedged Financials Fund"
    },
    {
        value: "DXJS",
        label: "WisdomTree Japan Hedged SmallCap Equity Fund"
    },
    {
        value: "DXLG",
        label: "Destination XL Group Inc."
    },
    {
        value: "DXPE",
        label: "DXP Enterprises Inc."
    },
    {
        value: "DXR",
        label: "Daxor Corporation"
    },
    {
        value: "DXYN",
        label: "The Dixie Group Inc."
    },
    {
        value: "DY",
        label: "Dycom Industries Inc."
    },
    {
        value: "DYB",
        label: "WisdomTree Dynamic Bearish U.S. Equity Fund"
    },
    {
        value: "DYLS",
        label: "WisdomTree Dynamic Long/Short U.S. Equity Fund"
    },
    {
        value: "DYNC",
        label: "Vistra Energy Corp. 7.00% Tangible Equity Units"
    },
    {
        value: "DYNT",
        label: "Dynatronics Corporation"
    },
    {
        value: "DYSL",
        label: "Dynasil Corporation of America"
    },
    {
        value: "DYY",
        label: "DB Commodity Double Long ETN due April 1 2038"
    },
    {
        value: "DZK",
        label: "Direxion Developed Markets Bull 3x Shares"
    },
    {
        value: "DZSI",
        label: "DASAN Zhone Solutions Inc."
    },
    {
        value: "DZZ",
        label: "DB Gold Double Short ETN due February 15 2038"
    },
    {
        value: "E",
        label: "ENI S.p.A."
    },
    {
        value: "EA",
        label: "Electronic Arts Inc."
    },
    {
        value: "EAB",
        label: "Entergy Arkansas Inc. First Mortgage Bonds 4.90% Series Due December 1 2052"
    },
    {
        value: "EACQ",
        label: "Easterly Acquisition Corp."
    },
    {
        value: "EACQU",
        label: "Easterly Acquisition Corp. Unit"
    },
    {
        value: "EACQW",
        label: ""
    },
    {
        value: "EAD",
        label: "Wells Fargo Income Opportunities Fund"
    },
    {
        value: "EAE",
        label: "Entergy Arkansas Inc. First Mortgage Bonds 4.75% Series due June 1 2063"
    },
    {
        value: "EAF",
        label: "GrafTech International Ltd."
    },
    {
        value: "EAGL",
        label: "Platinum Eagle Acquisition Corp."
    },
    {
        value: "EAGLU",
        label: "Platinum Eagle Acquisition Corp. Unit"
    },
    {
        value: "EAGLW",
        label: "Platinum Eagle Acquisition Corp. Warrant"
    },
    {
        value: "EAI",
        label: "Entergy Arkansas Inc. First Mortgage Bonds 4.875% Series Due September 1 2066"
    },
    {
        value: "EARN",
        label: "Ellington Residential Mortgage REIT of Beneficial Interest"
    },
    {
        value: "EARS",
        label: "Auris Medical Holding AG"
    },
    {
        value: "EAST",
        label: "Eastside Distilling Inc."
    },
    {
        value: "EASTW",
        label: "Eastside Distilling Inc. Warrants"
    },
    {
        value: "EAT",
        label: "Brinker International Inc."
    },
    {
        value: "EBAY",
        label: "eBay Inc."
    },
    {
        value: "EBAYL",
        label: "eBay Inc. 6.0% Notes Due 2056"
    },
    {
        value: "EBF",
        label: "Ennis Inc."
    },
    {
        value: "EBIX",
        label: "Ebix Inc."
    },
    {
        value: "EBMT",
        label: "Eagle Bancorp Montana Inc."
    },
    {
        value: "EBND",
        label: "SPDR Bloomberg Barclays Emerging Markets Local Bond"
    },
    {
        value: "EBR",
        label: "Centrais Electricas Brasileiras S A American Depositary Shares (Each representing one)"
    },
    {
        value: "EBR.B",
        label: "Centrais Electricas Brasileiras S.A.- Eletrobr?!s American Depositary Shares (Each representing one Preferred Share)"
    },
    {
        value: "EBS",
        label: "Emergent Biosolutions Inc."
    },
    {
        value: "EBSB",
        label: "Meridian Bancorp Inc."
    },
    {
        value: "EBTC",
        label: "Enterprise Bancorp Inc"
    },
    {
        value: "EC",
        label: "Ecopetrol S.A. American Depositary Shares"
    },
    {
        value: "ECA",
        label: "Encana Corporation"
    },
    {
        value: "ECC",
        label: "Eagle Point Credit Company Inc."
    },
    {
        value: "ECCA",
        label: "Eagle Point Credit Company Inc. Series A Term Preferred Stock due 2022"
    },
    {
        value: "ECCB",
        label: "Eagle Point Credit Company Inc. 7.75% Series B Term Preferred Stock due 2026"
    },
    {
        value: "ECCX",
        label: "Eagle Point Credit Company Inc. 6.6875% Notes due 2028"
    },
    {
        value: "ECCY",
        label: "Eagle Point Credit Company Inc. 6.75% Notes due 2027"
    },
    {
        value: "ECF",
        label: "Ellsworth Growth and Income Fund Ltd."
    },
    {
        value: "ECF-A",
        label: "Ellsworth Growth and Income Fund Ltd. 5.25% Series A Cumulative Preferred Shares (Liquidation Preference $25.00 per share)"
    },
    {
        value: "ECH",
        label: "iShares Inc. MSCI Chile"
    },
    {
        value: "ECHO",
        label: "Echo Global Logistics Inc."
    },
    {
        value: "ECL",
        label: "Ecolab Inc."
    },
    {
        value: "ECNS",
        label: "iShares MSCI China Small-Cap"
    },
    {
        value: "ECOL",
        label: "US Ecology Inc."
    },
    {
        value: "ECOM",
        label: "ChannelAdvisor Corporation"
    },
    {
        value: "ECON",
        label: "Columbia Emerging Markets Consumer"
    },
    {
        value: "ECPG",
        label: "Encore Capital Group Inc"
    },
    {
        value: "ECR",
        label: "Eclipse Resources Corporation"
    },
    {
        value: "ECT",
        label: "ECA Marcellus Trust I of Beneficial Interest"
    },
    {
        value: "ECYT",
        label: "Endocyte Inc."
    },
    {
        value: "ED",
        label: "Consolidated Edison Inc."
    },
    {
        value: "EDAP",
        label: "EDAP TMS S.A."
    },
    {
        value: "EDBI",
        label: "Legg Mason Emerging Markets Diversified Core ETF"
    },
    {
        value: "EDC",
        label: "Direxion Emerging Markets Bull 3X Shares"
    },
    {
        value: "EDD",
        label: "Morgan Stanley Emerging Markets Domestic Debt Fund Inc."
    },
    {
        value: "EDEN",
        label: "iShares Inc MSCI Denmark"
    },
    {
        value: "EDF",
        label: "Stone Harbor Emerging Markets Income Fund of Beneficial Interest"
    },
    {
        value: "EDGE",
        label: "Edge Therapeutics Inc."
    },
    {
        value: "EDGW",
        label: "Edgewater Technology Inc."
    },
    {
        value: "EDI",
        label: "Stone Harbor Emerging Markets Total Income Fund of Beneficial Interests"
    },
    {
        value: "EDIT",
        label: "Editas Medicine Inc."
    },
    {
        value: "EDIV",
        label: "SPDR S&P Emerging Markets Dividend"
    },
    {
        value: "EDN",
        label: "Empresa Distribuidora Y Comercializadora Norte S.A. (Edenor) Empresa Distribuidora Y Comercializadora Norte S.A. (Edenor) American Depositary Shares"
    },
    {
        value: "EDOG",
        label: "ALPS Emerging Sector Dividend Dogs"
    },
    {
        value: "EDOM",
        label: "WisdomTree Europe Domestic Economy Fund"
    },
    {
        value: "EDOW",
        label: "First Trust Dow 30 Equal Weight"
    },
    {
        value: "EDR",
        label: "Education Realty Trust Inc."
    },
    {
        value: "EDRY",
        label: "EURODRY LTD"
    },
    {
        value: "EDU",
        label: "New Oriental Education & Technology Group Inc. Sponsored ADR representing 1 (Cayman Islands)"
    },
    {
        value: "EDUC",
        label: "Educational Development Corporation"
    },
    {
        value: "EDV",
        label: "Vanguard Extended Duration Treasury"
    },
    {
        value: "EDZ",
        label: "Direxion Emerging Markets Bear 3X Shares"
    },
    {
        value: "EE",
        label: "El Pasoectric Company"
    },
    {
        value: "EEA",
        label: "The European Equity Fund Inc."
    },
    {
        value: "EEB",
        label: "Invesco BRIC"
    },
    {
        value: "EEFT",
        label: "Euronet Worldwide Inc."
    },
    {
        value: "EEH",
        label: "Aktiebolaget Svensk Exportkredit (Swed Ex Cred Corp) Elements (SM) Linked to the SPECTRUM Large Cap U.S. Sector Momentum Index developed by BNP Paribas due Augu"
    },
    {
        value: "EEI",
        label: "Ecology and Environment Inc."
    },
    {
        value: "EELV",
        label: "Invesco S&P Emerging Markets Low Volatility"
    },
    {
        value: "EEM",
        label: "iShares MSCI Emerging Index Fund"
    },
    {
        value: "EEMA",
        label: "iShares MSCI Emerging Markets Asia ETF"
    },
    {
        value: "EEMD",
        label: "AAM S&P Emerging Markets High Dividend Value"
    },
    {
        value: "EEMO",
        label: "Invesco S&P Emerging Markets Momentum"
    },
    {
        value: "EEMS",
        label: "Ishares MSCI Emerging Markets Small Cap Index Fund"
    },
    {
        value: "EEMV",
        label: "iShares Edge MSCI Min Vol Emerging Markets"
    },
    {
        value: "EEMX",
        label: "SPDR MSCI Emerging Markets Fuel Reserves Free"
    },
    {
        value: "EEP",
        label: "Enbridge Energy L.P. Class A"
    },
    {
        value: "EEQ",
        label: "Enbridge Energy Management LLC Shares repstg limited liability company interests"
    },
    {
        value: "EES",
        label: "WisdomTree U.S. SmallCap Earnings Fund"
    },
    {
        value: "EET",
        label: "ProShares Ultra MSCI Emerging Markets"
    },
    {
        value: "EEV",
        label: "ProShares UltraShort MSCI Emerging Markets"
    },
    {
        value: "EEX",
        label: "Emerald Expositions Events Inc."
    },
    {
        value: "EFA",
        label: "iShares MSCI EAFE"
    },
    {
        value: "EFAD",
        label: "ProShares Trust MSCI EAFE Dividend Growers"
    },
    {
        value: "EFAS",
        label: "Global X MSCI SuperDividend EAFE ETF"
    },
    {
        value: "EFAV",
        label: "iShares Edge MSCI Min Vol EAFE"
    },
    {
        value: "EFAX",
        label: "SPDR MSCI EAFE Fossil Fuel Reserves Free"
    },
    {
        value: "EFBI",
        label: "Eagle Financial Bancorp Inc."
    },
    {
        value: "EFC",
        label: "Ellington Financial LLC representing Limitied Liability Company Interests no par valu"
    },
    {
        value: "EFF",
        label: "Eaton vance Floating-Rate Income Plus Fund of Beneficial Interest"
    },
    {
        value: "EFFE",
        label: "Global X JPMorgan Efficiente Index"
    },
    {
        value: "EFG",
        label: "iShares MSCI EAFE Growth"
    },
    {
        value: "EFII",
        label: "Electronics for Imaging Inc."
    },
    {
        value: "EFL",
        label: "Eaton Vance Floating-Rate 2022 Target Term Trust of Beneficial Interest"
    },
    {
        value: "EFNL",
        label: "iShares Inc MSCI Finland"
    },
    {
        value: "EFO",
        label: "ProShares Ultra MSCI EAFE"
    },
    {
        value: "EFOI",
        label: "Energy Focus Inc."
    },
    {
        value: "EFR",
        label: "Eaton Vance Senior Floating-Rate Fund of Beneficial Interest"
    },
    {
        value: "EFSC",
        label: "Enterprise Financial Services Corporation"
    },
    {
        value: "EFT",
        label: "Eaton Vance Floating Rate Income Trust of Beneficial Interest"
    },
    {
        value: "EFU",
        label: "ProShares UltraShort MSCI EAFE"
    },
    {
        value: "EFV",
        label: "iShares MSCI EAFE Value"
    },
    {
        value: "EFX",
        label: "Equifax Inc."
    },
    {
        value: "EFZ",
        label: "ProShares Short MSCI EAFE"
    },
    {
        value: "EGAN",
        label: "eGain Corporation"
    },
    {
        value: "EGBN",
        label: "Eagle Bancorp Inc."
    },
    {
        value: "EGC",
        label: "Energy XXI Gulf Coast Inc."
    },
    {
        value: "EGF",
        label: "Blackrock Enhanced Government Fund Inc."
    },
    {
        value: "EGHT",
        label: "8x8 Inc"
    },
    {
        value: "EGI",
        label: "Entree Resources Ltd."
    },
    {
        value: "EGIF",
        label: "Eagle Growth and Income Opportunities Fund of Beneficial Interest"
    },
    {
        value: "EGL",
        label: "Engility Holdings Inc."
    },
    {
        value: "EGLE",
        label: "Eagle Bulk Shipping Inc."
    },
    {
        value: "EGLT",
        label: "Egalet Corporation"
    },
    {
        value: "EGN",
        label: "Energen Corporation"
    },
    {
        value: "EGO",
        label: "Eldorado Gold Corporation"
    },
    {
        value: "EGOV",
        label: "NIC Inc."
    },
    {
        value: "EGP",
        label: "EastGroup Properties Inc."
    },
    {
        value: "EGPT",
        label: "VanEck Vectors Egypt Index"
    },
    {
        value: "EGRX",
        label: "Eagle Pharmaceuticals Inc."
    },
    {
        value: "EGY",
        label: "VAALCO Energy Inc."
    },
    {
        value: "EHC",
        label: "Encompass Health Corporation"
    },
    {
        value: "EHI",
        label: "Western Asset Global High Income Fund Inc"
    },
    {
        value: "EHIC",
        label: "eHi Car Services Limited American Depositary Shares"
    },
    {
        value: "EHT",
        label: "Eaton Vance High Income 2021 Target Term Trust of Beneficial Interest"
    },
    {
        value: "EHTH",
        label: "eHealth Inc."
    },
    {
        value: "EIA",
        label: "Eaton Vance California Municipal Bond Fund II of Beneficial Interest $.01 par value"
    },
    {
        value: "EIDO",
        label: "iShares MSCI Indonesia"
    },
    {
        value: "EIG",
        label: "Employers Holdings Inc"
    },
    {
        value: "EIGI",
        label: "Endurance International Group Holdings Inc."
    },
    {
        value: "EIGR",
        label: "Eiger BioPharmaceuticals Inc."
    },
    {
        value: "EIM",
        label: "Eaton Vance Municipal Bond Fund of Beneficial Interest $.01 par value"
    },
    {
        value: "EIO",
        label: "Eaton Vance Ohio Municipal Bond Fundd of Befeficial Interest $.01 par value"
    },
    {
        value: "EIP",
        label: "Eaton Vance Pennsylvania Municipal Bond Fund of Befeficial Interest $.01 par value"
    },
    {
        value: "EIRL",
        label: "iShares Trust MSCI Ireland"
    },
    {
        value: "EIS",
        label: "iShares Inc MSCI Israel"
    },
    {
        value: "EIV",
        label: "Eaton Vance Municipal Bond Fund II of Beneficial Interest $.01 Par Value"
    },
    {
        value: "EIX",
        label: "Edison International"
    },
    {
        value: "EKAR",
        label: "Innovation Shares NextGen Vehicles & Technology"
    },
    {
        value: "EKSO",
        label: "Ekso Bionics Holdings Inc."
    },
    {
        value: "EL",
        label: "Estee Lauder Companies Inc. (The)"
    },
    {
        value: "ELC",
        label: "Entergy Louisiana Inc. Collateral Trust Mortgage Bonds 4.875 % Series due September 1 2066"
    },
    {
        value: "ELD",
        label: "WisdomTree Emerging Markets Local Debt Fund"
    },
    {
        value: "ELEC",
        label: "Electrum Special Acquisition Corporation"
    },
    {
        value: "ELECU",
        label: "Electrum Special Acquisition Corporation Unit"
    },
    {
        value: "ELECW",
        label: ""
    },
    {
        value: "ELF",
        label: "e.l.f. Beauty Inc."
    },
    {
        value: "ELGX",
        label: "Endologix Inc."
    },
    {
        value: "ELJ",
        label: "Entergy Louisiana Inc. First Mortgage Bonds 5.25% Series due July 1 2052"
    },
    {
        value: "ELLI",
        label: "Ellie Mae Inc."
    },
    {
        value: "ELLO",
        label: "Ellomay Capital Ltd (Israel)"
    },
    {
        value: "ELMD",
        label: "Electromed Inc."
    },
    {
        value: "ELON",
        label: "Echelon Corporation"
    },
    {
        value: "ELOX",
        label: "Eloxx Pharmaceuticals Inc."
    },
    {
        value: "ELP",
        label: "Companhia Paranaense de Energia (COPEL)"
    },
    {
        value: "ELS",
        label: "Equity Lifestyle Properties Inc."
    },
    {
        value: "ELSE",
        label: "Electro-Sensors Inc."
    },
    {
        value: "ELTK",
        label: "Eltek Ltd."
    },
    {
        value: "ELU",
        label: "Entergy Louisiana Inc. First Mortgage Bonds 4.70% Series due June 1 2063"
    },
    {
        value: "ELVT",
        label: "Elevate Credit Inc."
    },
    {
        value: "ELY",
        label: "Callaway Golf Company"
    },
    {
        value: "EMAG",
        label: "VanEck Vectors Emerging Markets Aggregate Bond"
    },
    {
        value: "EMAN",
        label: "eMagin Corporation"
    },
    {
        value: "EMB",
        label: "iShares J.P. Morgan USD Emerging Markets Bond ETF"
    },
    {
        value: "EMBH",
        label: "iShares Interest Rate Hedged Emerging Markets Bond"
    },
    {
        value: "EMBU",
        label: "Direxion Funds Daily Emerging Markets Bond Bull 3X Shares"
    },
    {
        value: "EMCB",
        label: "WisdomTree Emerging Markets Corporate Bond Fund"
    },
    {
        value: "EMCF",
        label: "Emclaire Financial Corp"
    },
    {
        value: "EMCG",
        label: "WisdomTree Emerging Markets Consumer Growth Fund"
    },
    {
        value: "EMCI",
        label: "EMC Insurance Group Inc."
    },
    {
        value: "EMD",
        label: "Western Asset Emerging Markets Debt Fund Inc"
    },
    {
        value: "EMDV",
        label: "ProShares MSCI Emerging Markets Dividend Growers"
    },
    {
        value: "EME",
        label: "EMCOR Group Inc."
    },
    {
        value: "EMEM",
        label: "Virtus Glovista Emerging Markets"
    },
    {
        value: "EMES",
        label: "Emerge Energy Services LP representing Limited Partner Interests"
    },
    {
        value: "EMF",
        label: "Templeton Emerging Markets Fund"
    },
    {
        value: "EMFM",
        label: "Global X Next Emerging & Frontier"
    },
    {
        value: "EMGF",
        label: "iShares Edge MSCI Multifactor Emerging Markets"
    },
    {
        value: "EMHY",
        label: "iShares Emerging Markets High Yield Bond"
    },
    {
        value: "EMI",
        label: "Eaton Vance Michigan Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "EMIF",
        label: "iShares S&P Emerging Markets Infrastructure Index Fund"
    },
    {
        value: "EMIH",
        label: "Xtrackers Emerging Markets Bond - Interest Rate Hedged"
    },
    {
        value: "EMITF",
        label: "Elbit Imaging Ltd."
    },
    {
        value: "EMJ",
        label: "Eaton Vance New Jersey Municipal Bond Fund Common Shres of Beneficial Interest $.01 par value"
    },
    {
        value: "EMKR",
        label: "EMCORE Corporation"
    },
    {
        value: "EML",
        label: "Eastern Company (The)"
    },
    {
        value: "EMLC",
        label: "VanEck Vectors J.P. Morgan EM Local Currency Bond"
    },
    {
        value: "EMLP",
        label: "First Trust North American Energy Infrastructure Fund"
    },
    {
        value: "EMMS",
        label: "Emmis Communications Corporation"
    },
    {
        value: "EMN",
        label: "Eastman Chemical Company"
    },
    {
        value: "EMO",
        label: "ClearBridge Energy MLP Opportunity Fund Inc."
    },
    {
        value: "EMP",
        label: "Entergy Mississippi Inc. First Mortgage Bonds 4.90% Series Due October 1 2066"
    },
    {
        value: "EMQQ",
        label: "Emerging Markets Internet and Ecommerce ETF (The)"
    },
    {
        value: "EMR",
        label: "Emerson Electric Company"
    },
    {
        value: "EMSH",
        label: "ProShares Short Term USD Emerging Markets Bond"
    },
    {
        value: "EMTL",
        label: "SPDR DoubleLine Emerging Markets Fixed Income"
    },
    {
        value: "EMTY",
        label: "ProShares Decline of the Retail Store"
    },
    {
        value: "EMX",
        label: "EMX Royalty Corporation (Canada)"
    },
    {
        value: "EMXC",
        label: "iShares MSCI Emerging Markets ex China ETF"
    },
    {
        value: "ENB",
        label: "Enbridge Inc"
    },
    {
        value: "ENBA",
        label: "Enbridge Inc 6.375% Fixed-to-Floating Rate Subordinated Notes Series 2018-B due 2078"
    },
    {
        value: "ENBL",
        label: "Enable Midstream Partners LP representing limited partner interests"
    },
    {
        value: "ENDP",
        label: "Endo International plc"
    },
    {
        value: "ENFC",
        label: "Entegra Financial Corp."
    },
    {
        value: "ENFR",
        label: "Alerian Energy Infrastructure"
    },
    {
        value: "ENG",
        label: "ENGlobal Corporation"
    },
    {
        value: "ENIA",
        label: "Enel Americas S.A. American Depositary Shares"
    },
    {
        value: "ENIC",
        label: "Enel Chile S.A. American Depositary Shares (Each representing 50 shares of)"
    },
    {
        value: "ENJ",
        label: "Entergy New Orleans LLC First Mortgage Bonds 5.0% Series due December 1 2052"
    },
    {
        value: "ENLC",
        label: "EnLink Midstream LLC representing Limited Partner Interests"
    },
    {
        value: "ENLK",
        label: "EnLink Midstream Partners LP Representing Limited Partnership Interests"
    },
    {
        value: "ENO",
        label: "Entergy New Orleans LLC First Mortgage Bonds 5.50% Series due April 1 2066"
    },
    {
        value: "ENOR",
        label: "iShares Inc MSCI Norway"
    },
    {
        value: "ENPH",
        label: "Enphase Energy Inc."
    },
    {
        value: "ENR",
        label: "Energizer Holdings Inc."
    },
    {
        value: "ENS",
        label: "Enersys"
    },
    {
        value: "ENSG",
        label: "The Ensign Group Inc."
    },
    {
        value: "ENSV",
        label: "Enservco Corporation"
    },
    {
        value: "ENT",
        label: "Global Eagle Entertainment Inc."
    },
    {
        value: "ENTA",
        label: "Enanta Pharmaceuticals Inc."
    },
    {
        value: "ENTG",
        label: "Entegris Inc."
    },
    {
        value: "ENTR",
        label: "ERShares Entrepreneur 30"
    },
    {
        value: "ENV",
        label: "Envestnet Inc"
    },
    {
        value: "ENVA",
        label: "Enova International Inc."
    },
    {
        value: "ENX",
        label: "Eaton Vance New York Municipal Bond Fund of Beneficial Interest $.01 par value"
    },
    {
        value: "ENY",
        label: "Invesco Canadian Energy Income"
    },
    {
        value: "ENZ",
        label: "Enzo Biochem Inc. ($0.01 Par Value)"
    },
    {
        value: "ENZL",
        label: "iShares MSCI New Zealand ETF"
    },
    {
        value: "EOCC",
        label: "Enel Generacion Chile S.A. American Depositary Shares (Each representing 30 shares of)"
    },
    {
        value: "EOD",
        label: "Wells Fargo Global Dividend Opportunity Fund"
    },
    {
        value: "EOG",
        label: "EOG Resources Inc."
    },
    {
        value: "EOI",
        label: "Eaton Vance Enhance Equity Income Fundd Equity Income Fund Shares of Beneficial Interest"
    },
    {
        value: "EOLS",
        label: "Evolus Inc."
    },
    {
        value: "EOS",
        label: "Eaton Vance Enhance Equity Income Fund II"
    },
    {
        value: "EOT",
        label: "Eaton Vance Municipal Income Trust EATON VANCE NATIONAL MUNICIPAL OPPORTUNITIES TRUST"
    },
    {
        value: "EP-C",
        label: "El Paso Corporation Preferred Stock"
    },
    {
        value: "EPAM",
        label: "EPAM Systems Inc."
    },
    {
        value: "EPAY",
        label: "Bottomline Technologies Inc."
    },
    {
        value: "EPC",
        label: "Edgewell Personal Care Company"
    },
    {
        value: "EPD",
        label: "Enterprise Products Partners L.P."
    },
    {
        value: "EPE",
        label: "EP Energy Corporation Class A"
    },
    {
        value: "EPHE",
        label: "iShares MSCI Philippines"
    },
    {
        value: "EPI",
        label: "WisdomTree India Earnings Fund"
    },
    {
        value: "EPIX",
        label: "ESSA Pharma Inc."
    },
    {
        value: "EPM",
        label: "Evolution Petroleum Corporation Inc."
    },
    {
        value: "EPOL",
        label: "iShares Trust MSCI Poland"
    },
    {
        value: "EPP",
        label: "iShares MSCI Pacific Ex-Japan Index Fund"
    },
    {
        value: "EPR",
        label: "EPR Properties"
    },
    {
        value: "EPR-C",
        label: "EPR Properties 5.75% Series C Cumulative Convertible Preferred Shares"
    },
    {
        value: "EPR-E",
        label: "EPR Properties Series E Cumulative Conv Pfd Shs Ser E"
    },
    {
        value: "EPR-G",
        label: "EPR Properties 5.750% Series G Cumulative Redeemable Preferred Shares"
    },
    {
        value: "EPRF",
        label: "Innovator S&P High Quality Preferred"
    },
    {
        value: "EPS",
        label: "WisdomTree U.S. Earnings 500 Fund"
    },
    {
        value: "EPU",
        label: "iShares Trust MSCI Peru"
    },
    {
        value: "EPV",
        label: "ProShares UltraShort FTSE Europe"
    },
    {
        value: "EPZM",
        label: "Epizyme Inc."
    },
    {
        value: "EQAL",
        label: "Invesco Russell 1000 Equal Weight"
    },
    {
        value: "EQBK",
        label: "Equity Bancshares Inc."
    },
    {
        value: "EQC",
        label: "Equity Commonwealth of Beneficial Interest"
    },
    {
        value: "EQC-D",
        label: "Equity Commonwealth 6.50% Pfd Conv Shs Ser D"
    },
    {
        value: "EQFN",
        label: "Equitable Financial Corp."
    },
    {
        value: "EQGP",
        label: "EQT GP Holdings LP representing limited partner interests"
    },
    {
        value: "EQH",
        label: "AXA Equitable Holdings Inc."
    },
    {
        value: "EQIX",
        label: "Equinix Inc."
    },
    {
        value: "EQL",
        label: "ALPS Equal Sector Weight"
    },
    {
        value: "EQLT",
        label: "Workplace Equality Portfolio"
    },
    {
        value: "EQM",
        label: "EQT Midstream Partners LP representing Limited Partner Interests"
    },
    {
        value: "EQNR",
        label: "Equinor ASA"
    },
    {
        value: "EQR",
        label: "Equity Residential of Beneficial Interest"
    },
    {
        value: "EQRR",
        label: "ProShares Equities for Rising Rates ETF"
    },
    {
        value: "EQS",
        label: "Equus Total Return Inc."
    },
    {
        value: "EQT",
        label: "EQT Corporation"
    },
    {
        value: "EQWL",
        label: "Invesco Russell Top 200 Equal Weight"
    },
    {
        value: "EQWM",
        label: "Invesco Russell Midcap Equal Weight"
    },
    {
        value: "EQWS",
        label: "Invesco Russell 2000 Equal Weight"
    },
    {
        value: "ERA",
        label: "Era Group Inc."
    },
    {
        value: "ERC",
        label: "Wells Fargo Multi-Sector Income Fund no par value"
    },
    {
        value: "ERF",
        label: "Enerplus Corporation"
    },
    {
        value: "ERGF",
        label: "iShares Edge MSCI Multifactor Energy"
    },
    {
        value: "ERH",
        label: "Wells Fargo Utilities and High Income Fund"
    },
    {
        value: "ERI",
        label: "Eldorado Resorts Inc."
    },
    {
        value: "ERIC",
        label: "Ericsson"
    },
    {
        value: "ERIE",
        label: "Erie Indemnity Company"
    },
    {
        value: "ERII",
        label: "Energy Recovery Inc."
    },
    {
        value: "ERJ",
        label: "Embraer S.A."
    },
    {
        value: "ERM",
        label: "EquityCompass Risk Manager"
    },
    {
        value: "EROS",
        label: "Eros International PLC A"
    },
    {
        value: "ERUS",
        label: "iShares MSCI Russia"
    },
    {
        value: "ERX",
        label: "Direxion Energy Bull 3X Shares"
    },
    {
        value: "ERY",
        label: "Direxion Daily Energy Bear 3X Shares"
    },
    {
        value: "ERYP",
        label: "Erytech Pharma S.A."
    },
    {
        value: "ES",
        label: "Eversource Energy (D/B/A)"
    },
    {
        value: "ESBA",
        label: "Empire State Realty OP L.P. Series ES Operating Partnership Units Representing Limited Partnership Interests"
    },
    {
        value: "ESBK",
        label: "Elmira Savings Bank NY (The)"
    },
    {
        value: "ESCA",
        label: "Escalade Incorporated"
    },
    {
        value: "ESE",
        label: "ESCO Technologies Inc."
    },
    {
        value: "ESEA",
        label: "Euroseas Ltd."
    },
    {
        value: "ESES",
        label: "Eco-Stim Energy Solutions Inc."
    },
    {
        value: "ESG",
        label: "FlexShares STOXX US ESG Impact Index Fund"
    },
    {
        value: "ESGD",
        label: "iShares MSCI EAFE ESG Optimized ETF"
    },
    {
        value: "ESGE",
        label: "iShares MSCI EM ESG Optimized ETF"
    },
    {
        value: "ESGF",
        label: "Oppenheimer Revenue Weighted ETF Trust Global ESG Revenue"
    },
    {
        value: "ESGG",
        label: "FlexShares STOXX Global ESG Impact Index Fund"
    },
    {
        value: "ESGL",
        label: "Oppenheimer Revenue Weighted ETF Trust ESG Revenue"
    },
    {
        value: "ESGN",
        label: "Columbia Sustainable International Equity Income"
    },
    {
        value: "ESGR",
        label: "Enstar Group Limited"
    },
    {
        value: "ESGS",
        label: "Columbia Sustainable U.S. Equity Income"
    },
    {
        value: "ESGU",
        label: "iShares MSCI USA ESG Optimized ETF"
    },
    {
        value: "ESGW",
        label: "Columbia Sustainable Global Equity Income"
    },
    {
        value: "ESIO",
        label: "Electro Scientific Industries Inc."
    },
    {
        value: "ESL",
        label: "Esterline Technologies Corporation"
    },
    {
        value: "ESLT",
        label: "Elbit Systems Ltd."
    },
    {
        value: "ESML",
        label: "iShares MSCI USA Small-Cap ESG Optimized"
    },
    {
        value: "ESNC",
        label: "EnSync Inc."
    },
    {
        value: "ESND",
        label: "Essendant Inc."
    },
    {
        value: "ESNT",
        label: "Essent Group Ltd."
    },
    {
        value: "ESP",
        label: "Espey Mfg. & Electronics Corp."
    },
    {
        value: "ESPR",
        label: "Esperion Therapeutics Inc."
    },
    {
        value: "ESQ",
        label: "Esquire Financial Holdings Inc."
    },
    {
        value: "ESRT",
        label: "Empire State Realty Trust Inc. Class A"
    },
    {
        value: "ESRX",
        label: "Express Scripts Holding Company"
    },
    {
        value: "ESS",
        label: "Essex Property Trust Inc."
    },
    {
        value: "ESSA",
        label: "ESSA Bancorp Inc."
    },
    {
        value: "ESTE",
        label: "Earthstone Energy Inc. Class A"
    },
    {
        value: "ESTR",
        label: "Estre Ambiental Inc."
    },
    {
        value: "ESTRW",
        label: "Estre Ambiental Inc. Warrants"
    },
    {
        value: "ESV",
        label: "Ensco plc Class A"
    },
    {
        value: "ESXB",
        label: "Community Bankers Trust Corporation."
    },
    {
        value: "ETB",
        label: "Eaton Vance Tax-Managed Buy-Write Income Fund of Beneficial Interest"
    },
    {
        value: "ETE",
        label: "Energy Transfer Equity L.P. representing Limited Partnership interests"
    },
    {
        value: "ETFC",
        label: "E*TRADE Financial Corporation"
    },
    {
        value: "ETG",
        label: "Eaton Vance Tax-Advantaged Global Dividend Income Fund of Beneficial Interest"
    },
    {
        value: "ETH",
        label: "Ethan Allen Interiors Inc."
    },
    {
        value: "ETHO",
        label: "Etho Climate Leadership U.S."
    },
    {
        value: "ETJ",
        label: "Eaton Vance Risk-Managed Diversified Equity Income Fund of Beneficial Interest"
    },
    {
        value: "ETM",
        label: "Entercom Communications Corp."
    },
    {
        value: "ETN",
        label: "Eaton Corporation PLC"
    },
    {
        value: "ETO",
        label: "Eaton Vance Tax-Advantage Global Dividend Opp"
    },
    {
        value: "ETP",
        label: "Energy Transfer Partners L.P. representing limited partner interests"
    },
    {
        value: "ETP-C",
        label: "Energy Transfer Partners L.P. Series C Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "ETR",
        label: "Entergy Corporation"
    },
    {
        value: "ETSY",
        label: "Etsy Inc."
    },
    {
        value: "ETV",
        label: "Eaton Vance Corporation Tax-Managed Buy-Write Opportunities Fund of Beneficial Interest"
    },
    {
        value: "ETW",
        label: "Eaton Vance Corporation Tax-Managed Global Buy-Write Opportunites Fund of Beneficial Interest"
    },
    {
        value: "ETX",
        label: "Eaton Vance Municipal Income 2028 Term Trust of Beneficial Interest"
    },
    {
        value: "ETY",
        label: "Eaton Vance Tax-Managed Diversified Equity Income Fund of Beneficial Interest"
    },
    {
        value: "EUDG",
        label: "WisdomTree Europe Quality Dividend Growth Fund"
    },
    {
        value: "EUDV",
        label: "ProShares MSCI Europe Dividend Growers"
    },
    {
        value: "EUFL",
        label: "Direxion Daily European Financials Bull 2X Shares"
    },
    {
        value: "EUFN",
        label: "iShares MSCI Europe Financials Sector Index Fund"
    },
    {
        value: "EUFX",
        label: "ProShares Short Euro"
    },
    {
        value: "EUM",
        label: "ProShares Short MSCI Emerging Markets"
    },
    {
        value: "EUMV",
        label: "iShares Edge MSCI Min Vol Europe"
    },
    {
        value: "EUO",
        label: "ProShares UltraShort Euro"
    },
    {
        value: "EURL",
        label: "Direxion Daily FTSE Europe Bull 3x Shares"
    },
    {
        value: "EURN",
        label: "Euronav NV"
    },
    {
        value: "EURZ",
        label: "Xtrackers Eurozone Equity"
    },
    {
        value: "EUSA",
        label: "iShares MSCI USA Equal Weighted"
    },
    {
        value: "EUSC",
        label: "WisdomTree Europe Hedged SmallCap Equity Fund"
    },
    {
        value: "EUXL",
        label: "Direxion Daily EURO STOXX 50? Bull 3X Shares"
    },
    {
        value: "EV",
        label: "Eaton Vance Corporation"
    },
    {
        value: "EVA",
        label: "Enviva Partners LP representing limited partner interests"
    },
    {
        value: "EVBG",
        label: "Everbridge Inc."
    },
    {
        value: "EVBN",
        label: "Evans Bancorp Inc."
    },
    {
        value: "EVC",
        label: "Entravision Communications Corporation"
    },
    {
        value: "EVF",
        label: "Eaton Vance Senior Income Trust"
    },
    {
        value: "EVFM",
        label: "Evofem Biosciences Inc."
    },
    {
        value: "EVFTC",
        label: "Eaton Vance NextShares Trust II"
    },
    {
        value: "EVG",
        label: "Eaton Vance Short Diversified Income Fund Duration Diversified Income Fund of Beneficial Interest"
    },
    {
        value: "EVGBC",
        label: "Eaton Vance NextShares Trust"
    },
    {
        value: "EVGN",
        label: "Evogene Ltd."
    },
    {
        value: "EVH",
        label: "Evolent Health Inc Class A"
    },
    {
        value: "EVHC",
        label: "Envision Healthcare Corporation"
    },
    {
        value: "EVI",
        label: "EnviroStar Inc."
    },
    {
        value: "EVIX",
        label: "VelocityShares 1x Long VSTOXX Futures ETN"
    },
    {
        value: "EVJ",
        label: "Eaton Vance New Jersey Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "EVK",
        label: "Ever-Glory International Group Inc."
    },
    {
        value: "EVLMC",
        label: "Eaton Vance NextShares Trust II"
    },
    {
        value: "EVLO",
        label: "Evelo Biosciences Inc."
    },
    {
        value: "EVLV",
        label: "EVINE Live Inc."
    },
    {
        value: "EVM",
        label: "Eaton Vance California Municipal Bond Fund of Beneficial Interest $.01 par value"
    },
    {
        value: "EVN",
        label: "Eaton Vance Municipal Income Trust"
    },
    {
        value: "EVO",
        label: "Eaton Vance Ohio Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "EVOK",
        label: "Evoke Pharma Inc."
    },
    {
        value: "EVOL",
        label: "Evolving Systems Inc."
    },
    {
        value: "EVOP",
        label: "EVO Payments Inc."
    },
    {
        value: "EVP",
        label: "Eaton Vance Pennsylvania Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "EVR",
        label: "Evercore Inc. Class A"
    },
    {
        value: "EVRG",
        label: "EVERGY INC"
    },
    {
        value: "EVRI",
        label: "Everi Holdings Inc."
    },
    {
        value: "EVSTC",
        label: "Eaton Vance NextShares Trust"
    },
    {
        value: "EVT",
        label: "Eaton Vance Tax Advantaged Dividend Income Fund of Beneficial Interest"
    },
    {
        value: "EVTC",
        label: "Evertec Inc."
    },
    {
        value: "EVV",
        label: "Eaton Vance Limited Duration Income Fund of Beneficial Interest"
    },
    {
        value: "EVX",
        label: "VanEck Vectors Environmental Services"
    },
    {
        value: "EVY",
        label: "Eaton Vance New York Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "EW",
        label: "Edwards Lifesciences Corporation"
    },
    {
        value: "EWA",
        label: "iShares MSCI Australia Index Fund"
    },
    {
        value: "EWBC",
        label: "East West Bancorp Inc."
    },
    {
        value: "EWC",
        label: "iShares MSCI Canada Index Fund"
    },
    {
        value: "EWD",
        label: "iShares Inc MSCI Sweden"
    },
    {
        value: "EWEM",
        label: "Invesco MSCI Emerging Markets Equal Country Weight"
    },
    {
        value: "EWG",
        label: "iShares MSCI Germany Index Fund"
    },
    {
        value: "EWGS",
        label: "Ishares MSCI Germany Small Cap"
    },
    {
        value: "EWH",
        label: "iShares MSCI Hong Kong Index Fund"
    },
    {
        value: "EWI",
        label: "iShares Inc MSCI Italy"
    },
    {
        value: "EWJ",
        label: "iShares MSCI Japan Index Fund"
    },
    {
        value: "EWK",
        label: "iShares Inc MSCI Belgium"
    },
    {
        value: "EWL",
        label: "iShares Inc MSCI Switzerland"
    },
    {
        value: "EWM",
        label: "iShares MSCI Malaysia Index Fund"
    },
    {
        value: "EWMC",
        label: "Invesco S&P MidCap 400 Equal Weight"
    },
    {
        value: "EWN",
        label: "iShares MSCI Netherlands Index Fund"
    },
    {
        value: "EWO",
        label: "iShares Inc MSCI Austria"
    },
    {
        value: "EWP",
        label: "iShares Inc MSCI Spain"
    },
    {
        value: "EWQ",
        label: "iShares MSCI France Index Fund"
    },
    {
        value: "EWRE",
        label: "Invesco S&P 500 Equal Weight Real Estate"
    },
    {
        value: "EWS",
        label: "iShares Inc MSCI Singapore"
    },
    {
        value: "EWSC",
        label: "Invesco S&P SmallCap 600 Equal Weight"
    },
    {
        value: "EWT",
        label: "iShares Inc MSCI Taiwan"
    },
    {
        value: "EWU",
        label: "iShares MSCI United Kingdom"
    },
    {
        value: "EWUS",
        label: "Ishares MSCI United Kingdom Small Cap"
    },
    {
        value: "EWV",
        label: "ProShares UltraShort MSCI Japan"
    },
    {
        value: "EWW",
        label: "iShares Inc MSCI Mexico"
    },
    {
        value: "EWX",
        label: "SPDR S&P Emerging Markets Small Cap"
    },
    {
        value: "EWY",
        label: "iShares Inc MSCI South Korea"
    },
    {
        value: "EWZ",
        label: "iShares Inc MSCI Brazil"
    },
    {
        value: "EWZS",
        label: "iShares MSCI Brazil Small-Cap ETF"
    },
    {
        value: "EXAS",
        label: "Exact Sciences Corporation"
    },
    {
        value: "EXC",
        label: "Exelon Corporation"
    },
    {
        value: "EXD",
        label: "Eaton Vance Tax-Advantaged Bond of Beneficial Interest"
    },
    {
        value: "EXEL",
        label: "Exelixis Inc."
    },
    {
        value: "EXFO",
        label: "EXFO Inc"
    },
    {
        value: "EXG",
        label: "Eaton Vance Tax-Managed Global Diversified Equity Income Fund of Beneficial Interest"
    },
    {
        value: "EXI",
        label: "iShares Global Industrials"
    },
    {
        value: "EXIV",
        label: "VelocityShares 1x Daily Inverse VSTOXX Futures ETN"
    },
    {
        value: "EXK",
        label: "Endeavour Silver Corporation (Canada)"
    },
    {
        value: "EXLS",
        label: "ExlService Holdings Inc."
    },
    {
        value: "EXP",
        label: "Eagle Materials Inc"
    },
    {
        value: "EXPD",
        label: "Expeditors International of Washington Inc."
    },
    {
        value: "EXPE",
        label: "Expedia Group Inc."
    },
    {
        value: "EXPI",
        label: "eXp World Holdings Inc."
    },
    {
        value: "EXPO",
        label: "Exponent Inc."
    },
    {
        value: "EXPR",
        label: "Express Inc."
    },
    {
        value: "EXR",
        label: "Extra Space Storage Inc"
    },
    {
        value: "EXT",
        label: "WisdomTree U.S. Total Earnings Fund"
    },
    {
        value: "EXTN",
        label: "Exterran Corporation"
    },
    {
        value: "EXTR",
        label: "Extreme Networks Inc."
    },
    {
        value: "EYE",
        label: "National Vision Holdings Inc."
    },
    {
        value: "EYEG",
        label: "Eyegate Pharmaceuticals Inc."
    },
    {
        value: "EYEGW",
        label: ""
    },
    {
        value: "EYEN",
        label: "Eyenovia Inc."
    },
    {
        value: "EYES",
        label: "Second Sight Medical Products Inc."
    },
    {
        value: "EYESW",
        label: "Second Sight Medical Products Inc. Warrants"
    },
    {
        value: "EYLD",
        label: "Cambria ETF Trust Emerging Shareholder Yield"
    },
    {
        value: "EYPT",
        label: "EyePoint Pharmaceuticals Inc."
    },
    {
        value: "EZA",
        label: "iShares MSCI South Africa Index Fund"
    },
    {
        value: "EZJ",
        label: "ProShares Ultra MSCI Japan"
    },
    {
        value: "EZM",
        label: "WisdomTree U.S. MidCap Earnings Fund"
    },
    {
        value: "EZPW",
        label: "EZCORP Inc."
    },
    {
        value: "EZT",
        label: "Entergy Texas Inc First Mortgage Bonds 5.625% Series due June 1 2064"
    },
    {
        value: "EZU",
        label: "iShares MSCI Eurozone"
    },
    {
        value: "F",
        label: "Ford Motor Company"
    },
    {
        value: "FAAR",
        label: "First Trust Alternative Absolute Return Strategy ETF"
    },
    {
        value: "FAB",
        label: "First Trust Multi Cap Value AlphaDEX Fund"
    },
    {
        value: "FAD",
        label: "First Trust Multi Cap Growth AlphaDEX Fund"
    },
    {
        value: "FAF",
        label: "First American Corporation (New)"
    },
    {
        value: "FALN",
        label: "iShares Fallen Angels USD Bond ETF"
    },
    {
        value: "FAM",
        label: "First Trust/Aberdeen Global Opportunity Income Fund of Beneficial Interest"
    },
    {
        value: "FAMI",
        label: "Farmmi INC."
    },
    {
        value: "FAN",
        label: "First Trust Global Wind Energy"
    },
    {
        value: "FANG",
        label: "Diamondback Energy Inc."
    },
    {
        value: "FANH",
        label: "Fanhua Inc."
    },
    {
        value: "FANZ",
        label: "ProSports Sponsors"
    },
    {
        value: "FARM",
        label: "Farmer Brothers Company"
    },
    {
        value: "FARO",
        label: "FARO Technologies Inc."
    },
    {
        value: "FAS",
        label: "Direxion Financial Bull 3X Shares"
    },
    {
        value: "FAST",
        label: "Fastenal Company"
    },
    {
        value: "FAT",
        label: "FAT Brands Inc."
    },
    {
        value: "FATE",
        label: "Fate Therapeutics Inc."
    },
    {
        value: "FAUS",
        label: "First Trust Australia AlphaDex fund"
    },
    {
        value: "FAX",
        label: "Aberdeen Asia-Pacific Income Fund Inc"
    },
    {
        value: "FAZ",
        label: "Direxion Financial Bear 3X Shares"
    },
    {
        value: "FB",
        label: "Facebook Inc."
    },
    {
        value: "FBC",
        label: "Flagstar Bancorp Inc."
    },
    {
        value: "FBGX",
        label: "UBS AG FI Enhanced Large Cap Growth ETN"
    },
    {
        value: "FBHS",
        label: "Fortune Brands Home & Security Inc."
    },
    {
        value: "FBIO",
        label: "Fortress Biotech Inc."
    },
    {
        value: "FBIOP",
        label: "Fortress Biotech Inc. 9.375% Series A Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "FBIZ",
        label: "First Business Financial Services Inc."
    },
    {
        value: "FBK",
        label: "FB Financial Corporation"
    },
    {
        value: "FBM",
        label: "Foundation Building Materials Inc."
    },
    {
        value: "FBMS",
        label: "The First Bancshares Inc."
    },
    {
        value: "FBNC",
        label: "First Bancorp"
    },
    {
        value: "FBND",
        label: "Fidelity Total Bond"
    },
    {
        value: "FBNK",
        label: "First Connecticut Bancorp Inc."
    },
    {
        value: "FBP",
        label: "First BanCorp."
    },
    {
        value: "FBR",
        label: "Fibria Celulose S.A."
    },
    {
        value: "FBSS",
        label: "Fauquier Bankshares Inc."
    },
    {
        value: "FBT",
        label: "First Trust Amex Biotech Index Fund"
    },
    {
        value: "FBZ",
        label: "First Trust Brazil AlphaDEX Fund"
    },
    {
        value: "FC",
        label: "Franklin Covey Company"
    },
    {
        value: "FCA",
        label: "First Trust China AlphaDEX Fund"
    },
    {
        value: "FCAL",
        label: "First Trust California Municipal High income ETF"
    },
    {
        value: "FCAN",
        label: "First Trust Canada AlphaDEX Fund"
    },
    {
        value: "FCAP",
        label: "First Capital Inc."
    },
    {
        value: "FCAU",
        label: "Fiat Chrysler Automobiles N.V."
    },
    {
        value: "FCB",
        label: "FCB Financial Holdings Inc. Class A"
    },
    {
        value: "FCBC",
        label: "First Community Bancshares Inc."
    },
    {
        value: "FCBP",
        label: "First Choice Bancorp"
    },
    {
        value: "FCCO",
        label: "First Community Corporation"
    },
    {
        value: "FCCY",
        label: "1st Constitution Bancorp (NJ)"
    },
    {
        value: "FCE.A",
        label: "Forest City Realty Trust Inc."
    },
    {
        value: "FCEF",
        label: "First Trust CEF Income Opportunity ETF"
    },
    {
        value: "FCEL",
        label: "FuelCell Energy Inc."
    },
    {
        value: "FCF",
        label: "First Commonwealth Financial Corporation"
    },
    {
        value: "FCFS",
        label: "First Cash Inc."
    },
    {
        value: "FCG",
        label: "First Trust Natural Gas"
    },
    {
        value: "FCN",
        label: "FTI Consulting Inc."
    },
    {
        value: "FCNCA",
        label: "First Citizens BancShares Inc. Class A Common Stock"
    },
    {
        value: "FCO",
        label: "Aberdeen Global Income Fund Inc."
    },
    {
        value: "FCOM",
        label: "Fidelity MSCI Telecommunication Services Index"
    },
    {
        value: "FCOR",
        label: "Fidelity Corporate Bond"
    },
    {
        value: "FCPT",
        label: "Four Corners Property Trust Inc."
    },
    {
        value: "FCRE",
        label: "FC Global Realty Incorporated"
    },
    {
        value: "FCSC",
        label: "Fibrocell Science Inc."
    },
    {
        value: "FCT",
        label: "First Trust Senior Floating Rate Income Fund II of Beneficial Interest"
    },
    {
        value: "FCVT",
        label: "First Trust SSI Strategic Convertible Securities ETF"
    },
    {
        value: "FCX",
        label: "Freeport-McMoRan Inc."
    },
    {
        value: "FDBC",
        label: "Fidelity D & D Bancorp Inc."
    },
    {
        value: "FDC",
        label: "First Data Corporation Class A"
    },
    {
        value: "FDD",
        label: "First Trust Dow Jones STOXX Select Dividend 30 Index Fund"
    },
    {
        value: "FDEF",
        label: "First Defiance Financial Corp."
    },
    {
        value: "FDEU",
        label: "First Trust Dynamic Europe Equity Income Fund of Beneficial Interest"
    },
    {
        value: "FDIS",
        label: "Fidelity MSCI Consumer Discretionary Index"
    },
    {
        value: "FDIV",
        label: "First Trust Strategic Income ETF"
    },
    {
        value: "FDL",
        label: "First Trust Morningstar"
    },
    {
        value: "FDLO",
        label: "Fidelity Low Volatility Factor"
    },
    {
        value: "FDM",
        label: "First Trust DJ Select MicroCap"
    },
    {
        value: "FDMO",
        label: "Fidelity Momentum Factor"
    },
    {
        value: "FDN",
        label: "First Trust DJ Internet Index Fund"
    },
    {
        value: "FDP",
        label: "Fresh Del Monte Produce Inc."
    },
    {
        value: "FDRR",
        label: "Fidelity Dividend ETF for Rising Rates"
    },
    {
        value: "FDS",
        label: "FactSet Research Systems Inc."
    },
    {
        value: "FDT",
        label: "First Trust Developed Markets Ex-US AlphaDEX Fund"
    },
    {
        value: "FDTS",
        label: "First Trust Developed Markets ex-US Small Cap AlphaDEX Fund"
    },
    {
        value: "FDUS",
        label: "Fidus Investment Corporation"
    },
    {
        value: "FDUSL",
        label: "Fidus Investment Corporation 5.875% Notes due 2023"
    },
    {
        value: "FDVV",
        label: "Fidelity High Dividend"
    },
    {
        value: "FDX",
        label: "FedEx Corporation"
    },
    {
        value: "FE",
        label: "FirstEnergy Corporation"
    },
    {
        value: "FEDU",
        label: "Four Seasons Education (Cayman) Inc. American Depositary Shares each two ADSs representing one"
    },
    {
        value: "FEI",
        label: "First Trust MLP and Energy Income Fund of Beneficial Interest"
    },
    {
        value: "FEIM",
        label: "Frequency Electronics Inc."
    },
    {
        value: "FELE",
        label: "Franklin Electric Co. Inc."
    },
    {
        value: "FELP",
        label: "Foresight Energy LP representing Limited Partner Interests"
    },
    {
        value: "FEM",
        label: "First Trust Emerging Markets AlphaDEX Fund"
    },
    {
        value: "FEMB",
        label: "First Trust Emerging Markets Local Currency Bond ETF"
    },
    {
        value: "FEMS",
        label: "First Trust Emerging Markets Small Cap AlphaDEX Fund"
    },
    {
        value: "FEN",
        label: "First Trust Energy Income and Growth Fund"
    },
    {
        value: "FENC",
        label: "Fennec Pharmaceuticals Inc."
    },
    {
        value: "FENG",
        label: "Phoenix New Media Limited American Depositary Shares each representing 8 Class A."
    },
    {
        value: "FENY",
        label: "Fidelity MSCI Energy Index"
    },
    {
        value: "FEO",
        label: "First Trust/Aberdeen Emerging Opportunity Fund of Beneficial Interest"
    },
    {
        value: "FEP",
        label: "First Trust Europe AlphaDEX Fund"
    },
    {
        value: "FET",
        label: "Forum Energy Technologies Inc."
    },
    {
        value: "FEU",
        label: "SPDR DJ STOXX 50 Etf"
    },
    {
        value: "FEUL",
        label: "Credit Suisse FI Enhanced Europe 50 ETNs"
    },
    {
        value: "FEUZ",
        label: "First Trust Eurozone AlphaDEX ETF"
    },
    {
        value: "FEX",
        label: "First Trust Large Cap Core AlphaDEX Fund"
    },
    {
        value: "FEYE",
        label: "FireEye Inc."
    },
    {
        value: "FEZ",
        label: "SPDR DJ Euro STOXX 50 Etf"
    },
    {
        value: "FF",
        label: "FutureFuel Corp."
    },
    {
        value: "FFA",
        label: "First Trust Enhanced Equity Income Fund"
    },
    {
        value: "FFBC",
        label: "First Financial Bancorp."
    },
    {
        value: "FFBCW",
        label: "First Financial Bancorp. Warrant 12/23/2018"
    },
    {
        value: "FFBW",
        label: "FFBW Inc."
    },
    {
        value: "FFC",
        label: "Flaherty & Crumrine Preferred Securities Income Fund Incorporated"
    },
    {
        value: "FFEU",
        label: "Barclays ETN FI Enhanced Europe 50 Exchange Traded Notes Series C"
    },
    {
        value: "FFG",
        label: "FBL Financial Group Inc."
    },
    {
        value: "FFHG",
        label: "Formula Folios Hedged Growth"
    },
    {
        value: "FFHL",
        label: "Fuwei Films (Holdings) Co. Ltd."
    },
    {
        value: "FFIC",
        label: "Flushing Financial Corporation"
    },
    {
        value: "FFIN",
        label: "First Financial Bankshares Inc."
    },
    {
        value: "FFIU",
        label: "Fieldstone UVA Unconstrained Medium-Term Fixed Income"
    },
    {
        value: "FFIV",
        label: "F5 Networks Inc."
    },
    {
        value: "FFKT",
        label: "Farmers Capital Bank Corporation"
    },
    {
        value: "FFNW",
        label: "First Financial Northwest Inc."
    },
    {
        value: "FFR",
        label: "First Trust FTSE EPRA/NAREIT Global Real Estate Index Fund"
    },
    {
        value: "FFSG",
        label: "FormulaFolios Smart Growth"
    },
    {
        value: "FFTG",
        label: "FormulaFolios Tactical Growth"
    },
    {
        value: "FFTI",
        label: "FormulaFolios Tactical Income"
    },
    {
        value: "FFTY",
        label: "Innovator IBD 50"
    },
    {
        value: "FFWM",
        label: "First Foundation Inc."
    },
    {
        value: "FG",
        label: "FGL Holdings"
    },
    {
        value: "FG+",
        label: ""
    },
    {
        value: "FGB",
        label: "First Trust Specialty Finance and Financial Opportunities Fund"
    },
    {
        value: "FGBI",
        label: "First Guaranty Bancshares Inc."
    },
    {
        value: "FGD",
        label: "First Trust DJ Global Select Dividend"
    },
    {
        value: "FGEN",
        label: "FibroGen Inc"
    },
    {
        value: "FGM",
        label: "First Trust Germany AlphaDEX Fund"
    },
    {
        value: "FGP",
        label: "Ferrellgas Partners L.P."
    },
    {
        value: "FHB",
        label: "First Hawaiian Inc."
    },
    {
        value: "FHK",
        label: "First Trust Hong Kong AlphaDEX Fund"
    },
    {
        value: "FHLC",
        label: "Fidelity MSCI Health Care Index"
    },
    {
        value: "FHN",
        label: "First Horizon National Corporation"
    },
    {
        value: "FHN-A",
        label: "First Horizon National Corporation Depositary Shares"
    },
    {
        value: "FHY",
        label: "First Trust Strategic High Income Fund II of Beneficial Interest"
    },
    {
        value: "FI",
        label: "Frank's International N.V."
    },
    {
        value: "FIBK",
        label: "First Interstate BancSystem Inc."
    },
    {
        value: "FIBR",
        label: "iShares Edge U.S. Fixed Income Balanced Risk"
    },
    {
        value: "FICO",
        label: "Fair Isaac Corproation"
    },
    {
        value: "FIDI",
        label: "Fidelity International High Dividend"
    },
    {
        value: "FIDU",
        label: "Fidelity MSCI Industrials Index"
    },
    {
        value: "FIEE",
        label: "UBS AG FI Enhanced Europe 50 ETN due February 12 2026"
    },
    {
        value: "FIEG",
        label: "FI Enhanced Gloabl High Yield ETN"
    },
    {
        value: "FIEU",
        label: "FI Enhanced Europe 50 ETN"
    },
    {
        value: "FIF",
        label: "First Trust Energy Infrastructure Fund of Beneficial Interest"
    },
    {
        value: "FIHD",
        label: "UBS AG FI Enhanced Global High Yield ETN due March 3 2026"
    },
    {
        value: "FII",
        label: "Federated Investors Inc."
    },
    {
        value: "FILL",
        label: "iShares MSCI Global Energy Producers Fund"
    },
    {
        value: "FINL",
        label: "The Finish Line Inc."
    },
    {
        value: "FINU",
        label: "ProShares UltraPro Financial Select Sector"
    },
    {
        value: "FINX",
        label: "Global X FinTech ETF"
    },
    {
        value: "FINZ",
        label: "ProShares UltraPro Short Financial Select Sector"
    },
    {
        value: "FIS",
        label: "Fidelity National Information Services Inc."
    },
    {
        value: "FISI",
        label: "Financial Institutions Inc."
    },
    {
        value: "FISK",
        label: "Empire State Realty OP L.P. Series 250 Operating Partnership Units Representing Limited Partnership Interests"
    },
    {
        value: "FISV",
        label: "Fiserv Inc."
    },
    {
        value: "FIT",
        label: "Fitbit Inc. Class A"
    },
    {
        value: "FITB",
        label: "Fifth Third Bancorp"
    },
    {
        value: "FITBI",
        label: "Fifth Third Bancorp Depositary Share repstg 1/1000th Ownership Interest Perp Pfd Series I"
    },
    {
        value: "FIV",
        label: "First Trust Senior Floating Rate 2022 Target Term Fund of Beneficial Interest"
    },
    {
        value: "FIVA",
        label: "Fidelity International Value Factor"
    },
    {
        value: "FIVE",
        label: "Five Below Inc."
    },
    {
        value: "FIVN",
        label: "Five9 Inc."
    },
    {
        value: "FIW",
        label: "First Trust Water"
    },
    {
        value: "FIX",
        label: "Comfort Systems USA Inc."
    },
    {
        value: "FIXD",
        label: "First Trust TCW Opportunistic Fixed Income ETF"
    },
    {
        value: "FIXX",
        label: "Homology Medicines Inc."
    },
    {
        value: "FIYY",
        label: "Barclays ETN FI Enhanced Global High Yield Exchange Traded Notes Series B"
    },
    {
        value: "FIZZ",
        label: "National Beverage Corp."
    },
    {
        value: "FJP",
        label: "First Trust Japan AlphaDEX Fund"
    },
    {
        value: "FKO",
        label: "First Trust South Korea AlphaDEX Fund"
    },
    {
        value: "FKU",
        label: "First Trust United Kingdom AlphaDEX Fund"
    },
    {
        value: "FL",
        label: "Foot Locker Inc."
    },
    {
        value: "FLAG",
        label: "Exchange Traded Concepts Trust FLAG-Forensic Accounting Long-Short"
    },
    {
        value: "FLAT",
        label: "iPath US Treasury Flattener ETN"
    },
    {
        value: "FLAU",
        label: "Franklin FTSE Australia"
    },
    {
        value: "FLAX",
        label: "Franklin FTSE Asia ex Japan"
    },
    {
        value: "FLBL",
        label: "FRANKLIN LIBERTY SENIOR LOAN"
    },
    {
        value: "FLBR",
        label: "Franklin FTSE Brazil"
    },
    {
        value: "FLC",
        label: "Flaherty & Crumrine Total Return Fund Inc"
    },
    {
        value: "FLCA",
        label: "Franklin FTSE Canada"
    },
    {
        value: "FLCH",
        label: "Franklin FTSE China"
    },
    {
        value: "FLCO",
        label: "Franklin Liberty Investment Grade Corporate"
    },
    {
        value: "FLDM",
        label: "Fluidigm Corporation"
    },
    {
        value: "FLEE",
        label: "Franklin FTSE Europe"
    },
    {
        value: "FLEH",
        label: "Franklin FTSE Europe Hedged"
    },
    {
        value: "FLEU",
        label: "Barclays ETN FI Enhanced Europe 50 ETN Series B"
    },
    {
        value: "FLEX",
        label: "Flex Ltd."
    },
    {
        value: "FLFR",
        label: "Franklin FTSE France"
    },
    {
        value: "FLGB",
        label: "Franklin FTSE United Kingdom"
    },
    {
        value: "FLGE",
        label: "Credit Suisse FI Large Cap Growth Enhanced ETN"
    },
    {
        value: "FLGR",
        label: "Franklin FTSE Germany"
    },
    {
        value: "FLGT",
        label: "Fulgent Genetics Inc."
    },
    {
        value: "FLHK",
        label: "Franklin FTSE Hong Kong"
    },
    {
        value: "FLHY",
        label: "FRANKLIN LIBERTY HIGH YIELD"
    },
    {
        value: "FLIA",
        label: "FRANKLIN LIBERTY INTL AGG BO"
    },
    {
        value: "FLIC",
        label: "The First of Long Island Corporation"
    },
    {
        value: "FLIN",
        label: "Franklin FTSE India"
    },
    {
        value: "FLIO",
        label: "Franklin Liberty International Opportunities"
    },
    {
        value: "FLIR",
        label: "FLIR Systems Inc."
    },
    {
        value: "FLIY",
        label: "Franklin FTSE Italy"
    },
    {
        value: "FLJH",
        label: "Franklin FTSE Japan Hedged"
    },
    {
        value: "FLJP",
        label: "Franklin FTSE Japan"
    },
    {
        value: "FLKR",
        label: "Franklin FTSE South Korea"
    },
    {
        value: "FLKS",
        label: "Flex Pharma Inc."
    },
    {
        value: "FLL",
        label: "Full House Resorts Inc."
    },
    {
        value: "FLLV",
        label: "Franklin Liberty U.S. Low Volatility"
    },
    {
        value: "FLM",
        label: "First Trust Global Engineering and Construction"
    },
    {
        value: "FLMB",
        label: "Franklin Templeton ETF Trust Liberty Municipal Bond"
    },
    {
        value: "FLMI",
        label: "Franklin Templeton ETF Trust Liberty Intermediate Municipal Opportunities"
    },
    {
        value: "FLMX",
        label: "Franklin FTSE Mexico"
    },
    {
        value: "FLN",
        label: "First Trust Latin America AlphaDEX Fund"
    },
    {
        value: "FLNT",
        label: "Fluent Inc."
    },
    {
        value: "FLO",
        label: "Flowers Foods Inc."
    },
    {
        value: "FLOT",
        label: "iShares Floating Rate Bond"
    },
    {
        value: "FLOW",
        label: "SPX FLOW Inc."
    },
    {
        value: "FLQD",
        label: "Franklin LibertyQ Global Dividend"
    },
    {
        value: "FLQE",
        label: "Franklin LibertyQ Emerging Markets"
    },
    {
        value: "FLQG",
        label: "Franklin LibertyQ Global Equity"
    },
    {
        value: "FLQH",
        label: "Franklin LibertyQ International Equity Hedged"
    },
    {
        value: "FLQL",
        label: "Franklin LibertyQ U.S. Equity"
    },
    {
        value: "FLQM",
        label: "Franklin LibertyQ U.S. Mid Cap Equity"
    },
    {
        value: "FLQS",
        label: "Franklin LibertyQ U.S. Small Cap Equity"
    },
    {
        value: "FLR",
        label: "Fluor Corporation"
    },
    {
        value: "FLRN",
        label: "SPDR Bloomberg Barclays Investment Grade Floating Rate"
    },
    {
        value: "FLRT",
        label: "AdvisorShares Pacific Asset Enhanced Floating Rate"
    },
    {
        value: "FLRU",
        label: "Franklin FTSE Russia"
    },
    {
        value: "FLS",
        label: "Flowserve Corporation"
    },
    {
        value: "FLSW",
        label: "Franklin FTSE Switzerland"
    },
    {
        value: "FLT",
        label: "FleetCor Technologies Inc."
    },
    {
        value: "FLTB",
        label: "Fidelity Limited Term Bond"
    },
    {
        value: "FLTR",
        label: "VanEck Vectors Investment Grade Floating Rate"
    },
    {
        value: "FLTW",
        label: "Franklin FTSE Taiwan"
    },
    {
        value: "FLWS",
        label: "1-800 FLOWERS.COM Inc."
    },
    {
        value: "FLXN",
        label: "Flexion Therapeutics Inc."
    },
    {
        value: "FLXS",
        label: "Flexsteel Industries Inc."
    },
    {
        value: "FLY",
        label: "Fly Leasing Limited"
    },
    {
        value: "FM",
        label: "iShares MSCI Frontier 100 Fund"
    },
    {
        value: "FMAO",
        label: "Farmers & Merchants Bancorp Inc."
    },
    {
        value: "FMAT",
        label: "Fidelity MSCI Materials Index"
    },
    {
        value: "FMB",
        label: "First Trust Managed Municipal ETF"
    },
    {
        value: "FMBH",
        label: "First Mid-Illinois Bancshares Inc."
    },
    {
        value: "FMBI",
        label: "First Midwest Bancorp Inc."
    },
    {
        value: "FMC",
        label: "FMC Corporation"
    },
    {
        value: "FMDG",
        label: "Fieldstone Merlin Dynamic Large Cap Growth"
    },
    {
        value: "FMF",
        label: "First Trust Morningstar Managed Futures Strategy Fund"
    },
    {
        value: "FMHI",
        label: "First Trust Municipal High Income ETF"
    },
    {
        value: "FMI",
        label: "Foundation Medicine Inc."
    },
    {
        value: "FMK",
        label: "First Trust Mega Cap AlphaDEX Fund"
    },
    {
        value: "FMN",
        label: "Federated Premier Municipal Income Fund"
    },
    {
        value: "FMNB",
        label: "Farmers National Banc Corp."
    },
    {
        value: "FMO",
        label: "Fiduciary/Claymore MLP Opportunity Fund of Beneficial Interest"
    },
    {
        value: "FMS",
        label: "Fresenius Medical Care AG"
    },
    {
        value: "FMX",
        label: "Fomento Economico Mexicano S.A.B. de C.V."
    },
    {
        value: "FMY",
        label: "First Trust Motgage Income Fund of Beneficial Interest"
    },
    {
        value: "FN",
        label: "Fabrinet"
    },
    {
        value: "FNB",
        label: "F.N.B. Corporation"
    },
    {
        value: "FNB-E",
        label: "F.N.B. Corporation Depositary Shares Series E"
    },
    {
        value: "FNBG",
        label: "FNB Bancorp"
    },
    {
        value: "FNCB",
        label: "FNCB Bancorp Inc."
    },
    {
        value: "FNCF",
        label: "iShares Edge MSCI Multifactor Financials"
    },
    {
        value: "FNCL",
        label: "Fidelity MSCI Financials Index"
    },
    {
        value: "FND",
        label: "Floor & Decor Holdings Inc."
    },
    {
        value: "FNDA",
        label: "Schwab Fundamental U.S. Small Company Index"
    },
    {
        value: "FNDB",
        label: "Schwab Fundamental U.S. Broad Market Index"
    },
    {
        value: "FNDC",
        label: "Schwab Fundamental International Small Company Index"
    },
    {
        value: "FNDE",
        label: "Schwab Fundamental Emerging Markets Large Company Index"
    },
    {
        value: "FNDF",
        label: "Schwab Fundamental International Large Company Index"
    },
    {
        value: "FNDX",
        label: "Schwab Fundamental U.S. Large Company Index"
    },
    {
        value: "FNF",
        label: "FNF Group of Fidelity National Financial Inc."
    },
    {
        value: "FNG",
        label: "AdvisorShares New Tech and Media"
    },
    {
        value: "FNGD",
        label: "BMO REX MicroSectors FANG Index -3X Inverse Leveraged Exchange Traded Notes"
    },
    {
        value: "FNGN",
        label: "Financial Engines Inc."
    },
    {
        value: "FNGU",
        label: "BMO REX MICROSECTORS FANG IN"
    },
    {
        value: "FNHC",
        label: "Federated National Holding Company"
    },
    {
        value: "FNI",
        label: "First Trust Chindia"
    },
    {
        value: "FNJN",
        label: "Finjan Holdings Inc."
    },
    {
        value: "FNK",
        label: "First Trust Mid Cap Value AlphaDEX Fund"
    },
    {
        value: "FNKO",
        label: "Funko Inc."
    },
    {
        value: "FNLC",
        label: "First Bancorp Inc (ME)"
    },
    {
        value: "FNSR",
        label: "Finisar Corporation"
    },
    {
        value: "FNTE",
        label: "FinTech Acquisition Corp. II"
    },
    {
        value: "FNTEU",
        label: "FinTech Acquisition Corp. II Unit"
    },
    {
        value: "FNTEW",
        label: "FinTech Acquisition Corp. II Warrant"
    },
    {
        value: "FNV",
        label: "Franco-Nevada Corporation"
    },
    {
        value: "FNWB",
        label: "First Northwest Bancorp"
    },
    {
        value: "FNX",
        label: "First Trust Mid Cap Core AlphaDEX Fund"
    },
    {
        value: "FNY",
        label: "First Trust Mid Cap Growth AlphaDEX Fund"
    },
    {
        value: "FOANC",
        label: "Gabelli NextShares Trust"
    },
    {
        value: "FOE",
        label: "Ferro Corporation"
    },
    {
        value: "FOF",
        label: "Cohen & Steers Closed-End Opportunity Fund Inc."
    },
    {
        value: "FOLD",
        label: "Amicus Therapeutics Inc."
    },
    {
        value: "FOMX",
        label: "Foamix Pharmaceuticals Ltd."
    },
    {
        value: "FONE",
        label: "First Trust NASDAQ Smartphone Index Fund"
    },
    {
        value: "FONR",
        label: "Fonar Corporation"
    },
    {
        value: "FOR",
        label: "Forestar Group Inc"
    },
    {
        value: "FORD",
        label: "Forward Industries Inc."
    },
    {
        value: "FORK",
        label: "Fuling Global Inc."
    },
    {
        value: "FORM",
        label: "FormFactor Inc."
    },
    {
        value: "FORR",
        label: "Forrester Research Inc."
    },
    {
        value: "FORTY",
        label: "Formula Systems (1985) Ltd. ADS represents 1 ordinary shares"
    },
    {
        value: "FOSL",
        label: "Fossil Group Inc."
    },
    {
        value: "FOX",
        label: "Twenty-First Century Fox Inc."
    },
    {
        value: "FOXA",
        label: "Twenty-First Century Fox Inc."
    },
    {
        value: "FOXF",
        label: "Fox Factory Holding Corp."
    },
    {
        value: "FPA",
        label: "First Trust Asia Pacific Ex-Japan AlphaDEX Fund"
    },
    {
        value: "FPAY",
        label: "FlexShopper Inc."
    },
    {
        value: "FPE",
        label: "First Trust Preferred Securities and Income ETF"
    },
    {
        value: "FPEI",
        label: "First Trust Institutional Preferred Securities and Income"
    },
    {
        value: "FPF",
        label: "First Trust Intermediate Duration Preferred & Income Fund of Beneficial Interest"
    },
    {
        value: "FPH",
        label: "Five Point Holdings LLC Class A"
    },
    {
        value: "FPI",
        label: "Farmland Partners Inc."
    },
    {
        value: "FPI-B",
        label: "Farmland Partners Inc. Series B Participating Preferred Stock"
    },
    {
        value: "FPL",
        label: "First Trust New Opportunities MLP & Energy Fund of Beneficial Interest"
    },
    {
        value: "FPRX",
        label: "Five Prime Therapeutics Inc."
    },
    {
        value: "FPX",
        label: "First Trust US Equity Opportunities"
    },
    {
        value: "FPXI",
        label: "First Trust International IPO ETF"
    },
    {
        value: "FQAL",
        label: "Fidelity Quality Factor"
    },
    {
        value: "FR",
        label: "First Industrial Realty Trust Inc."
    },
    {
        value: "FRA",
        label: "Blackrock Floating Rate Income Strategies Fund Inc"
    },
    {
        value: "FRAC",
        label: "Keane Group Inc."
    },
    {
        value: "FRAK",
        label: "VanEck Vectors Unconventional Oil & Gas"
    },
    {
        value: "FRAN",
        label: "Francesca's Holdings Corporation"
    },
    {
        value: "FRBA",
        label: "First Bank"
    },
    {
        value: "FRBK",
        label: "Republic First Bancorp Inc."
    },
    {
        value: "FRC",
        label: "FIRST REPUBLIC BANK"
    },
    {
        value: "FRC-D",
        label: "First Republic Bank San Francisco California Depositary Shares Series D"
    },
    {
        value: "FRC-E",
        label: "FIRST REPUBLIC BANK Depositary Shs Repstg 1/40th Perp Pfd Ser E Fixed To Fltg (RATE)"
    },
    {
        value: "FRC-F",
        label: "FIRST REPUBLIC BANK Depositary Shares Series F"
    },
    {
        value: "FRC-G",
        label: "FIRST REPUBLIC BANK Depositary Shares Series G"
    },
    {
        value: "FRC-H",
        label: "FIRST REPUBLIC BANK Depositary Shares Series H"
    },
    {
        value: "FRD",
        label: "Friedman Industries Inc."
    },
    {
        value: "FRED",
        label: "Fred's Inc."
    },
    {
        value: "FREL",
        label: "Fidelity MSCI Real Estate Index"
    },
    {
        value: "FRGI",
        label: "Fiesta Restaurant Group Inc."
    },
    {
        value: "FRI",
        label: "First Trust S&P REIT Index Fund"
    },
    {
        value: "FRLG",
        label: "Large Cap Growth Index-Linked Exchange Traded Notes due 2028"
    },
    {
        value: "FRME",
        label: "First Merchants Corporation"
    },
    {
        value: "FRN",
        label: "Invesco Frontier Markets"
    },
    {
        value: "FRO",
        label: "Frontline Ltd."
    },
    {
        value: "FRPH",
        label: "FRP Holdings Inc."
    },
    {
        value: "FRPT",
        label: "Freshpet Inc."
    },
    {
        value: "FRSH",
        label: "Papa Murphy's Holdings Inc."
    },
    {
        value: "FRSX",
        label: "Foresight Autonomous Holdings Ltd."
    },
    {
        value: "FRT",
        label: "Federal Realty Investment Trust"
    },
    {
        value: "FRT-C",
        label: "Federal Realty Investment Trust Depositary Shares Series C"
    },
    {
        value: "FRTA",
        label: "Forterra Inc."
    },
    {
        value: "FSAC",
        label: "Federal Street Acquisition Corp."
    },
    {
        value: "FSACU",
        label: "Federal Street Acquisition Corp. Unit consisting of One Common Stock and Half of a Warrant"
    },
    {
        value: "FSACW",
        label: "Federal Street Acquisition Corp. Warrant"
    },
    {
        value: "FSB",
        label: "Franklin Financial Network Inc."
    },
    {
        value: "FSBC",
        label: "FSB Bancorp Inc."
    },
    {
        value: "FSBW",
        label: "FS Bancorp Inc."
    },
    {
        value: "FSCT",
        label: "ForeScout Technologies Inc."
    },
    {
        value: "FSD",
        label: "First Trust High Income Long Short Fund of Beneficial Interest"
    },
    {
        value: "FSFG",
        label: "First Savings Financial Group Inc."
    },
    {
        value: "FSI",
        label: "Flexible Solutions International Inc."
    },
    {
        value: "FSIC",
        label: "FS Investment Corporation"
    },
    {
        value: "FSLR",
        label: "First Solar Inc."
    },
    {
        value: "FSM",
        label: "Fortuna Silver Mines Inc (Canada)"
    },
    {
        value: "FSNN",
        label: "Fusion Connect Inc."
    },
    {
        value: "FSP",
        label: "Franklin Street Properties Corp."
    },
    {
        value: "FSS",
        label: "Federal Signal Corporation"
    },
    {
        value: "FSTA",
        label: "Fidelity MSCI COnsumer Staples Index"
    },
    {
        value: "FSTR",
        label: "L.B. Foster Company"
    },
    {
        value: "FSV",
        label: "FirstService Corporation"
    },
    {
        value: "FSZ",
        label: "First Trust Switzerland AlphaDEX Fund"
    },
    {
        value: "FT",
        label: "Franklin Universal Trust"
    },
    {
        value: "FTA",
        label: "First Trust Large Cap Value AlphaDEX Fund"
    },
    {
        value: "FTAG",
        label: "First Trust Indxx Global Agriculture ETF"
    },
    {
        value: "FTAI",
        label: "Fortress Transportation and Infrastructure Investors LLC"
    },
    {
        value: "FTC",
        label: "First Trust Large Cap Growth AlphaDEX Fund"
    },
    {
        value: "FTCS",
        label: "First Trust Capital Strength ETF"
    },
    {
        value: "FTD",
        label: "FTD Companies Inc."
    },
    {
        value: "FTEC",
        label: "Fidelity MSCI Information Technology Index"
    },
    {
        value: "FTEK",
        label: "Fuel Tech Inc."
    },
    {
        value: "FTEO",
        label: "FRONTEO Inc."
    },
    {
        value: "FTF",
        label: "Franklin Limited Duration Income Trust of Beneficial Interest"
    },
    {
        value: "FTFT",
        label: "Future FinTech Group Inc."
    },
    {
        value: "FTGC",
        label: "First Trust Global Tactical Commodity Strategy Fund"
    },
    {
        value: "FTHI",
        label: "First Trust BuyWrite Income ETF"
    },
    {
        value: "FTI",
        label: "TechnipFMC plc"
    },
    {
        value: "FTK",
        label: "Flotek Industries Inc."
    },
    {
        value: "FTLB",
        label: "First Trust Hedged BuyWrite Income ETF"
    },
    {
        value: "FTLS",
        label: "First Trust Long/Short Equity"
    },
    {
        value: "FTNT",
        label: "Fortinet Inc."
    },
    {
        value: "FTNW",
        label: "FTE Networks Inc."
    },
    {
        value: "FTR",
        label: "Frontier Communications Corporation"
    },
    {
        value: "FTRI",
        label: "First Trust Indxx Global Natural Resources Income ETF"
    },
    {
        value: "FTRPR",
        label: "Frontier Communications Corporation 11.125% Series A Mandatory Convertible Preferred Stock"
    },
    {
        value: "FTS",
        label: "Fortis Inc."
    },
    {
        value: "FTSD",
        label: "Franklin Liberty Short Duration U.S. Government"
    },
    {
        value: "FTSI",
        label: "FTS International Inc."
    },
    {
        value: "FTSL",
        label: "First Trust Senior Loan Fund ETF"
    },
    {
        value: "FTSM",
        label: "First Trust Enhanced Short Maturity ETF"
    },
    {
        value: "FTV",
        label: "Fortive Corporation"
    },
    {
        value: "FTVA",
        label: "Aptus Fortified Value"
    },
    {
        value: "FTXD",
        label: "First Trust Nasdaq Retail ETF"
    },
    {
        value: "FTXG",
        label: "First Trust Nasdaq Food & Beverage ETF"
    },
    {
        value: "FTXH",
        label: "First Trust Nasdaq Pharmaceuticals ETF"
    },
    {
        value: "FTXL",
        label: "First Trust Nasdaq Semiconductor ETF"
    },
    {
        value: "FTXN",
        label: "First Trust Nasdaq Oil & Gas ETF"
    },
    {
        value: "FTXO",
        label: "First Trust Nasdaq Bank ETF"
    },
    {
        value: "FTXR",
        label: "First Trust Nasdaq Transportation ETF"
    },
    {
        value: "FUD",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Food ETN"
    },
    {
        value: "FUE",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the MLCX Biofuels Index - Total Return Structured Product"
    },
    {
        value: "FUL",
        label: "H. B. Fuller Company"
    },
    {
        value: "FULT",
        label: "Fulton Financial Corporation"
    },
    {
        value: "FUN",
        label: "Cedar Fair L.P."
    },
    {
        value: "FUNC",
        label: "First United Corporation"
    },
    {
        value: "FUND",
        label: "Sprott Focus Trust Inc."
    },
    {
        value: "FUSB",
        label: "First US Bancshares Inc."
    },
    {
        value: "FUT",
        label: "ProShares Managed Futures Strategy"
    },
    {
        value: "FUTY",
        label: "Fidelity MSCI Utilities Index"
    },
    {
        value: "FUV",
        label: "Arcimoto Inc."
    },
    {
        value: "FV",
        label: "First Trust Dorsey Wright Focus 5 ETF"
    },
    {
        value: "FVAL",
        label: "Fidelity Value Factor"
    },
    {
        value: "FVC",
        label: "First Trust Dorsey Wright Dynamic Focus 5 ETF"
    },
    {
        value: "FVD",
        label: "First Trust VL Dividend"
    },
    {
        value: "FVE",
        label: "Five Star Senior Living Inc."
    },
    {
        value: "FVL",
        label: "First Trust Value Line 100 Fund"
    },
    {
        value: "FWDB",
        label: "Madrona Global Bond"
    },
    {
        value: "FWDD",
        label: "Madrona Domestic"
    },
    {
        value: "FWDI",
        label: "Madrona International"
    },
    {
        value: "FWONA",
        label: "Liberty Media Corporation Series A"
    },
    {
        value: "FWONK",
        label: "Liberty Media Corporation Series C"
    },
    {
        value: "FWP",
        label: "Forward Pharma A/S"
    },
    {
        value: "FWRD",
        label: "Forward Air Corporation"
    },
    {
        value: "FXA",
        label: "Invesco CurrencyShares Australian Dollar Trust"
    },
    {
        value: "FXB",
        label: "Invesco CurrencyShares British Pound Sterling Trust"
    },
    {
        value: "FXC",
        label: "Invesco CurrencyShares Canadian Dollar Trust"
    },
    {
        value: "FXCH",
        label: "Invesco CurrencyShares Chinese Renminbi Trust"
    },
    {
        value: "FXD",
        label: "First Trust Cons. Discret. AlphaDEX"
    },
    {
        value: "FXE",
        label: "Invesco CurrencyShares Euro Currency Trust"
    },
    {
        value: "FXF",
        label: "Invesco CurrencyShares Swiss Franc Trust"
    },
    {
        value: "FXG",
        label: "First Trust Cons. Staples AlphaDEX"
    },
    {
        value: "FXH",
        label: "First Trust Health Care AlphaDEX"
    },
    {
        value: "FXI",
        label: "iShares China Large-Cap"
    },
    {
        value: "FXL",
        label: "First Trust Technology AlphaDEX"
    },
    {
        value: "FXN",
        label: "First Trust Energy AlphaDEX Fund"
    },
    {
        value: "FXO",
        label: "First Trust Financials AlphaDEX"
    },
    {
        value: "FXP",
        label: "ProShares Ultrashort FTSE China 50"
    },
    {
        value: "FXR",
        label: "First Trust Industrials AlphaDEX"
    },
    {
        value: "FXS",
        label: "Invesco CurrencyShares Swedish Krona Trust"
    },
    {
        value: "FXSG",
        label: "Invesco CurrencyShares Singapore Dollar Trust"
    },
    {
        value: "FXU",
        label: "First Trust Utilities AlphaDEX Fund"
    },
    {
        value: "FXY",
        label: "Invesco CurrencyShares Japanese Yen Trust"
    },
    {
        value: "FXZ",
        label: "First Trust Materials AlphaDEX Fund"
    },
    {
        value: "FYC",
        label: "First Trust Small Cap Growth AlphaDEX Fund"
    },
    {
        value: "FYLD",
        label: "Cambria Foreign Shareholder Yield"
    },
    {
        value: "FYT",
        label: "First Trust Small Cap Value AlphaDEX Fund"
    },
    {
        value: "FYX",
        label: "First Trust Small Cap Core AlphaDEX Fund"
    },
    {
        value: "G",
        label: "Genpact Limited"
    },
    {
        value: "GAA",
        label: "Cambria Global Asset Allocation"
    },
    {
        value: "GAB",
        label: "Gabelli Equity Trust Inc. (The)"
    },
    {
        value: "GAB-D",
        label: "Gabelli Equity Trust Inc. (The) Preferred Stock Series D"
    },
    {
        value: "GAB-G",
        label: "Gabelli Equity Trust Inc. (The) Series G Cumulative Preferred Stock"
    },
    {
        value: "GAB-H",
        label: "Gabelli Equity Trust Inc. (The) Pfd Ser H"
    },
    {
        value: "GAB-J",
        label: "Gabelli Equity Trust Inc. (The) 5.45% Series J Cumulative Preferred Stock"
    },
    {
        value: "GABC",
        label: "German American Bancorp Inc."
    },
    {
        value: "GAIA",
        label: "Gaia Inc."
    },
    {
        value: "GAIN",
        label: "Gladstone Investment Corporation"
    },
    {
        value: "GAINM",
        label: "Gladstone Investment Corporation 6.25% Series D Cumulative Term Preferred Stock"
    },
    {
        value: "GAINN",
        label: "Gladstone Investment Corporation 6.50% Series C Cumulative Term Preferred Stock Due 2022"
    },
    {
        value: "GAINO",
        label: "Gladstone Investment Corporation 6.75% Series B Cumulative Term Preferred Stock"
    },
    {
        value: "GAL",
        label: "SPDR SSgA Global Allocation"
    },
    {
        value: "GALT",
        label: "Galectin Therapeutics Inc."
    },
    {
        value: "GAM",
        label: "General American Investors Inc."
    },
    {
        value: "GAM-B",
        label: "General American Investors Company Inc. Cumulative Preferred Stock"
    },
    {
        value: "GAMR",
        label: "ETFMG Video Game Tech"
    },
    {
        value: "GARD",
        label: "Realty Shares DIVCON Dividend Guard"
    },
    {
        value: "GARS",
        label: "Garrison Capital Inc."
    },
    {
        value: "GASL",
        label: "Direxion Daily Natural Gas Related Bull 3X Shares"
    },
    {
        value: "GASS",
        label: "StealthGas Inc."
    },
    {
        value: "GASX",
        label: "Direxion Daily Natural Gas Related Bear 3X Shares"
    },
    {
        value: "GATX",
        label: "GATX Corporation"
    },
    {
        value: "GAZB",
        label: "Barclays Bank PLC iPath Series B Bloomberg Natural Gas Subindex Total Return ETN"
    },
    {
        value: "GBAB",
        label: "Guggenheim Taxable Municipal Managed Duration Trust of Beneficial Interest"
    },
    {
        value: "GBCI",
        label: "Glacier Bancorp Inc."
    },
    {
        value: "GBDC",
        label: "Golub Capital BDC Inc."
    },
    {
        value: "GBF",
        label: "iShares Government/Credit Bond"
    },
    {
        value: "GBIL",
        label: "Goldman Sachs Group Inc. (The)"
    },
    {
        value: "GBL",
        label: "Gamco Investors Inc."
    },
    {
        value: "GBLI",
        label: "Global Indemnity Limited"
    },
    {
        value: "GBLIL",
        label: "Global Indemnity Limited 7.875% Subordinated Notes due 2047"
    },
    {
        value: "GBLIZ",
        label: ""
    },
    {
        value: "GBNK",
        label: "Guaranty Bancorp"
    },
    {
        value: "GBR",
        label: "New Concept Energy Inc"
    },
    {
        value: "GBT",
        label: "Global Blood Therapeutics Inc."
    },
    {
        value: "GBX",
        label: "Greenbrier Companies Inc. (The)"
    },
    {
        value: "GCAP",
        label: "GAIN Capital Holdings Inc."
    },
    {
        value: "GCBC",
        label: "Greene County Bancorp Inc."
    },
    {
        value: "GCC",
        label: "WisdomTree Continuous Commodity Index Fund"
    },
    {
        value: "GCE",
        label: "Clarymore CEF GS Connect ETN"
    },
    {
        value: "GCI",
        label: "Gannett Co. Inc."
    },
    {
        value: "GCO",
        label: "Genesco Inc."
    },
    {
        value: "GCOW",
        label: "Pacer Global Cash Cows Dividend"
    },
    {
        value: "GCP",
        label: "GCP Applied Technologies Inc."
    },
    {
        value: "GCV",
        label: "Gabelli Convertible and Income Securities Fund Inc. (The)"
    },
    {
        value: "GCV-B",
        label: "Gabelli Convertible and Income Securities Fund Inc. (The) Series B 6.00% Cumulative Preferred Stock"
    },
    {
        value: "GCVRZ",
        label: "Sanofi Contingent Value Right (Expiring 12/31/2020)"
    },
    {
        value: "GD",
        label: "General Dynamics Corporation"
    },
    {
        value: "GDDY",
        label: "GoDaddy Inc. Class A"
    },
    {
        value: "GDEN",
        label: "Golden Entertainment Inc."
    },
    {
        value: "GDI",
        label: "Gardner Denver Holdings Inc."
    },
    {
        value: "GDL",
        label: "GDL Fund The of Beneficial Interest"
    },
    {
        value: "GDL-C",
        label: "The GDL Fund Series C Cumulative Puttable and Callable Preferred Shares"
    },
    {
        value: "GDO",
        label: "Western Asset Global Corporate Defined Opportunity Fund Inc."
    },
    {
        value: "GDOT",
        label: "Green Dot Corporation Class A $0.001 par value"
    },
    {
        value: "GDP",
        label: "Goodrich Petroleum Corporation"
    },
    {
        value: "GDS",
        label: "GDS Holdings Limited"
    },
    {
        value: "GDV",
        label: "Gabelli Dividend & Income Trust of Beneficial Interest"
    },
    {
        value: "GDV-A",
        label: "Gabelli Dividend & Income Tr Preferred Series A"
    },
    {
        value: "GDV-D",
        label: "Gabelli Dividend Pfd Series D"
    },
    {
        value: "GDV-G",
        label: "Gabelli Dividend 5.25% Series G Cumulative Preferred Shares par value $0.001 per share"
    },
    {
        value: "GDVD",
        label: "Principal Active Global Dividend Income"
    },
    {
        value: "GDX",
        label: "VanEck Vectors Gold Miners"
    },
    {
        value: "GDXJ",
        label: "VanEck Vectors Junior Gold Miners"
    },
    {
        value: "GDXS",
        label: "ProShares UltraShort Gold Miners"
    },
    {
        value: "GDXX",
        label: "ProShares Ultra Gold Miners"
    },
    {
        value: "GE",
        label: "General Electric Company"
    },
    {
        value: "GEC",
        label: "Great Elm Capital Group Inc."
    },
    {
        value: "GECC",
        label: "Great Elm Capital Corp."
    },
    {
        value: "GECCL",
        label: "Great Elm Capital Corp. 6.50% Notes due 2022"
    },
    {
        value: "GECCM",
        label: "Great Elm Capital Corp. 6.75% Notes Due 2025"
    },
    {
        value: "GEF",
        label: "Greif Inc. Class A"
    },
    {
        value: "GEF.B",
        label: "Greif Inc. Corporation Class B"
    },
    {
        value: "GEL",
        label: "Genesis Energy L.P."
    },
    {
        value: "GEM",
        label: "Goldman Sachs ActiveBeta Emerging Markets Equity"
    },
    {
        value: "GEMP",
        label: "Gemphire Therapeutics Inc."
    },
    {
        value: "GEN",
        label: "Genesis Healthcare Inc."
    },
    {
        value: "GENC",
        label: "Gencor Industries Inc."
    },
    {
        value: "GENE",
        label: "Genetic Technologies Ltd"
    },
    {
        value: "GENY",
        label: "Principal Millennials Index ETF"
    },
    {
        value: "GEO",
        label: "Geo Group Inc (The) REIT"
    },
    {
        value: "GEOS",
        label: "Geospace Technologies Corporation"
    },
    {
        value: "GER",
        label: "Goldman Sachs MLP Energy Renaissance Fund"
    },
    {
        value: "GERN",
        label: "Geron Corporation"
    },
    {
        value: "GES",
        label: "Guess? Inc."
    },
    {
        value: "GEVO",
        label: "Gevo Inc."
    },
    {
        value: "GEX",
        label: "VanEck Vectors Global Alternative Energy"
    },
    {
        value: "GF",
        label: "New Germany Fund Inc. (The)"
    },
    {
        value: "GFA",
        label: "Gafisa SA S.A. American Depositary Shares"
    },
    {
        value: "GFED",
        label: "Guaranty Federal Bancshares Inc."
    },
    {
        value: "GFF",
        label: "Griffon Corporation"
    },
    {
        value: "GFI",
        label: "Gold Fields Limited American Depositary Shares"
    },
    {
        value: "GFN",
        label: "General Finance Corporation"
    },
    {
        value: "GFNCP",
        label: "General Finance Corporation Cumulative Redeemable Perpetual Preferred Series C"
    },
    {
        value: "GFNSL",
        label: "General Finance Corporation Senior Notes due 2021"
    },
    {
        value: "GFY",
        label: "Western Asset Variable Rate Strategic Fund Inc."
    },
    {
        value: "GG",
        label: "Goldcorp Inc."
    },
    {
        value: "GGAL",
        label: "Grupo Financiero Galicia S.A."
    },
    {
        value: "GGB",
        label: "Gerdau S.A."
    },
    {
        value: "GGG",
        label: "Graco Inc."
    },
    {
        value: "GGM",
        label: "Guggenheim Credit Allocation Fund of Beneficial Interest"
    },
    {
        value: "GGN",
        label: "GAMCO Global Gold Natural Resources & Income Trust"
    },
    {
        value: "GGN-B",
        label: "GAMCO Global Gold Natural Reources & Income Trust 5.00% Series B Cumulative 25.00 Liquidation Preference"
    },
    {
        value: "GGO",
        label: "The Gabelli Go Anywhere Trust of Beneficial Interest"
    },
    {
        value: "GGO-A",
        label: "The Gabelli Go Anywhere Trust Series A Cumulative Puttable and Callable Preferred Shares"
    },
    {
        value: "GGP",
        label: "GGP Inc."
    },
    {
        value: "GGP-A",
        label: "GGP Inc. Preferred Series A"
    },
    {
        value: "GGT",
        label: "Gabelli Multi-Media Trust Inc. (The)"
    },
    {
        value: "GGT-B",
        label: "Gabelli Multi-Media Trust Inc. (The) Preferred Series B"
    },
    {
        value: "GGT-E",
        label: "Gabelli Multi-Media Trust Inc. (The) 5.125% Series E Cumulative Preferred Stock"
    },
    {
        value: "GGZ",
        label: "Gabelli Global Small and Mid Cap Value Trust (The) of Beneficial Interest"
    },
    {
        value: "GGZ-A",
        label: "Gabelli Global Small and Mid Cap Value Trust (The) 5.450% Series A Cumulative Preferred Shares (Liquidation Preference $25.00 per share)"
    },
    {
        value: "GHC",
        label: "Graham Holdings Company"
    },
    {
        value: "GHDX",
        label: "Genomic Health Inc."
    },
    {
        value: "GHG",
        label: "GreenTree Hospitality Group Ltd. American depositary shares each representing one Class A"
    },
    {
        value: "GHII",
        label: "Invesco S&P High Income Infrastructure"
    },
    {
        value: "GHL",
        label: "Greenhill & Co. Inc."
    },
    {
        value: "GHM",
        label: "Graham Corporation"
    },
    {
        value: "GHS",
        label: "REX Gold Hedged S&P 500"
    },
    {
        value: "GHY",
        label: "Prudential Global Short Duration High Yield Fund Inc."
    },
    {
        value: "GHYB",
        label: "Goldman Sachs Access High Yield Corporate Bond"
    },
    {
        value: "GHYG",
        label: "iShares US & Intl High Yield Corp Bond"
    },
    {
        value: "GIB",
        label: "CGI Group Inc."
    },
    {
        value: "GIFI",
        label: "Gulf Island Fabrication Inc."
    },
    {
        value: "GIG",
        label: "GigCapital Inc."
    },
    {
        value: "GIG+",
        label: ""
    },
    {
        value: "GIG=",
        label: "GigCapital Inc. Unit"
    },
    {
        value: "GIGB",
        label: "Goldman Sachs Access Investment Grade Corporate Bond"
    },
    {
        value: "GIGM",
        label: "GigaMedia Limited"
    },
    {
        value: "GIG^",
        label: "GRIT International Groups Inc."
    },
    {
        value: "GII",
        label: "SPDR S&P Global Infrastructure"
    },
    {
        value: "GIII",
        label: "G-III Apparel Group LTD."
    },
    {
        value: "GIL",
        label: "Gildan Activewear Inc. Class A Sub. Vot."
    },
    {
        value: "GILD",
        label: "Gilead Sciences Inc."
    },
    {
        value: "GILT",
        label: "Gilat Satellite Networks Ltd."
    },
    {
        value: "GIM",
        label: "Templeton Global Income Fund Inc."
    },
    {
        value: "GIS",
        label: "General Mills Inc."
    },
    {
        value: "GJH",
        label: "Synthetic Fixed-Income Securities Inc 6.375% (STRATS) Cl A-1"
    },
    {
        value: "GJO",
        label: "Synthetic Fixed-Income Securities Inc. on behalf of STRATS(SM) Trust for Wal-Mart Stores Inc. Securities Series 2004-5"
    },
    {
        value: "GJP",
        label: "Synthetic Fixed-Income Securities Inc. on behalf of STRATS (SM) Trust for Dominion Resources Inc. Securities Series 2005-6 Floating Rate Structured Repackaged A"
    },
    {
        value: "GJR",
        label: "Synthetic Fixed-Income Securities Inc. STRATS Trust for Procter&Gamble Securities Series 2006-1"
    },
    {
        value: "GJS",
        label: "Goldman Sachs Group Securities STRATS Trust for Series 2006-2"
    },
    {
        value: "GJT",
        label: "Synthetic Fixed-Income Securities Inc. Floating Rate Structured Repackaged Asset-Backed Trust Securities Certificates Series 2006-3"
    },
    {
        value: "GJV",
        label: "Synthetic Fixed-Income Securities Inc 7.00% Fixed Rate Structured Repackaged Asset-Backed Trust Securities (STRATS)"
    },
    {
        value: "GKOS",
        label: "Glaukos Corporation"
    },
    {
        value: "GLAD",
        label: "Gladstone Capital Corporation"
    },
    {
        value: "GLADN",
        label: "Gladstone Capital Corporation 6.00% Series 2024 Term Preferred Stock"
    },
    {
        value: "GLBS",
        label: "Globus Maritime Limited"
    },
    {
        value: "GLBZ",
        label: "Glen Burnie Bancorp"
    },
    {
        value: "GLD",
        label: "SPDR Gold Trust"
    },
    {
        value: "GLDD",
        label: "Great Lakes Dredge & Dock Corporation"
    },
    {
        value: "GLDI",
        label: "Credit Suisse X-Links Silver Call ETN IOPV"
    },
    {
        value: "GLDW",
        label: "SPDR Long Dollar Gold Trust"
    },
    {
        value: "GLF",
        label: "GulfMark Offshore Inc."
    },
    {
        value: "GLF+",
        label: ""
    },
    {
        value: "GLIBA",
        label: "GCI Liberty Inc. Class A Common Stock"
    },
    {
        value: "GLIBP",
        label: "GCI Liberty Inc. Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "GLL",
        label: "ProShares UltraShort Gold"
    },
    {
        value: "GLMD",
        label: "Galmed Pharmaceuticals Ltd."
    },
    {
        value: "GLNG",
        label: "Golar LNG Limited"
    },
    {
        value: "GLO",
        label: "Clough Global Opportunities Fund"
    },
    {
        value: "GLOB",
        label: "Globant S.A."
    },
    {
        value: "GLOG",
        label: "GasLog Ltd."
    },
    {
        value: "GLOG-A",
        label: "GasLog LP. 8.75% Series A Cumulative Redeemable Perpetual Preference Shares"
    },
    {
        value: "GLOP",
        label: "GasLog Partners LP representing limited partnership interests"
    },
    {
        value: "GLOP-A",
        label: "GasLog Partners LP 8.625% Series A Cumulative Redeemable Perpetual Fixed to Floating Rate Preference Units"
    },
    {
        value: "GLOP-B",
        label: "GasLog Partners LP 8.200% Series B Cumulative Redeemable Perpetual Fixed to Floating Rate Preference Units"
    },
    {
        value: "GLOW",
        label: "Glowpoint Inc."
    },
    {
        value: "GLP",
        label: "Global Partners LP representing Limited Partner Interests"
    },
    {
        value: "GLPG",
        label: "Galapagos NV"
    },
    {
        value: "GLPI",
        label: "Gaming and Leisure Properties Inc."
    },
    {
        value: "GLQ",
        label: "Clough Global Equity Fund of Beneficial Interest"
    },
    {
        value: "GLRE",
        label: "Greenlight Reinsurance Ltd."
    },
    {
        value: "GLT",
        label: "Glatfelter"
    },
    {
        value: "GLTR",
        label: "ETFS Physical Precious Metal Basket Shares"
    },
    {
        value: "GLU",
        label: "Gabelli Global Utility of Beneficial Ownership"
    },
    {
        value: "GLU-A",
        label: "The Gabelli Global Utility and Income Trust Series A Cumulative Puttable and Callable Preferred Shares"
    },
    {
        value: "GLUU",
        label: "Glu Mobile Inc."
    },
    {
        value: "GLV",
        label: "Clough Global Dividend and Income Fund of beneficial interest"
    },
    {
        value: "GLW",
        label: "Corning Incorporated"
    },
    {
        value: "GLYC",
        label: "GlycoMimetics Inc."
    },
    {
        value: "GM",
        label: "General Motors Company"
    },
    {
        value: "GM+B",
        label: "General Motors Company Warrant (Expires 07/10/2019)"
    },
    {
        value: "GME",
        label: "Gamestop Corporation"
    },
    {
        value: "GMED",
        label: "Globus Medical Inc. Class A"
    },
    {
        value: "GMF",
        label: "SPDR S&P Emerging Asia Pacific"
    },
    {
        value: "GMFL",
        label: "Invesco Multi-Factor Large Cap"
    },
    {
        value: "GMLP",
        label: "Golar LNG Partners LP"
    },
    {
        value: "GMLPP",
        label: "Golar LNG Partners LP 8.75% Series A Cumulative Redeemable Preferred Units"
    },
    {
        value: "GMO",
        label: "General Moly Inc."
    },
    {
        value: "GMOM",
        label: "Cambria Global Momentum"
    },
    {
        value: "GMRE",
        label: "Global Medical REIT Inc."
    },
    {
        value: "GMRE-A",
        label: "Global Medical REIT Inc. Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "GMS",
        label: "GMS Inc."
    },
    {
        value: "GMTA",
        label: "GATX Corporation 5.625% Senior Notes due 2066"
    },
    {
        value: "GMZ",
        label: "Goldman Sachs MLP Income Opportunities Fund"
    },
    {
        value: "GNBC",
        label: "Green Bancorp Inc."
    },
    {
        value: "GNC",
        label: "GNC Holdings Inc. Class A"
    },
    {
        value: "GNCA",
        label: "Genocea Biosciences Inc."
    },
    {
        value: "GNE",
        label: "Genie Energy Ltd. Class B Stock"
    },
    {
        value: "GNE-A",
        label: "Genie Energy Ltd. Series 2012 - A Preferred Stock $0.01 par value"
    },
    {
        value: "GNK",
        label: "Genco Shipping & Trading Limited New (Marshall Islands)"
    },
    {
        value: "GNL",
        label: "Global Net Lease Inc."
    },
    {
        value: "GNL-A",
        label: "Global Net Lease Inc. 7.25% Series A Cumulative Redeemable Preferred Stock $0.01 par value per share"
    },
    {
        value: "GNMA",
        label: "iShares GNMA Bond ETF"
    },
    {
        value: "GNMK",
        label: "GenMark Diagnostics Inc."
    },
    {
        value: "GNMX",
        label: "Aevi Genomic Medicine Inc."
    },
    {
        value: "GNPX",
        label: "Genprex Inc."
    },
    {
        value: "GNR",
        label: "SPDR S&P Global Natural Resources"
    },
    {
        value: "GNRC",
        label: "Generac Holdlings Inc."
    },
    {
        value: "GNRT",
        label: "Gener8 Maritime Inc."
    },
    {
        value: "GNRX",
        label: "VanEck Vectors Generic Drugs ETF"
    },
    {
        value: "GNT",
        label: "GAMCO Natural Resources Gold & Income Trust"
    },
    {
        value: "GNT-A",
        label: "GAMCO Natural Resources Gold & Income Tust 5.20% Series A Cumulative Preferred Shares (Liquidation Preference $25.00 per share)"
    },
    {
        value: "GNTX",
        label: "Gentex Corporation"
    },
    {
        value: "GNTY",
        label: "Guaranty Bancshares Inc."
    },
    {
        value: "GNUS",
        label: "Genius Brands International Inc."
    },
    {
        value: "GNW",
        label: "Genworth Financial Inc"
    },
    {
        value: "GOAU",
        label: "US Global GO Gold and Precious Metal Miners"
    },
    {
        value: "GOEX",
        label: "Global X Gold Explorers"
    },
    {
        value: "GOF",
        label: "Guggenheim Strategic Opportunities Fund of Beneficial Interest"
    },
    {
        value: "GOGL",
        label: "Golden Ocean Group Limited"
    },
    {
        value: "GOGO",
        label: "Gogo Inc."
    },
    {
        value: "GOL",
        label: "Gol Linhas Aereas Inteligentes S.A. Sponsored ADR representing 2 Pfd Shares"
    },
    {
        value: "GOLD",
        label: "Randgold Resources Limited"
    },
    {
        value: "GOLF",
        label: "Acushnet Holdings Corp."
    },
    {
        value: "GOOD",
        label: "Gladstone Commercial Corporation"
    },
    {
        value: "GOODM",
        label: "Gladstone Commercial Corporation Series D Cumulative Redeemable Preferred Stock"
    },
    {
        value: "GOODO",
        label: "Gladstone Commercial Corporation 7.50% Series B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "GOODP",
        label: "Gladstone Commercial Corporation 7.75% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "GOOG",
        label: "Alphabet Inc."
    },
    {
        value: "GOOGL",
        label: "Alphabet Inc."
    },
    {
        value: "GOOS",
        label: "Canada Goose Holdings Inc. Subordinate"
    },
    {
        value: "GORO",
        label: "Gold Resource Corporation"
    },
    {
        value: "GOV",
        label: "Government Properties Income Trust"
    },
    {
        value: "GOVNI",
        label: "Government Properties Income Trust 5.875% Senior Notes due 2046"
    },
    {
        value: "GOVT",
        label: "iShares U.S. Treasury Bond"
    },
    {
        value: "GPAQ",
        label: "Gordon Pointe Acquisition Corp."
    },
    {
        value: "GPAQU",
        label: "Gordon Pointe Acquisition Corp. Unit"
    },
    {
        value: "GPAQW",
        label: "Gordon Pointe Acquisition Corp. Warrant"
    },
    {
        value: "GPC",
        label: "Genuine Parts Company"
    },
    {
        value: "GPI",
        label: "Group 1 Automotive Inc."
    },
    {
        value: "GPIC",
        label: "Gaming Partners International Corporation"
    },
    {
        value: "GPJA",
        label: "Georgia Power Company Series 2017A 5.00% Junior Subordinated Notes due October 1 2077"
    },
    {
        value: "GPK",
        label: "Graphic Packaging Holding Company"
    },
    {
        value: "GPL",
        label: "Great Panther Silver Limited (Canada)"
    },
    {
        value: "GPM",
        label: "Guggenheim Enhanced Equity Income Fund"
    },
    {
        value: "GPMT",
        label: "Granite Point Mortgage Trust Inc."
    },
    {
        value: "GPN",
        label: "Global Payments Inc."
    },
    {
        value: "GPOR",
        label: "Gulfport Energy Corporation"
    },
    {
        value: "GPP",
        label: "Green Plains Partners LP"
    },
    {
        value: "GPRE",
        label: "Green Plains Inc."
    },
    {
        value: "GPRK",
        label: "Geopark Ltd"
    },
    {
        value: "GPRO",
        label: "GoPro Inc."
    },
    {
        value: "GPS",
        label: "Gap Inc. (The)"
    },
    {
        value: "GPT",
        label: "Gramercy Property Trust"
    },
    {
        value: "GPT-A",
        label: "Gramercy Property Trust Inc. 7.125% Series A Cumulative Redeemable Preferred Share"
    },
    {
        value: "GPX",
        label: "GP Strategies Corporation"
    },
    {
        value: "GQRE",
        label: "FlexShares Global Quality Real Estate Index Fund"
    },
    {
        value: "GRA",
        label: "W.R. Grace & Co."
    },
    {
        value: "GRBIC",
        label: "Gabelli NextShares Trust"
    },
    {
        value: "GRBK",
        label: "Green Brick Partners Inc."
    },
    {
        value: "GRC",
        label: "Gorman-Rupp Company (The)"
    },
    {
        value: "GREK",
        label: "Global X MSCI Greece"
    },
    {
        value: "GRES",
        label: "IQ ARB Global Resources"
    },
    {
        value: "GRF",
        label: "Eagle Capital Growth Fund Inc."
    },
    {
        value: "GRFS",
        label: "Grifols S.A."
    },
    {
        value: "GRI",
        label: "Cohen & Steers Global Realty Majors"
    },
    {
        value: "GRID",
        label: "First Trust NASDAQ Clean Edge Smart Grid Infrastructure Index Fund"
    },
    {
        value: "GRIF",
        label: "Griffin Industrial Realty Inc."
    },
    {
        value: "GRMN",
        label: "Garmin Ltd."
    },
    {
        value: "GRMY",
        label: "Xtrackers Germany Equity"
    },
    {
        value: "GRNB",
        label: "VanEck Vectors Green Bond"
    },
    {
        value: "GROW",
        label: "U.S. Global Investors Inc."
    },
    {
        value: "GRP=",
        label: "Granite Real Estate Inc. Stapled Units each consisting of one unit of Trust and one common share of Granite REIT Inc."
    },
    {
        value: "GRPN",
        label: "Groupon Inc."
    },
    {
        value: "GRU",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the MLCX Grains Index - Total Return"
    },
    {
        value: "GRUB",
        label: "GrubHub Inc."
    },
    {
        value: "GRVY",
        label: "GRAVITY Co. Ltd."
    },
    {
        value: "GRX",
        label: "The Gabelli Healthcare & Wellness Trust of Beneficial Interest"
    },
    {
        value: "GRX-A",
        label: "Gabelli Healthcare PFD SER A"
    },
    {
        value: "GRX-B",
        label: "Gabelli Healthcare Preferred Series B"
    },
    {
        value: "GS",
        label: "Goldman Sachs Group Inc. (The)"
    },
    {
        value: "GS-A",
        label: "Goldman Sachs Group Inc. (The) Depositary Shares Series A"
    },
    {
        value: "GS-B",
        label: "Goldman Sachs Group Inc. (The) Depositary Share repstg 1/1000th Preferred Series B"
    },
    {
        value: "GS-C",
        label: "Goldman Sachs Group Inc. (The) Depositary Share repstg 1/1000th Preferred Series C"
    },
    {
        value: "GS-D",
        label: "Goldman Sachs Group Inc. (The) Dep Shs repstg 1/1000 Pfd Ser D Fltg"
    },
    {
        value: "GS-J",
        label: "Goldman Sachs Group Inc Depositary Shs Repstg 1/1000th Pfd Ser J Fixed to Fltg Rate"
    },
    {
        value: "GS-K",
        label: "Goldman Sachs Group Inc. (The) Dep Shs Repstg 1/1000 Int Sh Fxd/Fltg Non Cum Pfd Stk Ser K"
    },
    {
        value: "GS-N",
        label: "Goldman Sachs Group Inc. (The) Depositary Shares Series N"
    },
    {
        value: "GSAT",
        label: "Globalstar Inc."
    },
    {
        value: "GSB",
        label: "GlobalSCAPE Inc."
    },
    {
        value: "GSBC",
        label: "Great Southern Bancorp Inc."
    },
    {
        value: "GSBD",
        label: "Goldman Sachs BDC Inc."
    },
    {
        value: "GSC",
        label: "Goldman Sachs Connect S&P Enhanced Commodity Total Return Strategy Index"
    },
    {
        value: "GSD",
        label: "WisdomTree Global SmallCap Dividend Fund"
    },
    {
        value: "GSEU",
        label: "Goldman Sachs ActiveBeta Europe Equity"
    },
    {
        value: "GSEW",
        label: "Goldman Sachs Equal Weight U.S. Large Cap Equity"
    },
    {
        value: "GSG",
        label: "iShares GSCI Commodity-Indexed Trust Fund"
    },
    {
        value: "GSH",
        label: "Guangshen Railway Company Limited"
    },
    {
        value: "GSHD",
        label: "Goosehead Insurance Inc."
    },
    {
        value: "GSHT",
        label: "Gores Holdings II Inc."
    },
    {
        value: "GSHTU",
        label: "Gores Holdings II Inc. Unit"
    },
    {
        value: "GSHTW",
        label: "Gores Holdings II Inc. Warrants"
    },
    {
        value: "GSIE",
        label: "Goldman Sachs ActiveBeta International Equity"
    },
    {
        value: "GSIT",
        label: "GSI Technology Inc."
    },
    {
        value: "GSJY",
        label: "Goldman Sachs ActiveBeta Japan Equity"
    },
    {
        value: "GSK",
        label: "GlaxoSmithKline PLC"
    },
    {
        value: "GSKY",
        label: "GreenSky Inc."
    },
    {
        value: "GSL",
        label: "Global Ship Lease Inc New Class A"
    },
    {
        value: "GSL-B",
        label: "Global Ship Lease Inc. Depository Shares Series B"
    },
    {
        value: "GSLC",
        label: "Goldman Sachs ActiveBeta U.S. Large Cap Equity"
    },
    {
        value: "GSM",
        label: "Ferroglobe PLC"
    },
    {
        value: "GSP",
        label: "Barclays Bank PLC iPath Exchange Traded Notes due June 12 2036 Linked to GSCI Total Return Index"
    },
    {
        value: "GSS",
        label: "Golden Star Resources Ltd"
    },
    {
        value: "GSSC",
        label: "GS ActiveBeta U.S. Small Cap Equity"
    },
    {
        value: "GST",
        label: "Gastar Exploration Inc"
    },
    {
        value: "GST-A",
        label: "Gastar Exploration 8.625% Series A Cumulative Preferred Stock"
    },
    {
        value: "GST-B",
        label: "Gastar Exploration Inc. Pfd Ser B %"
    },
    {
        value: "GSUM",
        label: "Gridsum Holding Inc."
    },
    {
        value: "GSV",
        label: "Gold Standard Ventures Corporation (Canada)"
    },
    {
        value: "GSVC",
        label: "GSV Capital Corp"
    },
    {
        value: "GSY",
        label: "Invesco Ultra Short Duration"
    },
    {
        value: "GT",
        label: "The Goodyear Tire & Rubber Company"
    },
    {
        value: "GTE",
        label: "Gran Tierra Energy Inc."
    },
    {
        value: "GTES",
        label: "Gates Industrial Corporation plc"
    },
    {
        value: "GTHX",
        label: "G1 Therapeutics Inc."
    },
    {
        value: "GTIM",
        label: "Good Times Restaurants Inc."
    },
    {
        value: "GTLS",
        label: "Chart Industries Inc."
    },
    {
        value: "GTN",
        label: "Gray Communications Systems Inc."
    },
    {
        value: "GTN.A",
        label: "Gray Television Inc. CLass A"
    },
    {
        value: "GTO",
        label: "Invesco Total Return Bond"
    },
    {
        value: "GTS",
        label: "Triple-S Management Corporation Class B"
    },
    {
        value: "GTT",
        label: "GTT Communications Inc."
    },
    {
        value: "GTXI",
        label: "GTx Inc."
    },
    {
        value: "GTY",
        label: "Getty Realty Corporation"
    },
    {
        value: "GTYH",
        label: "GTY Technology Holdings Inc."
    },
    {
        value: "GTYHU",
        label: "GTY Technology Holdings Inc. Unit"
    },
    {
        value: "GTYHW",
        label: "GTY Technology Holdings Inc. Warrants"
    },
    {
        value: "GUDB",
        label: "Sage ESG Intermediate Credit"
    },
    {
        value: "GULF",
        label: "WisdomTree Middle East Dividend Fund"
    },
    {
        value: "GUNR",
        label: "FlexShares Global Upstream Natural Resources Index Fund"
    },
    {
        value: "GURE",
        label: "Gulf Resources Inc."
    },
    {
        value: "GURU",
        label: "Global X Guru Index"
    },
    {
        value: "GUSH",
        label: "Direxion Daily S&P Oil & Gas Exp. & Prod. Bull 3X Shares"
    },
    {
        value: "GUT",
        label: "Gabelli Utility Trust (The)"
    },
    {
        value: "GUT-A",
        label: "Gabelli Utility Trust (The) 5.625% Series A Cumulative Preferred Shares"
    },
    {
        value: "GUT-C",
        label: "Gabelli Utility Trust (The) 5.375% Series C Cumulative Preferred Shares"
    },
    {
        value: "GV",
        label: "Goldfield Corporation (The)"
    },
    {
        value: "GVA",
        label: "Granite Construction Incorporated"
    },
    {
        value: "GVAL",
        label: "Cambria Global Value"
    },
    {
        value: "GVI",
        label: "iShares Intermediate Government/Credit Bond"
    },
    {
        value: "GVIP",
        label: "Goldman Sachs Hedge Industry VIP"
    },
    {
        value: "GVP",
        label: "GSE Systems Inc."
    },
    {
        value: "GWB",
        label: "Great Western Bancorp Inc."
    },
    {
        value: "GWGH",
        label: "GWG Holdings Inc"
    },
    {
        value: "GWPH",
        label: "GW Pharmaceuticals Plc"
    },
    {
        value: "GWR",
        label: "Genesee & Wyoming Inc. Class A"
    },
    {
        value: "GWRE",
        label: "Guidewire Software Inc."
    },
    {
        value: "GWRS",
        label: "Global Water Resources Inc."
    },
    {
        value: "GWW",
        label: "W.W. Grainger Inc."
    },
    {
        value: "GWX",
        label: "SPDR S&P International SmallCap"
    },
    {
        value: "GXC",
        label: "SPDR S&P China"
    },
    {
        value: "GXF",
        label: "Global X FTSE Nordic Region"
    },
    {
        value: "GXG",
        label: "Global X MSCI Colombia"
    },
    {
        value: "GYB",
        label: "CABCO Series 2004-101 Trust Goldman Sachs Capital I Floating Rate Callable Certificates"
    },
    {
        value: "GYC",
        label: "Corporate Asset Backed Corp CABCOoration CABCO Series 2004-102 Trust (SBC Communications Inc.) Collared Floating Rate Cllable Certificates"
    },
    {
        value: "GYLD",
        label: "Arrow Dow Jones Global Yield ETF"
    },
    {
        value: "GYRO",
        label: "Gyrodyne  LLC"
    },
    {
        value: "GZT",
        label: "Gazit-Globe Ltd."
    },
    {
        value: "H",
        label: "Hyatt Hotels Corporation Class A"
    },
    {
        value: "HA",
        label: "Hawaiian Holdings Inc."
    },
    {
        value: "HABT",
        label: "The Habit Restaurants Inc."
    },
    {
        value: "HACK",
        label: "ETFMG Prime Cyber Security"
    },
    {
        value: "HACV",
        label: "iShares Edge MSCI Min Vol Global Currency Hedged"
    },
    {
        value: "HACW",
        label: "iShares Currency Hedged MSCI ACWI"
    },
    {
        value: "HAE",
        label: "Haemonetics Corporation"
    },
    {
        value: "HAFC",
        label: "Hanmi Financial Corporation"
    },
    {
        value: "HAHA",
        label: "CSOP China CSI 300 A-H Dynamic"
    },
    {
        value: "HAIN",
        label: "The Hain Celestial Group Inc."
    },
    {
        value: "HAIR",
        label: "Restoration Robotics Inc."
    },
    {
        value: "HAL",
        label: "Halliburton Company"
    },
    {
        value: "HALL",
        label: "Hallmark Financial Services Inc."
    },
    {
        value: "HALO",
        label: "Halozyme Therapeutics Inc."
    },
    {
        value: "HAO",
        label: "Invesco China Small Cap"
    },
    {
        value: "HAP",
        label: "VanEck Vectors Natural Resources"
    },
    {
        value: "HAS",
        label: "Hasbro Inc."
    },
    {
        value: "HASI",
        label: "Hannon Armstrong Sustainable Infrastructure Capital Inc."
    },
    {
        value: "HAUD",
        label: "iShares Currency Hedged MSCI Australia"
    },
    {
        value: "HAWK",
        label: "Blackhawk Network Holdings Inc."
    },
    {
        value: "HAWX",
        label: "iShares Currency Hedged MSCI ACWI ex U.S."
    },
    {
        value: "HAYN",
        label: "Haynes International Inc."
    },
    {
        value: "HBAN",
        label: "Huntington Bancshares Incorporated"
    },
    {
        value: "HBANN",
        label: "Huntington Bancshares Incorporated Depositary Shares each representing a 1/40th interest in a share of 5.875% Series C Non-Cumulative Perpetual Preferred Stock"
    },
    {
        value: "HBANO",
        label: "Huntington Bancshares Incorporated Depositary Shares"
    },
    {
        value: "HBB",
        label: "Hamilton Beach Brands Holding Company Class A"
    },
    {
        value: "HBCP",
        label: "Home Bancorp Inc."
    },
    {
        value: "HBI",
        label: "Hanesbrands Inc."
    },
    {
        value: "HBIO",
        label: "Harvard Bioscience Inc."
    },
    {
        value: "HBK",
        label: "Hamilton Bancorp Inc."
    },
    {
        value: "HBM",
        label: "Hudbay Minerals Inc. (Canada)"
    },
    {
        value: "HBM+",
        label: ""
    },
    {
        value: "HBMD",
        label: "Howard Bancorp Inc."
    },
    {
        value: "HBNC",
        label: "Horizon Bancorp Inc."
    },
    {
        value: "HBP",
        label: "Huttig Building Products Inc."
    },
    {
        value: "HCA",
        label: "HCA Healthcare Inc."
    },
    {
        value: "HCAC",
        label: "Hennessy Capital Acquisition Corp. III"
    },
    {
        value: "HCAC+",
        label: ""
    },
    {
        value: "HCAC=",
        label: "Hennessy Capital Acquisition Corp. III Units each consisting of one share of Common Stock and one-half of one Warrant"
    },
    {
        value: "HCAP",
        label: "Harvest Capital Credit Corporation"
    },
    {
        value: "HCAPZ",
        label: "Harvest Capital Credit Corporation 6.125% Notes due 2022"
    },
    {
        value: "HCC",
        label: "Warrior Met Coal Inc."
    },
    {
        value: "HCCI",
        label: "Heritage-Crystal Clean Inc."
    },
    {
        value: "HCFT",
        label: "HUNT COMPANIES FINANCE TRUST"
    },
    {
        value: "HCFT-A",
        label: ""
    },
    {
        value: "HCHC",
        label: "HC2 Holdings Inc."
    },
    {
        value: "HCI",
        label: "HCI Group Inc."
    },
    {
        value: "HCKT",
        label: "The Hackett Group Inc."
    },
    {
        value: "HCLP",
        label: "Hi-Crush Partners LP representing limited partner interests"
    },
    {
        value: "HCM",
        label: "Hutchison China MediTech Limited"
    },
    {
        value: "HCOM",
        label: "Hawaiian Telcom Holdco Inc."
    },
    {
        value: "HCOR",
        label: "Hartford Corporate Bond"
    },
    {
        value: "HCP",
        label: "HCP Inc."
    },
    {
        value: "HCRF",
        label: "iShares Edge MSCI Multifactor Healthcare"
    },
    {
        value: "HCSG",
        label: "Healthcare Services Group Inc."
    },
    {
        value: "HCXZ",
        label: "Hercules Capital Inc. 5.25% Notes due 2025"
    },
    {
        value: "HD",
        label: "Home Depot Inc. (The)"
    },
    {
        value: "HDAW",
        label: "Xtrackers MSCI All World ex US High Dividend Yield Equity"
    },
    {
        value: "HDB",
        label: "HDFC Bank Limited"
    },
    {
        value: "HDEF",
        label: "Xtrackers MSCI EAFE High Dividend Yield Equity"
    },
    {
        value: "HDG",
        label: "ProShares Hedge Replication"
    },
    {
        value: "HDGE",
        label: "Ranger Equity Bear Bear"
    },
    {
        value: "HDLV",
        label: "ETRACS Montly Pay 2xLeveraged US High Dividend Low Volatility ETN due September 30 2044"
    },
    {
        value: "HDMV",
        label: "First Trust Exchange-Traded Fund III Horizon Managed Volatility Developed International"
    },
    {
        value: "HDP",
        label: "Hortonworks Inc."
    },
    {
        value: "HDS",
        label: "HD Supply Holdings Inc."
    },
    {
        value: "HDSN",
        label: "Hudson Technologies Inc."
    },
    {
        value: "HDV",
        label: "iShares Core High Dividend"
    },
    {
        value: "HE",
        label: "Hawaiian Electric Industries Inc."
    },
    {
        value: "HE-U",
        label: "Hawaiian Electric Industries Inc. 6.5 % Cum QUIPS"
    },
    {
        value: "HEAR",
        label: "Turtle Beach Corporation"
    },
    {
        value: "HEB",
        label: "Hemispherx BioPharma Inc."
    },
    {
        value: "HEBT",
        label: "Hebron Technology Co. Ltd."
    },
    {
        value: "HECO",
        label: "EcoLogical Strategy"
    },
    {
        value: "HEDJ",
        label: "WisdomTree Europe Hedged Equity Fund"
    },
    {
        value: "HEEM",
        label: "iShares Currency Hedged MSCI Emerging Markets"
    },
    {
        value: "HEES",
        label: "H&E Equipment Services Inc."
    },
    {
        value: "HEFA",
        label: "iShares Currency Hedged MSCI EAFE"
    },
    {
        value: "HEFV",
        label: "iShares Edge MSCI Min Vol EAFE Currency Hedged"
    },
    {
        value: "HEI",
        label: "Heico Corporation"
    },
    {
        value: "HEI.A",
        label: "Heico Corporation"
    },
    {
        value: "HELE",
        label: "Helen of Troy Limited"
    },
    {
        value: "HEMV",
        label: "iShares Edge MSCI Min Vol EM Currency Hedged"
    },
    {
        value: "HEP",
        label: "Holly Energy Partners L.P."
    },
    {
        value: "HEQ",
        label: "John Hancock Hedged Equity & Income Fund of Beneficial Interest"
    },
    {
        value: "HES",
        label: "Hess Corporation"
    },
    {
        value: "HES-A",
        label: "Hess Corporation Depositary Shares Series A"
    },
    {
        value: "HESM",
        label: "Hess Midstream Partners LP Representing Limited Partner Interests"
    },
    {
        value: "HEUS",
        label: "iShares Currency Hedged MSCI Europe Small-Cap"
    },
    {
        value: "HEUV",
        label: "iShares Edge MSCI Min Vol Europe Currency Hedged"
    },
    {
        value: "HEWC",
        label: "iShares Currency Hedged MSCI Canada"
    },
    {
        value: "HEWG",
        label: "iShares Currency Hedged MSCI Germany ETF"
    },
    {
        value: "HEWI",
        label: "iShares Currency Hedged MSCI Italy"
    },
    {
        value: "HEWJ",
        label: "iShares Currency Hedged MSCI Japan"
    },
    {
        value: "HEWL",
        label: "iShares Currency Hedged MSCI Switzerland"
    },
    {
        value: "HEWP",
        label: "iShares Currency Hedged MSCI Spain"
    },
    {
        value: "HEWU",
        label: "iShares Currency Hedged MSCI United Kingdom"
    },
    {
        value: "HEWW",
        label: "iShares Currency Hedged MSCI Mexico"
    },
    {
        value: "HEWY",
        label: "iShares Currency Hedged MSCI South Korea"
    },
    {
        value: "HEZU",
        label: "iShares Currency Hedged MSCI Eurozone"
    },
    {
        value: "HF",
        label: "HFF Inc. Class A"
    },
    {
        value: "HFBC",
        label: "HopFed Bancorp Inc."
    },
    {
        value: "HFBL",
        label: "Home Federal Bancorp Inc. of Louisiana"
    },
    {
        value: "HFC",
        label: "HollyFrontier Corporation"
    },
    {
        value: "HFGIC",
        label: "Hartford Funds NextShares Trust"
    },
    {
        value: "HFRO",
        label: "Highland Floating Rate Opportunities Fund"
    },
    {
        value: "HFWA",
        label: "Heritage Financial Corporation"
    },
    {
        value: "HFXE",
        label: "IQ 50 Percent Hedged FTSE Europe"
    },
    {
        value: "HFXI",
        label: "IQ 50 Percent Hedged FTSE International"
    },
    {
        value: "HFXJ",
        label: "IQ 50 Percent Hedged FTSE Japan"
    },
    {
        value: "HGH",
        label: "Hartford Financial Services Group Inc. (The) 7.875% Fixed to Floating Rate Junior Subordinated Debentures due 2042"
    },
    {
        value: "HGI",
        label: "Invesco Zacks International Multi-Asset Income"
    },
    {
        value: "HGSD",
        label: "WisdomTree Global Hedged SmallCap Dividend Fund"
    },
    {
        value: "HGSH",
        label: "China HGS Real Estate Inc."
    },
    {
        value: "HGT",
        label: "Hugoton Royalty Trust"
    },
    {
        value: "HGV",
        label: "Hilton Grand Vacations Inc."
    },
    {
        value: "HHC",
        label: "The Howard Hughes Corporation"
    },
    {
        value: "HHS",
        label: "Harte-Hanks Inc."
    },
    {
        value: "HHYX",
        label: "iShares Currency Hedged International High Yield Bond"
    },
    {
        value: "HI",
        label: "Hillenbrand Inc"
    },
    {
        value: "HIBB",
        label: "Hibbett Sports Inc."
    },
    {
        value: "HIE",
        label: "Miller/Howard High Income Equity Fund of Beneficial Interest"
    },
    {
        value: "HIFR",
        label: "InfraREIT Inc."
    },
    {
        value: "HIFS",
        label: "Hingham Institution for Savings"
    },
    {
        value: "HIG",
        label: "Hartford Financial Services Group Inc. (The)"
    },
    {
        value: "HIG+",
        label: "Hartford Financial Services Group Inc. (The) Warrants expiring June 26 2019"
    },
    {
        value: "HIHO",
        label: "Highway Holdings Limited"
    },
    {
        value: "HII",
        label: "Huntington Ingalls Industries Inc."
    },
    {
        value: "HIIQ",
        label: "Health Insurance Innovations Inc."
    },
    {
        value: "HIL",
        label: "Hill International Inc."
    },
    {
        value: "HILO",
        label: "Columbia EM Quality Dividend"
    },
    {
        value: "HIMX",
        label: "Himax Technologies Inc."
    },
    {
        value: "HIO",
        label: "Western Asset High Income Opportunity Fund Inc."
    },
    {
        value: "HIPS",
        label: "GraniteShares HIPS US High Income"
    },
    {
        value: "HIVE",
        label: "Aerohive Networks Inc."
    },
    {
        value: "HIW",
        label: "Highwoods Properties Inc."
    },
    {
        value: "HIX",
        label: "Western Asset High Income Fund II Inc."
    },
    {
        value: "HJLI",
        label: "HANCOCK JAFFE LABORATORIES I"
    },
    {
        value: "HJLIW",
        label: ""
    },
    {
        value: "HJPX",
        label: "iShares Currency Hedged JPX-Nikkei 400"
    },
    {
        value: "HJV",
        label: "MS Structured Asset Corp. SATURNS J.C. Penney Company Inc. Debenture Backed Series 2007-1 7% Callable Class A Units"
    },
    {
        value: "HK",
        label: "Halcon Resources Corporation"
    },
    {
        value: "HK+",
        label: "Halcon Resources Corporation Warrant"
    },
    {
        value: "HL",
        label: "Hecla Mining Company"
    },
    {
        value: "HL-B",
        label: "Hecla Mining Company Preferred Stock"
    },
    {
        value: "HLF",
        label: "Herbalife Nutrition Ltd."
    },
    {
        value: "HLG",
        label: "Hailiang Education Group Inc."
    },
    {
        value: "HLI",
        label: "Houlihan Lokey Inc. Class A"
    },
    {
        value: "HLIT",
        label: "Harmonic Inc."
    },
    {
        value: "HLM-",
        label: ""
    },
    {
        value: "HLNE",
        label: "Hamilton Lane Incorporated"
    },
    {
        value: "HLT",
        label: "Hilton Worldwide Holdings Inc."
    },
    {
        value: "HLTH",
        label: "Nobilis Health Corp."
    },
    {
        value: "HLX",
        label: "Helix Energy Solutions Group Inc."
    },
    {
        value: "HMC",
        label: "Honda Motor Company Ltd."
    },
    {
        value: "HMG",
        label: "HMG/Courtland Properties Inc."
    },
    {
        value: "HMHC",
        label: "Houghton Mifflin Harcourt Company"
    },
    {
        value: "HMI",
        label: "Huami Corporation American Depositary Shares each representing four Class A"
    },
    {
        value: "HMLP",
        label: "Hoegh LNG Partners LP representing Limited Partner Interests"
    },
    {
        value: "HMLP-A",
        label: "Hoegh LNG Partners LP 8.75% Series A Cumulative Redeemable Preferred Units"
    },
    {
        value: "HMN",
        label: "Horace Mann Educators Corporation"
    },
    {
        value: "HMNF",
        label: "HMN Financial Inc."
    },
    {
        value: "HMNY",
        label: "Helios and Matheson Analytics Inc"
    },
    {
        value: "HMOP",
        label: "Hartford Municipal Opportunities"
    },
    {
        value: "HMST",
        label: "HomeStreet Inc."
    },
    {
        value: "HMSY",
        label: "HMS Holdings Corp"
    },
    {
        value: "HMTA",
        label: "HomeTown Bankshares Corporation"
    },
    {
        value: "HMTV",
        label: "Hemisphere Media Group Inc."
    },
    {
        value: "HMY",
        label: "Harmony Gold Mining Company Limited"
    },
    {
        value: "HNDL",
        label: "Strategy Shares Nasdaq 7HANDL Index ETF"
    },
    {
        value: "HNI",
        label: "HNI Corporation"
    },
    {
        value: "HNNA",
        label: "Hennessy Advisors Inc."
    },
    {
        value: "HNP",
        label: "Huaneng Power Intl"
    },
    {
        value: "HNRG",
        label: "Hallador Energy Company"
    },
    {
        value: "HNW",
        label: "Pioneer Diversified High Income Trust of Beneficial Interest"
    },
    {
        value: "HOFT",
        label: "Hooker Furniture Corporation"
    },
    {
        value: "HOG",
        label: "Harley-Davidson Inc."
    },
    {
        value: "HOLD",
        label: "AdvisorShares Sage Core Reserves"
    },
    {
        value: "HOLI",
        label: "Hollysys Automation Technologies Ltd."
    },
    {
        value: "HOLX",
        label: "Hologic Inc."
    },
    {
        value: "HOMB",
        label: "Home BancShares Inc."
    },
    {
        value: "HOME",
        label: "At Home Group Inc."
    },
    {
        value: "HOML",
        label: "ETRACS Monthly Reset 2xLeveraged ISE Exclusively Homebuilders ETN due March 13 2045"
    },
    {
        value: "HON",
        label: "Honeywell International Inc."
    },
    {
        value: "HONE",
        label: "HarborOne Bancorp Inc."
    },
    {
        value: "HONR",
        label: "InsightShares Patriotic Employers"
    },
    {
        value: "HOPE",
        label: "Hope Bancorp Inc."
    },
    {
        value: "HOS",
        label: "Hornbeck Offshore Services"
    },
    {
        value: "HOV",
        label: "Hovnanian Enterprises Inc. Class A"
    },
    {
        value: "HOVNP",
        label: "Hovnanian Enterprises Inc Depositary Share representing 1/1000th of 7.625% Series A Preferred Stock"
    },
    {
        value: "HP",
        label: "Helmerich & Payne Inc."
    },
    {
        value: "HPE",
        label: "Hewlett Packard Enterprise Company"
    },
    {
        value: "HPF",
        label: "John Hancock Pfd Income Fund II Pfd Income Fund II"
    },
    {
        value: "HPI",
        label: "John Hancock Preferred Income Fund of Beneficial Interest"
    },
    {
        value: "HPJ",
        label: "Highpower International Inc"
    },
    {
        value: "HPP",
        label: "Hudson Pacific Properties Inc."
    },
    {
        value: "HPQ",
        label: "HP Inc."
    },
    {
        value: "HPR",
        label: "HIGHPOINT RESOURCES CORP"
    },
    {
        value: "HPS",
        label: "John Hancock Preferred Income Fund III Preferred Income Fund III"
    },
    {
        value: "HPT",
        label: "Hospitality Properties Trust"
    },
    {
        value: "HQBD",
        label: "Hartford Quality Bonds"
    },
    {
        value: "HQCL",
        label: "Hanwha Q CELLS Co. Ltd."
    },
    {
        value: "HQH",
        label: "Tekla Healthcare Investors"
    },
    {
        value: "HQL",
        label: "TeklaLife Sciences Investors"
    },
    {
        value: "HQY",
        label: "HealthEquity Inc."
    },
    {
        value: "HR",
        label: "Healthcare Realty Trust Incorporated"
    },
    {
        value: "HRB",
        label: "H&R Block Inc."
    },
    {
        value: "HRC",
        label: "Hill-Rom Holdings Inc"
    },
    {
        value: "HRG",
        label: "HRG Group Inc."
    },
    {
        value: "HRI",
        label: "Herc Holdings Inc."
    },
    {
        value: "HRL",
        label: "Hormel Foods Corporation"
    },
    {
        value: "HRS",
        label: "Harris Corporation"
    },
    {
        value: "HRTG",
        label: "Heritage Insurance Holdings Inc."
    },
    {
        value: "HRTX",
        label: "Heron Therapeutics Inc."
    },
    {
        value: "HRZN",
        label: "Horizon Technology Finance Corporation"
    },
    {
        value: "HSBC",
        label: "HSBC Holdings plc."
    },
    {
        value: "HSBC-A",
        label: "HSBC Holdings plc. ADR SER A REP 1/40 PFD SER A"
    },
    {
        value: "HSC",
        label: "Harsco Corporation"
    },
    {
        value: "HSCZ",
        label: "iShares Currency Hedged MSCI EAFE Small-Cap"
    },
    {
        value: "HSDT",
        label: "Helius Medical Technologies Inc."
    },
    {
        value: "HSGX",
        label: "Histogenics Corporation"
    },
    {
        value: "HSIC",
        label: "Henry Schein Inc."
    },
    {
        value: "HSII",
        label: "Heidrick & Struggles International Inc."
    },
    {
        value: "HSKA",
        label: "Heska Corporation"
    },
    {
        value: "HSON",
        label: "Hudson Global Inc."
    },
    {
        value: "HSPX",
        label: "Horizons ETF Trust I S&P 500 Covered Call"
    },
    {
        value: "HSRT",
        label: "HARTFORD SHORT DURATION ETF"
    },
    {
        value: "HST",
        label: "Host Hotels & Resorts Inc."
    },
    {
        value: "HSTM",
        label: "HealthStream Inc."
    },
    {
        value: "HSY",
        label: "The Hershey Company"
    },
    {
        value: "HT",
        label: "Hersha Hospitality Trust Class A of Beneficial Interest"
    },
    {
        value: "HT-C",
        label: "Hersha Hospitality Trust 6.875% Series C Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "HT-D",
        label: "Hersha Hospitality Trust 6.50% Series D Cumulative Redeemable Preferred Shares of Beneficial Interest $0.01 par value per share"
    },
    {
        value: "HT-E",
        label: "Hersha Hospitality Trust 6.50% Series E Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "HTA",
        label: "Healthcare Trust of America Inc. Class A"
    },
    {
        value: "HTAB",
        label: "Hartford Schroders Tax-Aware Bond"
    },
    {
        value: "HTBI",
        label: "HomeTrust Bancshares Inc."
    },
    {
        value: "HTBK",
        label: "Heritage Commerce Corp"
    },
    {
        value: "HTBX",
        label: "Heat Biologics Inc."
    },
    {
        value: "HTD",
        label: "John Hancock Tax Advantaged Dividend Income Fund of Beneficial Interest"
    },
    {
        value: "HTFA",
        label: "Horizon Technology Finance Corporation 6.25% Notes due 2022"
    },
    {
        value: "HTGC",
        label: "Hercules Capital Inc."
    },
    {
        value: "HTGM",
        label: "HTG Molecular Diagnostics Inc."
    },
    {
        value: "HTGX",
        label: "Hercules Capital Inc. 6.25% Notes due 2024"
    },
    {
        value: "HTH",
        label: "Hilltop Holdings Inc."
    },
    {
        value: "HTHT",
        label: "China Lodging Group Limited"
    },
    {
        value: "HTLD",
        label: "Heartland Express Inc."
    },
    {
        value: "HTLF",
        label: "Heartland Financial USA Inc."
    },
    {
        value: "HTRB",
        label: "Hartford Total Return Bond"
    },
    {
        value: "HTUS",
        label: "Hull Tactical US"
    },
    {
        value: "HTY",
        label: "John Hancock Tax-Advantaged Global Shareholder Yield Fund of Beneficial Interest"
    },
    {
        value: "HTZ",
        label: "Hertz Global Holdings Inc"
    },
    {
        value: "HUBB",
        label: "Hubbell Inc"
    },
    {
        value: "HUBG",
        label: "Hub Group Inc."
    },
    {
        value: "HUBS",
        label: "HubSpot Inc."
    },
    {
        value: "HUD",
        label: "Hudson Ltd. Class A"
    },
    {
        value: "HUM",
        label: "Humana Inc."
    },
    {
        value: "HUN",
        label: "Huntsman Corporation"
    },
    {
        value: "HUNT",
        label: "Hunter Maritime Acquisition Corp."
    },
    {
        value: "HUNTU",
        label: "Hunter Maritime Acquisition Corp. Unit"
    },
    {
        value: "HUNTW",
        label: "Hunter Maritime Acquisition Corp. Warrant"
    },
    {
        value: "HURC",
        label: "Hurco Companies Inc."
    },
    {
        value: "HURN",
        label: "Huron Consulting Group Inc."
    },
    {
        value: "HUSA",
        label: "Houston American Energy Corporation"
    },
    {
        value: "HUSE",
        label: "US Market Rotation Strategy"
    },
    {
        value: "HUSV",
        label: "First Trust Exchange-Traded Fund III Horizon Managed Volatility Domestic"
    },
    {
        value: "HUYA",
        label: "HUYA Inc. American depositary shares each representing one Class A"
    },
    {
        value: "HVBC",
        label: "HV Bancorp Inc."
    },
    {
        value: "HVT",
        label: "Haverty Furniture Companies Inc."
    },
    {
        value: "HVT.A",
        label: "Haverty Furniture Companies Inc."
    },
    {
        value: "HWBK",
        label: "Hawthorn Bancshares Inc."
    },
    {
        value: "HWC",
        label: "Hancock Whitney Corporation"
    },
    {
        value: "HWCC",
        label: "Houston Wire & Cable Company"
    },
    {
        value: "HWCPL",
        label: ""
    },
    {
        value: "HWKN",
        label: "Hawkins Inc."
    },
    {
        value: "HX",
        label: "Hexindai Inc."
    },
    {
        value: "HXL",
        label: "Hexcel Corporation"
    },
    {
        value: "HY",
        label: "Hyster-Yale Materials Handling Inc. Class A"
    },
    {
        value: "HYAC",
        label: "Haymaker Acquisition Corp."
    },
    {
        value: "HYACU",
        label: "Haymaker Acquisition Corp. Unit"
    },
    {
        value: "HYACW",
        label: "Haymaker Acquisition Corp. Warrant"
    },
    {
        value: "HYB",
        label: "New America High Income Fund Inc. (The)"
    },
    {
        value: "HYD",
        label: "VanEck Vectors High Yield Municipal Index"
    },
    {
        value: "HYDB",
        label: "iShares Edge High Yield Defensive Bond"
    },
    {
        value: "HYDD",
        label: "Direxion Daily High Yield Bear 2X Shares"
    },
    {
        value: "HYDW",
        label: "Xtrackers Low Beta High Yield Bond"
    },
    {
        value: "HYEM",
        label: "VanEck Vectors Emerging Markets High Yield Bond"
    },
    {
        value: "HYG",
        label: "iShares iBoxx $ High Yield Corporate Bond"
    },
    {
        value: "HYGH",
        label: "iShares Interest Rate Hedged High Yield Bond"
    },
    {
        value: "HYGS",
        label: "Hydrogenics Corporation"
    },
    {
        value: "HYH",
        label: "Halyard Health Inc."
    },
    {
        value: "HYHG",
        label: "ProShares High Yield Interest Rate Hedged"
    },
    {
        value: "HYI",
        label: "Western Asset High Yield Defined Opportunity Fund Inc."
    },
    {
        value: "HYIH",
        label: "Xtrackers High Yield Corporate Bond - Interest Rate Hedged"
    },
    {
        value: "HYLB",
        label: "Xtrackers USD High Yield Corporate Bond"
    },
    {
        value: "HYLD",
        label: "Peritus High Yield"
    },
    {
        value: "HYLS",
        label: "First Trust High Yield Long/Short ETF"
    },
    {
        value: "HYLV",
        label: "IndexIQ ETF Trust IQ S&P High Yield Low Volatility Bond"
    },
    {
        value: "HYMB",
        label: "SPDR Nuveen S&P High Yield Municipal Bond"
    },
    {
        value: "HYND",
        label: "WisdomTree Negative Duration High Yield Bond Fund"
    },
    {
        value: "HYS",
        label: "PIMCO 0-5 Year High Yield Corporat Bond Index Exchange-Traded Fund"
    },
    {
        value: "HYT",
        label: "Blackrock Corporate High Yield Fund Inc."
    },
    {
        value: "HYUP",
        label: "Xtrackers High Beta High Yield Bond"
    },
    {
        value: "HYXE",
        label: "iShares iBoxx $ High Yield ex Oil & Gas Corporate Bond ETF"
    },
    {
        value: "HYXU",
        label: "iShares International High Yield Bond"
    },
    {
        value: "HYZD",
        label: "WisdomTree Interest Rate Hedged High Yield Bond Fund"
    },
    {
        value: "HZN",
        label: "Horizon Global Corporation"
    },
    {
        value: "HZNP",
        label: "Horizon Pharma plc"
    },
    {
        value: "HZO",
        label: "MarineMax Inc. (FL)"
    },
    {
        value: "I",
        label: "Intelsat S.A."
    },
    {
        value: "IAC",
        label: "IAC/InterActiveCorp"
    },
    {
        value: "IAE",
        label: "Voya Asia Pacific High Dividend Equity Income Fund ING Asia Pacific High Dividend Equity Income Fund of Beneficial Interest"
    },
    {
        value: "IAF",
        label: "Aberdeen Australia Equity Fund Inc"
    },
    {
        value: "IAG",
        label: "Iamgold Corporation"
    },
    {
        value: "IAGG",
        label: "iShares International Aggregate Bond Fund"
    },
    {
        value: "IAI",
        label: "iShares U.S. Broker-Dealers & Securities Exchanges"
    },
    {
        value: "IAK",
        label: "iShares U.S. Insurance"
    },
    {
        value: "IAM",
        label: "I-AM Capital Acquisition Company"
    },
    {
        value: "IAMXR",
        label: "I-AM Capital Acquisition Company Right"
    },
    {
        value: "IAMXW",
        label: "I-AM Capital Acquisition Company Warrant"
    },
    {
        value: "IART",
        label: "Integra LifeSciences Holdings Corporation"
    },
    {
        value: "IAT",
        label: "iShares U.S. Regional Banks"
    },
    {
        value: "IAU",
        label: "ishares Gold Trust"
    },
    {
        value: "IBA",
        label: "Industrias Bachoco S.A.B. de C.V."
    },
    {
        value: "IBB",
        label: "iShares Nasdaq Biotechnology Index Fund"
    },
    {
        value: "IBCD",
        label: "iShares iBonds Mar 2020 Term Corporate ex-Financials Term"
    },
    {
        value: "IBCE",
        label: "iShares iBonds Mar 2023 Term Corporate ex-Financials"
    },
    {
        value: "IBCP",
        label: "Independent Bank Corporation"
    },
    {
        value: "IBD",
        label: "Inspire Corporate Bond Impact"
    },
    {
        value: "IBDC",
        label: "iShares iBonds Mar 2020 Term Corporate"
    },
    {
        value: "IBDD",
        label: "iShares iBonds Mar 2023 Term Corporate"
    },
    {
        value: "IBDH",
        label: "iShares iBonds Dec 2018 Term Corporate"
    },
    {
        value: "IBDK",
        label: "iShares iBonds Dec 2019 Term Corporate"
    },
    {
        value: "IBDL",
        label: "iShares iBonds Dec 2020 Term Corporate"
    },
    {
        value: "IBDM",
        label: "iShares iBonds Dec 2021 Term Corporate"
    },
    {
        value: "IBDN",
        label: "iShares iBonds Dec 2022 Term Corporate"
    },
    {
        value: "IBDO",
        label: "iShares iBonds Dec 2023 Term Corporate"
    },
    {
        value: "IBDP",
        label: "iShares iBonds Dec 2024 Term Corporate"
    },
    {
        value: "IBDQ",
        label: "iShares iBonds Dec 2025 Term Corporate"
    },
    {
        value: "IBDR",
        label: "iShares iBonds Dec 2026 Term Corporate"
    },
    {
        value: "IBDS",
        label: "iShares iBonds Dec 2027 Term Corporate"
    },
    {
        value: "IBIO",
        label: "iBio Inc."
    },
    {
        value: "IBKC",
        label: "IBERIABANK Corporation"
    },
    {
        value: "IBKCO",
        label: "IBERIABANK Corporation Depositary Shares Representing Series C Fixed to Floating"
    },
    {
        value: "IBKCP",
        label: "IBERIABANK Corporation Depositary Shares Representing Series B Fixed to Floating"
    },
    {
        value: "IBKR",
        label: "Interactive Brokers Group Inc."
    },
    {
        value: "IBM",
        label: "International Business Machines Corporation"
    },
    {
        value: "IBMG",
        label: "iShares iBonds Sep 2018 Term Muni Bond"
    },
    {
        value: "IBMH",
        label: "iShares iBonds Sep 2019 Term Muni Bond"
    },
    {
        value: "IBMI",
        label: "iShares iBonds Sep 2020 Term Muni Bond"
    },
    {
        value: "IBMJ",
        label: "iShares iBonds Dec 2021 Term Muni Bond"
    },
    {
        value: "IBMK",
        label: "iShares iBonds Dec 2022 Term Muni Bond"
    },
    {
        value: "IBML",
        label: "iShares iBonds Dec 2023 Term Muni Bond"
    },
    {
        value: "IBMM",
        label: "iShares iBonds Dec 2024 Term Muni Bond"
    },
    {
        value: "IBN",
        label: "ICICI Bank Limited"
    },
    {
        value: "IBND",
        label: "SPDR Bloomberg Barclays International Corporate Bond"
    },
    {
        value: "IBOC",
        label: "International Bancshares Corporation"
    },
    {
        value: "IBP",
        label: "Installed Building Products Inc."
    },
    {
        value: "IBTX",
        label: "Independent Bank Group Inc"
    },
    {
        value: "IBUY",
        label: "Amplify Online Retail ETF"
    },
    {
        value: "ICAD",
        label: "icad inc."
    },
    {
        value: "ICAN",
        label: "SerenityShares Impact"
    },
    {
        value: "ICBK",
        label: "County Bancorp Inc."
    },
    {
        value: "ICCC",
        label: "ImmuCell Corporation"
    },
    {
        value: "ICCH",
        label: "ICC Holdings Inc."
    },
    {
        value: "ICD",
        label: "Independence Contract Drilling Inc."
    },
    {
        value: "ICE",
        label: "Intercontinental Exchange Inc."
    },
    {
        value: "ICF",
        label: "iShares Cohen & Steers REIT"
    },
    {
        value: "ICFI",
        label: "ICF International Inc."
    },
    {
        value: "ICHR",
        label: "Ichor Holdings"
    },
    {
        value: "ICL",
        label: "Israel Chemicals Limited"
    },
    {
        value: "ICLK",
        label: "iClick Interactive Asia Group Limited"
    },
    {
        value: "ICLN",
        label: "iShares S&P Global Clean Energy Index Fund"
    },
    {
        value: "ICLR",
        label: "ICON plc"
    },
    {
        value: "ICOL",
        label: "iShares Inc MSCI Colombia"
    },
    {
        value: "ICON",
        label: "Iconix Brand Group Inc."
    },
    {
        value: "ICOW",
        label: "Pacer Developed Markets International Cash Cows 100"
    },
    {
        value: "ICPT",
        label: "Intercept Pharmaceuticals Inc."
    },
    {
        value: "ICSH",
        label: "iShares Ultra Short-Term Bond"
    },
    {
        value: "ICUI",
        label: "ICU Medical Inc."
    },
    {
        value: "ICVT",
        label: "iShares Convertible Bond"
    },
    {
        value: "IDA",
        label: "IDACORP Inc."
    },
    {
        value: "IDCC",
        label: "InterDigital Inc."
    },
    {
        value: "IDE",
        label: "Voya Infrastructure Industrials and Materials Fund of Beneficial Interest"
    },
    {
        value: "IDEV",
        label: "iShares Core MSCI International Developed Markets"
    },
    {
        value: "IDHD",
        label: "Invesco S&P International Developed High Dividend Low Volatility"
    },
    {
        value: "IDHQ",
        label: "Invesco S&P International Developed Quality"
    },
    {
        value: "IDIV",
        label: "U.S. Equity Cumulative Dividends Fund Series 2027 Shares"
    },
    {
        value: "IDLB",
        label: "Invesco FTSE International Low Beta Equal Weight ETF"
    },
    {
        value: "IDLV",
        label: "Invesco S&P International Developed Low Volatility"
    },
    {
        value: "IDMO",
        label: "Invesco S&P International Developed Momentum"
    },
    {
        value: "IDN",
        label: "Intellicheck Inc."
    },
    {
        value: "IDOG",
        label: "ALPS International Sector Dividend Dogs"
    },
    {
        value: "IDRA",
        label: "Idera Pharmaceuticals Inc."
    },
    {
        value: "IDSA",
        label: "Industrial Services of America Inc."
    },
    {
        value: "IDSY",
        label: "I.D. Systems Inc."
    },
    {
        value: "IDT",
        label: "IDT Corporation Class B"
    },
    {
        value: "IDTI",
        label: "Integrated Device Technology Inc."
    },
    {
        value: "IDU",
        label: "iShares U.S. Utilities"
    },
    {
        value: "IDV",
        label: "iShares International Select Dividend"
    },
    {
        value: "IDX",
        label: "VanEck Vectors Indonesia Index"
    },
    {
        value: "IDXG",
        label: "Interpace Diagnostics Group Inc."
    },
    {
        value: "IDXX",
        label: "IDEXX Laboratories Inc."
    },
    {
        value: "IEA",
        label: "Infrastructure and Energy Alternatives Inc."
    },
    {
        value: "IEAWW",
        label: "Infrastructure and Energy Alternatives Inc. Warrant"
    },
    {
        value: "IEC",
        label: "IEC Electronics Corp."
    },
    {
        value: "IECS",
        label: "iShares Evolved U.S. Consumer Staples"
    },
    {
        value: "IEDI",
        label: "iShares Evolved U.S. Discretionary Spending"
    },
    {
        value: "IEF",
        label: "iShares 7-10 Year Treasury Bond ETF"
    },
    {
        value: "IEFA",
        label: "iShares Core MSCI EAFE"
    },
    {
        value: "IEFN",
        label: "iShares Evolved U.S. Financials"
    },
    {
        value: "IEHS",
        label: "iShares Evolved U.S. Healthcare Staples"
    },
    {
        value: "IEI",
        label: "iShares 3-7 Year Treasury Bond ETF"
    },
    {
        value: "IEIH",
        label: "iShares Evolved U.S. Innovative Healthcare"
    },
    {
        value: "IEME",
        label: "iShares Evolved U.S. Media and Entertainment"
    },
    {
        value: "IEMG",
        label: "iShares Core MSCI Emerging Markets"
    },
    {
        value: "IEO",
        label: "iShares U.S. Oil & Gas Exploration & Production"
    },
    {
        value: "IEP",
        label: "Icahn Enterprises L.P."
    },
    {
        value: "IESC",
        label: "IES Holdings Inc."
    },
    {
        value: "IETC",
        label: "iShares Evolved U.S. Technology"
    },
    {
        value: "IEUR",
        label: "iShares Core MSCI Europe"
    },
    {
        value: "IEUS",
        label: "iShares MSCI Europe Small-Cap ETF"
    },
    {
        value: "IEV",
        label: "iShares Europe"
    },
    {
        value: "IEX",
        label: "IDEX Corporation"
    },
    {
        value: "IEZ",
        label: "iShares U.S. Oil Equipment & Services"
    },
    {
        value: "IFEU",
        label: "iShares FTSE EPRA/NAREIT Europe Index Fund"
    },
    {
        value: "IFF",
        label: "Internationa Flavors & Fragrances Inc."
    },
    {
        value: "IFGL",
        label: "iShares FTSE EPRA/NAREIT Global Real Estate ex-U.S. Index Fund"
    },
    {
        value: "IFIX",
        label: "Xtrackers Barclays International Corporate Bond Hedged"
    },
    {
        value: "IFLY",
        label: "ETFMG Drone Economy Strategy"
    },
    {
        value: "IFMK",
        label: "iFresh Inc."
    },
    {
        value: "IFN",
        label: "India Fund Inc. (The)"
    },
    {
        value: "IFON",
        label: "InfoSonics Corp"
    },
    {
        value: "IFRA",
        label: "iShares U.S. Infrastructure"
    },
    {
        value: "IFRX",
        label: "InflaRx N.V."
    },
    {
        value: "IFV",
        label: "First Trust Dorsey Wright International Focus 5 ETF"
    },
    {
        value: "IG",
        label: "Principal Investment Grade Corporate Active"
    },
    {
        value: "IGA",
        label: "Voya Global Advantage and Premium Opportunity Fund of Beneficial Interest"
    },
    {
        value: "IGC",
        label: "India Globalization Capital Inc."
    },
    {
        value: "IGD",
        label: "Voya Global Equity Dividend and Premium Opportunity Fund"
    },
    {
        value: "IGE",
        label: "iShares North American Natural Resources"
    },
    {
        value: "IGEB",
        label: "iShares Edge Investment Grade Enhanced Bond"
    },
    {
        value: "IGEM",
        label: "VanEck Vectors ETF Trust Market Vectors EM Investment Grade + BB Rated USD Sovereign Bond"
    },
    {
        value: "IGF",
        label: "iShares Global Infrastructure ETF"
    },
    {
        value: "IGHG",
        label: "ProShares Investment Grade-Interest Rate Hedged"
    },
    {
        value: "IGI",
        label: "Western Asset Investment Grade Defined Opportunity Trust Inc."
    },
    {
        value: "IGIH",
        label: "Xtrackers Investment Grade Bond - Interest Rate Hedged"
    },
    {
        value: "IGLD",
        label: "Internet Gold Golden Lines Ltd."
    },
    {
        value: "IGM",
        label: "iShares North American Tech"
    },
    {
        value: "IGN",
        label: "iShares North American Tech-Multimedia Networking"
    },
    {
        value: "IGOV",
        label: "iShares International Treasury Bond ETF"
    },
    {
        value: "IGR",
        label: "CBRE Clarion Global Real Estate Income Fund"
    },
    {
        value: "IGRO",
        label: "iShares International Dividend Growth"
    },
    {
        value: "IGT",
        label: "International Game Technology"
    },
    {
        value: "IGV",
        label: "iShares North American Tech-Software"
    },
    {
        value: "IGVT",
        label: "Xtrackers Barclays International Treasury Bond Hedged"
    },
    {
        value: "IHC",
        label: "Independence Holding Company"
    },
    {
        value: "IHD",
        label: "Voya Emerging Markets High Income Dividend Equity Fund"
    },
    {
        value: "IHDG",
        label: "WisdomTree International Hedged Quality Dividend Growth Fund"
    },
    {
        value: "IHE",
        label: "iShares U.S. Pharmaceutical"
    },
    {
        value: "IHF",
        label: "iShares U.S. Health Care Providers"
    },
    {
        value: "IHG",
        label: "Intercontinental Hotels Group American Depositary Shares (Each representing one)"
    },
    {
        value: "IHI",
        label: "iShares U.S. Medical Devices"
    },
    {
        value: "IHIT",
        label: "Invesco High Income 2023 Target Term Fund of Beneficial Interest"
    },
    {
        value: "IHT",
        label: "InnSuites Hospitality Trust Shares of Beneficial Interest"
    },
    {
        value: "IHTA",
        label: "Invesco High Income 2024 Target Term Fund of Beneficial Interest No par value per share"
    },
    {
        value: "IHY",
        label: "VanEck Vectors International High Yield Bond"
    },
    {
        value: "IID",
        label: "Voya International High Dividend Equity Income Fund of Beneficial Interest"
    },
    {
        value: "IIF",
        label: "Morgan Stanley India Investment Fund Inc."
    },
    {
        value: "III",
        label: "Information Services Group Inc."
    },
    {
        value: "IIIN",
        label: "Insteel Industries Inc."
    },
    {
        value: "IIJI",
        label: "Internet Initiative Japan Inc."
    },
    {
        value: "IIM",
        label: "Invesco Value Municipal Income Trust"
    },
    {
        value: "IIN",
        label: "IntriCon Corporation"
    },
    {
        value: "IIPR",
        label: "Innovative Industrial Properties Inc."
    },
    {
        value: "IIPR-A",
        label: "Innovative Industrial Properties Inc. 9.00% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "IIVI",
        label: "II-VI Incorporated"
    },
    {
        value: "IJH",
        label: "iShares Core S&P Mid-Cap"
    },
    {
        value: "IJJ",
        label: "iShares S&P Mid-Cap 400 Value"
    },
    {
        value: "IJK",
        label: "iShares S&P Mid-Cap 400 Growth"
    },
    {
        value: "IJR",
        label: "iShares Core S&P Small-Cap"
    },
    {
        value: "IJS",
        label: "iShares S&P SmallCap 600 Value"
    },
    {
        value: "IJT",
        label: "iShares S&P Small-Cap 600 Growth ETF"
    },
    {
        value: "IKNX",
        label: "Ikonics Corporation"
    },
    {
        value: "ILF",
        label: "iShares Latin America 40"
    },
    {
        value: "ILG",
        label: "ILG Inc"
    },
    {
        value: "ILMN",
        label: "Illumina Inc."
    },
    {
        value: "ILPT",
        label: "Industrial Logistics Properties Trust"
    },
    {
        value: "ILTB",
        label: "iShares Core 10 Year USD Bond"
    },
    {
        value: "IMAX",
        label: "Imax Corporation"
    },
    {
        value: "IMDZ",
        label: "Immune Design Corp."
    },
    {
        value: "IMGN",
        label: "ImmunoGen Inc."
    },
    {
        value: "IMH",
        label: "Impac Mortgage Holdings Inc."
    },
    {
        value: "IMI",
        label: "Intermolecular Inc."
    },
    {
        value: "IMKTA",
        label: "Ingles Markets Incorporated Class A Common Stock"
    },
    {
        value: "IMLP",
        label: "iPath S&P MLP ETN"
    },
    {
        value: "IMMP",
        label: "Immutep Limited"
    },
    {
        value: "IMMR",
        label: "Immersion Corporation"
    },
    {
        value: "IMMU",
        label: "Immunomedics Inc."
    },
    {
        value: "IMMY",
        label: "Imprimis Pharmaceuticals Inc."
    },
    {
        value: "IMNP",
        label: "Immune Pharmaceuticals Inc."
    },
    {
        value: "IMO",
        label: "Imperial Oil Limited"
    },
    {
        value: "IMOM",
        label: "Alpha Architect International Quantitative Momentum"
    },
    {
        value: "IMOS",
        label: "ChipMOS TECHNOLOGIES INC."
    },
    {
        value: "IMPV",
        label: "Imperva Inc."
    },
    {
        value: "IMRN",
        label: "Immuron Limited"
    },
    {
        value: "IMRNW",
        label: "Immuron Limited Warrants"
    },
    {
        value: "IMTB",
        label: "iShares Core 5-10 Year USD Bond"
    },
    {
        value: "IMTE",
        label: "Integrated Media Technology Limited"
    },
    {
        value: "IMTM",
        label: "iShares Edge MSCI Intl Momentum Factor"
    },
    {
        value: "IMUC",
        label: "ImmunoCellular Therapeutics Ltd."
    },
    {
        value: "IMUC+",
        label: "ImmunoCellular Therapeutics Ltd. Warrants"
    },
    {
        value: "IMV",
        label: "IMV INC"
    },
    {
        value: "INAP",
        label: "Internap Corporation"
    },
    {
        value: "INB",
        label: "Cohen & Steers Global Income Builder Inc. of Beneficial Interest"
    },
    {
        value: "INBK",
        label: "First Internet Bancorp"
    },
    {
        value: "INBKL",
        label: "First Internet Bancorp 6.0% Fixed-to-Floating Rate Subordinated Notes due 2026"
    },
    {
        value: "INCO",
        label: "Columbia India Consumer"
    },
    {
        value: "INCY",
        label: "Incyte Corporation"
    },
    {
        value: "INDA",
        label: "Ishares MSCI India"
    },
    {
        value: "INDB",
        label: "Independent Bank Corp."
    },
    {
        value: "INDF",
        label: "iShares Edge MSCI Multifactor Industrials"
    },
    {
        value: "INDL",
        label: "Direxion Daily MSCI India Bull 3x Shares"
    },
    {
        value: "INDS",
        label: "Pacer Benchmark Industrial Real Estate SCTR"
    },
    {
        value: "INDU",
        label: "Industrea Acquisition Corp."
    },
    {
        value: "INDUU",
        label: "Industrea Acquisition Corp. Unit"
    },
    {
        value: "INDUW",
        label: "Industrea Acquisition Corp. Warrant"
    },
    {
        value: "INDY",
        label: "iShares S&P India Nifty 50 Index Fund"
    },
    {
        value: "INF",
        label: "Brookfield Global Listed Infrastructure Income Fund Closed End Fund"
    },
    {
        value: "INFI",
        label: "Infinity Pharmaceuticals Inc."
    },
    {
        value: "INFN",
        label: "Infinera Corporation"
    },
    {
        value: "INFO",
        label: "IHS Markit Ltd."
    },
    {
        value: "INFR",
        label: "Legg Mason Global Infrastructure ETF"
    },
    {
        value: "INFU",
        label: "InfuSystems Holdings Inc."
    },
    {
        value: "INFY",
        label: "Infosys Limited American Depositary Shares"
    },
    {
        value: "ING",
        label: "ING Group N.V."
    },
    {
        value: "INGN",
        label: "Inogen Inc"
    },
    {
        value: "INGR",
        label: "Ingredion Incorporated"
    },
    {
        value: "INKM",
        label: "SPDR SSgA Income Allocation"
    },
    {
        value: "INN",
        label: "Summit Hotel Properties Inc."
    },
    {
        value: "INN-D",
        label: "Summit Hotel Properties Inc. 6.45% Series D Cumulative Redeemable Preferred Stock"
    },
    {
        value: "INN-E",
        label: "Summit Hotel Properties Inc. 6.250% Series E Cumulative Redeemable Preferred Stock"
    },
    {
        value: "INNT",
        label: "Innovate Biopharmaceuticals Inc."
    },
    {
        value: "INO",
        label: "Inovio Pharmaceuticals Inc."
    },
    {
        value: "INOD",
        label: "Innodata Inc."
    },
    {
        value: "INOV",
        label: "Inovalon Holdings Inc."
    },
    {
        value: "INPX",
        label: "Inpixon"
    },
    {
        value: "INR",
        label: "Market Vectors Indian Rupee/USD ETN"
    },
    {
        value: "INS",
        label: "Intelligent Systems Corporation"
    },
    {
        value: "INSE",
        label: "Inspired Entertainment Inc."
    },
    {
        value: "INSG",
        label: "Inseego Corp."
    },
    {
        value: "INSI",
        label: "Insight Select Income Fund"
    },
    {
        value: "INSM",
        label: "Insmed Inc."
    },
    {
        value: "INSP",
        label: "Inspire Medical Systems Inc."
    },
    {
        value: "INST",
        label: "Instructure Inc."
    },
    {
        value: "INSW",
        label: "International Seaways Inc."
    },
    {
        value: "INSY",
        label: "Insys Therapeutics Inc."
    },
    {
        value: "INT",
        label: "World Fuel Services Corporation"
    },
    {
        value: "INTC",
        label: "Intel Corporation"
    },
    {
        value: "INTF",
        label: "iShares Edge MSCI Multifactor Intl"
    },
    {
        value: "INTG",
        label: "The Intergroup Corporation"
    },
    {
        value: "INTL",
        label: "INTL FCStone Inc."
    },
    {
        value: "INTT",
        label: "inTest Corporation"
    },
    {
        value: "INTU",
        label: "Intuit Inc."
    },
    {
        value: "INTX",
        label: "Intersections Inc."
    },
    {
        value: "INUV",
        label: "Inuvo Inc."
    },
    {
        value: "INVA",
        label: "Innoviva Inc."
    },
    {
        value: "INVE",
        label: "Identiv Inc."
    },
    {
        value: "INVH",
        label: "Invitation Homes Inc."
    },
    {
        value: "INWK",
        label: "InnerWorkings Inc."
    },
    {
        value: "INXN",
        label: "InterXion Holding N.V. (0.01 nominal value)"
    },
    {
        value: "INXX",
        label: "Columbia India Infrastructure"
    },
    {
        value: "IO",
        label: "Ion Geophysical Corporation"
    },
    {
        value: "IONS",
        label: "Ionis Pharmaceuticals Inc."
    },
    {
        value: "IOO",
        label: "iShares Global 100"
    },
    {
        value: "IOR",
        label: "Income Opportunity Realty Investors Inc."
    },
    {
        value: "IOSP",
        label: "Innospec Inc."
    },
    {
        value: "IOTS",
        label: "Adesto Technologies Corporation"
    },
    {
        value: "IOVA",
        label: "Iovance Biotherapeutics Inc."
    },
    {
        value: "IP",
        label: "International Paper Company"
    },
    {
        value: "IPAC",
        label: "iShares Core MSCI Pacific"
    },
    {
        value: "IPAR",
        label: "Inter Parfums Inc."
    },
    {
        value: "IPAS",
        label: "iPass Inc."
    },
    {
        value: "IPAY",
        label: "ETFMG Prime Mobile Payments"
    },
    {
        value: "IPB",
        label: "Merrill Lynch & Co. Inc. 6.0518% Index Plus Trust Certificates Series 2003-1"
    },
    {
        value: "IPCC",
        label: "Infinity Property and Casualty Corporation"
    },
    {
        value: "IPCI",
        label: "Intellipharmaceutics International Inc."
    },
    {
        value: "IPDN",
        label: "Professional Diversity Network Inc."
    },
    {
        value: "IPE",
        label: "SPDR Bloomberg Barclays TIPS"
    },
    {
        value: "IPFF",
        label: "iShares International Preferred Stock"
    },
    {
        value: "IPG",
        label: "Interpublic Group of Companies Inc. (The)"
    },
    {
        value: "IPGP",
        label: "IPG Photonics Corporation"
    },
    {
        value: "IPHI",
        label: "Inphi Corporation $0.001 par value"
    },
    {
        value: "IPHS",
        label: "Innophos Holdings Inc."
    },
    {
        value: "IPI",
        label: "Intrepid Potash Inc"
    },
    {
        value: "IPIC",
        label: "iPic Entertainment Inc."
    },
    {
        value: "IPKW",
        label: "Invesco International BuyBack Achievers ETF"
    },
    {
        value: "IPL-D",
        label: "Interstate Power & Light Company Perp Prd Ser D"
    },
    {
        value: "IPO",
        label: "Renaissance IPO"
    },
    {
        value: "IPOA",
        label: "Social Capital Hedosophia Holdings Corp. Class A par value $0.0001"
    },
    {
        value: "IPOA+",
        label: ""
    },
    {
        value: "IPOA=",
        label: "Social Capital Hedosophia Holdings Corp. Units each consisting of one Class A Ordinary Share and one-third of one warrant"
    },
    {
        value: "IPOS",
        label: "Renaissance Capital Greenwich Fund"
    },
    {
        value: "IPWR",
        label: "Ideal Power Inc."
    },
    {
        value: "IQ",
        label: "iQIYI Inc."
    },
    {
        value: "IQDE",
        label: "FlexShares International Quality Dividend Defensive Index Fund"
    },
    {
        value: "IQDF",
        label: "FlexShares International Quality Dividend Index Fund"
    },
    {
        value: "IQDG",
        label: "WisdomTree International Quality Dividend Growth Fund"
    },
    {
        value: "IQDY",
        label: "FlexShares International Quality Dividend Dynamic Index Fund"
    },
    {
        value: "IQI",
        label: "Invesco Quality Municipal Income Trust"
    },
    {
        value: "IQLT",
        label: "iShares Edge MSCI Intl Quality Factor"
    },
    {
        value: "IQV",
        label: "IQVIA Holdings Inc."
    },
    {
        value: "IR",
        label: "Ingersoll-Rand plc (Ireland)"
    },
    {
        value: "IRBT",
        label: "iRobot Corporation"
    },
    {
        value: "IRCP",
        label: "IRSA Propiedades Comerciales S.A."
    },
    {
        value: "IRDM",
        label: "Iridium Communications Inc"
    },
    {
        value: "IRDMB",
        label: "Iridium Communications Inc 6.75% Series B Cumulative Perpetual Convertible Preferred Stock"
    },
    {
        value: "IRET",
        label: "Investors Real Estate Trust Shares of Beneficial Interest"
    },
    {
        value: "IRET-C",
        label: "Investors Real Estate Trust 6.625% Series C Cumulative Redeemable Preferred Shares (Liquidation Preference $25.00 Per Share)"
    },
    {
        value: "IRIX",
        label: "IRIDEX Corporation"
    },
    {
        value: "IRL",
        label: "New Ireland Fund Inc (The)"
    },
    {
        value: "IRM",
        label: "Iron Mountain Incorporated (Delaware)Common Stock REIT"
    },
    {
        value: "IRMD",
        label: "iRadimed Corporation"
    },
    {
        value: "IROQ",
        label: "IF Bancorp Inc."
    },
    {
        value: "IRR",
        label: "Voya Natural Resources Equity Income Fund of Beneficial Interest"
    },
    {
        value: "IRS",
        label: "IRSA Inversiones Y Representaciones S.A."
    },
    {
        value: "IRT",
        label: "Independence Realty Trust Inc."
    },
    {
        value: "IRTC",
        label: "iRhythm Technologies Inc."
    },
    {
        value: "IRWD",
        label: "Ironwood Pharmaceuticals Inc."
    },
    {
        value: "ISBC",
        label: "Investors Bancorp Inc."
    },
    {
        value: "ISCA",
        label: "International Speedway Corporation"
    },
    {
        value: "ISCF",
        label: "iShares Edge MSCI Intl Size Factor"
    },
    {
        value: "ISD",
        label: "Prudential Short Duration High Yield Fund Inc."
    },
    {
        value: "ISDR",
        label: "Issuer Direct Corporation"
    },
    {
        value: "ISF",
        label: "ING Group N.V. Perp Hybrid Cap Secs (Netherlands)"
    },
    {
        value: "ISG",
        label: "ING Group N.V. Perpetual Dent Secs 6.125%"
    },
    {
        value: "ISHG",
        label: "iShares 1-3 Year International Treasury Bond ETF"
    },
    {
        value: "ISIG",
        label: "Insignia Systems Inc."
    },
    {
        value: "ISMD",
        label: "Inspire Small/Mid Cap Impact"
    },
    {
        value: "ISNS",
        label: "Image Sensing Systems Inc."
    },
    {
        value: "ISR",
        label: "IsoRay Inc."
    },
    {
        value: "ISRA",
        label: "VanEck Vectors Israel"
    },
    {
        value: "ISRG",
        label: "Intuitive Surgical Inc."
    },
    {
        value: "ISRL",
        label: "Isramco Inc."
    },
    {
        value: "ISSC",
        label: "Innovative Solutions and Support Inc."
    },
    {
        value: "ISTB",
        label: "iShares Core 1-5 Year USD Bond ETF"
    },
    {
        value: "ISTR",
        label: "Investar Holding Corporation"
    },
    {
        value: "ISZE",
        label: "iShares Edge MSCI Intl Size Factor"
    },
    {
        value: "IT",
        label: "Gartner Inc."
    },
    {
        value: "ITA",
        label: "iShares U.S. Aerospace & Defense"
    },
    {
        value: "ITB",
        label: "iShares U.S. Home Construction"
    },
    {
        value: "ITCB",
        label: "Itau CorpBanca American Depositary Shares (each representing 1500 shares of no par value)"
    },
    {
        value: "ITCI",
        label: "Intra-Cellular Therapies Inc."
    },
    {
        value: "ITE",
        label: "SPDR Bloomberg Barclays Intermediate Term Treasury"
    },
    {
        value: "ITEQ",
        label: "BlueStar Israel Technology"
    },
    {
        value: "ITG",
        label: "Investment Technology Group Inc."
    },
    {
        value: "ITGR",
        label: "Integer Holdings Corporation"
    },
    {
        value: "ITI",
        label: "Iteris Inc."
    },
    {
        value: "ITIC",
        label: "Investors Title Company"
    },
    {
        value: "ITM",
        label: "VanEck Vectors AMT-Free Intermediate Municipal Index"
    },
    {
        value: "ITOT",
        label: "iShares Core S&P Total U.S. Stock Market"
    },
    {
        value: "ITRI",
        label: "Itron Inc."
    },
    {
        value: "ITRM",
        label: "Iterum Therapeutics plc"
    },
    {
        value: "ITRN",
        label: "Ituran Location and Control Ltd."
    },
    {
        value: "ITT",
        label: "ITT Inc."
    },
    {
        value: "ITUB",
        label: "Itau Unibanco Banco Holding SA American Depositary Shares (Each repstg 500 Preferred shares)"
    },
    {
        value: "ITUS",
        label: "ITUS Corporation"
    },
    {
        value: "ITW",
        label: "Illinois Tool Works Inc."
    },
    {
        value: "IUSB",
        label: "iShares Core Total USD Bond Market ETF"
    },
    {
        value: "IUSG",
        label: "iShares Core S&P U.S. Growth ETF"
    },
    {
        value: "IUSV",
        label: "iShares Core S&P U.S. Value ETF"
    },
    {
        value: "IVAC",
        label: "Intevac Inc."
    },
    {
        value: "IVAL",
        label: "Alpha Architect International Quantitative Value"
    },
    {
        value: "IVC",
        label: "Invacare Corporation"
    },
    {
        value: "IVE",
        label: "iShares S&P 500 Value"
    },
    {
        value: "IVENC",
        label: "Ivy NextShares"
    },
    {
        value: "IVFGC",
        label: "Ivy NextShares"
    },
    {
        value: "IVFVC",
        label: "Ivy NextShares"
    },
    {
        value: "IVH",
        label: "Ivy High Income Opportunities Fund of Beneficial Interest"
    },
    {
        value: "IVLU",
        label: "iShares Edge MSCI Intl Value Factor"
    },
    {
        value: "IVOG",
        label: "Vanguard S&P Mid-Cap 400 Growth"
    },
    {
        value: "IVOO",
        label: "Vanguard S&P Mid-Cap 400"
    },
    {
        value: "IVOV",
        label: "Vanguard S&P Mid-Cap 400 Value"
    },
    {
        value: "IVR",
        label: "INVESCO MORTGAGE CAPITAL INC"
    },
    {
        value: "IVR-A",
        label: "Invesco Mortgage Capital Inc. Pfd Ser A"
    },
    {
        value: "IVR-B",
        label: "Invesco Mortgage Capital Inc. Preferred Series B Cum Fxd to Fltg"
    },
    {
        value: "IVR-C",
        label: "INVESCO MORTGAGE CAPITAL INC 7.5% Fixed-to-Floating Series C Cumulative Redeemable Preferred Stock Liquation Preference $25.00 per Share"
    },
    {
        value: "IVTY",
        label: "Invuity Inc."
    },
    {
        value: "IVV",
        label: "iShares Core S&P 500"
    },
    {
        value: "IVW",
        label: "iShares S&P 500 Growth"
    },
    {
        value: "IVZ",
        label: "Invesco Ltd"
    },
    {
        value: "IWB",
        label: "iShares Russell 1000"
    },
    {
        value: "IWC",
        label: "iShares Microcap"
    },
    {
        value: "IWD",
        label: "iShares Russell 1000 Value"
    },
    {
        value: "IWF",
        label: "iShares Russell 1000 Growth"
    },
    {
        value: "IWL",
        label: "iShares Russell Top 200"
    },
    {
        value: "IWM",
        label: "iShares Russell 2000"
    },
    {
        value: "IWN",
        label: "iShares Russell 2000 Value"
    },
    {
        value: "IWO",
        label: "iShares Russell 2000 Growth"
    },
    {
        value: "IWP",
        label: "iShares Russell Midcap Growth"
    },
    {
        value: "IWR",
        label: "iShares Russell Mid-Cap"
    },
    {
        value: "IWS",
        label: "iShares Russell Mid-cap Value"
    },
    {
        value: "IWV",
        label: "iShares Russell 3000"
    },
    {
        value: "IWX",
        label: "iShares Russell Top 200 Value"
    },
    {
        value: "IWY",
        label: "iShares Russell Top 200 Growth"
    },
    {
        value: "IX",
        label: "Orix Corp Ads"
    },
    {
        value: "IXC",
        label: "iShares Global Energy"
    },
    {
        value: "IXG",
        label: "iShares Global Financial"
    },
    {
        value: "IXJ",
        label: "iShares Global Healthcare"
    },
    {
        value: "IXN",
        label: "iShares Global Tech"
    },
    {
        value: "IXP",
        label: "iShares Global Telecom"
    },
    {
        value: "IXUS",
        label: "iShares Core MSCI Total International Stock ETF"
    },
    {
        value: "IYC",
        label: "iShares U.S. Consumer Services"
    },
    {
        value: "IYE",
        label: "iShares U.S. Energy"
    },
    {
        value: "IYF",
        label: "iShares U.S. Financial"
    },
    {
        value: "IYG",
        label: "iShares U.S. Financial Services"
    },
    {
        value: "IYH",
        label: "iShares U.S. Healthcare"
    },
    {
        value: "IYJ",
        label: "iShares U.S. Industrials"
    },
    {
        value: "IYK",
        label: "iShares U.S. Consumer Goods"
    },
    {
        value: "IYLD",
        label: "iShares Morningstar Multi-Asset Income"
    },
    {
        value: "IYM",
        label: "iShares U.S. Basic Materials"
    },
    {
        value: "IYR",
        label: "iShares U.S. Real Estate"
    },
    {
        value: "IYT",
        label: "iShares Transportation Average"
    },
    {
        value: "IYW",
        label: "iShares U.S. Technology"
    },
    {
        value: "IYY",
        label: "iShares Dow Jones U.S."
    },
    {
        value: "IYZ",
        label: "iShares U.S. Telecommunications"
    },
    {
        value: "IZEA",
        label: "IZEA Inc."
    },
    {
        value: "IZRL",
        label: "ARK Israel Innovative Technology"
    },
    {
        value: "JACK",
        label: "Jack In The Box Inc."
    },
    {
        value: "JAG",
        label: "Jagged Peak Energy Inc."
    },
    {
        value: "JAGX",
        label: "Jaguar Health Inc."
    },
    {
        value: "JAKK",
        label: "JAKKS Pacific Inc."
    },
    {
        value: "JASN",
        label: "Jason Industries Inc."
    },
    {
        value: "JASNW",
        label: ""
    },
    {
        value: "JASO",
        label: "JA Solar Holdings Co. Ltd."
    },
    {
        value: "JAX",
        label: "J. Alexander's Holdings Inc."
    },
    {
        value: "JAZZ",
        label: "Jazz Pharmaceuticals plc"
    },
    {
        value: "JBGS",
        label: "JBG SMITH Properties"
    },
    {
        value: "JBHT",
        label: "J.B. Hunt Transport Services Inc."
    },
    {
        value: "JBK",
        label: "Lehman ABS 3.50 3.50% Adjustable Corp Backed Tr Certs GS Cap I"
    },
    {
        value: "JBL",
        label: "Jabil Inc."
    },
    {
        value: "JBLU",
        label: "JetBlue Airways Corporation"
    },
    {
        value: "JBN",
        label: "Select Asset Inc. on behalf of Corporate Backed Callable Trust Certificates J.C. Penney Debenture Backed Series 2007-1 Trust"
    },
    {
        value: "JBR",
        label: "Select Asset Inc. Corporate Backed Callable Trust Certificates J.C. Penney Debenture-Backed Series 2006-1 Class A-1"
    },
    {
        value: "JBRI",
        label: "James Biblically Responsible Investment"
    },
    {
        value: "JBSS",
        label: "John B. Sanfilippo & Son Inc."
    },
    {
        value: "JBT",
        label: "John Bean Technologies Corporation"
    },
    {
        value: "JCAP",
        label: "Jernigan Capital Inc."
    },
    {
        value: "JCAP-B",
        label: "Jernigan Capital Inc. 7.00% Series B Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "JCE",
        label: "Nuveen Core Equity Alpha Fund of Beneficial Interest"
    },
    {
        value: "JCI",
        label: "Johnson Controls International plc"
    },
    {
        value: "JCO",
        label: "Nuveen Credit Opportunities 2022 Target Term Fund of Beneficial Interest"
    },
    {
        value: "JCOM",
        label: "j2 Global Inc."
    },
    {
        value: "JCP",
        label: "J.C. Penney Company Inc. Holding Company"
    },
    {
        value: "JCS",
        label: "Communications Systems Inc."
    },
    {
        value: "JCTCF",
        label: "Jewett-Cameron Trading Company"
    },
    {
        value: "JD",
        label: "JD.com Inc."
    },
    {
        value: "JDD",
        label: "Nuveen Diversified Dividend and Income Fund Shares of Beneficial Interest"
    },
    {
        value: "JDIV",
        label: "JPMorgan U.S. Dividend"
    },
    {
        value: "JDST",
        label: "Direxion Daily Junior Gold Miners Index Bear 3X Shares"
    },
    {
        value: "JE",
        label: "Just Energy Group Inc. (Canada)"
    },
    {
        value: "JE-A",
        label: "Just Energy Group Inc. 8.50% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "JEC",
        label: "Jacobs Engineering Group Inc."
    },
    {
        value: "JEF",
        label: "Jefferies Financial Group Inc."
    },
    {
        value: "JELD",
        label: "JELD-WEN Holding Inc."
    },
    {
        value: "JEMD",
        label: "Nuveen Emerging Markets Debt 2022 Target Term Fund of Beneficial Interest $0.01 par value per share"
    },
    {
        value: "JEQ",
        label: "Aberdeen Japan Equity Fund Inc."
    },
    {
        value: "JETS",
        label: "U.S. Global Jets"
    },
    {
        value: "JFR",
        label: "Nuveen Floating Rate Income Fund"
    },
    {
        value: "JGH",
        label: "Nuveen Global High Income Fund of Beneficial Interest"
    },
    {
        value: "JHA",
        label: "Nuveen High Income December 2018 Target Term Fund"
    },
    {
        value: "JHB",
        label: "Nuveen High Income November 2021 Target Term Fund"
    },
    {
        value: "JHD",
        label: "Nuveen High Income December 2019 Target Term Fund of Beneficial Interest"
    },
    {
        value: "JHDG",
        label: "WisdomTree Japan Hedged Quality Dividend Growth Fund"
    },
    {
        value: "JHG",
        label: "Janus Henderson Group plc"
    },
    {
        value: "JHI",
        label: "John Hancock Investors Trust"
    },
    {
        value: "JHMA",
        label: "John Hancock Multifactor Materials"
    },
    {
        value: "JHMC",
        label: "John Hancock Multifactor Consumer Discretionary"
    },
    {
        value: "JHMD",
        label: "John Hancock Exchange-Traded Fund Trust Multifactor Developed International"
    },
    {
        value: "JHME",
        label: "John Hancock Multifactor Energy"
    },
    {
        value: "JHMF",
        label: "John Hancock Multifactor Financials"
    },
    {
        value: "JHMH",
        label: "John Hancock Multifactor Healthcare"
    },
    {
        value: "JHMI",
        label: "John Hancock Multifactor Industrials"
    },
    {
        value: "JHML",
        label: "John Hancock Multifactor Large Cap"
    },
    {
        value: "JHMM",
        label: "John Hancock Multifactor Mid Cap"
    },
    {
        value: "JHMS",
        label: "John Hancock Multifactor Consumer Staples"
    },
    {
        value: "JHMT",
        label: "John Hancock Multifactor Technology"
    },
    {
        value: "JHMU",
        label: "John Hancock Multifactor Utilities"
    },
    {
        value: "JHS",
        label: "John Hancock Income Securities Trust"
    },
    {
        value: "JHSC",
        label: "John Hancock Multifactor Small Cap"
    },
    {
        value: "JHX",
        label: "James Hardie Industries plc American Depositary Shares (Ireland)"
    },
    {
        value: "JHY",
        label: "Nuveen High Income 2020 Target Term Fund of Beneficial Interest"
    },
    {
        value: "JILL",
        label: "J. Jill Inc."
    },
    {
        value: "JJAB",
        label: "iPathA Series B Bloomberg Agriculture Subindex Total Return ETN"
    },
    {
        value: "JJCB",
        label: "iPathA Series B Bloomberg Copper Subindex Total Return ETN"
    },
    {
        value: "JJEB",
        label: "iPathA Series B Bloomberg Energy Subindex Total Return ETN"
    },
    {
        value: "JJGB",
        label: "iPathA Series B Bloomberg Grains Subindex Total Return ETN"
    },
    {
        value: "JJMB",
        label: "iPathA Series B Bloomberg Industrial Metals Subindex Total Return ETN"
    },
    {
        value: "JJPB",
        label: "iPathA Series B Bloomberg Precious Metals Subindex Total Return ETN"
    },
    {
        value: "JJSB",
        label: "iPathA Series B Bloomberg Softs Subindex Total Return ETN"
    },
    {
        value: "JJSF",
        label: "J & J Snack Foods Corp."
    },
    {
        value: "JJTB",
        label: "iPathA Series B Bloomberg Tin Subindex Total Return ETN"
    },
    {
        value: "JJUB",
        label: "iPathA Series B Bloomberg Aluminum Subindex Total Return ETN"
    },
    {
        value: "JKD",
        label: "iShares Morningstar Large-Cap"
    },
    {
        value: "JKE",
        label: "iShares Morningstar Large-Cap Growth"
    },
    {
        value: "JKF",
        label: "iShares Morningstar Large-Cap Value"
    },
    {
        value: "JKG",
        label: "iShares Morningstar Mid-Cap"
    },
    {
        value: "JKH",
        label: "iShares Morningstar Mid-Cap Growth"
    },
    {
        value: "JKHY",
        label: "Jack Henry & Associates Inc."
    },
    {
        value: "JKI",
        label: "iShares Morningstar Mid-Cap ETF"
    },
    {
        value: "JKJ",
        label: "iShares Morningstar Small-Cap"
    },
    {
        value: "JKK",
        label: "iShares Morningstar Small-Cap Growth"
    },
    {
        value: "JKL",
        label: "iShares Morningstar Small-Cap Value ETFnd"
    },
    {
        value: "JKS",
        label: "JinkoSolar Holding Company Limited American Depositary Shares (each representing 4)"
    },
    {
        value: "JLL",
        label: "Jones Lang LaSalle Incorporated"
    },
    {
        value: "JLS",
        label: "Nuveen Mortgage Opportunity Term Fund"
    },
    {
        value: "JMBA",
        label: "Jamba Inc."
    },
    {
        value: "JMEI",
        label: "Jumei International Holding Limited American Depositary Shares each representing one Class A"
    },
    {
        value: "JMF",
        label: "Nuveen Energy MLP Total Return Fund of Beneficial Interest"
    },
    {
        value: "JMIN",
        label: "JPMorgan U.S. Minimum Volatility"
    },
    {
        value: "JMLP",
        label: "Nuveen All Cap Energy MLP Opportunities Fund of Beneficial Interest"
    },
    {
        value: "JMM",
        label: "Nuveen Multi-Market Income Fund (MA)"
    },
    {
        value: "JMOM",
        label: "JPMorgan U.S. Momentum Factor"
    },
    {
        value: "JMP",
        label: "JMP Group LLC"
    },
    {
        value: "JMPB",
        label: "JMP Group Inc 8.00% Senior Notes due 2023"
    },
    {
        value: "JMPD",
        label: "JMP Group LLC 7.25% Senior Notes due 2027"
    },
    {
        value: "JMT",
        label: "Nuveen Mortgage Opportunity Term Fund 2 of Beneficial Interest"
    },
    {
        value: "JMU",
        label: "JMU Limited"
    },
    {
        value: "JNCE",
        label: "Jounce Therapeutics Inc."
    },
    {
        value: "JNJ",
        label: "Johnson & Johnson"
    },
    {
        value: "JNK",
        label: "SPDR Bloomberg Barclays High Yield Bond"
    },
    {
        value: "JNP",
        label: "Juniper Pharmaceuticals Inc."
    },
    {
        value: "JNPR",
        label: "Juniper Networks Inc."
    },
    {
        value: "JNUG",
        label: "Direxion Daily Junior Gold Miners Index Bull 3X Shares"
    },
    {
        value: "JOB",
        label: "GEE Group Inc."
    },
    {
        value: "JOBS",
        label: "51job Inc."
    },
    {
        value: "JOE",
        label: "St. Joe Company (The)"
    },
    {
        value: "JOF",
        label: "Japan Smaller Capitalization Fund Inc"
    },
    {
        value: "JONE",
        label: "Jones Energy Inc. Class A"
    },
    {
        value: "JOUT",
        label: "Johnson Outdoors Inc."
    },
    {
        value: "JP",
        label: "Jupai Holdings Limited American Depositary Shares each representing six"
    },
    {
        value: "JPC",
        label: "Nuveen Preferred & Income Opportunities Fund"
    },
    {
        value: "JPED",
        label: "JPMorgan Event Driven"
    },
    {
        value: "JPEH",
        label: "JPMorgan Diversified Return Europe Currency Hedged"
    },
    {
        value: "JPEM",
        label: "JPMorgan Diversified Return Emerging Markets Equity"
    },
    {
        value: "JPEU",
        label: "JPMorgan Diversified Return Europe Equity"
    },
    {
        value: "JPGB",
        label: "JPMorgan Global Bond Opportunities"
    },
    {
        value: "JPGE",
        label: "JPMorgan Diversified Return Global Equity"
    },
    {
        value: "JPHF",
        label: "J P Morgan Chase & Co"
    },
    {
        value: "JPHY",
        label: "JPMorgan Disciplined HY"
    },
    {
        value: "JPI",
        label: "Nuveen Preferred and Income Term Fund of Beneficial Interest"
    },
    {
        value: "JPIH",
        label: "JPMorgan Diversified Return International Currency Hedged"
    },
    {
        value: "JPIN",
        label: "JPMorgan Diversified Return International Equity"
    },
    {
        value: "JPLS",
        label: "JPMorgan Long/Short"
    },
    {
        value: "JPM",
        label: "JP Morgan Chase & Co."
    },
    {
        value: "JPM+",
        label: "J P Morgan Chase & Co Warrant expiring October 28 2018"
    },
    {
        value: "JPM-A",
        label: "J P Morgan Chase & Co Depositary Shs Repstg 1/400 Pfd Ser P"
    },
    {
        value: "JPM-B",
        label: "JP Morgan Chase & Co Depositary Shares Series T"
    },
    {
        value: "JPM-E",
        label: "J P Morgan Chase & Co Depository Shares Representing 1/400th Int Perp Pfd Ser W"
    },
    {
        value: "JPM-F",
        label: "J P Morgan Chase & Co Depositary Shares Series Y"
    },
    {
        value: "JPM-G",
        label: "J P Morgan Chase & Co Depositary Shares Series A"
    },
    {
        value: "JPM-H",
        label: "J P Morgan Chase & Co Depositary Shares Series B"
    },
    {
        value: "JPMB",
        label: "JPMorgan USD Emerging Markets Sovereign Bond"
    },
    {
        value: "JPME",
        label: "JPMorgan Diversified Return U.S. Mid Cap Equity"
    },
    {
        value: "JPMF",
        label: "JPMorgan Managed Futures Strategy"
    },
    {
        value: "JPMV",
        label: "iShares Edge MSCI Min Vol Japan"
    },
    {
        value: "JPN",
        label: "Xtrackers Japan JPX-Nikkei 400 Equity"
    },
    {
        value: "JPNL",
        label: "Direxion Daily Japan Bull 3X"
    },
    {
        value: "JPS",
        label: "Nuveen Preferred & Income Securities Fund"
    },
    {
        value: "JPSE",
        label: "JPMorgan Diversified Return U.S. Small Cap Equity"
    },
    {
        value: "JPST",
        label: "JPMorgan Ultra-Short Income"
    },
    {
        value: "JPT",
        label: "Nuveen Preferred and Income 2022 Term Fund of Beneficial Interest"
    },
    {
        value: "JPUS",
        label: "JPMorgan Diversified Return U.S. Equity"
    },
    {
        value: "JPXN",
        label: "iShares JPX-Nikkei 400"
    },
    {
        value: "JQC",
        label: "Nuveen Credit Strategies Income Fund Shares of Beneficial Interest"
    },
    {
        value: "JQUA",
        label: "JPMorgan U.S. Quality Factor"
    },
    {
        value: "JRI",
        label: "Nuveen Real Asset Income and Growth Fund of Beneficial Interest"
    },
    {
        value: "JRJC",
        label: "China Finance Online Co. Limited"
    },
    {
        value: "JRO",
        label: "Nuveen Floating Rate Income Opportuntiy Fund Shares of Beneficial Interest"
    },
    {
        value: "JRS",
        label: "Nuveen Real Estate Income Fund of Beneficial Interest"
    },
    {
        value: "JRSH",
        label: "Jerash Holdings (US) Inc."
    },
    {
        value: "JRVR",
        label: "James River Group Holdings Ltd."
    },
    {
        value: "JSD",
        label: "Nuveen Short Duration Credit Opportunities Fund of Beneficial Interest"
    },
    {
        value: "JSM",
        label: "Navient Corporation"
    },
    {
        value: "JSMD",
        label: "Janus Henderson Small/Mid Cap Growth Alpha ETF"
    },
    {
        value: "JSML",
        label: "Janus Henderson Small Cap Growth Alpha ETF"
    },
    {
        value: "JSYN",
        label: "Jensyn Acquistion Corp."
    },
    {
        value: "JSYNR",
        label: "Jensyn Acquistion Corp. Rights"
    },
    {
        value: "JSYNU",
        label: "Jensyn Acquistion Corp. Unit"
    },
    {
        value: "JSYNW",
        label: ""
    },
    {
        value: "JT",
        label: "Jianpu Technology Inc. American depositary shares each two representing five Class A"
    },
    {
        value: "JTA",
        label: "Nuveen Tax-Advantaged Total Return Strategy Fund of Beneficial Interest"
    },
    {
        value: "JTD",
        label: "Nuveen Tax-Advantaged Dividend Growth Fund of Beneficial Interest"
    },
    {
        value: "JTPY",
        label: "JetPay Corporation"
    },
    {
        value: "JVA",
        label: "Coffee Holding Co. Inc."
    },
    {
        value: "JVAL",
        label: "JPMorgan U.S. Value Factor"
    },
    {
        value: "JW.A",
        label: "John Wiley & Sons Inc."
    },
    {
        value: "JW.B",
        label: "John Wiley & Sons Inc."
    },
    {
        value: "JWN",
        label: "Nordstrom Inc."
    },
    {
        value: "JXI",
        label: "iShares Global Utilities"
    },
    {
        value: "JYNT",
        label: "The Joint Corp."
    },
    {
        value: "K",
        label: "Kellogg Company"
    },
    {
        value: "KAAC",
        label: "Kayne Anderson Acquisition Corp."
    },
    {
        value: "KAACU",
        label: "Kayne Anderson Acquisition Corp. Unit"
    },
    {
        value: "KAACW",
        label: "Kayne Anderson Acquisition Corp. Warrant"
    },
    {
        value: "KAI",
        label: "Kadant Inc"
    },
    {
        value: "KALA",
        label: "Kala Pharmaceuticals Inc."
    },
    {
        value: "KALU",
        label: "Kaiser Aluminum Corporation"
    },
    {
        value: "KALV",
        label: "KalVista Pharmaceuticals Inc."
    },
    {
        value: "KAMN",
        label: "Kaman Corporation"
    },
    {
        value: "KANG",
        label: "iKang Healthcare Group Inc."
    },
    {
        value: "KAP",
        label: "KCAP Financial Inc. 7.375% Senior Notes due 2019"
    },
    {
        value: "KAR",
        label: "KAR Auction Services Inc"
    },
    {
        value: "KARS",
        label: "KraneShares Electric Vehicles and Future Mobility Index"
    },
    {
        value: "KB",
        label: "KB Financial Group Inc"
    },
    {
        value: "KBA",
        label: "KraneShares Bosera MSCI China A"
    },
    {
        value: "KBAL",
        label: "Kimball International Inc."
    },
    {
        value: "KBE",
        label: "SPDR S&P Bank"
    },
    {
        value: "KBH",
        label: "KB Home"
    },
    {
        value: "KBLM",
        label: "KBL Merger Corp. IV"
    },
    {
        value: "KBLMR",
        label: "KBL Merger Corp. IV Right"
    },
    {
        value: "KBLMU",
        label: "KBL Merger Corp. IV Unit"
    },
    {
        value: "KBLMW",
        label: "KBL Merger Corp. IV Warrant"
    },
    {
        value: "KBR",
        label: "KBR Inc."
    },
    {
        value: "KBSF",
        label: "KBS Fashion Group Limited"
    },
    {
        value: "KBWB",
        label: "Invesco KBW Bank ETF"
    },
    {
        value: "KBWD",
        label: "Invesco KBW High Dividend Yield Financial ETF"
    },
    {
        value: "KBWP",
        label: "Invesco KBW Property & Casualty Insurance ETF"
    },
    {
        value: "KBWR",
        label: "Invesco KBW Regional Banking ETF"
    },
    {
        value: "KBWY",
        label: "Invesco KBW Premium Yield Equity REIT ETF"
    },
    {
        value: "KCAP",
        label: "KCAP Financial Inc."
    },
    {
        value: "KCAPL",
        label: "KCAP Financial Inc. 6.125% Notes due 2022"
    },
    {
        value: "KCE",
        label: "SPDR S&P Capital Markets"
    },
    {
        value: "KCNY",
        label: "KraneShares E Fund China Commercial Paper"
    },
    {
        value: "KDMN",
        label: "Kadmon Holdings Inc."
    },
    {
        value: "KE",
        label: "Kimball Electronics Inc."
    },
    {
        value: "KED",
        label: "Kayne Anderson Energy Development Company"
    },
    {
        value: "KEG",
        label: "Key Energy Services Inc."
    },
    {
        value: "KELYA",
        label: "Kelly Services Inc. Class A Common Stock"
    },
    {
        value: "KELYB",
        label: "Kelly Services Inc. Class B Common Stock"
    },
    {
        value: "KEM",
        label: "KEMET Corporation"
    },
    {
        value: "KEMP",
        label: "KraneShares FTSE Emerging Markets Plus"
    },
    {
        value: "KEMQ",
        label: "KraneShares Emerging Markets Consumer Technology Index"
    },
    {
        value: "KEN",
        label: "Kenon Holdings Ltd."
    },
    {
        value: "KEP",
        label: "Korea Electric Power Corporation"
    },
    {
        value: "KEQU",
        label: "Kewaunee Scientific Corporation"
    },
    {
        value: "KERX",
        label: "Keryx Biopharmaceuticals Inc."
    },
    {
        value: "KEX",
        label: "Kirby Corporation"
    },
    {
        value: "KEY",
        label: "KeyCorp"
    },
    {
        value: "KEY-I",
        label: "KeyCorp Depositary Shares Series E"
    },
    {
        value: "KEYS",
        label: "Keysight Technologies Inc."
    },
    {
        value: "KEYW",
        label: "The KEYW Holding Corporation"
    },
    {
        value: "KF",
        label: "Korea Fund Inc. (The)"
    },
    {
        value: "KFFB",
        label: "Kentucky First Federal Bancorp"
    },
    {
        value: "KFRC",
        label: "Kforce Inc."
    },
    {
        value: "KFS",
        label: "Kingsway Financial Services Inc."
    },
    {
        value: "KFY",
        label: "Korn/Ferry International"
    },
    {
        value: "KFYP",
        label: "KraneShares Zacks New China"
    },
    {
        value: "KGC",
        label: "Kinross Gold Corporation"
    },
    {
        value: "KGJI",
        label: "Kingold Jewelry Inc."
    },
    {
        value: "KGRN",
        label: "KraneShares MSCI China Environment Index"
    },
    {
        value: "KHC",
        label: "The Kraft Heinz Company"
    },
    {
        value: "KIDS",
        label: "OrthoPediatrics Corp."
    },
    {
        value: "KIE",
        label: "SPDR S&P Insurance"
    },
    {
        value: "KIM",
        label: "Kimco Realty Corporation"
    },
    {
        value: "KIM-I",
        label: "Kimco Realty Corporation DEPOSITARY SH REPSTG 1/1000TH PFD SER I"
    },
    {
        value: "KIM-J",
        label: "Kimco Realty Corporation Depositary Sh Repstg 1/1000th Pfd CL J %"
    },
    {
        value: "KIM-K",
        label: "Kimco Realty Corporation Depositary Shares Series K"
    },
    {
        value: "KIM-L",
        label: "Kimco Realty Corporation Class L Depositary Shares each of which represents a one-one thousandth fractional interest in a share of 5.125% Class L Cumulative Red"
    },
    {
        value: "KIM-M",
        label: "Kimco Realty Corporation Class M Depositary Shares each of which represents a one-one thousandth fractional interest in a share of 5.25% Class M Cumulative Rede"
    },
    {
        value: "KIN",
        label: "Kindred Biosciences Inc."
    },
    {
        value: "KINS",
        label: "Kingstone Companies Inc"
    },
    {
        value: "KIO",
        label: "KKR Income Opportunities Fund"
    },
    {
        value: "KIQ",
        label: "Kelso Technologies Inc"
    },
    {
        value: "KIRK",
        label: "Kirkland's Inc."
    },
    {
        value: "KKR",
        label: "KKR & Co. L.P. Representing Limited Partnership Interest"
    },
    {
        value: "KKR-A",
        label: "KKR & Co. L.P. 6.75% Series A Preferred Units"
    },
    {
        value: "KKR-B",
        label: "KKR & Co. L.P. 6.50% Series B Preferred Unit"
    },
    {
        value: "KL",
        label: "Kirkland Lake Gold Ltd."
    },
    {
        value: "KLAC",
        label: "KLA-Tencor Corporation"
    },
    {
        value: "KLDW",
        label: "Knowledge Leaders Developed World"
    },
    {
        value: "KLDX",
        label: "Klondex Mines Ltd."
    },
    {
        value: "KLIC",
        label: "Kulicke and Soffa Industries Inc."
    },
    {
        value: "KLXI",
        label: "KLX Inc."
    },
    {
        value: "KMB",
        label: "Kimberly-Clark Corporation"
    },
    {
        value: "KMDA",
        label: "Kamada Ltd."
    },
    {
        value: "KMF",
        label: "Kayne Anderson Midstream Energy Fund Inc"
    },
    {
        value: "KMG",
        label: "KMG Chemicals Inc."
    },
    {
        value: "KMI",
        label: "Kinder Morgan Inc."
    },
    {
        value: "KMI-A",
        label: "Kinder Morgan Inc. Depositary Shares Series A"
    },
    {
        value: "KMM",
        label: "Deutsche Multi-Market Income Trust Common Sshares of Beneficial Interest"
    },
    {
        value: "KMPA",
        label: "Kemper Corporation 7.375% Subordinated Debentures due 2054"
    },
    {
        value: "KMPH",
        label: "KemPharm Inc."
    },
    {
        value: "KMPR",
        label: "Kemper Corporation"
    },
    {
        value: "KMT",
        label: "Kennametal Inc."
    },
    {
        value: "KMX",
        label: "CarMax Inc"
    },
    {
        value: "KN",
        label: "Knowles Corporation"
    },
    {
        value: "KND",
        label: "Kindred Healthcare Inc."
    },
    {
        value: "KNDI",
        label: "Kandi Technologies Group Inc."
    },
    {
        value: "KNG",
        label: "ETF Series Solutions Cboe Vest S&P 500 Dividend Aristocrats Target Income"
    },
    {
        value: "KNL",
        label: "Knoll Inc."
    },
    {
        value: "KNOP",
        label: "KNOT Offshore Partners LP representing Limited Partner Interests"
    },
    {
        value: "KNOW",
        label: "Direxion All Cap Insider Sentiment Shares"
    },
    {
        value: "KNSA",
        label: "Kiniksa Pharmaceuticals Ltd."
    },
    {
        value: "KNSL",
        label: "Kinsale Capital Group Inc."
    },
    {
        value: "KNX",
        label: "Knight-Swift Transportation Holdings Inc."
    },
    {
        value: "KO",
        label: "Coca-Cola Company (The)"
    },
    {
        value: "KODK",
        label: "Eastman Kodak Company Common New"
    },
    {
        value: "KODK+",
        label: "Eastman Kodak Company Warrant (Expiring September 3 2018)"
    },
    {
        value: "KODK+A",
        label: "Eastman Kodak Company Wt Exp 135%"
    },
    {
        value: "KOF",
        label: "Coca Cola Femsa S.A.B. de C.V."
    },
    {
        value: "KOIN",
        label: "Innovation Shares NextGen Protocol"
    },
    {
        value: "KOL",
        label: "VanEck Vectors Coal"
    },
    {
        value: "KOLD",
        label: "ProShares UltraShort Bloomberg Natural Gas"
    },
    {
        value: "KONA",
        label: "Kona Grill Inc."
    },
    {
        value: "KONE",
        label: "Kingtone Wirelessinfo Solution Holding Ltd"
    },
    {
        value: "KOOL",
        label: "Cesca Therapeutics Inc."
    },
    {
        value: "KOP",
        label: "Koppers Holdings Inc."
    },
    {
        value: "KOPN",
        label: "Kopin Corporation"
    },
    {
        value: "KOR",
        label: "AdvisorShares KIM Korea Equity"
    },
    {
        value: "KORP",
        label: "American Century Diversified Corporate Bond"
    },
    {
        value: "KORS",
        label: "Michael Kors Holdings Limited"
    },
    {
        value: "KORU",
        label: "Direxion Daily South Korea Bull 3X Shares"
    },
    {
        value: "KOS",
        label: "Kosmos Energy Ltd."
    },
    {
        value: "KOSS",
        label: "Koss Corporation"
    },
    {
        value: "KPTI",
        label: "Karyopharm Therapeutics Inc."
    },
    {
        value: "KR",
        label: "Kroger Company (The)"
    },
    {
        value: "KRA",
        label: "Kraton Corporation"
    },
    {
        value: "KRC",
        label: "Kilroy Realty Corporation"
    },
    {
        value: "KRE",
        label: "SPDR S&P Regional Banking"
    },
    {
        value: "KREF",
        label: "KKR Real Estate Finance Trust Inc."
    },
    {
        value: "KRG",
        label: "Kite Realty Group Trust"
    },
    {
        value: "KRMA",
        label: "Global X Conscious Companies ETF"
    },
    {
        value: "KRNT",
        label: "Kornit Digital Ltd."
    },
    {
        value: "KRNY",
        label: "Kearny Financial"
    },
    {
        value: "KRO",
        label: "Kronos Worldwide Inc"
    },
    {
        value: "KRP",
        label: "Kimbell Royalty Partners Representing Limited Partner Interests"
    },
    {
        value: "KRYS",
        label: "Krystal Biotech Inc."
    },
    {
        value: "KS",
        label: "KapStone Paper and Packaging Corporation"
    },
    {
        value: "KSA",
        label: "iShares Trust MSCI Saudi Arabia"
    },
    {
        value: "KSM",
        label: "Deutsche Strategic Municiple Income Trust of Beneficial Interest"
    },
    {
        value: "KSS",
        label: "Kohl's Corporation"
    },
    {
        value: "KST",
        label: "Deutsche Strategic Income Trust Shares of Beneficial Interest"
    },
    {
        value: "KSU",
        label: "Kansas City Southern"
    },
    {
        value: "KSU-",
        label: ""
    },
    {
        value: "KT",
        label: "KT Corporation"
    },
    {
        value: "KTCC",
        label: "Key Tronic Corporation"
    },
    {
        value: "KTF",
        label: "Deutsche Municiple Income Trust"
    },
    {
        value: "KTH",
        label: "Structures Products Cp 8% CorTS Issued by Peco Energy Cap Tr II Preferred Stock"
    },
    {
        value: "KTN",
        label: "Structured Products Corp 8.205% CorTS 8.205% Corporate Backed Trust Securities (CorTS)"
    },
    {
        value: "KTOS",
        label: "Kratos Defense & Security Solutions Inc."
    },
    {
        value: "KTOV",
        label: "Kitov Pharma Ltd."
    },
    {
        value: "KTOVW",
        label: ""
    },
    {
        value: "KTP",
        label: "Corts 7.625 Pfd"
    },
    {
        value: "KTWO",
        label: "K2M Group Holdings Inc."
    },
    {
        value: "KURA",
        label: "Kura Oncology Inc."
    },
    {
        value: "KURE",
        label: "KraneShares MSCI All China Health Care Index"
    },
    {
        value: "KVHI",
        label: "KVH Industries Inc."
    },
    {
        value: "KW",
        label: "Kennedy-Wilson Holdings Inc."
    },
    {
        value: "KWEB",
        label: "KraneShares Trust CSI China Internet"
    },
    {
        value: "KWR",
        label: "Quaker Chemical Corporation"
    },
    {
        value: "KXI",
        label: "iShares Global Consumer Staples"
    },
    {
        value: "KYE",
        label: "Kayne Anderson Total Energy Return Fund Inc."
    },
    {
        value: "KYN",
        label: "Kayne Anderson MLP Investment Company"
    },
    {
        value: "KYN-F",
        label: "Kayne Anderson MLP Investment Company 3.50% Series F Mandatory Redeemable Preferred Shares $25.00 Liquidation Preference per share"
    },
    {
        value: "KYO",
        label: "Kyocera Corporation"
    },
    {
        value: "KZIA",
        label: "Kazia Therapeutics Limited"
    },
    {
        value: "L",
        label: "Loews Corporation"
    },
    {
        value: "LABD",
        label: "Direxion Daily S&P Biotech Bear 3X Shares"
    },
    {
        value: "LABL",
        label: "Multi-Color Corporation"
    },
    {
        value: "LABU",
        label: "Direxion Daily S&P Biotech Bull 3X Shares"
    },
    {
        value: "LAC",
        label: "Lithium Americas Corp."
    },
    {
        value: "LACQ",
        label: "Leisure Acquisition Corp."
    },
    {
        value: "LACQU",
        label: "Leisure Acquisition Corp. Unit"
    },
    {
        value: "LACQW",
        label: "Leisure Acquisition Corp. Warrant"
    },
    {
        value: "LAD",
        label: "Lithia Motors Inc."
    },
    {
        value: "LADR",
        label: "Ladder Capital Corp Class A"
    },
    {
        value: "LAKE",
        label: "Lakeland Industries Inc."
    },
    {
        value: "LALT",
        label: "Invesco Multi-Strategy Alternative ETF"
    },
    {
        value: "LAMR",
        label: "Lamar Advertising Company"
    },
    {
        value: "LANC",
        label: "Lancaster Colony Corporation"
    },
    {
        value: "LAND",
        label: "Gladstone Land Corporation"
    },
    {
        value: "LANDP",
        label: "Gladstone Land Corporation 6.375% Series A Cumulative Term Preferred Stock"
    },
    {
        value: "LARK",
        label: "Landmark Bancorp Inc."
    },
    {
        value: "LASR",
        label: "nLIGHT Inc."
    },
    {
        value: "LAUR",
        label: "Laureate Education Inc."
    },
    {
        value: "LAWS",
        label: "Lawson Products Inc."
    },
    {
        value: "LAYN",
        label: "Layne Christensen Company"
    },
    {
        value: "LAZ",
        label: "Lazard LTD. LTD. Class A"
    },
    {
        value: "LAZY",
        label: "Lazydays Holdings Inc."
    },
    {
        value: "LB",
        label: "L Brands Inc."
    },
    {
        value: "LBAI",
        label: "Lakeland Bancorp Inc."
    },
    {
        value: "LBC",
        label: "Luther Burbank Corporation"
    },
    {
        value: "LBDC",
        label: "2xLeveraged Long ETRACS Wells Fargo Business Development Company Index Series B due May 24 2041"
    },
    {
        value: "LBIX",
        label: "Leading Brands Inc"
    },
    {
        value: "LBJ",
        label: "Direxion Daily Latin America 3x Bull Shares"
    },
    {
        value: "LBRDA",
        label: "Liberty Broadband Corporation Class A Common Stock"
    },
    {
        value: "LBRDK",
        label: "Liberty Broadband Corporation"
    },
    {
        value: "LBRT",
        label: "Liberty Oilfield Services Inc. Class A"
    },
    {
        value: "LBTYA",
        label: "Liberty Global plc Class A Ordinary Shares"
    },
    {
        value: "LBTYB",
        label: "Liberty Global plc Class B Ordinary Shares"
    },
    {
        value: "LBTYK",
        label: "Liberty Global plc"
    },
    {
        value: "LBY",
        label: "Libbey Inc."
    },
    {
        value: "LC",
        label: "LendingClub Corporation"
    },
    {
        value: "LCA",
        label: "Landcadia Holdings Inc."
    },
    {
        value: "LCAHU",
        label: "Landcadia Holdings Inc. Unit"
    },
    {
        value: "LCAHW",
        label: "Landcadia Holdings Inc. Warrant"
    },
    {
        value: "LCI",
        label: "Lannett Co Inc"
    },
    {
        value: "LCII",
        label: "LCI Industries"
    },
    {
        value: "LCM",
        label: "Advent/Claymore Enhanced Growth & Income Fund of Beneficial Interest"
    },
    {
        value: "LCNB",
        label: "LCNB Corporation"
    },
    {
        value: "LCUT",
        label: "Lifetime Brands Inc."
    },
    {
        value: "LD",
        label: "iPath Bloomberg Lead Subindex Total Return SM Index ETN"
    },
    {
        value: "LDF",
        label: "Latin American Discovery Fund Inc. (The)"
    },
    {
        value: "LDL",
        label: "Lydall Inc."
    },
    {
        value: "LDOS",
        label: "Leidos Holdings Inc."
    },
    {
        value: "LDP",
        label: "Cohen & Steers Limited Duration Preferred and Income Fund Inc."
    },
    {
        value: "LDRI",
        label: "Invesco LadderRite 0-5 Year Corporate Bond ETF"
    },
    {
        value: "LDRS",
        label: "Innovator IBD ETF Leaders"
    },
    {
        value: "LDUR",
        label: "PIMCO Enhanced Low Duration Active Exchange-Traded Fund"
    },
    {
        value: "LE",
        label: "Lands' End Inc."
    },
    {
        value: "LEA",
        label: "Lear Corporation"
    },
    {
        value: "LEAD",
        label: "Realty Shares DIVCON Leaders Dividend"
    },
    {
        value: "LECO",
        label: "Lincoln Electric Holdings Inc."
    },
    {
        value: "LEDS",
        label: "SemiLEDS Corporation"
    },
    {
        value: "LEE",
        label: "Lee Enterprises Incorporated"
    },
    {
        value: "LEG",
        label: "Leggett & Platt Incorporated"
    },
    {
        value: "LEGR",
        label: "First Trust Indxx Innovative Transaction & Process ETF"
    },
    {
        value: "LEJU",
        label: "Leju Holdings Limited American Depositary Shares each representing one"
    },
    {
        value: "LEMB",
        label: "iShares J.P. Morgan EM Local Currency Bond"
    },
    {
        value: "LEN",
        label: "Lennar Corporation Class A"
    },
    {
        value: "LEN.B",
        label: "Lennar Corporation Class B"
    },
    {
        value: "LENS",
        label: "Presbia PLC"
    },
    {
        value: "LEO",
        label: "Dreyfus Strategic Municipals Inc."
    },
    {
        value: "LEU",
        label: "Centrus Energy Corp. Class A"
    },
    {
        value: "LEVB",
        label: "Level Brands Inc."
    },
    {
        value: "LEVL",
        label: "Level One Bancorp Inc."
    },
    {
        value: "LEXEA",
        label: "Liberty Expedia Holdings Inc. Series A Common Stock"
    },
    {
        value: "LEXEB",
        label: "Liberty Expedia Holdings Inc. Series B Common Stock"
    },
    {
        value: "LFC",
        label: "China Life Insurance Company Limited American Depositary Shares"
    },
    {
        value: "LFEQ",
        label: "VanEck Vectors NDR CMG Long/Flat Allocation"
    },
    {
        value: "LFGR",
        label: "Leaf Group Ltd."
    },
    {
        value: "LFUS",
        label: "Littelfuse Inc."
    },
    {
        value: "LFVN",
        label: "Lifevantage Corporation"
    },
    {
        value: "LGC",
        label: "Legacy Acquisition Corp. Class A par value $0.0001 per share"
    },
    {
        value: "LGC+",
        label: ""
    },
    {
        value: "LGC=",
        label: "Legacy Acquisition Corp. Units each consisting of one share of Class A Common Stock and one Warrant to purchase one-half of one share of Class A Common Stock"
    },
    {
        value: "LGCY",
        label: "Legacy Reserves LP"
    },
    {
        value: "LGCYO",
        label: "Legacy Reserves LP 8.00% Series B Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "LGCYP",
        label: "Legacy Reserves LP 8% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "LGF.A",
        label: "Lions Gate Entertainment Corporation Class A"
    },
    {
        value: "LGF.B",
        label: "Lions Gate Entertainment Corporation Class B Non-Voting Shares"
    },
    {
        value: "LGI",
        label: "Lazard Global Total Return and Income Fund"
    },
    {
        value: "LGIH",
        label: "LGI Homes Inc."
    },
    {
        value: "LGL",
        label: "LGL Group Inc. (The)"
    },
    {
        value: "LGLV",
        label: "SPDR SSGA US Large Cap Low Volatility Index"
    },
    {
        value: "LGND",
        label: "Ligand Pharmaceuticals Incorporated"
    },
    {
        value: "LH",
        label: "Laboratory Corporation of America Holdings"
    },
    {
        value: "LHC",
        label: "Leo Holdings Corp. Class A"
    },
    {
        value: "LHC+",
        label: ""
    },
    {
        value: "LHC=",
        label: "Leo Holdings Corp. Units each consisting of one Class A ordinary share and one-third of one redeemable warrant"
    },
    {
        value: "LHCG",
        label: "LHC Group"
    },
    {
        value: "LHO",
        label: "LaSalle Hotel Properties"
    },
    {
        value: "LHO-I",
        label: "LaSalle Hotel Properties 6.375% Series I Cumulative Redeemable Redeemable Preferred SBI"
    },
    {
        value: "LHO-J",
        label: "LaSalle Hotel Properties 6.3% Series J Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "LIFE",
        label: "aTyr Pharma Inc."
    },
    {
        value: "LII",
        label: "Lennox International Inc."
    },
    {
        value: "LILA",
        label: "Liberty Latin America Ltd."
    },
    {
        value: "LILAK",
        label: "Liberty Latin America Ltd."
    },
    {
        value: "LINC",
        label: "Lincoln Educational Services Corporation"
    },
    {
        value: "LIND",
        label: "Lindblad Expeditions Holdings Inc."
    },
    {
        value: "LINDW",
        label: "Lindblad Expeditions Holdings Inc. Warrant"
    },
    {
        value: "LINK",
        label: "Interlink Electronics Inc."
    },
    {
        value: "LION",
        label: "Fidelity Southern Corporation"
    },
    {
        value: "LIQT",
        label: "LiqTech International Inc."
    },
    {
        value: "LIT",
        label: "Global X Lithium & Battery Tech"
    },
    {
        value: "LITB",
        label: "LightInTheBox Holding Co. Ltd. American Depositary Shares each representing 2"
    },
    {
        value: "LITE",
        label: "Lumentum Holdings Inc."
    },
    {
        value: "LIVE",
        label: "Live Ventures Incorporated"
    },
    {
        value: "LIVN",
        label: "LivaNova PLC"
    },
    {
        value: "LIVX",
        label: "LiveXLive Media Inc."
    },
    {
        value: "LJPC",
        label: "La Jolla Pharmaceutical Company"
    },
    {
        value: "LKFN",
        label: "Lakeland Financial Corporation"
    },
    {
        value: "LKM",
        label: "Link Motion Inc. American Depositary Shares each representing five Class A"
    },
    {
        value: "LKOR",
        label: "FlexShares Credit-Scored US Long Corporate Bond Index Fund"
    },
    {
        value: "LKQ",
        label: "LKQ Corporation"
    },
    {
        value: "LKSD",
        label: "LSC Communications Inc."
    },
    {
        value: "LL",
        label: "Lumber Liquidators Holdings Inc"
    },
    {
        value: "LLEX",
        label: "Lilis Energy Inc."
    },
    {
        value: "LLIT",
        label: "Lianluo Smart Limited"
    },
    {
        value: "LLL",
        label: "L3 Technologies Inc."
    },
    {
        value: "LLNW",
        label: "Limelight Networks Inc."
    },
    {
        value: "LLQD",
        label: "iShares 10 Year Investment Grade Corporate Bond"
    },
    {
        value: "LLY",
        label: "Eli Lilly and Company"
    },
    {
        value: "LM",
        label: "Legg Mason Inc."
    },
    {
        value: "LMAT",
        label: "LeMaitre Vascular Inc."
    },
    {
        value: "LMB",
        label: "Limbach Holdings Inc."
    },
    {
        value: "LMBS",
        label: "First Trust Low Duration Opportunities ETF"
    },
    {
        value: "LMFA",
        label: "LM Funding America Inc."
    },
    {
        value: "LMFAW",
        label: ""
    },
    {
        value: "LMHA",
        label: "Legg Mason Inc. 6.375% Junior Subordinated Notes due 2056"
    },
    {
        value: "LMHB",
        label: "Legg Mason Inc. 5.45% Junior Subordinated Notes due 2056"
    },
    {
        value: "LMLP",
        label: "ETRACS Monthly Pay 2xLeveraged Wells Fargo MLP Ex-Energy ETN"
    },
    {
        value: "LMNR",
        label: "Limoneira Co"
    },
    {
        value: "LMNX",
        label: "Luminex Corporation"
    },
    {
        value: "LMRK",
        label: "Landmark Infrastructure Partners LP"
    },
    {
        value: "LMRKN",
        label: "Landmark Infrastructure Partners LP Preferred Stock"
    },
    {
        value: "LMRKO",
        label: "Landmark Infrastructure Partners LP Preferred Units"
    },
    {
        value: "LMRKP",
        label: "Landmark Infrastructure Partners LP 8.00% Series A Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "LMT",
        label: "Lockheed Martin Corporation"
    },
    {
        value: "LN",
        label: "LINE Corporation American Depositary Shares (each representing one share of)"
    },
    {
        value: "LNC",
        label: "Lincoln National Corporation"
    },
    {
        value: "LNC+",
        label: "Lincoln National Corporation Warrant expiring July 10 2019"
    },
    {
        value: "LND",
        label: "Brasilagro Brazilian Agric Real Estate Co Sponsored ADR (Brazil)"
    },
    {
        value: "LNDC",
        label: "Landec Corporation"
    },
    {
        value: "LNG",
        label: "Cheniere Energy Inc."
    },
    {
        value: "LNGR",
        label: "Global X Longevity Thematic ETF"
    },
    {
        value: "LNN",
        label: "Lindsay Corporation"
    },
    {
        value: "LNT",
        label: "Alliant Energy Corporation"
    },
    {
        value: "LNTH",
        label: "Lantheus Holdings Inc."
    },
    {
        value: "LOAN",
        label: "Manhattan Bridge Capital Inc"
    },
    {
        value: "LOB",
        label: "Live Oak Bancshares Inc."
    },
    {
        value: "LOCO",
        label: "El Pollo Loco Holdings Inc."
    },
    {
        value: "LODE",
        label: "Comstock Mining Inc."
    },
    {
        value: "LOGI",
        label: "Logitech International S.A."
    },
    {
        value: "LOGM",
        label: "LogMeIn Inc."
    },
    {
        value: "LOGO",
        label: "Global X Iconic U.S. Brands"
    },
    {
        value: "LOMA",
        label: "Loma Negra Compania Industrial Argentina Sociedad Anonima ADS"
    },
    {
        value: "LONE",
        label: "Lonestar Resources US Inc."
    },
    {
        value: "LOOP",
        label: "Loop Industries Inc."
    },
    {
        value: "LOPE",
        label: "Grand Canyon Education Inc."
    },
    {
        value: "LOR",
        label: "Lazard World Dividend & Income Fund Inc."
    },
    {
        value: "LORL",
        label: "Loral Space and Communications Inc."
    },
    {
        value: "LOV",
        label: "Spark Networks Inc. American Depositary Shares (each representing one-tenth of an)"
    },
    {
        value: "LOW",
        label: "Lowe's Companies Inc."
    },
    {
        value: "LOWC",
        label: "SPDR MSCI ACWI Low Carbon Target"
    },
    {
        value: "LOXO",
        label: "Loxo Oncology Inc."
    },
    {
        value: "LPCN",
        label: "Lipocine Inc."
    },
    {
        value: "LPG",
        label: "Dorian LPG Ltd."
    },
    {
        value: "LPI",
        label: "Laredo Petroleum Inc."
    },
    {
        value: "LPL",
        label: "LG Display Co Ltd AMERICAN DEPOSITORY SHARES"
    },
    {
        value: "LPLA",
        label: "LPL Financial Holdings Inc."
    },
    {
        value: "LPNT",
        label: "LifePoint Health Inc."
    },
    {
        value: "LPSN",
        label: "LivePerson Inc."
    },
    {
        value: "LPT",
        label: "Liberty Property Trust"
    },
    {
        value: "LPTH",
        label: "LightPath Technologies Inc."
    },
    {
        value: "LPTX",
        label: "Leap Therapeutics Inc."
    },
    {
        value: "LPX",
        label: "Louisiana-Pacific Corporation"
    },
    {
        value: "LQD",
        label: "iShares iBoxx $ Investment Grade Corporate Bond"
    },
    {
        value: "LQDH",
        label: "iShares Interest Rate Hedged Corporate Bond"
    },
    {
        value: "LQDI",
        label: "iShares Inflation Hedged Corporate Bond"
    },
    {
        value: "LQDT",
        label: "Liquidity Services Inc."
    },
    {
        value: "LRAD",
        label: "LRAD Corporation"
    },
    {
        value: "LRCX",
        label: "Lam Research Corporation"
    },
    {
        value: "LRET",
        label: "ETRACS Monthly Pay 2xLeveraged MSCI US REIT Index ETN due May 5 2045"
    },
    {
        value: "LRGE",
        label: "ClearBridge Large Cap Growth ESG ETF"
    },
    {
        value: "LRGF",
        label: "iShares Edge MSCI Multifactor USA"
    },
    {
        value: "LRN",
        label: "K12 Inc"
    },
    {
        value: "LSBK",
        label: "Lake Shore Bancorp Inc."
    },
    {
        value: "LSCC",
        label: "Lattice Semiconductor Corporation"
    },
    {
        value: "LSI",
        label: "Life Storage Inc."
    },
    {
        value: "LSST",
        label: "Natixis ETF Trust Loomis Sayles Short Duration Income"
    },
    {
        value: "LSTR",
        label: "Landstar System Inc."
    },
    {
        value: "LSVX",
        label: "UBS AG VelocityShares VIX Variable Long/Short ETN linked to the S&P 500 VIX Futures Variable Long/Short Index Short Term due July 18 2046"
    },
    {
        value: "LSXMA",
        label: "Liberty Media Corporation Series A Liberty SiriusXM Common Stock"
    },
    {
        value: "LSXMB",
        label: "Liberty Media Corporation Series B Liberty SiriusXM Common Stock"
    },
    {
        value: "LSXMK",
        label: "Liberty Media Corporation Series C Liberty SiriusXM Common Stock"
    },
    {
        value: "LTBR",
        label: "Lightbridge Corporation"
    },
    {
        value: "LTC",
        label: "LTC Properties Inc."
    },
    {
        value: "LTL",
        label: "ProShares Ultra Telecommunications"
    },
    {
        value: "LTM",
        label: "LATAM Airlines Group S.A."
    },
    {
        value: "LTN",
        label: "Union Acquisition Corp."
    },
    {
        value: "LTN+",
        label: ""
    },
    {
        value: "LTN=",
        label: "Union Acquisition Corp. Units each consisting of one ordinary share and one redeemable warrant"
    },
    {
        value: "LTN^",
        label: "LiveXLive Media"
    },
    {
        value: "LTPZ",
        label: "Pimco 15 Year U.S. TIPS Index Exchange-Traded Fund"
    },
    {
        value: "LTRPA",
        label: "Liberty TripAdvisor Holdings Inc. Series A Common Stock"
    },
    {
        value: "LTRPB",
        label: "Liberty TripAdvisor Holdings Inc. Series B Common Stock"
    },
    {
        value: "LTRX",
        label: "Lantronix Inc."
    },
    {
        value: "LTS",
        label: "Ladenburg Thalmann Financial Services Inc"
    },
    {
        value: "LTS-A",
        label: "Ladenburg Thalmann Financial Services Inc 8.00% Series A Cumulative Redeemable Preferred Stock Liquidation Preference $25.00 per share"
    },
    {
        value: "LTSF",
        label: ""
    },
    {
        value: "LTSL",
        label: "Ladenburg Thalmann Financial Services Inc 6.50% Senior Notes due 2027"
    },
    {
        value: "LTXB",
        label: "LegacyTexas Financial Group Inc."
    },
    {
        value: "LUB",
        label: "Luby's Inc."
    },
    {
        value: "LULU",
        label: "lululemon athletica inc."
    },
    {
        value: "LUNA",
        label: "Luna Innovations Incorporated"
    },
    {
        value: "LUV",
        label: "Southwest Airlines Company"
    },
    {
        value: "LVHB",
        label: "Innovator Lunt Low Vol/High Beta Tactical"
    },
    {
        value: "LVHD",
        label: "Legg Mason Low Volatility High Dividend ETF"
    },
    {
        value: "LVHE",
        label: "Legg Mason Emerging Markets Low Volatility High Dividend"
    },
    {
        value: "LVHI",
        label: "Legg Mason International Low Volatility High Dividend"
    },
    {
        value: "LVIN",
        label: "Hartford Multifactor Low Volatility International Equity"
    },
    {
        value: "LVL",
        label: "Invesco S&P Global Dividend Opportunities Index"
    },
    {
        value: "LVS",
        label: "Las Vegas Sands Corp."
    },
    {
        value: "LVUS",
        label: "Hartford Multifactor Low Volatility US Equity"
    },
    {
        value: "LW",
        label: "Lamb Weston Holdings Inc."
    },
    {
        value: "LWAY",
        label: "Lifeway Foods Inc."
    },
    {
        value: "LX",
        label: "LexinFintech Holdings Ltd."
    },
    {
        value: "LXFR",
        label: "Luxfer Holdings PLC"
    },
    {
        value: "LXFT",
        label: "Luxoft Holding Inc. Class A"
    },
    {
        value: "LXP",
        label: "Lexington Realty Trust"
    },
    {
        value: "LXP-C",
        label: "Lexington Realty Trust Preferred Conv. Series C"
    },
    {
        value: "LXRX",
        label: "Lexicon Pharmaceuticals Inc."
    },
    {
        value: "LXU",
        label: "LSB Industries Inc."
    },
    {
        value: "LYB",
        label: "LyondellBasell Industries NV Class A (Netherlands)"
    },
    {
        value: "LYG",
        label: "Lloyds Banking Group Plc American Depositary Shares"
    },
    {
        value: "LYL",
        label: "Dragon Victory International Limited"
    },
    {
        value: "LYTS",
        label: "LSI Industries Inc."
    },
    {
        value: "LYV",
        label: "Live Nation Entertainment Inc."
    },
    {
        value: "LZB",
        label: "La-Z-Boy Incorporated"
    },
    {
        value: "M",
        label: "Macy's Inc"
    },
    {
        value: "MA",
        label: "Mastercard Incorporated"
    },
    {
        value: "MAA",
        label: "Mid-America Apartment Communities Inc."
    },
    {
        value: "MAA-I",
        label: "Mid-America Apartment Communities Inc. 8.50% Series I Cumulative Redeemable Preferred Stock"
    },
    {
        value: "MAB",
        label: "Eaton Vance Massachusetts Municipal Bond Fund of Beneficial Interest $.01 par value"
    },
    {
        value: "MAC",
        label: "Macerich Company (The)"
    },
    {
        value: "MACK",
        label: "Merrimack Pharmaceuticals Inc."
    },
    {
        value: "MACQ",
        label: "M I Acquisitions Inc."
    },
    {
        value: "MACQU",
        label: "M I Acquisitions Inc. Unit"
    },
    {
        value: "MACQW",
        label: "M I Acquisitions Inc. Warrant"
    },
    {
        value: "MAG",
        label: "MAG Silver Corporation"
    },
    {
        value: "MAGA",
        label: "Point Bridge GOP Stock Tracker"
    },
    {
        value: "MAGS",
        label: "Magal Security Systems Ltd."
    },
    {
        value: "MAIN",
        label: "Main Street Capital Corporation"
    },
    {
        value: "MAMS",
        label: "MAM Software Group Inc."
    },
    {
        value: "MAN",
        label: "ManpowerGroup"
    },
    {
        value: "MANH",
        label: "Manhattan Associates Inc."
    },
    {
        value: "MANT",
        label: "ManTech International Corporation"
    },
    {
        value: "MANU",
        label: "Manchester United Ltd. Class A"
    },
    {
        value: "MAR",
        label: "Marriott International"
    },
    {
        value: "MARA",
        label: "Marathon Patent Group Inc."
    },
    {
        value: "MARK",
        label: "Remark Holdings Inc."
    },
    {
        value: "MARPS",
        label: "Marine Petroleum Trust Units of Beneficial Interest"
    },
    {
        value: "MAS",
        label: "Masco Corporation"
    },
    {
        value: "MASI",
        label: "Masimo Corporation"
    },
    {
        value: "MAT",
        label: "Mattel Inc."
    },
    {
        value: "MATF",
        label: "iShares Edge MSCI Multifactor Materials"
    },
    {
        value: "MATR",
        label: "Mattersight Corporation"
    },
    {
        value: "MATW",
        label: "Matthews International Corporation"
    },
    {
        value: "MATX",
        label: "Matson Inc."
    },
    {
        value: "MAV",
        label: "Pioneer Municipal High Income Advantage Trust of Beneficial Interest"
    },
    {
        value: "MAXR",
        label: "Maxar Technologies Ltd."
    },
    {
        value: "MAYS",
        label: "J. W. Mays Inc."
    },
    {
        value: "MB",
        label: "MINDBODY Inc."
    },
    {
        value: "MBB",
        label: "iShares MBS ETF"
    },
    {
        value: "MBCN",
        label: "Middlefield Banc Corp."
    },
    {
        value: "MBFI",
        label: "MB Financial Inc."
    },
    {
        value: "MBFIO",
        label: "MB Financial Inc. Depositary Shares Each Representing a 1/40th Interest in a Share of 6.000% Noncumulative Perpetual Preferred Stock Series C"
    },
    {
        value: "MBG",
        label: "SPDR Bloomberg Barclays Mortgage Backed Bond"
    },
    {
        value: "MBI",
        label: "MBIA Inc."
    },
    {
        value: "MBII",
        label: "Marrone Bio Innovations Inc."
    },
    {
        value: "MBIN",
        label: "Merchants Bancorp"
    },
    {
        value: "MBIO",
        label: "Mustang Bio Inc."
    },
    {
        value: "MBOT",
        label: "Microbot Medical Inc."
    },
    {
        value: "MBRX",
        label: "Moleculin Biotech Inc."
    },
    {
        value: "MBSD",
        label: "FlexShares Disciplined Duration MBS Index Fund"
    },
    {
        value: "MBT",
        label: "Mobile TeleSystems PJSC"
    },
    {
        value: "MBTF",
        label: "M B T Financial Corp"
    },
    {
        value: "MBUU",
        label: "Malibu Boats Inc."
    },
    {
        value: "MBVX",
        label: "MabVax Therapeutics Holdings Inc."
    },
    {
        value: "MBWM",
        label: "Mercantile Bank Corporation"
    },
    {
        value: "MC",
        label: "Moelis & Company Class A"
    },
    {
        value: "MCA",
        label: "Blackrock MuniYield California Quality Fund Inc."
    },
    {
        value: "MCB",
        label: "Metropolitan Bank Holding Corp."
    },
    {
        value: "MCBC",
        label: "Macatawa Bank Corporation"
    },
    {
        value: "MCC",
        label: "Medley Capital Corporation"
    },
    {
        value: "MCD",
        label: "McDonald's Corporation"
    },
    {
        value: "MCEF",
        label: "First Trust Municipal CEF Income Opportunity ETF"
    },
    {
        value: "MCEP",
        label: "Mid-Con Energy Partners LP"
    },
    {
        value: "MCF",
        label: "Contango Oil & Gas Company"
    },
    {
        value: "MCFT",
        label: "MCBC Holdings Inc."
    },
    {
        value: "MCHI",
        label: "iShares MSCI China ETF"
    },
    {
        value: "MCHP",
        label: "Microchip Technology Incorporated"
    },
    {
        value: "MCHX",
        label: "Marchex Inc."
    },
    {
        value: "MCI",
        label: "Barings Corporate Investors"
    },
    {
        value: "MCK",
        label: "McKesson Corporation"
    },
    {
        value: "MCN",
        label: "Madison Covered Call & Equity Strategy Fund"
    },
    {
        value: "MCO",
        label: "Moody's Corporation"
    },
    {
        value: "MCR",
        label: "MFS Charter Income Trust"
    },
    {
        value: "MCRB",
        label: "Seres Therapeutics Inc."
    },
    {
        value: "MCRI",
        label: "Monarch Casino & Resort Inc."
    },
    {
        value: "MCRN",
        label: "Milacron Holdings Corp."
    },
    {
        value: "MCRO",
        label: "IQ Hedge Macro Tracker"
    },
    {
        value: "MCS",
        label: "Marcus Corporation (The)"
    },
    {
        value: "MCV",
        label: "Medley Capital Corporation 6.125% Senior Notes due 2023"
    },
    {
        value: "MCX",
        label: "Medley Capital Corporation 6.50% Notes due 2021"
    },
    {
        value: "MCY",
        label: "Mercury General Corporation"
    },
    {
        value: "MD",
        label: "Mednax Inc."
    },
    {
        value: "MDB",
        label: "MongoDB Inc."
    },
    {
        value: "MDC",
        label: "M.D.C. Holdings Inc."
    },
    {
        value: "MDCA",
        label: "MDC Partners Inc."
    },
    {
        value: "MDCO",
        label: "The Medicines Company"
    },
    {
        value: "MDGL",
        label: "Madrigal Pharmaceuticals Inc."
    },
    {
        value: "MDGS",
        label: "Medigus Ltd."
    },
    {
        value: "MDIV",
        label: "First Trust Multi-Asset Diversified Income Index Fund"
    },
    {
        value: "MDLQ",
        label: "Medley LLC 7.25% Notes due 2024"
    },
    {
        value: "MDLX",
        label: "Medley LLC 6.875% Senior Notes due 2026"
    },
    {
        value: "MDLY",
        label: "Medley Management Inc. Class A"
    },
    {
        value: "MDLZ",
        label: "Mondelez International Inc."
    },
    {
        value: "MDP",
        label: "Meredith Corporation"
    },
    {
        value: "MDR",
        label: "McDermott International Inc."
    },
    {
        value: "MDRX",
        label: "Allscripts Healthcare Solutions Inc."
    },
    {
        value: "MDSO",
        label: "Medidata Solutions Inc."
    },
    {
        value: "MDT",
        label: "Medtronic plc."
    },
    {
        value: "MDU",
        label: "MDU Resources Group Inc."
    },
    {
        value: "MDWD",
        label: "MediWound Ltd."
    },
    {
        value: "MDXG",
        label: "MiMedx Group Inc"
    },
    {
        value: "MDY",
        label: "SPDR MidCap Trust Series I"
    },
    {
        value: "MDYG",
        label: "SPDR S&P 400 Mid Cap Growth ETF (based on S&P MidCap 400 Growth Index--symbol: MUV)"
    },
    {
        value: "MDYV",
        label: "SPDR S&P 400 Mid Cap Value ETF (based on S&P MidCap 400 Value Index--symbol: MGD"
    },
    {
        value: "MEAR",
        label: "iShares Short Maturity Municipal Bond"
    },
    {
        value: "MED",
        label: "MEDIFAST INC"
    },
    {
        value: "MEDP",
        label: "Medpace Holdings Inc."
    },
    {
        value: "MEET",
        label: "The Meet Group Inc."
    },
    {
        value: "MEI",
        label: "Methode Electronics Inc."
    },
    {
        value: "MEIP",
        label: "MEI Pharma Inc."
    },
    {
        value: "MELI",
        label: "MercadoLibre Inc."
    },
    {
        value: "MELR",
        label: "Melrose Bancorp Inc."
    },
    {
        value: "MEN",
        label: "Blackrock MuniEnhanced Fund Inc"
    },
    {
        value: "MEOH",
        label: "Methanex Corporation"
    },
    {
        value: "MER-K",
        label: "Merrill Lynch & Co. Inc. 6.45% Trust Preferred Securities"
    },
    {
        value: "MERC",
        label: "Mercer International Inc."
    },
    {
        value: "MESO",
        label: "Mesoblast Limited"
    },
    {
        value: "MET",
        label: "MetLife Inc."
    },
    {
        value: "MET-A",
        label: "MetLife Inc. Preferred Series A Floating Rate"
    },
    {
        value: "METC",
        label: "Ramaco Resources Inc."
    },
    {
        value: "MEXX",
        label: "Direxion Daily MSCI Mexico Bull 3X Shares"
    },
    {
        value: "MFA",
        label: "MFA Financial Inc."
    },
    {
        value: "MFA-B",
        label: "MFA Financial Inc. Preferred Series B"
    },
    {
        value: "MFC",
        label: "Manulife Financial Corporation"
    },
    {
        value: "MFCB",
        label: "MFC Bancorp Ltd."
    },
    {
        value: "MFD",
        label: "Macquarie First Trust Global"
    },
    {
        value: "MFDX",
        label: "PIMCO Equitiy Series RAFI Dynamic Multi-Factor International Equity"
    },
    {
        value: "MFEM",
        label: "PIMCO Equitiy Series RAFI Dynamic Multi-Factor Emerging Markets Equity"
    },
    {
        value: "MFG",
        label: "Mizuho Financial Group Inc. Sponosred ADR (Japan)"
    },
    {
        value: "MFGP",
        label: "Micro Focus Intl PLC ADS each representing One Ord Sh"
    },
    {
        value: "MFIN",
        label: "Medallion Financial Corp."
    },
    {
        value: "MFINL",
        label: "Medallion Financial Corp. 9.000% Notes due 2021"
    },
    {
        value: "MFL",
        label: "Blackrock MuniHoldings Investment Quality Fund of Beneficial Interest"
    },
    {
        value: "MFM",
        label: "MFS Municipal Income Trust"
    },
    {
        value: "MFNC",
        label: "Mackinac Financial Corporation"
    },
    {
        value: "MFO",
        label: "MFA Financial Inc. 8.00% Senior Notes due 2042"
    },
    {
        value: "MFSF",
        label: "MutualFirst Financial Inc."
    },
    {
        value: "MFT",
        label: "Blackrock MuniYield Investment Quality Fund of Beneficial Interest"
    },
    {
        value: "MFUS",
        label: "PIMCO Equitiy Series RAFI Dynamic Multi-Factor U.S. Equity"
    },
    {
        value: "MFV",
        label: "MFS Special Value Trust"
    },
    {
        value: "MG",
        label: "Mistras Group Inc"
    },
    {
        value: "MGA",
        label: "Magna International Inc."
    },
    {
        value: "MGC",
        label: "Vanguard Mega Cap"
    },
    {
        value: "MGEE",
        label: "MGE Energy Inc."
    },
    {
        value: "MGEN",
        label: "Miragen Therapeutics Inc."
    },
    {
        value: "MGF",
        label: "MFS Government Markets Income Trust"
    },
    {
        value: "MGI",
        label: "Moneygram International Inc."
    },
    {
        value: "MGIC",
        label: "Magic Software Enterprises Ltd."
    },
    {
        value: "MGK",
        label: "Vanguard Mega Cap Growth"
    },
    {
        value: "MGLN",
        label: "Magellan Health Inc."
    },
    {
        value: "MGM",
        label: "MGM Resorts International"
    },
    {
        value: "MGNX",
        label: "MacroGenics Inc."
    },
    {
        value: "MGP",
        label: "MGM Growth Properties LLC Class A representing limited liability company interests"
    },
    {
        value: "MGPI",
        label: "MGP Ingredients Inc."
    },
    {
        value: "MGRC",
        label: "McGrath RentCorp"
    },
    {
        value: "MGU",
        label: "Macquarie Global Infrastructure Total Return Fund Inc."
    },
    {
        value: "MGV",
        label: "Vanguard Mega Cap Value"
    },
    {
        value: "MGYR",
        label: "Magyar Bancorp Inc."
    },
    {
        value: "MH-A",
        label: "Maiden Holdings Ltd. Pref Shs Ser A (Bermuda)"
    },
    {
        value: "MH-C",
        label: "Maiden Holdings North America Ltd. 7.125% Non-Cumulative Preference Shares Series C"
    },
    {
        value: "MH-D",
        label: "Maiden Holdings Ltd. 6.700% Non-Cumulative Preference Shares Series D"
    },
    {
        value: "MHD",
        label: "Blackrock MuniHoldings Fund Inc."
    },
    {
        value: "MHE",
        label: "BlackRock Massachusetts Tax-Exempt Trust"
    },
    {
        value: "MHF",
        label: "Western Asset Municipal High Income Fund Inc."
    },
    {
        value: "MHH",
        label: "Mastech Digital Inc"
    },
    {
        value: "MHI",
        label: "Pioneer Municipal High Income Trust of Beneficial Interest"
    },
    {
        value: "MHK",
        label: "Mohawk Industries Inc."
    },
    {
        value: "MHLA",
        label: "Maiden Holdings Ltd. 6.625% Notes due 2046"
    },
    {
        value: "MHLD",
        label: "Maiden Holdings Ltd."
    },
    {
        value: "MHN",
        label: "Blackrock MuniHoldings New York Quality Fund Inc."
    },
    {
        value: "MHNC",
        label: "Maiden Holdings North America Ltd. 7.75% Notes due 2043"
    },
    {
        value: "MHO",
        label: "M/I Homes Inc."
    },
    {
        value: "MIC",
        label: "Macquarie Infrastructure Corporation"
    },
    {
        value: "MICR",
        label: "Micron Solutions Inc."
    },
    {
        value: "MICT",
        label: "Micronet Enertec Technologies Inc."
    },
    {
        value: "MIDD",
        label: "The Middleby Corporation"
    },
    {
        value: "MIDU",
        label: "Direxion Mid Cap Bull 3X Shares"
    },
    {
        value: "MIDZ",
        label: "Direxion Mid Cap Bear 3X Shares"
    },
    {
        value: "MIE",
        label: "Cohen & Steers MLP Income and Energy Opportunity Fund Inc."
    },
    {
        value: "MIK",
        label: "The Michaels Companies Inc."
    },
    {
        value: "MILN",
        label: "Global X Millennials Thematic ETF"
    },
    {
        value: "MIME",
        label: "Mimecast Limited"
    },
    {
        value: "MIN",
        label: "MFS Intermediate Income Trust"
    },
    {
        value: "MINC",
        label: "AdvisorShares Newfleet Multi-sector Income"
    },
    {
        value: "MIND",
        label: "Mitcham Industries Inc."
    },
    {
        value: "MINDP",
        label: "Mitcham Industries Inc. Series A 9.00% Series A Cumulative Preferred Stock"
    },
    {
        value: "MINI",
        label: "Mobile Mini Inc."
    },
    {
        value: "MINT",
        label: "PIMCO Enhanced Short Maturity Active Exchange-Traded Fund"
    },
    {
        value: "MITK",
        label: "Mitek Systems Inc."
    },
    {
        value: "MITL",
        label: "Mitel Networks Corporation"
    },
    {
        value: "MITT",
        label: "AG Mortgage Investment Trust Inc."
    },
    {
        value: "MITT-A",
        label: "AG Mortgage Investment Trust Inc. 8.25% Preferred Series A"
    },
    {
        value: "MITT-B",
        label: "AG Mortgage Investment Trust Inc. Preferred Series B"
    },
    {
        value: "MIW",
        label: "Eaton Vance Michigan Municipal Bond Fund of Beneficial Interest $.01 par value"
    },
    {
        value: "MIXT",
        label: "MiX Telematics Limited American Depositary Shares each representing 25"
    },
    {
        value: "MIY",
        label: "Blackrock MuniYield Michigan Quality Fund Inc."
    },
    {
        value: "MJ",
        label: "ETFMG Alternative Harvest"
    },
    {
        value: "MJCO",
        label: "Majesco"
    },
    {
        value: "MKC",
        label: "McCormick & Company Incorporated"
    },
    {
        value: "MKC.V",
        label: "McCormick & Company Incorporated"
    },
    {
        value: "MKGI",
        label: "Monaker Group Inc."
    },
    {
        value: "MKL",
        label: "Markel Corporation"
    },
    {
        value: "MKSI",
        label: "MKS Instruments Inc."
    },
    {
        value: "MKTX",
        label: "MarketAxess Holdings Inc."
    },
    {
        value: "MLAB",
        label: "Mesa Laboratories Inc."
    },
    {
        value: "MLCO",
        label: "Melco Resorts & Entertainment Limited"
    },
    {
        value: "MLHR",
        label: "Herman Miller Inc."
    },
    {
        value: "MLI",
        label: "Mueller Industries Inc."
    },
    {
        value: "MLM",
        label: "Martin Marietta Materials Inc."
    },
    {
        value: "MLN",
        label: "VanEck Vectors AMT-Free Long Municipal Index"
    },
    {
        value: "MLNT",
        label: "Melinta Therapeutics Inc."
    },
    {
        value: "MLNX",
        label: "Mellanox Technologies Ltd."
    },
    {
        value: "MLP",
        label: "Maui Land & Pineapple Company Inc."
    },
    {
        value: "MLPA",
        label: "Global X MLP"
    },
    {
        value: "MLPB",
        label: "ETRACS Alerian MLP Infrastructure Index ETN Series B due April 2 2040"
    },
    {
        value: "MLPC",
        label: "C-Tracks ETNs based on Performance of the Miller/Howard MLP Fundamental Index"
    },
    {
        value: "MLPE",
        label: "C-Tracks ETN on Miller/Howard Fundamental MLP Index Series B Due July 13 2026"
    },
    {
        value: "MLPG",
        label: "UBS AG Exchange Traded Access Securities (E-TRACS) Linked to the Alerian Natural Gas MLP Index due July 9 2040"
    },
    {
        value: "MLPI",
        label: "UBS AG ETN"
    },
    {
        value: "MLPO",
        label: "Credit Suisse Group Exchange Traded Notes due December 4 2034 Linked to the S&P MLP Index"
    },
    {
        value: "MLPQ",
        label: "UBS AG ETRACS 2xMonthly Leveraged Alerian MLP Infrastructure Index ETN Series B due February 12 2046"
    },
    {
        value: "MLPS",
        label: "UBS AG 1xMonthly Short Exchange Traded Access Securities (E-TRACS) Linked to the Alerian MLP Infrastructure Total Return Index due October 1 2040"
    },
    {
        value: "MLPX",
        label: "Global X MLP & Energy Infrastructure"
    },
    {
        value: "MLPY",
        label: "Morgan Stanley Cushing MLP High Income Index ETN"
    },
    {
        value: "MLPZ",
        label: "UBS AG ETRACS ETRACS 2xMonthly Leveraged S&P MLP Index ETN Series B due February 12 2046"
    },
    {
        value: "MLQD",
        label: "iShares 5-10 Year Investment Grade Corporate Bond"
    },
    {
        value: "MLR",
        label: "Miller Industries Inc."
    },
    {
        value: "MLSS",
        label: "Milestone Scientific Inc."
    },
    {
        value: "MLTI",
        label: "Credit Suisse X-Links Multi-Asset High Income Exchange Traded Notes (ETNs) due September 28 2035"
    },
    {
        value: "MLVF",
        label: "Malvern Bancorp Inc."
    },
    {
        value: "MMAC",
        label: "MMA Capital Management LLC"
    },
    {
        value: "MMC",
        label: "Marsh & McLennan Companies Inc."
    },
    {
        value: "MMD",
        label: "MainStay MacKay DefinedTerm Municipal Opportunities Fund"
    },
    {
        value: "MMDM",
        label: "Modern Media Acquisition Corp."
    },
    {
        value: "MMDMR",
        label: "Modern Media Acquisition Corp. Right"
    },
    {
        value: "MMDMU",
        label: "Modern Media Acquisition Corp. Unit"
    },
    {
        value: "MMDMW",
        label: "Modern Media Acquisition Corp. Warrant"
    },
    {
        value: "MMI",
        label: "Marcus & Millichap Inc."
    },
    {
        value: "MMIN",
        label: "IQ MacKay Shields Municipal Insured ETF"
    },
    {
        value: "MMIT",
        label: "IQ MacKay Shields Municipal Intermediate"
    },
    {
        value: "MMLP",
        label: "Martin Midstream Partners L.P."
    },
    {
        value: "MMM",
        label: "3M Company"
    },
    {
        value: "MMP",
        label: "Magellan Midstream Partners L.P. Limited Partnership"
    },
    {
        value: "MMS",
        label: "Maximus Inc."
    },
    {
        value: "MMSI",
        label: "Merit Medical Systems Inc."
    },
    {
        value: "MMT",
        label: "MFS Multimarket Income Trust"
    },
    {
        value: "MMTM",
        label: "SPDR S&P 1500 Momentum Tilt"
    },
    {
        value: "MMU",
        label: "Western Asset Managed Municipals Fund Inc."
    },
    {
        value: "MMV",
        label: "Eaton Vance Massachusetts Municipal Income Trust Shares of Beneficial Interest"
    },
    {
        value: "MMYT",
        label: "MakeMyTrip Limited"
    },
    {
        value: "MN",
        label: "Manning & Napier Inc. Class A"
    },
    {
        value: "MNA",
        label: "IQ Merger Arbitrage"
    },
    {
        value: "MNDO",
        label: "MIND C.T.I. Ltd."
    },
    {
        value: "MNE",
        label: "Blackrock Muni New York Intermediate Duration Fund Inc"
    },
    {
        value: "MNGA",
        label: "MagneGas Corporation"
    },
    {
        value: "MNI",
        label: "McClatchy Company (The)"
    },
    {
        value: "MNK",
        label: "Mallinckrodt plc"
    },
    {
        value: "MNKD",
        label: "MannKind Corporation"
    },
    {
        value: "MNLO",
        label: "Menlo Therapeutics Inc."
    },
    {
        value: "MNOV",
        label: "MediciNova Inc."
    },
    {
        value: "MNP",
        label: "Western Asset Municipal Partners Fund Inc."
    },
    {
        value: "MNR",
        label: "Monmouth Real Estate Investment Corporation Class A"
    },
    {
        value: "MNR-C",
        label: "Monmouth Real Estate Investment Corporation 6.125% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "MNRO",
        label: "Monro Inc."
    },
    {
        value: "MNST",
        label: "Monster Beverage Corporation"
    },
    {
        value: "MNTA",
        label: "Momenta Pharmaceuticals Inc."
    },
    {
        value: "MNTX",
        label: "Manitex International Inc."
    },
    {
        value: "MO",
        label: "Altria Group Inc."
    },
    {
        value: "MOAT",
        label: "VanEck Vectors Morningstar Wide Moat"
    },
    {
        value: "MOBL",
        label: "MobileIron Inc."
    },
    {
        value: "MOC",
        label: "Command Security Corporation"
    },
    {
        value: "MOD",
        label: "Modine Manufacturing Company"
    },
    {
        value: "MODN",
        label: "Model N Inc."
    },
    {
        value: "MOFG",
        label: "MidWestOne Financial Group Inc."
    },
    {
        value: "MOG.A",
        label: "Moog Inc. Class A"
    },
    {
        value: "MOG.B",
        label: "Moog Inc. Class B"
    },
    {
        value: "MOGLC",
        label: "Gabelli NextShares Trust"
    },
    {
        value: "MOGO",
        label: "Mogo Finance Technology Inc."
    },
    {
        value: "MOH",
        label: "Molina Healthcare Inc"
    },
    {
        value: "MOM",
        label: "AGFiQ U.S. Market Neutral Momentum Fund"
    },
    {
        value: "MOMO",
        label: "Momo Inc."
    },
    {
        value: "MON",
        label: "Monsanto Company"
    },
    {
        value: "MOO",
        label: "VanEck Vectors Agribusiness"
    },
    {
        value: "MOR",
        label: "MorphoSys AG"
    },
    {
        value: "MORL",
        label: "ETRACS Monthly Pay 2XLeveraged Mortgage REIT ETN"
    },
    {
        value: "MORN",
        label: "Morningstar Inc."
    },
    {
        value: "MORT",
        label: "VanEck Vectors Mortgage REIT Income"
    },
    {
        value: "MOS",
        label: "Mosaic Company (The)"
    },
    {
        value: "MOSC",
        label: "Mosaic Acquisition Corp. Class A"
    },
    {
        value: "MOSC+",
        label: ""
    },
    {
        value: "MOSC=",
        label: "Mosaic Acquisition Corp. Units each consisting of one Class A Ordinary Share and one-third of one Warrant"
    },
    {
        value: "MOSY",
        label: "MoSys Inc."
    },
    {
        value: "MOTI",
        label: "VanEck Vectors Morningstar International Moat"
    },
    {
        value: "MOTS",
        label: "Motus GI Holdings Inc."
    },
    {
        value: "MOV",
        label: "Movado Group Inc."
    },
    {
        value: "MOXC",
        label: "Moxian Inc."
    },
    {
        value: "MP-D",
        label: "Mississippi Power Company 5.25 Srs Pfd"
    },
    {
        value: "MPA",
        label: "Blackrock MuniYield Pennsylvania Quality Fund"
    },
    {
        value: "MPAA",
        label: "Motorcar Parts of America Inc."
    },
    {
        value: "MPAC",
        label: "Matlin & Partners Acquisition Corporation"
    },
    {
        value: "MPACU",
        label: "Matlin & Partners Acquisition Corporation Unit"
    },
    {
        value: "MPACW",
        label: "Matlin & Partners Acquisition Corporation Warrants"
    },
    {
        value: "MPB",
        label: "Mid Penn Bancorp"
    },
    {
        value: "MPC",
        label: "Marathon Petroleum Corporation"
    },
    {
        value: "MPCT",
        label: "iShares MSCI Global Impact ETF"
    },
    {
        value: "MPLX",
        label: "MPLX LP Representing Limited Partner Interests"
    },
    {
        value: "MPO",
        label: "Midstates Petroleum Company Inc."
    },
    {
        value: "MPV",
        label: "Barings Participation Investors"
    },
    {
        value: "MPVD",
        label: "Mountain Province Diamonds Inc."
    },
    {
        value: "MPW",
        label: "Medical Properties Trust Inc."
    },
    {
        value: "MPWR",
        label: "Monolithic Power Systems Inc."
    },
    {
        value: "MPX",
        label: "Marine Products Corporation"
    },
    {
        value: "MQT",
        label: "Blackrock MuniYield Quality Fund II Inc."
    },
    {
        value: "MQY",
        label: "Blackrock MuniYield Quality Fund Inc."
    },
    {
        value: "MRAM",
        label: "Everspin Technologies Inc."
    },
    {
        value: "MRBK",
        label: "Meridian Bank"
    },
    {
        value: "MRC",
        label: "MRC Global Inc."
    },
    {
        value: "MRCC",
        label: "Monroe Capital Corporation"
    },
    {
        value: "MRCY",
        label: "Mercury Systems Inc"
    },
    {
        value: "MRGR",
        label: "ProShares Merger"
    },
    {
        value: "MRIN",
        label: "Marin Software Incorporated"
    },
    {
        value: "MRK",
        label: "Merck & Company Inc. (new)"
    },
    {
        value: "MRLN",
        label: "Marlin Business Services Corp."
    },
    {
        value: "MRNS",
        label: "Marinus Pharmaceuticals Inc."
    },
    {
        value: "MRO",
        label: "Marathon Oil Corporation"
    },
    {
        value: "MRRL",
        label: "ETRACS Monthly Pay 2xLeveraged Mortgage REIT ETN Series B due October 16 2042"
    },
    {
        value: "MRSN",
        label: "Mersana Therapeutics Inc."
    },
    {
        value: "MRT",
        label: "MedEquities Realty Trust Inc."
    },
    {
        value: "MRTN",
        label: "Marten Transport Ltd."
    },
    {
        value: "MRTX",
        label: "Mirati Therapeutics Inc."
    },
    {
        value: "MRUS",
        label: "Merus N.V."
    },
    {
        value: "MRVL",
        label: "Marvell Technology Group Ltd."
    },
    {
        value: "MS",
        label: "Morgan Stanley"
    },
    {
        value: "MS-A",
        label: "Morgan Stanley Dep Shs repstg 1/1000 Pfd Ser A"
    },
    {
        value: "MS-E",
        label: "Morgan Stanley DEPOSITARY SHARES SERIES E"
    },
    {
        value: "MS-F",
        label: "Morgan Stanley Dep Shs Rpstg 1/1000th Int Prd Ser F Fxd to Flag"
    },
    {
        value: "MS-G",
        label: "Morgan Stanley Depositary Shares Series G"
    },
    {
        value: "MS-I",
        label: "Morgan Stanley Depository Shares Series 1"
    },
    {
        value: "MS-K",
        label: "Morgan Stanley Depositary Shares Series K"
    },
    {
        value: "MSA",
        label: "MSA Safety Incorporated"
    },
    {
        value: "MSB",
        label: "Mesabi Trust"
    },
    {
        value: "MSBF",
        label: "MSB Financial Corp."
    },
    {
        value: "MSBI",
        label: "Midland States Bancorp Inc."
    },
    {
        value: "MSCI",
        label: "MSCI Inc"
    },
    {
        value: "MSD",
        label: "Morgan Stanley Emerging Markets Debt Fund Inc."
    },
    {
        value: "MSEX",
        label: "Middlesex Water Company"
    },
    {
        value: "MSF",
        label: "Morgan Stanley Emerging Markets Fund Inc."
    },
    {
        value: "MSFT",
        label: "Microsoft Corporation"
    },
    {
        value: "MSG",
        label: "The Madison Square Garden Company Class A (New)"
    },
    {
        value: "MSGN",
        label: "MSG Networks Inc."
    },
    {
        value: "MSI",
        label: "Motorola Solutions Inc."
    },
    {
        value: "MSL",
        label: "MidSouth Bancorp"
    },
    {
        value: "MSM",
        label: "MSC Industrial Direct Company Inc."
    },
    {
        value: "MSN",
        label: "Emerson Radio Corporation"
    },
    {
        value: "MSON",
        label: "MISONIX Inc."
    },
    {
        value: "MSP",
        label: "Madison Strategic Sector Premium Fund of Beneficial Interest"
    },
    {
        value: "MSTR",
        label: "MicroStrategy Incorporated"
    },
    {
        value: "MSUS",
        label: "LHA Market State U.S. Tactical"
    },
    {
        value: "MT",
        label: "Arcelor Mittal NY Registry Shares NEW"
    },
    {
        value: "MTB",
        label: "M&T Bank Corporation"
    },
    {
        value: "MTB+",
        label: "M&T Bank Corporation Warrant (Expiring December 23 2018)"
    },
    {
        value: "MTB-",
        label: ""
    },
    {
        value: "MTB-C",
        label: "M&T Bank Corporation Fixed Rate Cumulative Perpetual Preferred Stock Series C"
    },
    {
        value: "MTBC",
        label: "Medical Transcription Billing Corp."
    },
    {
        value: "MTBCP",
        label: "Medical Transcription Billing Corp. 11% Series A Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "MTCH",
        label: "Match Group Inc."
    },
    {
        value: "MTD",
        label: "Mettler-Toledo International Inc."
    },
    {
        value: "MTDR",
        label: "Matador Resources Company"
    },
    {
        value: "MTEC",
        label: "MTech Acquisition Corp."
    },
    {
        value: "MTECU",
        label: "MTech Acquisition Corp. Unit"
    },
    {
        value: "MTECW",
        label: "MTech Acquisition Corp. Warrant"
    },
    {
        value: "MTEM",
        label: "Molecular Templates Inc."
    },
    {
        value: "MTEX",
        label: "Mannatech Incorporated"
    },
    {
        value: "MTFB",
        label: "Motif Bio plc"
    },
    {
        value: "MTFBW",
        label: "Motif Bio plc Warrant"
    },
    {
        value: "MTG",
        label: "MGIC Investment Corporation"
    },
    {
        value: "MTGE",
        label: "MTGE Investment Corp."
    },
    {
        value: "MTGEP",
        label: "MTGE Investment Corp. 8.125% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "MTH",
        label: "Meritage Homes Corporation"
    },
    {
        value: "MTL",
        label: "Mechel PAO American Depositary Shares (Each rep. 1)"
    },
    {
        value: "MTL-",
        label: "MECHEL-PREF SPON ADR"
    },
    {
        value: "MTLS",
        label: "Materialise NV"
    },
    {
        value: "MTN",
        label: "Vail Resorts Inc."
    },
    {
        value: "MTNB",
        label: "Matinas Biopharma Holdings Inc."
    },
    {
        value: "MTOR",
        label: "Meritor Inc."
    },
    {
        value: "MTP",
        label: "Midatech Pharma PLC"
    },
    {
        value: "MTR",
        label: "Mesa Royalty Trust"
    },
    {
        value: "MTRN",
        label: "Materion Corporation"
    },
    {
        value: "MTRX",
        label: "Matrix Service Company"
    },
    {
        value: "MTSC",
        label: "MTS Systems Corporation"
    },
    {
        value: "MTSI",
        label: "MACOM Technology Solutions Holdings Inc."
    },
    {
        value: "MTSL",
        label: "MER Telemanagement Solutions Ltd."
    },
    {
        value: "MTT",
        label: "Western Asset Municipal Defined Opportunity Trust Inc"
    },
    {
        value: "MTUM",
        label: "iShares Edge MSCI USA Momentum Factor"
    },
    {
        value: "MTW",
        label: "Manitowoc Company Inc. (The)"
    },
    {
        value: "MTX",
        label: "Minerals Technologies Inc."
    },
    {
        value: "MTZ",
        label: "MasTec Inc."
    },
    {
        value: "MU",
        label: "Micron Technology Inc."
    },
    {
        value: "MUA",
        label: "Blackrock MuniAssets Fund Inc"
    },
    {
        value: "MUB",
        label: "iShares National Muni Bond"
    },
    {
        value: "MUC",
        label: "Blackrock MuniHoldings California Quality Fund Inc."
    },
    {
        value: "MUDS",
        label: "Mudrick Capital Acquisition Corporation"
    },
    {
        value: "MUDSU",
        label: "Mudrick Capital Acquisition Corporation Unit"
    },
    {
        value: "MUDSW",
        label: "Mudrick Capital Acquisition Corporation Warrant"
    },
    {
        value: "MUE",
        label: "Blackrock MuniHoldings Quality Fund II Inc."
    },
    {
        value: "MUFG",
        label: "Mitsubishi UFJ Financial Group Inc."
    },
    {
        value: "MUH",
        label: "Blackrock MuniHoldings Fund II Inc."
    },
    {
        value: "MUI",
        label: "Blackrock Muni Intermediate Duration Fund Inc"
    },
    {
        value: "MUJ",
        label: "Blackrock MuniHoldings New Jersey Quality Fund Inc."
    },
    {
        value: "MUNI",
        label: "PIMCO Intermediate Municipal Bond Active Exchange-Traded Fund"
    },
    {
        value: "MUR",
        label: "Murphy Oil Corporation"
    },
    {
        value: "MUS",
        label: "Blackrock MuniHoldings Quality Fund Inc"
    },
    {
        value: "MUSA",
        label: "Murphy USA Inc."
    },
    {
        value: "MUX",
        label: "McEwen Mining Inc."
    },
    {
        value: "MVBF",
        label: "MVB Financial Corp."
    },
    {
        value: "MVC",
        label: "MVC Capital Inc."
    },
    {
        value: "MVCD",
        label: "MVC Capital Inc. 6.25% Senior Notes due 2022"
    },
    {
        value: "MVF",
        label: "Blackrock MuniVest Fund Inc."
    },
    {
        value: "MVIN",
        label: "Natixis ETF Trust"
    },
    {
        value: "MVIS",
        label: "Microvision Inc."
    },
    {
        value: "MVO",
        label: "MV Oil Trust"
    },
    {
        value: "MVT",
        label: "Blackrock MuniVest Fund II Inc."
    },
    {
        value: "MVV",
        label: "ProShares Ultra MidCap400"
    },
    {
        value: "MWA",
        label: "MUELLER WATER PRODUCTS"
    },
    {
        value: "MX",
        label: "MagnaChip Semiconductor Corporation"
    },
    {
        value: "MXC",
        label: "Mexco Energy Corporation"
    },
    {
        value: "MXDE",
        label: "Nationwide Maximum Diversification Emerging Markets Core Equity"
    },
    {
        value: "MXDU",
        label: "Nationwide Maximum Diversification U.S. Core Equity"
    },
    {
        value: "MXE",
        label: "Mexico Equity and Income Fund Inc. (The)"
    },
    {
        value: "MXF",
        label: "Mexico Fund Inc. (The)"
    },
    {
        value: "MXI",
        label: "iShares Global Materials"
    },
    {
        value: "MXIM",
        label: "Maxim Integrated Products Inc."
    },
    {
        value: "MXL",
        label: "MaxLinear Inc."
    },
    {
        value: "MXWL",
        label: "Maxwell Technologies Inc."
    },
    {
        value: "MYC",
        label: "Blackrock MuniYield California Fund Inc."
    },
    {
        value: "MYD",
        label: "Blackrock MuniYield Fund Inc."
    },
    {
        value: "MYE",
        label: "Myers Industries Inc."
    },
    {
        value: "MYF",
        label: "Blackrock MuniYield Investment Fund"
    },
    {
        value: "MYGN",
        label: "Myriad Genetics Inc."
    },
    {
        value: "MYI",
        label: "Blackrock MuniYield Quality Fund III Inc"
    },
    {
        value: "MYJ",
        label: "Blackrock MuniYield New Jersey Fund Inc"
    },
    {
        value: "MYL",
        label: "Mylan N.V."
    },
    {
        value: "MYN",
        label: "Blackrock MuniYield New York Quality Fund Inc.Common Stock"
    },
    {
        value: "MYND",
        label: "MYnd Analytics Inc."
    },
    {
        value: "MYNDW",
        label: "MYnd Analytics Inc. Warrant"
    },
    {
        value: "MYO",
        label: "Myomo Inc."
    },
    {
        value: "MYOK",
        label: "MyoKardia Inc."
    },
    {
        value: "MYOS",
        label: "MYOS RENS Technology Inc."
    },
    {
        value: "MYOV",
        label: "Myovant Sciences Ltd."
    },
    {
        value: "MYRG",
        label: "MYR Group Inc."
    },
    {
        value: "MYSZ",
        label: "My Size Inc."
    },
    {
        value: "MYY",
        label: "ProShares Short MidCap400"
    },
    {
        value: "MZA",
        label: "Blackrock MuniYield Arizona Fund Inc."
    },
    {
        value: "MZF",
        label: "Managed Duration Investment Grade Municipal Fund"
    },
    {
        value: "MZOR",
        label: "Mazor Robotics Ltd."
    },
    {
        value: "MZZ",
        label: "ProShares UltraShort MidCap400"
    },
    {
        value: "NAC",
        label: "Nuveen California Quality Municipal Income Fund"
    },
    {
        value: "NAD",
        label: "Nuveen Quality Municipal Income Fund"
    },
    {
        value: "NAII",
        label: "Natural Alternatives International Inc."
    },
    {
        value: "NAIL",
        label: "Direxion Daily Homebuilders & Supplies Bull 3X Shares"
    },
    {
        value: "NAK",
        label: "Northern Dynasty Minerals Ltd."
    },
    {
        value: "NAKD",
        label: "Naked Brand Group Inc."
    },
    {
        value: "NAN",
        label: "Nuveen New York Quality Municipal Income Fund"
    },
    {
        value: "NANO",
        label: "Nanometrics Incorporated"
    },
    {
        value: "NANR",
        label: "SPDR S&P North American Natural Resources"
    },
    {
        value: "NAO",
        label: "Nordic Amern Offshore Ltd (Bermuda)"
    },
    {
        value: "NAOV",
        label: "NanoVibronix Inc."
    },
    {
        value: "NAP",
        label: "Navios Maritime Midstream Partners LP representing limited partner interests"
    },
    {
        value: "NAT",
        label: "Nordic American Tankers Limited"
    },
    {
        value: "NATH",
        label: "Nathan's Famous Inc."
    },
    {
        value: "NATI",
        label: "National Instruments Corporation"
    },
    {
        value: "NATR",
        label: "Nature's Sunshine Products Inc."
    },
    {
        value: "NAUH",
        label: "National American University Holdings Inc."
    },
    {
        value: "NAV",
        label: "Navistar International Corporation"
    },
    {
        value: "NAV-D",
        label: "Navistar International Corporation Preferred Stock"
    },
    {
        value: "NAVB",
        label: "Navidea Biopharmaceuticals Inc."
    },
    {
        value: "NAVG",
        label: "The Navigators Group Inc."
    },
    {
        value: "NAVI",
        label: "Navient Corporation"
    },
    {
        value: "NAZ",
        label: "Nuveen Arizona Quality Municipal Income Fund"
    },
    {
        value: "NBB",
        label: "Nuveen Build America Bond Fund of Beneficial Interest"
    },
    {
        value: "NBD",
        label: "Nuveen Build America Bond Opportunity Fund of Beneficial Interest"
    },
    {
        value: "NBEV",
        label: "New Age Beverages Corporation"
    },
    {
        value: "NBH",
        label: "Neuberger Berman Intermediate Municipal Fund Inc."
    },
    {
        value: "NBHC",
        label: "National Bank Holdings Corporation"
    },
    {
        value: "NBIX",
        label: "Neurocrine Biosciences Inc."
    },
    {
        value: "NBL",
        label: "Noble Energy Inc."
    },
    {
        value: "NBLX",
        label: "Noble Midstream Partners LP Representing Limited Partner Interests"
    },
    {
        value: "NBN",
        label: "Northeast Bancorp"
    },
    {
        value: "NBO",
        label: "Neuberger Berman New York Intermediate Municipal Fund Inc."
    },
    {
        value: "NBR",
        label: "Nabors Industries Ltd."
    },
    {
        value: "NBR-A",
        label: "Nabors Industries Ltd. 6.00% Mandatory Convertible Preferred Shares Series A"
    },
    {
        value: "NBRV",
        label: "Nabriva Therapeutics plc"
    },
    {
        value: "NBTB",
        label: "NBT Bancorp Inc."
    },
    {
        value: "NBW",
        label: "Neuberger Berman California Intermediate Municipal Fund Inc."
    },
    {
        value: "NBY",
        label: "NovaBay Pharmaceuticals Inc."
    },
    {
        value: "NC",
        label: "NACCO Industries Inc."
    },
    {
        value: "NCA",
        label: "Nuveen California Municipal Value Fund Inc."
    },
    {
        value: "NCB",
        label: "Nuveen California Municipal Value Fund 2 of Beneficial Interest"
    },
    {
        value: "NCBS",
        label: "Nicolet Bankshares Inc."
    },
    {
        value: "NCI",
        label: "Navigant Consulting Inc."
    },
    {
        value: "NCLH",
        label: "Norwegian Cruise Line Holdings Ltd."
    },
    {
        value: "NCMI",
        label: "National CineMedia Inc."
    },
    {
        value: "NCNA",
        label: "NuCana plc"
    },
    {
        value: "NCOM",
        label: "National Commerce Corporation"
    },
    {
        value: "NCR",
        label: "NCR Corporation"
    },
    {
        value: "NCS",
        label: "NCI Building Systems Inc."
    },
    {
        value: "NCSM",
        label: "NCS Multistage Holdings Inc."
    },
    {
        value: "NCTY",
        label: "The9 Limited"
    },
    {
        value: "NCV",
        label: "AllianzGI Convertible & Income Fund"
    },
    {
        value: "NCZ",
        label: "AllianzGI Convertible & Income Fund II of Beneficial Interest"
    },
    {
        value: "NDAQ",
        label: "Nasdaq Inc."
    },
    {
        value: "NDLS",
        label: "Noodles & Company"
    },
    {
        value: "NDP",
        label: "Tortoise Energy Independence Fund Inc."
    },
    {
        value: "NDRA",
        label: "ENDRA Life Sciences Inc."
    },
    {
        value: "NDRAW",
        label: "ENDRA Life Sciences Inc. Warrants"
    },
    {
        value: "NDRO",
        label: "Enduro Royalty Trust Trust Units representing beneficial interest in the trust"
    },
    {
        value: "NDSN",
        label: "Nordson Corporation"
    },
    {
        value: "NE",
        label: "Noble Corporation (UK)"
    },
    {
        value: "NEA",
        label: "Nuveen AMT-Free Quality Municipal Income Fund of Beneficial Interest Par Value $.01"
    },
    {
        value: "NEAR",
        label: "iShares Short Maturity Bond"
    },
    {
        value: "NEBU",
        label: "Nebula Acquisition Corporation"
    },
    {
        value: "NEBUU",
        label: "Nebula Acquisition Corporation Unit"
    },
    {
        value: "NEBUW",
        label: "Nebula Acquisition Corporation Warrant"
    },
    {
        value: "NEE",
        label: "NextEra Energy Inc."
    },
    {
        value: "NEE-I",
        label: "NextEra Energy Inc. Series I Junior Subordinated Debentures due November 15 2072"
    },
    {
        value: "NEE-J",
        label: "NextEra Energy Inc. Series J Junior Subordinated Debentures due January 15 2073"
    },
    {
        value: "NEE-K",
        label: "NextEra Energy Inc. Series K Junior Subordinated Debentures due June 1 2076"
    },
    {
        value: "NEE-Q",
        label: "NextEra Energy Inc. Corporate Units"
    },
    {
        value: "NEE-R",
        label: "NextEra Energy Inc. Corporate Units expiring 09/01/2019"
    },
    {
        value: "NEM",
        label: "Newmont Mining Corporation"
    },
    {
        value: "NEN",
        label: "New England Realty Associates Limited Partnership Class A Depositary Receipts Evidencing Units of Limited Partnership"
    },
    {
        value: "NEO",
        label: "NeoGenomics Inc."
    },
    {
        value: "NEOG",
        label: "Neogen Corporation"
    },
    {
        value: "NEON",
        label: "Neonode Inc."
    },
    {
        value: "NEOS",
        label: "Neos Therapeutics Inc."
    },
    {
        value: "NEP",
        label: "NextEra Energy Partners LP representing limited partner interests"
    },
    {
        value: "NEPT",
        label: "Neptune Technologies & Bioresources Inc"
    },
    {
        value: "NERV",
        label: "Minerva Neurosciences Inc"
    },
    {
        value: "NES",
        label: "Nuverra Environmental Solutions Inc."
    },
    {
        value: "NESR",
        label: "National Energy Services Reunited Corp."
    },
    {
        value: "NESRW",
        label: "National Energy Services Reunited Corp. Warrant"
    },
    {
        value: "NETE",
        label: "Net Element Inc."
    },
    {
        value: "NETS",
        label: "Netshoes (Cayman) Limited"
    },
    {
        value: "NEU",
        label: "NewMarket Corp"
    },
    {
        value: "NEV",
        label: "Nuveen Enhanced Municipal Value Fund of Beneficial Interest"
    },
    {
        value: "NEWA",
        label: "Newater Technology Inc."
    },
    {
        value: "NEWM",
        label: "New Media Investment Group Inc."
    },
    {
        value: "NEWR",
        label: "New Relic Inc."
    },
    {
        value: "NEWT",
        label: "Newtek Business Services Corp."
    },
    {
        value: "NEWTI",
        label: "Newtek Business Services Corp. 6.25% Notes Due 2023"
    },
    {
        value: "NEWTZ",
        label: ""
    },
    {
        value: "NEXA",
        label: "Nexa Resources S.A."
    },
    {
        value: "NEXT",
        label: "NextDecade Corporation"
    },
    {
        value: "NFBK",
        label: "Northfield Bancorp Inc."
    },
    {
        value: "NFEC",
        label: "NF Energy Saving Corporation"
    },
    {
        value: "NFG",
        label: "National Fuel Gas Company"
    },
    {
        value: "NFJ",
        label: "AllianzGI NFJ Dividend Interest & Premium Strategy Fund"
    },
    {
        value: "NFLT",
        label: "Virtus Newfleet Multi-Sector Bond"
    },
    {
        value: "NFLX",
        label: "Netflix Inc."
    },
    {
        value: "NFO",
        label: "Invesco Insider Sentiment"
    },
    {
        value: "NFRA",
        label: "FlexShares STOXX Global Broad Infrastructure Index Fund"
    },
    {
        value: "NFTY",
        label: "First Trust India Nifty 50 Equal Weight ETF"
    },
    {
        value: "NFX",
        label: "Newfield Exploration Company"
    },
    {
        value: "NG",
        label: "Novagold Resources Inc."
    },
    {
        value: "NGD",
        label: "New Gold Inc."
    },
    {
        value: "NGE",
        label: "Global X MSCI Nigeria"
    },
    {
        value: "NGG",
        label: "National Grid Transco PLC PLC (NEW) American Depositary Shares"
    },
    {
        value: "NGHC",
        label: "National General Holdings Corp"
    },
    {
        value: "NGHCN",
        label: "National General Holdings Corp Depositary Shares each representing 1/40th of a share of 7.50% Non-Cumulative Preferred Stock Series C"
    },
    {
        value: "NGHCO",
        label: "National General Holdings Corp Depositary Shares"
    },
    {
        value: "NGHCP",
        label: "National General Holdings Corp 7.50% Non-Cumulative Preferred Stock Series A"
    },
    {
        value: "NGHCZ",
        label: ""
    },
    {
        value: "NGL",
        label: "NGL ENERGY PARTNERS LP representing Limited Partner Interests"
    },
    {
        value: "NGL-B",
        label: "NGL ENERGY PARTNERS LP 9.00% Class B Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units representing limited partnership interests"
    },
    {
        value: "NGLS-A",
        label: "Targa Resources Partners LP 9.00% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units representing preferred equity interests"
    },
    {
        value: "NGS",
        label: "Natural Gas Services Group Inc."
    },
    {
        value: "NGVC",
        label: "Natural Grocers by Vitamin Cottage Inc."
    },
    {
        value: "NGVT",
        label: "Ingevity Corporation"
    },
    {
        value: "NH",
        label: "NantHealth Inc."
    },
    {
        value: "NHA",
        label: "Nuveen Municipal 2021 Target Term Fund Fund"
    },
    {
        value: "NHC",
        label: "National HealthCare Corporation"
    },
    {
        value: "NHF",
        label: "NexPoint Strategic Opportunities Fund"
    },
    {
        value: "NHI",
        label: "National Health Investors Inc."
    },
    {
        value: "NHLD",
        label: "National Holdings Corporation"
    },
    {
        value: "NHLDW",
        label: "National Holdings Corporation Warrants"
    },
    {
        value: "NHS",
        label: "Neuberger Berman High Yield Strategies Fund"
    },
    {
        value: "NHTC",
        label: "Natural Health Trends Corp."
    },
    {
        value: "NI",
        label: "NiSource Inc"
    },
    {
        value: "NIB",
        label: "iPath Bloomberg Cocoa Subindex Total Return SM IndexETN"
    },
    {
        value: "NICE",
        label: "NICE Ltd"
    },
    {
        value: "NICK",
        label: "Nicholas Financial Inc."
    },
    {
        value: "NID",
        label: "Nuveen Intermediate Duration Municipal Term Fund of Beneficial Interest"
    },
    {
        value: "NIE",
        label: "AllianzGI Equity & Convertible Income Fund"
    },
    {
        value: "NIHD",
        label: "NII Holdings Inc."
    },
    {
        value: "NIM",
        label: "Nuveen Select Maturities Municipal Fund"
    },
    {
        value: "NINE",
        label: "Nine Energy Service Inc."
    },
    {
        value: "NIQ",
        label: "Nuveenn Intermediate Duration Quality Municipal Term Fund of Beneficial Interest"
    },
    {
        value: "NITE",
        label: "Nightstar Therapeutics plc"
    },
    {
        value: "NJR",
        label: "NewJersey Resources Corporation"
    },
    {
        value: "NJV",
        label: "Nuveen New Jersey Municipal Value Fund of Beneficial Interest"
    },
    {
        value: "NK",
        label: "NantKwest Inc."
    },
    {
        value: "NKE",
        label: "Nike Inc."
    },
    {
        value: "NKG",
        label: "Nuveen Georgia Quality Municipal Income Fund"
    },
    {
        value: "NKSH",
        label: "National Bankshares Inc."
    },
    {
        value: "NKTR",
        label: "Nektar Therapeutics"
    },
    {
        value: "NKX",
        label: "Nuveen California AMT-Free Quality Municipal Income Fund"
    },
    {
        value: "NL",
        label: "NL Industries Inc."
    },
    {
        value: "NLNK",
        label: "NewLink Genetics Corporation"
    },
    {
        value: "NLR",
        label: "VanEck Vectors Uranium & Nuclear Energy"
    },
    {
        value: "NLS",
        label: "Nautilus Inc."
    },
    {
        value: "NLSN",
        label: "Nielsen N.V."
    },
    {
        value: "NLST",
        label: "Netlist Inc."
    },
    {
        value: "NLY",
        label: "Annaly Capital Management Inc"
    },
    {
        value: "NLY-C",
        label: "Annaly Capital Management Inc 7.625% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "NLY-D",
        label: "Annaly Capital Management Inc Preferred Series D"
    },
    {
        value: "NLY-F",
        label: "Annaly Capital Management Inc 6.95% Series F"
    },
    {
        value: "NLY-G",
        label: "Annaly Capital Management Inc 6.50% Series G Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock"
    },
    {
        value: "NM",
        label: "Navios Maritime Holdings Inc."
    },
    {
        value: "NM-G",
        label: "Navios Maritime Holdings Inc. Sponsored ADR Representing 1/100th Perpetual Preferred Series G (Marshall Islands)"
    },
    {
        value: "NM-H",
        label: "Navios Maritime Holdings Inc. Sponsored ADR Representing 1/100th Perp. Preferred Series H%"
    },
    {
        value: "NMFC",
        label: "New Mountain Finance Corporation"
    },
    {
        value: "NMI",
        label: "Nuveen Municipal Income Fund Inc."
    },
    {
        value: "NMIH",
        label: "NMI Holdings Inc"
    },
    {
        value: "NMK-B",
        label: "Niagara Mohawk Holdings Inc. Preferred Stock"
    },
    {
        value: "NMK-C",
        label: "Niagara Mohawk Holdings Inc. Preferred Stock"
    },
    {
        value: "NML",
        label: "Neuberger Berman MLP Income Fund Inc."
    },
    {
        value: "NMM",
        label: "Navios Maritime Partners LP Representing Limited Partner Interests"
    },
    {
        value: "NMR",
        label: "Nomura Holdings Inc ADR American Depositary Shares"
    },
    {
        value: "NMRD",
        label: "Nemaura Medical Inc."
    },
    {
        value: "NMRK",
        label: "Newmark Group Inc."
    },
    {
        value: "NMS",
        label: "Nuveen Minnesota Quality Municipal Income Fund"
    },
    {
        value: "NMT",
        label: "Nuveen Massachusetts Quality Municipal Income Fund"
    },
    {
        value: "NMY",
        label: "Nuveen Maryland Quality Municipal Income Fund"
    },
    {
        value: "NMZ",
        label: "Nuveen Municipal High Income Opportunity Fund $0.01 par value per share"
    },
    {
        value: "NNA",
        label: "Navios Maritime Acquisition Corporation"
    },
    {
        value: "NNBR",
        label: "NN Inc."
    },
    {
        value: "NNC",
        label: "Nuveen North Carolina Quality Municipal Income Fund"
    },
    {
        value: "NNDM",
        label: "Nano Dimension Ltd."
    },
    {
        value: "NNI",
        label: "Nelnet Inc."
    },
    {
        value: "NNN",
        label: "National Retail Properties"
    },
    {
        value: "NNN-E",
        label: "National Retail Properties Depositary Shares Series E"
    },
    {
        value: "NNN-F",
        label: "National Retail Properties Depositary Shares Series F"
    },
    {
        value: "NNVC",
        label: "NanoViricides Inc."
    },
    {
        value: "NNY",
        label: "Nuveen New York Municipal Value Fund Inc."
    },
    {
        value: "NOA",
        label: "North American Construction Group Ltd. (no par)"
    },
    {
        value: "NOAH",
        label: "Noah Holdings Limited"
    },
    {
        value: "NOBL",
        label: "ProShares S&P 500 Dividend Aristocrats"
    },
    {
        value: "NOC",
        label: "Northrop Grumman Corporation"
    },
    {
        value: "NODK",
        label: "NI Holdings Inc."
    },
    {
        value: "NOG",
        label: "Northern Oil and Gas Inc."
    },
    {
        value: "NOK",
        label: "Nokia Corporation Sponsored American Depositary Shares"
    },
    {
        value: "NOM",
        label: "Nuveen Missouri Quality Municipal Income Fund"
    },
    {
        value: "NOMD",
        label: "Nomad Foods Limited"
    },
    {
        value: "NORW",
        label: "Global X MSCI Norway"
    },
    {
        value: "NOV",
        label: "National Oilwell Varco Inc."
    },
    {
        value: "NOVN",
        label: "Novan Inc."
    },
    {
        value: "NOVT",
        label: "Novanta Inc."
    },
    {
        value: "NOW",
        label: "ServiceNow Inc."
    },
    {
        value: "NP",
        label: "Neenah Inc."
    },
    {
        value: "NPK",
        label: "National Presto Industries Inc."
    },
    {
        value: "NPN",
        label: "Nuveen Pennsylvania Municipal Value Fund of Beneficial Interest"
    },
    {
        value: "NPO",
        label: "EnPro Industries Inc"
    },
    {
        value: "NPTN",
        label: "NeoPhotonics Corporation"
    },
    {
        value: "NPV",
        label: "Nuveen Virginia Quality Municipal Income Fund"
    },
    {
        value: "NQP",
        label: "Nuveen Pennsylvania Quality Municipal Income Fund"
    },
    {
        value: "NR",
        label: "Newpark Resources Inc."
    },
    {
        value: "NRC",
        label: "National Research Corporation"
    },
    {
        value: "NRE",
        label: "NorthStar Realty Europe Corp."
    },
    {
        value: "NRG",
        label: "NRG Energy Inc."
    },
    {
        value: "NRIM",
        label: "Northrim BanCorp Inc"
    },
    {
        value: "NRK",
        label: "Nuveen New York AMT-Free Quality Municipal Income Fund"
    },
    {
        value: "NRO",
        label: "Neuberger Berman Real Estate Securities Income Fund Inc."
    },
    {
        value: "NRP",
        label: "Natural Resource Partners LP Limited Partnership"
    },
    {
        value: "NRT",
        label: "North European Oil Royality Trust"
    },
    {
        value: "NRZ",
        label: "New Residential Investment Corp."
    },
    {
        value: "NS",
        label: "Nustar Energy L.P."
    },
    {
        value: "NS-A",
        label: "Nustar Energy L.P. 8.50% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "NS-B",
        label: "Nustar Energy L.P. 7.625% Series B Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units representing limited partner interests"
    },
    {
        value: "NS-C",
        label: "Nustar Energy L.P. 9.00% Series C Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "NSA",
        label: "National Storage Affiliates Trust of Beneficial Interest"
    },
    {
        value: "NSA-A",
        label: "National Storage Affiliates Trust 6.000% Series A Cumulative Redeemable Preferred Shares of Beneficial Interest (Liquidation Preference $25.00 per share)"
    },
    {
        value: "NSC",
        label: "Norfolk Southern Corporation"
    },
    {
        value: "NSEC",
        label: "National Security Group Inc."
    },
    {
        value: "NSH",
        label: "Nustar GP Holdings LLC Units"
    },
    {
        value: "NSIT",
        label: "Insight Enterprises Inc."
    },
    {
        value: "NSL",
        label: "Nuveen Senior Income Fund"
    },
    {
        value: "NSM",
        label: "Nationstar Mortgage Holdings Inc."
    },
    {
        value: "NSP",
        label: "Insperity Inc."
    },
    {
        value: "NSPR",
        label: "InspireMD Inc."
    },
    {
        value: "NSPR+",
        label: "InspireMD Inc. Warrant"
    },
    {
        value: "NSPR+B",
        label: "InspireMD Inc. Series B Warrants exercisable for one share of common stock (Expiring March 14 2022)"
    },
    {
        value: "NSS",
        label: "NuStar Logistics L.P. 7.625% Fixed-to-Floating Rate Subordinated Notes due 2043"
    },
    {
        value: "NSSC",
        label: "NAPCO Security Technologies Inc."
    },
    {
        value: "NSTG",
        label: "NanoString Technologies Inc."
    },
    {
        value: "NSU",
        label: "Nevsun Resources Ltd"
    },
    {
        value: "NSYS",
        label: "Nortech Systems Incorporated"
    },
    {
        value: "NTAP",
        label: "NetApp Inc."
    },
    {
        value: "NTB",
        label: "Bank of N.T. Butterfield & Son Limited (The) Voting"
    },
    {
        value: "NTC",
        label: "Nuveen Connecticut Quality Municipal Income Fund"
    },
    {
        value: "NTCT",
        label: "NetScout Systems Inc."
    },
    {
        value: "NTEC",
        label: "Intec Pharma Ltd."
    },
    {
        value: "NTES",
        label: "NetEase Inc."
    },
    {
        value: "NTEST",
        label: ""
    },
    {
        value: "NTEST.A",
        label: ""
    },
    {
        value: "NTEST.B",
        label: ""
    },
    {
        value: "NTEST.C",
        label: ""
    },
    {
        value: "NTG",
        label: "Tortoise MLP Fund Inc."
    },
    {
        value: "NTGR",
        label: "NETGEAR Inc."
    },
    {
        value: "NTIC",
        label: "Northern Technologies International Corporation"
    },
    {
        value: "NTIP",
        label: "Network-1 Technologies Inc."
    },
    {
        value: "NTLA",
        label: "Intellia Therapeutics Inc."
    },
    {
        value: "NTN",
        label: "NTN Buzztime Inc."
    },
    {
        value: "NTNX",
        label: "Nutanix Inc."
    },
    {
        value: "NTP",
        label: "Nam Tai Property Inc."
    },
    {
        value: "NTR",
        label: "Nutrien Ltd."
    },
    {
        value: "NTRA",
        label: "Natera Inc."
    },
    {
        value: "NTRI",
        label: "NutriSystem Inc"
    },
    {
        value: "NTRP",
        label: "Neurotrope Inc."
    },
    {
        value: "NTRS",
        label: "Northern Trust Corporation"
    },
    {
        value: "NTRSP",
        label: "Northern Trust Corporation Depository Shares"
    },
    {
        value: "NTWK",
        label: "NETSOL Technologies Inc."
    },
    {
        value: "NTX",
        label: "Nuveen Texas Quality Municipal Income Fund"
    },
    {
        value: "NTZ",
        label: "Natuzzi S.p.A."
    },
    {
        value: "NUAG",
        label: "NuShares Enhanced Yield US Aggregate Bond ETF"
    },
    {
        value: "NUAN",
        label: "Nuance Communications Inc."
    },
    {
        value: "NUBD",
        label: "NuShares ESG U.S. Aggregate Bond"
    },
    {
        value: "NUDM",
        label: "NuShares ESG International Developed Markets Equity"
    },
    {
        value: "NUE",
        label: "Nucor Corporation"
    },
    {
        value: "NUEM",
        label: "NuShares ESG Emerging Markets Equity"
    },
    {
        value: "NUGT",
        label: "Direxion Daily Gold Miners Index Bull 3X Shares"
    },
    {
        value: "NULG",
        label: "NuShares ESG Large-Cap Growth"
    },
    {
        value: "NULV",
        label: "NuShares ESG Large-Cap Value"
    },
    {
        value: "NUM",
        label: "Nuveen Michigan Quality Municipal Income Fund"
    },
    {
        value: "NUMG",
        label: "NuShares ESG Mid-Cap Growth"
    },
    {
        value: "NUMV",
        label: "NuShares ESG Mid-Cap Value"
    },
    {
        value: "NUO",
        label: "Nuveen Ohio Quality Municipal Income Fund"
    },
    {
        value: "NURE",
        label: "NuShares Enhanced Yield US Aggregate Bond ETF"
    },
    {
        value: "NURO",
        label: "NeuroMetrix Inc."
    },
    {
        value: "NUROW",
        label: ""
    },
    {
        value: "NUS",
        label: "Nu Skin Enterprises Inc."
    },
    {
        value: "NUSA",
        label: "NuShares Enhanced Yield 1-5 Year U.S. Aggregate Bond"
    },
    {
        value: "NUSC",
        label: "NuShares ESG Small-Cap"
    },
    {
        value: "NUV",
        label: "Nuveen Municipal Value Fund Inc."
    },
    {
        value: "NUVA",
        label: "NuVasive Inc."
    },
    {
        value: "NUW",
        label: "Nuveen AMT-Free Municipal Value Fund"
    },
    {
        value: "NVAX",
        label: "Novavax Inc."
    },
    {
        value: "NVCN",
        label: "Neovasc Inc."
    },
    {
        value: "NVCR",
        label: "NovoCure Limited"
    },
    {
        value: "NVDA",
        label: "NVIDIA Corporation"
    },
    {
        value: "NVEC",
        label: "NVE Corporation"
    },
    {
        value: "NVEE",
        label: "NV5 Global Inc."
    },
    {
        value: "NVFY",
        label: "Nova Lifestyle Inc"
    },
    {
        value: "NVG",
        label: "Nuveen AMT-Free Municipal Credit Income Fund"
    },
    {
        value: "NVGS",
        label: "Navigator Holdings Ltd. (Marshall Islands)"
    },
    {
        value: "NVIV",
        label: "InVivo Therapeutics Holdings Corp."
    },
    {
        value: "NVLN",
        label: "Novelion Therapeutics Inc."
    },
    {
        value: "NVMI",
        label: "Nova Measuring Instruments Ltd."
    },
    {
        value: "NVMM",
        label: "Novume Solutions Inc."
    },
    {
        value: "NVO",
        label: "Novo Nordisk A/S"
    },
    {
        value: "NVR",
        label: "NVR Inc."
    },
    {
        value: "NVRO",
        label: "Nevro Corp."
    },
    {
        value: "NVS",
        label: "Novartis AG"
    },
    {
        value: "NVT",
        label: "nVent Electric plc"
    },
    {
        value: "NVTA",
        label: "Invitae Corporation"
    },
    {
        value: "NVTR",
        label: "Nuvectra Corporation"
    },
    {
        value: "NVUS",
        label: "Novus Therapeutics Inc."
    },
    {
        value: "NWBI",
        label: "Northwest Bancshares Inc."
    },
    {
        value: "NWE",
        label: "NorthWestern Corporation"
    },
    {
        value: "NWFL",
        label: "Norwood Financial Corp."
    },
    {
        value: "NWHM",
        label: "The New Home Company Inc."
    },
    {
        value: "NWL",
        label: "Newell Brands Inc."
    },
    {
        value: "NWLI",
        label: "National Western Life Group Inc."
    },
    {
        value: "NWN",
        label: "Northwest Natural Gas Company"
    },
    {
        value: "NWPX",
        label: "Northwest Pipe Company"
    },
    {
        value: "NWS",
        label: "News Corporation"
    },
    {
        value: "NWSA",
        label: "News Corporation"
    },
    {
        value: "NWY",
        label: "New York & Company Inc."
    },
    {
        value: "NX",
        label: "Quanex Building Products Corporation"
    },
    {
        value: "NXC",
        label: "Nuveen California Select Tax-Free Income Portfolio"
    },
    {
        value: "NXE",
        label: "Nexgen Energy Ltd."
    },
    {
        value: "NXEO",
        label: "Nexeo Solutions Inc."
    },
    {
        value: "NXEOU",
        label: "Nexeo Solutions Inc. Unit"
    },
    {
        value: "NXEOW",
        label: ""
    },
    {
        value: "NXJ",
        label: "Nuveen New Jersey Qualified Municipal Fund"
    },
    {
        value: "NXN",
        label: "Nuveen New York Select Tax-Free Income Portfolio"
    },
    {
        value: "NXP",
        label: "Nuveen Select Tax Free Income Portfolio"
    },
    {
        value: "NXPI",
        label: "NXP Semiconductors N.V."
    },
    {
        value: "NXQ",
        label: "Nuveen Select Tax Free Income Portfolio II"
    },
    {
        value: "NXR",
        label: "Nuveen Select Tax Free Income Portfolio III"
    },
    {
        value: "NXRT",
        label: "NexPoint Residential Trust Inc."
    },
    {
        value: "NXST",
        label: "Nexstar Media Group Inc."
    },
    {
        value: "NXTD",
        label: "NXT-ID Inc."
    },
    {
        value: "NXTDW",
        label: ""
    },
    {
        value: "NXTM",
        label: "NxStage Medical Inc."
    },
    {
        value: "NYCB",
        label: "New York Community Bancorp Inc."
    },
    {
        value: "NYCB-A",
        label: "New York Community Bancorp Inc. Depositary shares Series A"
    },
    {
        value: "NYCB-U",
        label: "New York Community Bancorp Inc. Capital Tr V (BONUSES)"
    },
    {
        value: "NYF",
        label: "iShares New York Muni Bond"
    },
    {
        value: "NYH",
        label: "Eaton Vance New York Municipal Bond Fund II of Beneficial Interest $.01 par value"
    },
    {
        value: "NYLD",
        label: "NRG Yield Inc. Class C"
    },
    {
        value: "NYLD.A",
        label: "NRG Yield Inc. Class A"
    },
    {
        value: "NYMT",
        label: "New York Mortgage Trust Inc."
    },
    {
        value: "NYMTN",
        label: "New York Mortgage Trust Inc. 8.00% Series D Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock"
    },
    {
        value: "NYMTO",
        label: "New York Mortgage Trust Inc. 7.875% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "NYMTP",
        label: "New York Mortgage Trust Inc. 7.75% Series B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "NYMX",
        label: "Nymox Pharmaceutical Corporation"
    },
    {
        value: "NYNY",
        label: "Empire Resorts Inc."
    },
    {
        value: "NYRT",
        label: "New York REIT Inc."
    },
    {
        value: "NYT",
        label: "New York Times Company (The)"
    },
    {
        value: "NYV",
        label: "Nuveen New York Municipal Value Fund 2 of Beneficial Interest"
    },
    {
        value: "NZF",
        label: "Nuveen Municipal Credit Income Fund"
    },
    {
        value: "NONE",
        label: ""
    },
    {
        value: "O",
        label: "Realty Income Corporation"
    },
    {
        value: "OA",
        label: "Orbital ATK Inc."
    },
    {
        value: "OAK",
        label: "Oaktree Capital Group LLC Class A Units Representing Limited Liability Company Interests"
    },
    {
        value: "OAK-A",
        label: "Oaktree Capital Group LLC 6.625% Series A Preferred units"
    },
    {
        value: "OAS",
        label: "Oasis Petroleum Inc."
    },
    {
        value: "OASI",
        label: "O'Shares FTSE Asia Pacific Quality Dividend"
    },
    {
        value: "OASM",
        label: "Oasmia Pharmaceutical AB"
    },
    {
        value: "OBAS",
        label: "Optibase Ltd."
    },
    {
        value: "OBCI",
        label: "Ocean Bio-Chem Inc."
    },
    {
        value: "OBE",
        label: "Obsidian Energy Ltd."
    },
    {
        value: "OBLN",
        label: "Obalon Therapeutics Inc."
    },
    {
        value: "OBNK",
        label: "Origin Bancorp Inc."
    },
    {
        value: "OBOR",
        label: "KraneShares MSCI One Belt One Road Index"
    },
    {
        value: "OBSV",
        label: "ObsEva SA"
    },
    {
        value: "OC",
        label: "Owens Corning Inc New"
    },
    {
        value: "OCC",
        label: "Optical Cable Corporation"
    },
    {
        value: "OCFC",
        label: "OceanFirst Financial Corp."
    },
    {
        value: "OCIO",
        label: "ETF Series Solutions Trust"
    },
    {
        value: "OCIP",
        label: "OCI Partners LP representing Limited Partner Interests"
    },
    {
        value: "OCLR",
        label: "Oclaro Inc."
    },
    {
        value: "OCN",
        label: "Ocwen Financial Corporation"
    },
    {
        value: "OCSI",
        label: "Oaktree Strategic Income Corporation"
    },
    {
        value: "OCSL",
        label: "Oaktree Specialty Lending Corporation"
    },
    {
        value: "OCSLL",
        label: "Oaktree Specialty Lending Corporation 6.125% senior notes due 2028"
    },
    {
        value: "OCUL",
        label: "Ocular Therapeutix Inc."
    },
    {
        value: "OCX",
        label: "OncoCyte Corporation"
    },
    {
        value: "ODC",
        label: "Oil-Dri Corporation Of America"
    },
    {
        value: "ODFL",
        label: "Old Dominion Freight Line Inc."
    },
    {
        value: "ODP",
        label: "Office Depot Inc."
    },
    {
        value: "ODT",
        label: "Odonate Therapeutics Inc."
    },
    {
        value: "OEC",
        label: "Orion Engineered Carbons S.A"
    },
    {
        value: "OEF",
        label: "iShares S&P 100"
    },
    {
        value: "OESX",
        label: "Orion Energy Systems Inc."
    },
    {
        value: "OEUR",
        label: "O'Shares FTSE Europe Quality Dividend"
    },
    {
        value: "OEW",
        label: "Invesco S&P 100 Equal Weight"
    },
    {
        value: "OFC",
        label: "Corporate Office Properties Trust"
    },
    {
        value: "OFED",
        label: "Oconee Federal Financial Corp."
    },
    {
        value: "OFG",
        label: "OFG Bancorp"
    },
    {
        value: "OFG-A",
        label: "OFG Bancorp Preferred Stock"
    },
    {
        value: "OFG-B",
        label: "OFG Bancorp 7.0% Non Cumulative Monthly Income Preferred Stock Series B"
    },
    {
        value: "OFG-D",
        label: "OFG Bancorp 7.125% Non-Cumulative Perpetual Preferred Stock. Series D"
    },
    {
        value: "OFIX",
        label: "Orthofix International N.V."
    },
    {
        value: "OFLX",
        label: "Omega Flex Inc."
    },
    {
        value: "OFS",
        label: "OFS Capital Corporation"
    },
    {
        value: "OFSSL",
        label: "OFS Capital Corporation 6.375% Notes due 2025"
    },
    {
        value: "OGCP",
        label: "Empire State Realty OP L.P. Series 60 Operating Partnership Units Representing Limited Partnership Interests"
    },
    {
        value: "OGE",
        label: "OGE Energy Corporation"
    },
    {
        value: "OGEN",
        label: "Oragenics Inc."
    },
    {
        value: "OGIG",
        label: "O'SHARES GLOBAL INTERNET GIA"
    },
    {
        value: "OGS",
        label: "ONE Gas Inc."
    },
    {
        value: "OHAI",
        label: "OHA Investment Corporation"
    },
    {
        value: "OHGI",
        label: "One Horizon Group Inc."
    },
    {
        value: "OHI",
        label: "Omega Healthcare Investors Inc."
    },
    {
        value: "OHRP",
        label: "Ohr Pharmaceutical Inc."
    },
    {
        value: "OI",
        label: "Owens-Illinois Inc."
    },
    {
        value: "OIA",
        label: "Invesco Municipal Income Opportunities Trust"
    },
    {
        value: "OIBR.C",
        label: "Oi S.A. American Depositary Shares (Each representing 1)"
    },
    {
        value: "OIH",
        label: "VanEck Vectors Oil Services"
    },
    {
        value: "OII",
        label: "Oceaneering International Inc."
    },
    {
        value: "OIIL",
        label: "Credit Suisse X-Links WTI Crude Oil Index ETNs due February 8 2016"
    },
    {
        value: "OIIM",
        label: "O2Micro International Limited"
    },
    {
        value: "OILB",
        label: "iPath Series B S&P GSCI Crude Oil"
    },
    {
        value: "OILD",
        label: "ProShares UltraPro 3x Short Crude Oil"
    },
    {
        value: "OILK",
        label: "ProShares K-1 Free Crude Oil Strategy"
    },
    {
        value: "OILU",
        label: "ProShares UltraPro 3x Crude Oil"
    },
    {
        value: "OILX",
        label: "ETRACS S&P GSCI Crude Oil Total Return Index ETN due February 22 2046"
    },
    {
        value: "OIS",
        label: "Oil States International Inc."
    },
    {
        value: "OKDCC",
        label: "Eaton Vance NextShares Trust II"
    },
    {
        value: "OKE",
        label: "ONEOK Inc."
    },
    {
        value: "OKTA",
        label: "Okta Inc."
    },
    {
        value: "OLBK",
        label: "Old Line Bancshares Inc."
    },
    {
        value: "OLD",
        label: "The Long-Term Care ETF"
    },
    {
        value: "OLED",
        label: "Universal Display Corporation"
    },
    {
        value: "OLEM",
        label: "iPath Pure Beta Crude Oil ETN"
    },
    {
        value: "OLLI",
        label: "Ollie's Bargain Outlet Holdings Inc."
    },
    {
        value: "OLN",
        label: "Olin Corporation"
    },
    {
        value: "OLO",
        label: "DB Crude Oil Long Exchange Traded Notes due June 1 2038"
    },
    {
        value: "OLP",
        label: "One Liberty Properties Inc."
    },
    {
        value: "OMAB",
        label: "Grupo Aeroportuario del Centro Norte S.A.B. de C.V."
    },
    {
        value: "OMAD",
        label: "One Madison Corporation Class A"
    },
    {
        value: "OMAD+",
        label: ""
    },
    {
        value: "OMAD=",
        label: "One Madison Corporation Units each consisting of one Class A ordinary share $0.0001 par value and one half of one warrant"
    },
    {
        value: "OMC",
        label: "Omnicom Group Inc."
    },
    {
        value: "OMCL",
        label: "Omnicell Inc."
    },
    {
        value: "OMED",
        label: "OncoMed Pharmaceuticals Inc."
    },
    {
        value: "OMER",
        label: "Omeros Corporation"
    },
    {
        value: "OMEX",
        label: "Odyssey Marine Exploration Inc."
    },
    {
        value: "OMF",
        label: "OneMain Holdings Inc."
    },
    {
        value: "OMFL",
        label: "Oppenheimer Russell 1000 Dynamic Multifactor"
    },
    {
        value: "OMFS",
        label: "Oppenheimer Russell 2000 Dynamic Multifactor"
    },
    {
        value: "OMI",
        label: "Owens & Minor Inc."
    },
    {
        value: "OMN",
        label: "OMNOVA Solutions Inc."
    },
    {
        value: "OMOM",
        label: "Oppenheimer Russell 1000 Momentum Factor"
    },
    {
        value: "OMP",
        label: "Oasis Midstream Partners LP Representing Limited Partner Interests"
    },
    {
        value: "ON",
        label: "ON Semiconductor Corporation"
    },
    {
        value: "ONB",
        label: "Old National Bancorp"
    },
    {
        value: "ONCE",
        label: "Spark Therapeutics Inc."
    },
    {
        value: "ONCS",
        label: "OncoSec Medical Incorporated"
    },
    {
        value: "ONCY",
        label: "ONCOLYTICS BIOTECH INC"
    },
    {
        value: "ONDK",
        label: "On Deck Capital Inc."
    },
    {
        value: "ONE",
        label: "OneSmart International Education Group Limited ADS"
    },
    {
        value: "ONEO",
        label: "SPDR Russell 1000 Momentum Focus"
    },
    {
        value: "ONEQ",
        label: "Fidelity Nasdaq Composite Index Tracking Stock"
    },
    {
        value: "ONEV",
        label: "SPDR Russell 1000 Low Volatility Focus"
    },
    {
        value: "ONEY",
        label: "SPDR Russell 1000 Yield Focus"
    },
    {
        value: "ONP",
        label: "Orient Paper Inc."
    },
    {
        value: "ONS",
        label: "Oncobiologics Inc."
    },
    {
        value: "ONSIW",
        label: ""
    },
    {
        value: "ONTL",
        label: "O'Shares FTSE Russell International Quality Dividend"
    },
    {
        value: "ONTX",
        label: "Onconova Therapeutics Inc."
    },
    {
        value: "ONTXW",
        label: "Onconova Therapeutics Inc. Warrants"
    },
    {
        value: "ONVO",
        label: "Organovo Holdings Inc."
    },
    {
        value: "OOMA",
        label: "Ooma Inc."
    },
    {
        value: "OPB",
        label: "Opus Bank"
    },
    {
        value: "OPBK",
        label: "OP Bancorp"
    },
    {
        value: "OPES",
        label: "Opes Acquisition Corp."
    },
    {
        value: "OPESU",
        label: "Opes Acquisition Corp. Unit"
    },
    {
        value: "OPESW",
        label: "Opes Acquisition Corp. Warrant"
    },
    {
        value: "OPGN",
        label: "OpGen Inc."
    },
    {
        value: "OPGNW",
        label: ""
    },
    {
        value: "OPHC",
        label: "OptimumBank Holdings Inc."
    },
    {
        value: "OPHT",
        label: "Ophthotech Corporation"
    },
    {
        value: "OPK",
        label: "Opko Health Inc."
    },
    {
        value: "OPNT",
        label: "Opiant Pharmaceuticals Inc."
    },
    {
        value: "OPOF",
        label: "Old Point Financial Corporation"
    },
    {
        value: "OPP",
        label: "RiverNorth/DoubleLine Strategic Opportunity Fund Inc."
    },
    {
        value: "OPTN",
        label: "OptiNose Inc."
    },
    {
        value: "OPTT",
        label: "Ocean Power Technologies Inc."
    },
    {
        value: "OPY",
        label: "Oppenheimer Holdings Inc. Class A (DE)"
    },
    {
        value: "OQAL",
        label: "Oppenheimer Russell 1000 Quality Factor"
    },
    {
        value: "OR",
        label: "Osisko Gold Royalties Ltd"
    },
    {
        value: "ORA",
        label: "Ormat Technologies Inc."
    },
    {
        value: "ORAN",
        label: "Orange"
    },
    {
        value: "ORBC",
        label: "ORBCOMM Inc."
    },
    {
        value: "ORBK",
        label: "Orbotech Ltd."
    },
    {
        value: "ORC",
        label: "Orchid Island Capital Inc."
    },
    {
        value: "ORCL",
        label: "Oracle Corporation"
    },
    {
        value: "ORG",
        label: "The Organics ETF"
    },
    {
        value: "ORGS",
        label: "Orgenesis Inc."
    },
    {
        value: "ORI",
        label: "Old Republic International Corporation"
    },
    {
        value: "ORIG",
        label: "Ocean Rig UDW Inc."
    },
    {
        value: "ORIT",
        label: "Oritani Financial Corp."
    },
    {
        value: "ORLY",
        label: "O'Reilly Automotive Inc."
    },
    {
        value: "ORM",
        label: "Owens Realty Mortgage Inc."
    },
    {
        value: "ORMP",
        label: "Oramed Pharmaceuticals Inc."
    },
    {
        value: "ORN",
        label: "Orion Group Holdings Inc. Common"
    },
    {
        value: "ORPN",
        label: "Bioblast Pharma Ltd."
    },
    {
        value: "ORRF",
        label: "Orrstown Financial Services Inc"
    },
    {
        value: "OSB",
        label: "Norbord Inc."
    },
    {
        value: "OSBC",
        label: "Old Second Bancorp Inc."
    },
    {
        value: "OSBCP",
        label: "Old Second Bancorp Inc. 7.80% Cumulative Trust Preferred Securities"
    },
    {
        value: "OSG",
        label: "Overseas Shipholding Group Inc. Class A"
    },
    {
        value: "OSIS",
        label: "OSI Systems Inc."
    },
    {
        value: "OSIZ",
        label: "Oppenheimer Russell 1000 Size Factor"
    },
    {
        value: "OSK",
        label: "Oshkosh Corporation (Holding Company)Common Stock"
    },
    {
        value: "OSLE",
        label: "Oaktree Specialty Lending Corporation 5.875% Senior Notes due 2024"
    },
    {
        value: "OSN",
        label: "Ossen Innovation Co. Ltd."
    },
    {
        value: "OSPN",
        label: "ONESPAN INC"
    },
    {
        value: "OSPR",
        label: "Osprey Energy Acquisition Corp."
    },
    {
        value: "OSPRU",
        label: "Osprey Energy Acquisition Corp. Unit"
    },
    {
        value: "OSPRW",
        label: ""
    },
    {
        value: "OSS",
        label: "One Stop Systems Inc."
    },
    {
        value: "OSTK",
        label: "Overstock.com Inc."
    },
    {
        value: "OSUR",
        label: "OraSure Technologies Inc."
    },
    {
        value: "OTEL",
        label: "Otelco Inc."
    },
    {
        value: "OTEX",
        label: "Open Text Corporation"
    },
    {
        value: "OTIC",
        label: "Otonomy Inc."
    },
    {
        value: "OTIV",
        label: "On Track Innovations Ltd"
    },
    {
        value: "OTTR",
        label: "Otter Tail Corporation"
    },
    {
        value: "OTTW",
        label: "Ottawa Bancorp Inc."
    },
    {
        value: "OUNZ",
        label: "VanEck Merk Gold Trust"
    },
    {
        value: "OUSA",
        label: "O'Shares FTSE U.S. Quality Dividend"
    },
    {
        value: "OUSM",
        label: "O'Shares FTSE Russell Small Cap Quality Dividend"
    },
    {
        value: "OUT",
        label: "OUTFRONT Media Inc."
    },
    {
        value: "OVAS",
        label: "OvaScience Inc."
    },
    {
        value: "OVBC",
        label: "Ohio Valley Banc Corp."
    },
    {
        value: "OVID",
        label: "Ovid Therapeutics Inc."
    },
    {
        value: "OVLC",
        label: "Invesco U.S. Large Cap Optimized Volatility"
    },
    {
        value: "OVLU",
        label: "Oppenheimer Russell 1000 Value Factor"
    },
    {
        value: "OVLY",
        label: "Oak Valley Bancorp (CA)"
    },
    {
        value: "OVOL",
        label: "Oppenheimer Russell 1000 Low Volatility Factor"
    },
    {
        value: "OXBR",
        label: "Oxbridge Re Holdings Limited"
    },
    {
        value: "OXBRW",
        label: "Oxbridge Re Holdings Limited Warrant"
    },
    {
        value: "OXFD",
        label: "Oxford Immunotec Global PLC"
    },
    {
        value: "OXLC",
        label: "Oxford Lane Capital Corp."
    },
    {
        value: "OXLCM",
        label: "Oxford Lane Capital Corp. 6.75% Series 2024 Term Preferred Stock"
    },
    {
        value: "OXLCO",
        label: "Oxford Lane Capital Corp. Term Preferred Shares 7.50% Series 2023"
    },
    {
        value: "OXM",
        label: "Oxford Industries Inc."
    },
    {
        value: "OXSQ",
        label: "Oxford Square Capital Corp."
    },
    {
        value: "OXSQL",
        label: "Oxford Square Capital Corp. 6.50% Notes due 2024"
    },
    {
        value: "OXY",
        label: "Occidental Petroleum Corporation"
    },
    {
        value: "OYLD",
        label: "Oppenheimer Russell 1000 Yield Factor"
    },
    {
        value: "OZM",
        label: "Och-Ziff Capital Management Group LLC Class A Shares representing Class A limited liability company interests"
    },
    {
        value: "OZRK",
        label: "Bank of the Ozarks"
    },
    {
        value: "P",
        label: "Pandora Media Inc."
    },
    {
        value: "PAA",
        label: "Plains All American Pipeline L.P."
    },
    {
        value: "PAAS",
        label: "Pan American Silver Corp."
    },
    {
        value: "PAC",
        label: "Grupo Aeroportuario Del Pacifico S.A. B. de C.V. de C.V. (each representing 10 Series B shares)"
    },
    {
        value: "PACB",
        label: "Pacific Biosciences of California Inc."
    },
    {
        value: "PACQ",
        label: "PURE ACQUISITION CORP"
    },
    {
        value: "PACQU",
        label: "Pure Acquisition Corp. Unit"
    },
    {
        value: "PACQW",
        label: ""
    },
    {
        value: "PACW",
        label: "PacWest Bancorp"
    },
    {
        value: "PAF",
        label: "Invesco FTSE RAFI Asia Pacific ex-Japan"
    },
    {
        value: "PAG",
        label: "Penske Automotive Group Inc."
    },
    {
        value: "PAGG",
        label: "Invesco Global Agriculture ETF"
    },
    {
        value: "PAGP",
        label: "Plains Group Holdings L.P. Class A Shares representing limited partner interests"
    },
    {
        value: "PAGS",
        label: "PagSeguro Digital Ltd. Class A"
    },
    {
        value: "PAH",
        label: "Platform Specialty Products Corporation"
    },
    {
        value: "PAHC",
        label: "Phibro Animal Health Corporation"
    },
    {
        value: "PAI",
        label: "Western Asset Investment Grade Income Fund Inc."
    },
    {
        value: "PAK",
        label: "Global X MSCI Pakistan"
    },
    {
        value: "PALL",
        label: "ETFS Physical Palladium Shares"
    },
    {
        value: "PAM",
        label: "Pampa Energia S.A."
    },
    {
        value: "PANL",
        label: "Pangaea Logistics Solutions Ltd."
    },
    {
        value: "PANW",
        label: "Palo Alto Networks Inc."
    },
    {
        value: "PAR",
        label: "PAR Technology Corporation"
    },
    {
        value: "PARR",
        label: "Par Pacific Holdings Inc."
    },
    {
        value: "PATI",
        label: "Patriot Transportation Holding Inc."
    },
    {
        value: "PATK",
        label: "Patrick Industries Inc."
    },
    {
        value: "PAVE",
        label: "Global X Funds U.S. Infrastructure Development"
    },
    {
        value: "PAVM",
        label: "PAVmed Inc."
    },
    {
        value: "PAVMW",
        label: "PAVmed Inc. Warrant"
    },
    {
        value: "PAVMZ",
        label: "PAVmed Inc. Series Z Warrant"
    },
    {
        value: "PAY",
        label: "Verifone Systems Inc."
    },
    {
        value: "PAYC",
        label: "Paycom Software Inc."
    },
    {
        value: "PAYX",
        label: "Paychex Inc."
    },
    {
        value: "PB",
        label: "Prosperity Bancshares Inc."
    },
    {
        value: "PBA",
        label: "Pembina Pipeline Corp. (Canada)"
    },
    {
        value: "PBB",
        label: "Prospect Capital Corporation 6.25% Notes due 2024"
    },
    {
        value: "PBBI",
        label: "PB Bancorp Inc."
    },
    {
        value: "PBCT",
        label: "People's United Financial Inc."
    },
    {
        value: "PBCTP",
        label: "People's United Financial Inc. Perpetual Preferred Series A Fixed-to-floating Rate"
    },
    {
        value: "PBD",
        label: "Invesco Global Clean Energy"
    },
    {
        value: "PBDM",
        label: "Invesco PureBeta FTSE Developed ex-North America"
    },
    {
        value: "PBE",
        label: "Invesco Dynamic Biotech & Genome"
    },
    {
        value: "PBEE",
        label: "Invesco PureBeta FTSE Emerging Markets"
    },
    {
        value: "PBF",
        label: "PBF Energy Inc. Class A"
    },
    {
        value: "PBFX",
        label: "PBF Logistics LP representing limited partner interests"
    },
    {
        value: "PBH",
        label: "Prestige Brand Holdings Inc."
    },
    {
        value: "PBHC",
        label: "Pathfinder Bancorp Inc."
    },
    {
        value: "PBI",
        label: "Pitney Bowes Inc."
    },
    {
        value: "PBI-B",
        label: "Pitney Bowes Inc 6.70% Notes Due 2043"
    },
    {
        value: "PBIB",
        label: "Porter Bancorp Inc."
    },
    {
        value: "PBIP",
        label: "Prudential Bancorp Inc."
    },
    {
        value: "PBJ",
        label: "Invesco Dynamic Food & Beverage"
    },
    {
        value: "PBND",
        label: "Invesco PureBeta US Aggregate Bond"
    },
    {
        value: "PBP",
        label: "Invesco S&P 500 BuyWrite"
    },
    {
        value: "PBPB",
        label: "Potbelly Corporation"
    },
    {
        value: "PBR",
        label: "Petroleo Brasileiro S.A.- Petrobras"
    },
    {
        value: "PBR.A",
        label: "Petroleo Brasileiro S.A.- Petrobras American Depositary Shares"
    },
    {
        value: "PBS",
        label: "Invesco Dynamic Media"
    },
    {
        value: "PBSK",
        label: "Poage Bankshares Inc."
    },
    {
        value: "PBSM",
        label: "Invesco PureBeta MSCI USA Small Cap"
    },
    {
        value: "PBT",
        label: "Permian Basin Royalty Trust"
    },
    {
        value: "PBTP",
        label: "Invesco PureBeta 0-5 Yr US TIPS"
    },
    {
        value: "PBUS",
        label: "Invesco PureBeta MSCI USA"
    },
    {
        value: "PBW",
        label: "Invesco WilderHill Clean Energy"
    },
    {
        value: "PBYI",
        label: "Puma Biotechnology Inc"
    },
    {
        value: "PCAR",
        label: "PACCAR Inc."
    },
    {
        value: "PCEF",
        label: "Invesco CEF Income Composite"
    },
    {
        value: "PCF",
        label: "Putnam High Income Securities Fund"
    },
    {
        value: "PCG",
        label: "Pacific Gas & Electric Co."
    },
    {
        value: "PCG-A",
        label: "Pacific Gas & Electric Co. 6% Preferred Stock"
    },
    {
        value: "PCG-B",
        label: "Pacific Gas & Electric Co. 5 1/2% Preferred Stock"
    },
    {
        value: "PCG-C",
        label: "Pacific Gas & Electric Co. 5% 1st Preferred Stock"
    },
    {
        value: "PCG-D",
        label: "Pacific Gas & Electric Co. 5% 1st Red. Preferred Stock"
    },
    {
        value: "PCG-E",
        label: "Pacific Gas & Electric Co. 5% 1st A Preferred Stock"
    },
    {
        value: "PCG-G",
        label: "Pacific Gas & Electric Co. 4.80% 1st Preferred Stock"
    },
    {
        value: "PCG-H",
        label: "Pacific Gas & Electric Co. 4.50% 1st Preferred Stock"
    },
    {
        value: "PCG-I",
        label: "Pacific Gas & Electric Co. 4.36% 1st Preferred Stock"
    },
    {
        value: "PCH",
        label: "PotlatchDeltic Corporation"
    },
    {
        value: "PCI",
        label: "PIMCO Dynamic Credit and Mortgage Income Fund of Beneficial Interest"
    },
    {
        value: "PCK",
        label: "Pimco California Municipal Income Fund II of Beneficial Interest"
    },
    {
        value: "PCM",
        label: "PCM Fund Inc."
    },
    {
        value: "PCMI",
        label: "PCM Inc."
    },
    {
        value: "PCN",
        label: "Pimco Corporate & Income Strategy Fund"
    },
    {
        value: "PCOM",
        label: "Points International Ltd."
    },
    {
        value: "PCQ",
        label: "PIMCO California Municipal Income Fund"
    },
    {
        value: "PCRX",
        label: "Pacira Pharmaceuticals Inc."
    },
    {
        value: "PCSB",
        label: "PCSB Financial Corporation"
    },
    {
        value: "PCTI",
        label: "PC-Tel Inc."
    },
    {
        value: "PCTY",
        label: "Paylocity Holding Corporation"
    },
    {
        value: "PCY",
        label: "Invesco Emerging Markets Sovereign Debt"
    },
    {
        value: "PCYG",
        label: "Park City Group Inc."
    },
    {
        value: "PCYO",
        label: "Pure Cycle Corporation"
    },
    {
        value: "PDBC",
        label: "Invesco Optimum Yield Diversified Commodity Strategy No K-1 ETF"
    },
    {
        value: "PDCE",
        label: "PDC Energy Inc."
    },
    {
        value: "PDCO",
        label: "Patterson Companies Inc."
    },
    {
        value: "PDEX",
        label: "Pro-Dex Inc."
    },
    {
        value: "PDFS",
        label: "PDF Solutions Inc."
    },
    {
        value: "PDI",
        label: "PIMCO Dynamic Income Fund"
    },
    {
        value: "PDLB",
        label: "PDL Community Bancorp"
    },
    {
        value: "PDLI",
        label: "PDL BioPharma Inc."
    },
    {
        value: "PDM",
        label: "Piedmont Office Realty Trust Inc. Class A"
    },
    {
        value: "PDN",
        label: "Invesco FTSE RAFI Developed Markets ex-U.S. Small-Mid"
    },
    {
        value: "PDP",
        label: "Invesco DWA Momentum ETF"
    },
    {
        value: "PDS",
        label: "Precision Drilling Corporation"
    },
    {
        value: "PDT",
        label: "John Hancock Premium Dividend Fund"
    },
    {
        value: "PDVW",
        label: "pdvWireless Inc."
    },
    {
        value: "PE",
        label: "Parsley Energy Inc. Class A"
    },
    {
        value: "PEB",
        label: "Pebblebrook Hotel Trust of Beneficial Interest"
    },
    {
        value: "PEB-C",
        label: "Pebblebrook Hotel Trust 6.50% Series C Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "PEB-D",
        label: "Pebblebrook Hotel Trust 6.375% Series D Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "PEBK",
        label: "Peoples Bancorp of North Carolina Inc."
    },
    {
        value: "PEBO",
        label: "Peoples Bancorp Inc."
    },
    {
        value: "PED",
        label: "Pedevco Corp."
    },
    {
        value: "PEG",
        label: "Public Service Enterprise Group Incorporated"
    },
    {
        value: "PEGA",
        label: "Pegasystems Inc."
    },
    {
        value: "PEGI",
        label: "Pattern Energy Group Inc."
    },
    {
        value: "PEI",
        label: "Pennsylvania Real Estate Investment Trust"
    },
    {
        value: "PEI-B",
        label: "Pennsylvania Real Estate Investment Trust Cumulative Redeemable Perpetual Preferred Shares Series B"
    },
    {
        value: "PEI-C",
        label: "Pennsylvania Real Estate Investment Trust 7.20% Series C Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "PEI-D",
        label: "Pennsylvania Real Estate Investment Trust 6.875% Series D Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "PEIX",
        label: "Pacific Ethanol Inc."
    },
    {
        value: "PEJ",
        label: "Invesco Dynamic Leisure and Entertainment"
    },
    {
        value: "PEK",
        label: "VanEck Vectors ChinaAMC CSI 3000"
    },
    {
        value: "PEN",
        label: "Penumbra Inc."
    },
    {
        value: "PENN",
        label: "Penn National Gaming Inc."
    },
    {
        value: "PEO",
        label: "Adams Natural Resources Fund Inc."
    },
    {
        value: "PEP",
        label: "PepsiCo Inc."
    },
    {
        value: "PER",
        label: "SandRidge Permian Trust of Benficial Interest"
    },
    {
        value: "PERI",
        label: "Perion Network Ltd"
    },
    {
        value: "PERY",
        label: "Perry Ellis International Inc."
    },
    {
        value: "PES",
        label: "Pioneer Energy Services Corp. Common Stk"
    },
    {
        value: "PESI",
        label: "Perma-Fix Environmental Services Inc."
    },
    {
        value: "PETQ",
        label: "PetIQ Inc."
    },
    {
        value: "PETS",
        label: "PetMed Express Inc."
    },
    {
        value: "PETX",
        label: "Aratana Therapeutics Inc."
    },
    {
        value: "PETZ",
        label: "TDH Holdings Inc."
    },
    {
        value: "PEX",
        label: "ProShares Global Listed Private Equity"
    },
    {
        value: "PEY",
        label: "Invesco High Yield Equity Dividend Achievers ETF"
    },
    {
        value: "PEZ",
        label: "Invesco DWA Consumer Cyclicals Momentum ETF"
    },
    {
        value: "PF",
        label: "Pinnacle Foods Inc."
    },
    {
        value: "PFBC",
        label: "Preferred Bank"
    },
    {
        value: "PFBI",
        label: "Premier Financial Bancorp Inc."
    },
    {
        value: "PFD",
        label: "Flaherty & Crumrine Preferred Income Fund Incorporated"
    },
    {
        value: "PFE",
        label: "Pfizer Inc."
    },
    {
        value: "PFF",
        label: "iShares U.S. Preferred Stock ETF"
    },
    {
        value: "PFFA",
        label: "Virtus InfraCap U.S. Preferred Stock"
    },
    {
        value: "PFFD",
        label: "Global X U.S. Preferred"
    },
    {
        value: "PFFR",
        label: "ETFIS Series Trust I"
    },
    {
        value: "PFG",
        label: "Principal Financial Group Inc"
    },
    {
        value: "PFGC",
        label: "Performance Food Group Company"
    },
    {
        value: "PFH",
        label: "Cabco Tr Jcp 7.625"
    },
    {
        value: "PFI",
        label: "Invesco DWA Financial Momentum ETF"
    },
    {
        value: "PFIE",
        label: "Profire Energy Inc."
    },
    {
        value: "PFIG",
        label: "Invesco Fundamental Investment Grade Corporate Bond"
    },
    {
        value: "PFIN",
        label: "P & F Industries Inc."
    },
    {
        value: "PFIS",
        label: "Peoples Financial Services Corp."
    },
    {
        value: "PFL",
        label: "PIMCO Income Strategy Fund Shares of Beneficial Interest"
    },
    {
        value: "PFLT",
        label: "PennantPark Floating Rate Capital Ltd."
    },
    {
        value: "PFM",
        label: "Invesco Dividend Achievers ETF"
    },
    {
        value: "PFMT",
        label: "Performant Financial Corporation"
    },
    {
        value: "PFN",
        label: "PIMCO Income Strategy Fund II"
    },
    {
        value: "PFNX",
        label: "Pfenex Inc."
    },
    {
        value: "PFO",
        label: "Flaherty & Crumrine Preferred Income Opportunity Fund Incorporated"
    },
    {
        value: "PFPT",
        label: "Proofpoint Inc."
    },
    {
        value: "PFS",
        label: "Provident Financial Services Inc"
    },
    {
        value: "PFSI",
        label: "PennyMac Financial Services Inc. Class A"
    },
    {
        value: "PFSW",
        label: "PFSweb Inc."
    },
    {
        value: "PFXF",
        label: "VanEck Vectors Preferred Securities ex Financials"
    },
    {
        value: "PG",
        label: "Procter & Gamble Company (The)"
    },
    {
        value: "PGAL",
        label: "Global X MSCI Portugal"
    },
    {
        value: "PGC",
        label: "Peapack-Gladstone Financial Corporation"
    },
    {
        value: "PGF",
        label: "Invesco Financial Preferred"
    },
    {
        value: "PGHY",
        label: "Invesco Global Short Term High Yield Bond"
    },
    {
        value: "PGJ",
        label: "Invesco Golden Dragon China ETF"
    },
    {
        value: "PGLC",
        label: "Pershing Gold Corporation"
    },
    {
        value: "PGMB",
        label: "iPathA Series B Bloomberg Platinum Subindex Total Return ETN"
    },
    {
        value: "PGNX",
        label: "Progenics Pharmaceuticals Inc."
    },
    {
        value: "PGP",
        label: "Pimco Global Stocksplus & Income Fund StocksPlus & Income Fund of Beneficial Interest"
    },
    {
        value: "PGR",
        label: "Progressive Corporation (The)"
    },
    {
        value: "PGRE",
        label: "Paramount Group Inc."
    },
    {
        value: "PGTI",
        label: "PGT Innovations Inc."
    },
    {
        value: "PGX",
        label: "Invesco Preferred"
    },
    {
        value: "PGZ",
        label: "Principal Real Estate Income Fund of Beneficial Interest"
    },
    {
        value: "PH",
        label: "Parker-Hannifin Corporation"
    },
    {
        value: "PHB",
        label: "Invesco Fundamental High Yield Corporate Bond"
    },
    {
        value: "PHD",
        label: "Pioneer Floating Rate Trust Shares of Beneficial Interest"
    },
    {
        value: "PHDG",
        label: "Invesco S&P 500 Downside Hedged"
    },
    {
        value: "PHG",
        label: "Koninklijke Philips N.V. NY Registry Shares"
    },
    {
        value: "PHH",
        label: "PHH Corp"
    },
    {
        value: "PHI",
        label: "PLDT Inc. Sponsored ADR"
    },
    {
        value: "PHII",
        label: "PHI Inc."
    },
    {
        value: "PHIIK",
        label: "PHI Inc."
    },
    {
        value: "PHK",
        label: "Pimco High Income Fund"
    },
    {
        value: "PHM",
        label: "PulteGroup Inc."
    },
    {
        value: "PHO",
        label: "Invesco Water Resources ETF"
    },
    {
        value: "PHT",
        label: "Pioneer High Income Trust of Beneficial Interest"
    },
    {
        value: "PHX",
        label: "Panhandle Oil and Gas Inc"
    },
    {
        value: "PHYS",
        label: "Sprott Physical Gold Trust ETV"
    },
    {
        value: "PI",
        label: "Impinj Inc."
    },
    {
        value: "PICB",
        label: "Invesco International Corporate Bond"
    },
    {
        value: "PICK",
        label: "iShares MSCI Global Select Metals & Mining Producers Fund"
    },
    {
        value: "PICO",
        label: "PICO Holdings Inc."
    },
    {
        value: "PID",
        label: "Invesco International Dividend Achievers ETF"
    },
    {
        value: "PIE",
        label: "Invesco DWA Emerging Markets Momentum ETF"
    },
    {
        value: "PIH",
        label: "1347 Property Insurance Holdings Inc."
    },
    {
        value: "PIHPP",
        label: "1347 Property Insurance Holdings Inc. 8.00% Cumulative Series A Preferred Stock"
    },
    {
        value: "PII",
        label: "Polaris Industries Inc."
    },
    {
        value: "PILL",
        label: "Direxion Daily Pharmaceutical & Medical Bull 3X Shares"
    },
    {
        value: "PIM",
        label: "Putnam Master Intermediate Income Trust"
    },
    {
        value: "PIN",
        label: "Invesco India"
    },
    {
        value: "PINC",
        label: "Premier Inc."
    },
    {
        value: "PIO",
        label: "Invesco Global Water ETF"
    },
    {
        value: "PIR",
        label: "Pier 1 Imports Inc."
    },
    {
        value: "PIRS",
        label: "Pieris Pharmaceuticals Inc."
    },
    {
        value: "PIXY",
        label: "ShiftPixy Inc."
    },
    {
        value: "PIY",
        label: "Preferred Plus Trust (Ser CZN) Ser CZN-1 Tr Ctf 8.375% Maturity 10/01/2046"
    },
    {
        value: "PIZ",
        label: "Invesco DWA Developed Markets Momentum ETF"
    },
    {
        value: "PJC",
        label: "Piper Jaffray Companies"
    },
    {
        value: "PJH",
        label: "Prudential Financial Inc. 5.75% Junior Subordinated Notes due 2052"
    },
    {
        value: "PJP",
        label: "Invesco Dynamic Pharmaceuticals"
    },
    {
        value: "PJT",
        label: "PJT Partners Inc. Class A"
    },
    {
        value: "PK",
        label: "Park Hotels & Resorts Inc."
    },
    {
        value: "PKB",
        label: "Invesco Dynamic Building & Construction"
    },
    {
        value: "PKBK",
        label: "Parke Bancorp Inc."
    },
    {
        value: "PKD",
        label: "Parker Drilling Company"
    },
    {
        value: "PKE",
        label: "Park Electrochemical Corporation"
    },
    {
        value: "PKG",
        label: "Packaging Corporation of America"
    },
    {
        value: "PKI",
        label: "PerkinElmer Inc."
    },
    {
        value: "PKO",
        label: "Pimco Income Opportunity Fund of Beneficial Interest"
    },
    {
        value: "PKOH",
        label: "Park-Ohio Holdings Corp."
    },
    {
        value: "PKW",
        label: "Invesco BuyBack Achievers ETF"
    },
    {
        value: "PKX",
        label: "POSCO"
    },
    {
        value: "PLAB",
        label: "Photronics Inc."
    },
    {
        value: "PLAY",
        label: "Dave & Buster's Entertainment Inc."
    },
    {
        value: "PLBC",
        label: "Plumas Bancorp"
    },
    {
        value: "PLCE",
        label: "Children's Place Inc. (The)"
    },
    {
        value: "PLCY",
        label: "EventShares U.S. Policy Alpha"
    },
    {
        value: "PLD",
        label: "Prologis Inc."
    },
    {
        value: "PLG",
        label: "Platinum Group Metals Ltd. (Canada)"
    },
    {
        value: "PLLL",
        label: "Piedmont Lithium Limited"
    },
    {
        value: "PLM",
        label: "Polymet Mining Corporation (Canada)"
    },
    {
        value: "PLND",
        label: "VanEck Vectors Poland"
    },
    {
        value: "PLNT",
        label: "Planet Fitness Inc."
    },
    {
        value: "PLOW",
        label: "Douglas Dynamics Inc."
    },
    {
        value: "PLPC",
        label: "Preformed Line Products Company"
    },
    {
        value: "PLSE",
        label: "Pulse Biosciences Inc"
    },
    {
        value: "PLT",
        label: "Plantronics Inc."
    },
    {
        value: "PLTM",
        label: "GraniteShares Platinum Shares"
    },
    {
        value: "PLUG",
        label: "Plug Power Inc."
    },
    {
        value: "PLUS",
        label: "ePlus inc."
    },
    {
        value: "PLW",
        label: "Invesco 1-30 Laddered Treasury ETF"
    },
    {
        value: "PLX",
        label: "Protalix BioTherapeutics Inc. (DE)"
    },
    {
        value: "PLXP",
        label: "PLx Pharma Inc."
    },
    {
        value: "PLXS",
        label: "Plexus Corp."
    },
    {
        value: "PLYA",
        label: "Playa Hotels & Resorts N.V."
    },
    {
        value: "PLYM",
        label: "Plymouth Industrial REIT Inc."
    },
    {
        value: "PLYM-A",
        label: "Plymouth Industrial REIT Inc. 7.50% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "PM",
        label: "Philip Morris International Inc"
    },
    {
        value: "PMBC",
        label: "Pacific Mercantile Bancorp"
    },
    {
        value: "PMD",
        label: "Psychemedics Corporation"
    },
    {
        value: "PME",
        label: "Pingtan Marine Enterprise Ltd."
    },
    {
        value: "PMF",
        label: "PIMCO Municipal Income Fund"
    },
    {
        value: "PML",
        label: "Pimco Municipal Income Fund II of Beneficial Interest"
    },
    {
        value: "PMM",
        label: "Putnam Managed Municipal Income Trust"
    },
    {
        value: "PMO",
        label: "Putnam Municipal Opportunities Trust"
    },
    {
        value: "PMOM",
        label: "Principal Sustainable Momentum Index ETF"
    },
    {
        value: "PMPT",
        label: "iSectors Post-MPT Growth ETF"
    },
    {
        value: "PMR",
        label: "Invesco Dynamic Retail"
    },
    {
        value: "PMT",
        label: "PennyMac Mortgage Investment Trust of Beneficial Interest"
    },
    {
        value: "PMT-A",
        label: "PennyMac Mortgage Investment Trust 8.125% Series A Fixed-to-Floating Rate Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "PMT-B",
        label: "PennyMac Mortgage Investment Trust 8.00% Series B Fixed-to-Floating Rate Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "PMTS",
        label: "CPI Card Group Inc."
    },
    {
        value: "PMX",
        label: "PIMCO Municipal Income Fund III of Beneficial Interest"
    },
    {
        value: "PNBK",
        label: "Patriot National Bancorp Inc."
    },
    {
        value: "PNC",
        label: "PNC Financial Services Group Inc. (The)"
    },
    {
        value: "PNC+",
        label: "PNC Financial Services Group Inc. Warrant expiring December 31 2018"
    },
    {
        value: "PNC-P",
        label: "PNC Financial Services Group Inc. (The) Depositary Shares Series P"
    },
    {
        value: "PNC-Q",
        label: "PNC Financial Services Group Inc. (The) Depositary Shares Series Q"
    },
    {
        value: "PNF",
        label: "PIMCO New York Municipal Income Fund"
    },
    {
        value: "PNFP",
        label: "Pinnacle Financial Partners Inc."
    },
    {
        value: "PNI",
        label: "Pimco New York Municipal Income Fund II of Beneficial Interest"
    },
    {
        value: "PNK",
        label: "Pinnacle Entertainment Inc."
    },
    {
        value: "PNM",
        label: "PNM Resources Inc. (Holding Co.)"
    },
    {
        value: "PNNT",
        label: "PennantPark Investment Corporation"
    },
    {
        value: "PNQI",
        label: "Invesco Nasdaq Internet ETF"
    },
    {
        value: "PNR",
        label: "Pentair plc."
    },
    {
        value: "PNRG",
        label: "PrimeEnergy Corporation"
    },
    {
        value: "PNTR",
        label: "Pointer Telocation Ltd."
    },
    {
        value: "PNW",
        label: "Pinnacle West Capital Corporation"
    },
    {
        value: "PODD",
        label: "Insulet Corporation"
    },
    {
        value: "POL",
        label: "PolyOne Corporation"
    },
    {
        value: "POLA",
        label: "Polar Power Inc."
    },
    {
        value: "POOL",
        label: "Pool Corporation"
    },
    {
        value: "POPE",
        label: "Pope Resources"
    },
    {
        value: "POR",
        label: "Portland General Electric Co"
    },
    {
        value: "POST",
        label: "Post Holdings Inc."
    },
    {
        value: "POWI",
        label: "Power Integrations Inc."
    },
    {
        value: "POWL",
        label: "Powell Industries Inc."
    },
    {
        value: "PPA",
        label: "Invesco Aerospace & Defense"
    },
    {
        value: "PPBI",
        label: "Pacific Premier Bancorp Inc"
    },
    {
        value: "PPC",
        label: "Pilgrim's Pride Corporation"
    },
    {
        value: "PPDF",
        label: "PPDAI Group Inc. American Depositary Shares each representing five Class A"
    },
    {
        value: "PPDM",
        label: "Portfolio Developed Markets"
    },
    {
        value: "PPEM",
        label: "Portfolio Emerging Markets"
    },
    {
        value: "PPG",
        label: "PPG Industries Inc."
    },
    {
        value: "PPH",
        label: "VanEck Vectors Pharmaceutical ETF"
    },
    {
        value: "PPIH",
        label: "Perma-Pipe International Holdings Inc."
    },
    {
        value: "PPL",
        label: "PPL Corporation"
    },
    {
        value: "PPLC",
        label: "Portfolio S&P 500"
    },
    {
        value: "PPLN",
        label: "Cushing 30 MLP Index ETNs due June 15 2037"
    },
    {
        value: "PPLT",
        label: "ETFS Physical Platinum Shares"
    },
    {
        value: "PPMC",
        label: "Portfolio S&P Mid Cap"
    },
    {
        value: "PPR",
        label: "Voya Prime Rate Trust Shares of Beneficial Interest"
    },
    {
        value: "PPSC",
        label: "Portfolio S&P Small Cap"
    },
    {
        value: "PPSI",
        label: "Pioneer Power Solutions Inc."
    },
    {
        value: "PPT",
        label: "Putnam Premier Income Trust"
    },
    {
        value: "PPTB",
        label: "Portfolio Total Bond Markets"
    },
    {
        value: "PPTY",
        label: "PPTY U.S. Diversified Real Estate"
    },
    {
        value: "PPX",
        label: "PPL Capital Funding Inc. 2013 Series B Junior Subordinated Notes due 2073"
    },
    {
        value: "PQG",
        label: "PQ Group Holdings Inc."
    },
    {
        value: "PRA",
        label: "ProAssurance Corporation"
    },
    {
        value: "PRAA",
        label: "PRA Group Inc."
    },
    {
        value: "PRAH",
        label: "PRA Health Sciences Inc."
    },
    {
        value: "PRAN",
        label: "Prana Biotechnology Ltd"
    },
    {
        value: "PRB",
        label: "VanEck Vectors Pre-refunded Municipal Index"
    },
    {
        value: "PRCP",
        label: "Perceptron Inc."
    },
    {
        value: "PRE-F",
        label: "PartnerRe Ltd. Redeemable Preferred Shares Series F (Bermuda)"
    },
    {
        value: "PRE-G",
        label: "PartnerRe Ltd. 6.50% Series G Cumulative Redeemable Preferred Shares $1.00 par value"
    },
    {
        value: "PRE-H",
        label: "PartnerRe Ltd. 7.25% Series H Cumulative Redeemable Preferred Shares $1.00 par value"
    },
    {
        value: "PRE-I",
        label: "PartnerRe Ltd. 5.875% Series I Non-Cumulative Redeemable Preferred Shares $1.00 par value"
    },
    {
        value: "PREF",
        label: "Principal Spectrum Preferred Securities Active"
    },
    {
        value: "PRF",
        label: "Invesco FTSE RAFI US 1000"
    },
    {
        value: "PRFT",
        label: "Perficient Inc."
    },
    {
        value: "PRFZ",
        label: "Invesco FTSE RAFI US 1500 Small-Mid ETF"
    },
    {
        value: "PRGO",
        label: "Perrigo Company plc"
    },
    {
        value: "PRGS",
        label: "Progress Software Corporation"
    },
    {
        value: "PRGX",
        label: "PRGX Global Inc."
    },
    {
        value: "PRH",
        label: "Prudential Financial Inc. 5.70% Junior Subordinated Notes due 2053"
    },
    {
        value: "PRI",
        label: "Primerica Inc."
    },
    {
        value: "PRID",
        label: "InsightShares LGBT Employment Equality"
    },
    {
        value: "PRIM",
        label: "Primoris Services Corporation"
    },
    {
        value: "PRK",
        label: "Park National Corporation"
    },
    {
        value: "PRKR",
        label: "ParkerVision Inc."
    },
    {
        value: "PRLB",
        label: "Proto Labs Inc."
    },
    {
        value: "PRME",
        label: "First Trust Heitman Global Prime Real Estate"
    },
    {
        value: "PRMW",
        label: "Primo Water Corporation"
    },
    {
        value: "PRN",
        label: "Invesco DWA Industrials Momentum ETF"
    },
    {
        value: "PRNT",
        label: "3D Printing (The)"
    },
    {
        value: "PRO",
        label: "PROS Holdings Inc."
    },
    {
        value: "PROV",
        label: "Provident Financial Holdings Inc."
    },
    {
        value: "PRPH",
        label: "ProPhase Labs Inc."
    },
    {
        value: "PRPL",
        label: "Purple Innovation Inc."
    },
    {
        value: "PRPLW",
        label: ""
    },
    {
        value: "PRPO",
        label: "Precipio Inc."
    },
    {
        value: "PRQR",
        label: "ProQR Therapeutics N.V."
    },
    {
        value: "PRSC",
        label: "The Providence Service Corporation"
    },
    {
        value: "PRSP",
        label: "PERSPECTA INC"
    },
    {
        value: "PRSS",
        label: "CafePress Inc."
    },
    {
        value: "PRT",
        label: "PermRock Royalty Trust Trust Units"
    },
    {
        value: "PRTA",
        label: "Prothena Corporation plc"
    },
    {
        value: "PRTK",
        label: "Paratek Pharmaceuticals Inc."
    },
    {
        value: "PRTO",
        label: "Proteon Therapeutics Inc."
    },
    {
        value: "PRTS",
        label: "U.S. Auto Parts Network Inc."
    },
    {
        value: "PRTY",
        label: "Party City Holdco Inc."
    },
    {
        value: "PRU",
        label: "Prudential Financial Inc."
    },
    {
        value: "PS",
        label: "Pluralsight Inc."
    },
    {
        value: "PSA",
        label: "Public Storage"
    },
    {
        value: "PSA-A",
        label: "Public Storage Depositary Shares Series A"
    },
    {
        value: "PSA-B",
        label: "Public Storage Depositary Shares each representing 1/1000 of a 5.40% Cumulative Preferred Share of Beneficial Interest"
    },
    {
        value: "PSA-C",
        label: "Public Storage Depositary Shares Series C"
    },
    {
        value: "PSA-D",
        label: "Public Storage Depositary Shares Series D"
    },
    {
        value: "PSA-E",
        label: "Public Storage Depositary Shares Series E"
    },
    {
        value: "PSA-F",
        label: "Public Storage Depositary Shares Series F"
    },
    {
        value: "PSA-G",
        label: "Public Storage Depositary Shares Series G"
    },
    {
        value: "PSA-U",
        label: "Public Storage Depositary Shares Series U"
    },
    {
        value: "PSA-V",
        label: "Public Storage Dep Shs Repstg 1/1000th Pfd Sh Ben Int Ser V"
    },
    {
        value: "PSA-W",
        label: "Public Storage Depositary Shares Series W"
    },
    {
        value: "PSA-X",
        label: "Public Storage Depositary Shares Series X"
    },
    {
        value: "PSA-Y",
        label: "Public Storage Dep Shs Repstg 1/1000th Pfd Sh Ben Int Ser Y"
    },
    {
        value: "PSA-Z",
        label: "Public Storage Dep Shs Representing 1/1000th Pfd Sh Ben Int Ser Z"
    },
    {
        value: "PSAU",
        label: "Invesco Global Gold and Precious Metals ETF"
    },
    {
        value: "PSB",
        label: "PS Business Parks Inc."
    },
    {
        value: "PSB-U",
        label: "PS Business Parks Inc. Dep Shs Repstg 1/1000 Pfd Ser U"
    },
    {
        value: "PSB-V",
        label: "PS Business Parks Inc. Depositary Shares Series V"
    },
    {
        value: "PSB-W",
        label: "PS Business Parks Inc. Depositary Shares Series W"
    },
    {
        value: "PSB-X",
        label: "PS Business Parks Inc. Depositary Shares Series X"
    },
    {
        value: "PSB-Y",
        label: "PS Business Parks Inc. 5.20% Cumulative Preferred Stock Series Y"
    },
    {
        value: "PSC",
        label: "Principal U.S. Small-Cap Multi-Factor Index ETF"
    },
    {
        value: "PSCC",
        label: "Invesco S&P SmallCap Consumer Staples ETF"
    },
    {
        value: "PSCD",
        label: "Invesco S&P SmallCap Consumer Discretionary ETF"
    },
    {
        value: "PSCE",
        label: "Invesco S&P SmallCap Energy ETF"
    },
    {
        value: "PSCF",
        label: "Invesco S&P SmallCap Financials ETF"
    },
    {
        value: "PSCH",
        label: "Invesco S&P SmallCap Health Care ETF"
    },
    {
        value: "PSCI",
        label: "Invesco S&P SmallCap Industrials ETF"
    },
    {
        value: "PSCM",
        label: "Invesco S&P SmallCap Materials ETF"
    },
    {
        value: "PSCT",
        label: "Invesco S&P SmallCap Information Technology ETF"
    },
    {
        value: "PSCU",
        label: "Invesco S&P SmallCap Utilities ETF"
    },
    {
        value: "PSDO",
        label: "Presidio Inc."
    },
    {
        value: "PSEC",
        label: "Prospect Capital Corporation"
    },
    {
        value: "PSET",
        label: "Principal Price Setters Index ETF"
    },
    {
        value: "PSF",
        label: "Cohen & Steers Select Preferred and Income Fund Inc."
    },
    {
        value: "PSI",
        label: "Invesco Dynamic Semiconductors"
    },
    {
        value: "PSJ",
        label: "Invesco Dynamic Software"
    },
    {
        value: "PSK",
        label: "SPDR Wells Fargo Preferred Stock"
    },
    {
        value: "PSL",
        label: "Invesco DWA Consumer Staples Momentum ETF"
    },
    {
        value: "PSLV",
        label: "Sprott Physical Silver Trust ETV"
    },
    {
        value: "PSMB",
        label: "Invesco Balanced Multi-Asset Allocation"
    },
    {
        value: "PSMC",
        label: "Invesco Conservative Multi-Asset Allocation"
    },
    {
        value: "PSMG",
        label: "Invesco Growth Multi-Asset Allocation"
    },
    {
        value: "PSMM",
        label: "Invesco Moderately Conservative Multi-Asset Allocation"
    },
    {
        value: "PSMT",
        label: "PriceSmart Inc."
    },
    {
        value: "PSO",
        label: "Pearson Plc"
    },
    {
        value: "PSP",
        label: "Invesco Global Listed Private Equity"
    },
    {
        value: "PSQ",
        label: "ProShares Short QQQ"
    },
    {
        value: "PSR",
        label: "Invesco Active U.S. Real Estate Fund"
    },
    {
        value: "PST",
        label: "ProShares UltraShort Lehman 7-10 Year Treasury"
    },
    {
        value: "PSTG",
        label: "Pure Storage Inc. Class A"
    },
    {
        value: "PSTI",
        label: "Pluristem Therapeutics Inc."
    },
    {
        value: "PSX",
        label: "Phillips 66"
    },
    {
        value: "PSXP",
        label: "Phillips 66 Partners LP representing limited partner interest in the Partnership"
    },
    {
        value: "PTC",
        label: "PTC Inc."
    },
    {
        value: "PTCT",
        label: "PTC Therapeutics Inc."
    },
    {
        value: "PTEN",
        label: "Patterson-UTI Energy Inc."
    },
    {
        value: "PTEU",
        label: "Pacer TrendpilotTM European Index"
    },
    {
        value: "PTF",
        label: "Invesco DWA Technology Momentum ETF"
    },
    {
        value: "PTGX",
        label: "Protagonist Therapeutics Inc."
    },
    {
        value: "PTH",
        label: "Invesco DWA Healthcare Momentum ETF"
    },
    {
        value: "PTI",
        label: "Proteostasis Therapeutics Inc."
    },
    {
        value: "PTIE",
        label: "Pain Therapeutics Inc."
    },
    {
        value: "PTLA",
        label: "Portola Pharmaceuticals Inc."
    },
    {
        value: "PTLC",
        label: "Pacer Fund Trust Trendpilot US Large Cap"
    },
    {
        value: "PTMC",
        label: "Pacer Trendpilot US Mid Cap"
    },
    {
        value: "PTN",
        label: "Palatin Technologies Inc."
    },
    {
        value: "PTNQ",
        label: "Pacer Trendpilot 100"
    },
    {
        value: "PTNR",
        label: "Partner Communications Company Ltd."
    },
    {
        value: "PTR",
        label: "PetroChina Company Limited"
    },
    {
        value: "PTSI",
        label: "P.A.M. Transportation Services Inc."
    },
    {
        value: "PTX",
        label: "Pernix Therapeutics Holdings Inc."
    },
    {
        value: "PTY",
        label: "Pimco Corporate & Income Opportunity Fund"
    },
    {
        value: "PUB",
        label: "People's Utah Bancorp"
    },
    {
        value: "PUI",
        label: "Invesco DWA Utilities Momentum ETF"
    },
    {
        value: "PUK",
        label: "Prudential Public Limited Company"
    },
    {
        value: "PUK-",
        label: ""
    },
    {
        value: "PUK-A",
        label: "Prudential Public Limited Company 6.50% Perpetual Subordinated Capital Securities Exchangeable at the Issuer's Option Into Non-Cumulative Dollar Denominated Pre"
    },
    {
        value: "PULM",
        label: "Pulmatrix Inc."
    },
    {
        value: "PULS",
        label: "PGIM Ultra Short Bond"
    },
    {
        value: "PUMP",
        label: "ProPetro Holding Corp."
    },
    {
        value: "PUTW",
        label: "WisdomTree CBOE S&P 500 PutWrite Strategy Fund"
    },
    {
        value: "PUW",
        label: "Invesco WilderHill Progressive Energy"
    },
    {
        value: "PVAC",
        label: "Penn Virginia Corporation"
    },
    {
        value: "PVAL",
        label: "Principal Contrarian Value Index ETF"
    },
    {
        value: "PVBC",
        label: "Provident Bancorp Inc."
    },
    {
        value: "PVG",
        label: "Pretium Resources Inc. (Canada)"
    },
    {
        value: "PVH",
        label: "PVH Corp."
    },
    {
        value: "PVI",
        label: "Invesco VRDO Tax Free Weekly"
    },
    {
        value: "PVTL",
        label: "Pivotal Software Inc. Class A"
    },
    {
        value: "PW",
        label: "Power REIT (MD)"
    },
    {
        value: "PW-A",
        label: "Power REIT 7.75% Series A Cumulative Perpetual Preferred Stock"
    },
    {
        value: "PWB",
        label: "Invesco Dynamic Large Cap Growth"
    },
    {
        value: "PWC",
        label: "Invesco Dynamic Market"
    },
    {
        value: "PWOD",
        label: "Penns Woods Bancorp Inc."
    },
    {
        value: "PWR",
        label: "Quanta Services Inc."
    },
    {
        value: "PWS",
        label: "Pacer WealthShield"
    },
    {
        value: "PWV",
        label: "Invesco Dynamic Large Cap Value"
    },
    {
        value: "PWZ",
        label: "Invesco California AMT-Free Municipal Bond Portfolio"
    },
    {
        value: "PX",
        label: "Praxair Inc."
    },
    {
        value: "PXD",
        label: "Pioneer Natural Resources Company"
    },
    {
        value: "PXE",
        label: "Invesco Dynamic Energy Exploration &Production"
    },
    {
        value: "PXF",
        label: "Invesco FTSE RAFI Developed Markets ex-U.S."
    },
    {
        value: "PXH",
        label: "Invesco FTSE RAFI Emerging Markets"
    },
    {
        value: "PXI",
        label: "Invesco DWA Energy Momentum ETF"
    },
    {
        value: "PXJ",
        label: "Invesco Dynamic Oil & Gas Services"
    },
    {
        value: "PXLG",
        label: "Invesco Russell Top 200 Pure Growth"
    },
    {
        value: "PXLV",
        label: "Invesco Russell Top 200 Pure Value"
    },
    {
        value: "PXLW",
        label: "Pixelworks Inc."
    },
    {
        value: "PXMG",
        label: "Invesco Russell MidCap Pure Growth"
    },
    {
        value: "PXMV",
        label: "Invesco Russell Midcap Pure Value"
    },
    {
        value: "PXQ",
        label: "Invesco Dynamic Networking"
    },
    {
        value: "PXR",
        label: "Invesco Emerging Markets Infrastructure"
    },
    {
        value: "PXS",
        label: "Pyxis Tankers Inc."
    },
    {
        value: "PXSG",
        label: "Invesco Russell 2000 Pure Growth"
    },
    {
        value: "PXSV",
        label: "Invesco Russell 2000 Pure Value"
    },
    {
        value: "PXUS",
        label: "Principal International Multi-Factor Index ETF"
    },
    {
        value: "PY",
        label: "Principal Shareholder Yield Index ETF"
    },
    {
        value: "PYDS",
        label: "Payment Data Systems Inc."
    },
    {
        value: "PYN",
        label: "PIMCO New York Municipal Income Fund III of Beneficial Interest"
    },
    {
        value: "PYPL",
        label: "PayPal Holdings Inc."
    },
    {
        value: "PYS",
        label: "Merrill Lynch Depositor Inc PPlus Tr Ser RRD-1 Tr Ctf Cl A"
    },
    {
        value: "PYT",
        label: "PPlus Tr GSC-2 Tr Ctf Fltg Rate"
    },
    {
        value: "PYZ",
        label: "Invesco DWA Basic Materials Momentum ETF"
    },
    {
        value: "PZA",
        label: "Invesco National AMT-Free Municipal Bond ETFo"
    },
    {
        value: "PZC",
        label: "PIMCO California Municipal Income Fund III of Beneficial Interest"
    },
    {
        value: "PZD",
        label: "Invesco Cleantech"
    },
    {
        value: "PZG",
        label: "Paramount Gold Nevada Corp."
    },
    {
        value: "PZI",
        label: "Invesco Zacks Micro Cap"
    },
    {
        value: "PZN",
        label: "Pzena Investment Management Inc Class A"
    },
    {
        value: "PZT",
        label: "Invesco New York AMT-Free Municipal Bond"
    },
    {
        value: "PZZA",
        label: "Papa John's International Inc."
    },
    {
        value: "QABA",
        label: "First Trust NASDAQ ABA Community Bank Index Fund"
    },
    {
        value: "QADA",
        label: "QAD Inc."
    },
    {
        value: "QADB",
        label: "QAD Inc."
    },
    {
        value: "QAI",
        label: "IQ Hedge MultiIQ Hedge Multi-Strategy Tracker"
    },
    {
        value: "QARP",
        label: "Xtrackers Russell 1000 US QARP"
    },
    {
        value: "QAT",
        label: "iShares MSCI Qatar ETF"
    },
    {
        value: "QBAK",
        label: "Qualstar Corporation"
    },
    {
        value: "QCAN",
        label: "SPDR MSCI Canada StrategicFactors"
    },
    {
        value: "QCLN",
        label: "First Trust NASDAQ Clean Edge Green Energy Index Fund"
    },
    {
        value: "QCOM",
        label: "QUALCOMM Incorporated"
    },
    {
        value: "QCP",
        label: "Quality Care Properties Inc."
    },
    {
        value: "QCRH",
        label: "QCR Holdings Inc."
    },
    {
        value: "QD",
        label: "Qudian Inc. American Depositary Shares each representing one Class A"
    },
    {
        value: "QDEF",
        label: "FlexShares Quality Dividend Defensive Index Fund"
    },
    {
        value: "QDEL",
        label: "Quidel Corporation"
    },
    {
        value: "QDEU",
        label: "SPDR MSCI Germany StrategicFactors"
    },
    {
        value: "QDF",
        label: "FlexShares Quality Dividend Index Fund"
    },
    {
        value: "QDYN",
        label: "FlexShares Quality Dynamic Index Fund"
    },
    {
        value: "QED",
        label: "IQ Hedge Event-Driven Tracker"
    },
    {
        value: "QEFA",
        label: "SPDR MSCI EAFE StrategicFactors"
    },
    {
        value: "QEMM",
        label: "SPDR MSCI Emerging Markets StrategicFactors"
    },
    {
        value: "QEP",
        label: "QEP Resources Inc."
    },
    {
        value: "QES",
        label: "Quintana Energy Services Inc."
    },
    {
        value: "QGBR",
        label: "SPDR MSCI United Kingdom StrategicFactors"
    },
    {
        value: "QGEN",
        label: "Qiagen N.V."
    },
    {
        value: "QGTA",
        label: "IQ Leaders GTAA Tracker"
    },
    {
        value: "QHC",
        label: "Quorum Health Corporation"
    },
    {
        value: "QID",
        label: "ProShares UltraShort QQQ"
    },
    {
        value: "QINC",
        label: "First Trust RBA Quality Income ETF"
    },
    {
        value: "QIWI",
        label: "QIWI plc"
    },
    {
        value: "QJPN",
        label: "SPDR MSCI Japan StrategicFactors"
    },
    {
        value: "QLC",
        label: "FlexShares US Quality Large Cap Index Fund"
    },
    {
        value: "QLD",
        label: "ProShares Ultra QQQ"
    },
    {
        value: "QLS",
        label: "IQ Hedge Long Short Tracker"
    },
    {
        value: "QLTA",
        label: "iShares Aaa A Rated Corporate Bond"
    },
    {
        value: "QLYS",
        label: "Qualys Inc."
    },
    {
        value: "QMN",
        label: "IQ Hedge Market Neutral Tracker"
    },
    {
        value: "QMOM",
        label: "Alpha Architect U.S. Quantitative Momentum"
    },
    {
        value: "QNST",
        label: "QuinStreet Inc."
    },
    {
        value: "QQEW",
        label: "First Trust NASDAQ-100 Equal Weighted Index Fund"
    },
    {
        value: "QQQ",
        label: "Invesco QQQ Trust Series 1"
    },
    {
        value: "QQQC",
        label: "Global X NASDAQ China Technology ETF"
    },
    {
        value: "QQQE",
        label: "Direxion NASDAQ-100 Equal Weighted Index Shares"
    },
    {
        value: "QQQX",
        label: "Nuveen NASDAQ 100 Dynamic Overwrite Fund"
    },
    {
        value: "QQXT",
        label: "First Trust NASDAQ-100 Ex-Technology Sector Index Fund"
    },
    {
        value: "QRHC",
        label: "Quest Resource Holding Corporation."
    },
    {
        value: "QRTEA",
        label: "Qurate Retail Inc. Series A Common Stock"
    },
    {
        value: "QRTEB",
        label: "Qurate Retail Inc. Series B Common Stock"
    },
    {
        value: "QRVO",
        label: "Qorvo Inc."
    },
    {
        value: "QSII",
        label: "Quality Systems Inc."
    },
    {
        value: "QSR",
        label: "Restaurant Brands International Inc."
    },
    {
        value: "QSY",
        label: "WisdomTree U.S. Quality Shareholder Yield Fund"
    },
    {
        value: "QTEC",
        label: "First Trust NASDAQ-100- Technology Index Fund"
    },
    {
        value: "QTM",
        label: "Quantum Corporation"
    },
    {
        value: "QTNA",
        label: "Quantenna Communications Inc."
    },
    {
        value: "QTNT",
        label: "Quotient Limited"
    },
    {
        value: "QTRH",
        label: "Quarterhill Inc."
    },
    {
        value: "QTRX",
        label: "Quanterix Corporation"
    },
    {
        value: "QTS",
        label: "QTS Realty Trust Inc. Class A"
    },
    {
        value: "QTS-A",
        label: "QTS Realty Trust Inc. 7.125% Series A Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "QTWO",
        label: "Q2 Holdings Inc."
    },
    {
        value: "QUAD",
        label: "Quad Graphics Inc Class A"
    },
    {
        value: "QUAL",
        label: "iShares Edge MSCI USA Quality Factor"
    },
    {
        value: "QUIK",
        label: "QuickLogic Corporation"
    },
    {
        value: "QUMU",
        label: "Qumu Corporation"
    },
    {
        value: "QUOT",
        label: "Quotient Technology Inc."
    },
    {
        value: "QURE",
        label: "uniQure N.V."
    },
    {
        value: "QUS",
        label: "SPDR MSCI USA StrategicFactors"
    },
    {
        value: "QVAL",
        label: "Alpha Architect U.S. Quantitative Value"
    },
    {
        value: "QVM",
        label: "Arrow QVM Equity Factor"
    },
    {
        value: "QWLD",
        label: "SPDR MSCI World StrategicFactors"
    },
    {
        value: "QXGG",
        label: "QuantX Risk Managed Growth ETF"
    },
    {
        value: "QXMI",
        label: "QuantX Risk Managed Multi-Asset Income"
    },
    {
        value: "QXRR",
        label: "QuantX Risk Managed Real Return"
    },
    {
        value: "QXTR",
        label: "QuantX Risk Managed Multi-Asset Total Return"
    },
    {
        value: "QYLD",
        label: "Horizons NASDAQ-100 Covered Call ETF"
    },
    {
        value: "R",
        label: "Ryder System Inc."
    },
    {
        value: "RA",
        label: "Brookfield Real Assets Income Fund Inc."
    },
    {
        value: "RAAX",
        label: "VanEck Vectors Real Asset Allocation"
    },
    {
        value: "RACE",
        label: "Ferrari N.V."
    },
    {
        value: "RAD",
        label: "Rite Aid Corporation"
    },
    {
        value: "RADA",
        label: "RADA Electronic Industries Ltd."
    },
    {
        value: "RAIL",
        label: "Freightcar America Inc."
    },
    {
        value: "RALS",
        label: "ProShares RAFI Long Short"
    },
    {
        value: "RAND",
        label: "Rand Capital Corporation"
    },
    {
        value: "RARE",
        label: "Ultragenyx Pharmaceutical Inc."
    },
    {
        value: "RARX",
        label: "Ra Pharmaceuticals Inc."
    },
    {
        value: "RAVE",
        label: "Rave Restaurant Group Inc."
    },
    {
        value: "RAVI",
        label: "FlexShares Ready Access Variable Income Fund"
    },
    {
        value: "RAVN",
        label: "Raven Industries Inc."
    },
    {
        value: "RBA",
        label: "Ritchie Bros. Auctioneers Incorporated"
    },
    {
        value: "RBB",
        label: "RBB Bancorp"
    },
    {
        value: "RBBN",
        label: "Ribbon Communications Inc."
    },
    {
        value: "RBC",
        label: "Regal Beloit Corporation"
    },
    {
        value: "RBCAA",
        label: "Republic Bancorp Inc. Class A Common Stock"
    },
    {
        value: "RBCN",
        label: "Rubicon Technology Inc."
    },
    {
        value: "RBIN",
        label: "Nationwide Risk-Based International Equity"
    },
    {
        value: "RBNC",
        label: "Reliant Bancorp Inc."
    },
    {
        value: "RBS",
        label: "Royal Bank of Scotland Group Plc New (The) ADS"
    },
    {
        value: "RBS-S",
        label: "Royal Bank of Scotland Group Plc (The) Sponsored ADR Repstg Pref Ser S (United Kingdom)"
    },
    {
        value: "RBUS",
        label: "Nationwide Risk-Based U.S. Equity"
    },
    {
        value: "RCD",
        label: "Invesco S&P 500 Equal Weight Consumer Discretionary"
    },
    {
        value: "RCG",
        label: "RENN Fund Inc"
    },
    {
        value: "RCI",
        label: "Rogers Communication Inc."
    },
    {
        value: "RCII",
        label: "Rent-A-Center Inc."
    },
    {
        value: "RCKT",
        label: "Rocket Pharmaceuticals Inc."
    },
    {
        value: "RCKY",
        label: "Rocky Brands Inc."
    },
    {
        value: "RCL",
        label: "Royal Caribbean Cruises Ltd."
    },
    {
        value: "RCM",
        label: "R1 RCM Inc."
    },
    {
        value: "RCMT",
        label: "RCM Technologies Inc."
    },
    {
        value: "RCON",
        label: "Recon Technology Ltd."
    },
    {
        value: "RCS",
        label: "PIMCO Strategic Income Fund Inc."
    },
    {
        value: "RCUS",
        label: "Arcus Biosciences Inc."
    },
    {
        value: "RDC",
        label: "Rowan Companies plc Class A"
    },
    {
        value: "RDCM",
        label: "Radcom Ltd."
    },
    {
        value: "RDFN",
        label: "Redfin Corporation"
    },
    {
        value: "RDHL",
        label: "Redhill Biopharma Ltd."
    },
    {
        value: "RDI",
        label: "Reading International Inc"
    },
    {
        value: "RDIB",
        label: "Reading International Inc"
    },
    {
        value: "RDIV",
        label: "Oppenheimer S&P Ultra Dividend Revenue"
    },
    {
        value: "RDN",
        label: "Radian Group Inc."
    },
    {
        value: "RDNT",
        label: "RadNet Inc."
    },
    {
        value: "RDS.A",
        label: "Royal Dutch Shell PLC American Depositary Shares (Each representing two Class A)"
    },
    {
        value: "RDS.B",
        label: "Royal Dutch Shell PLC American Depositary Shares (Each representing two Class B)"
    },
    {
        value: "RDUS",
        label: "Radius Health Inc."
    },
    {
        value: "RDVT",
        label: "Red Violet Inc."
    },
    {
        value: "RDVY",
        label: "First Trust Rising Dividend Achievers ETF"
    },
    {
        value: "RDWR",
        label: "Radware Ltd."
    },
    {
        value: "RDY",
        label: "Dr. Reddy's Laboratories Ltd"
    },
    {
        value: "RE",
        label: "Everest Re Group Ltd."
    },
    {
        value: "RECN",
        label: "Resources Connection Inc."
    },
    {
        value: "REDU",
        label: "RISE Education Cayman Ltd"
    },
    {
        value: "REED",
        label: "Reeds Inc."
    },
    {
        value: "REEM",
        label: "Oppenheimer Revenue Weighted ETF Trust"
    },
    {
        value: "REET",
        label: "iShares Trust Global REIT"
    },
    {
        value: "REFA",
        label: "Oppenheimer International Revenue"
    },
    {
        value: "REFR",
        label: "Research Frontiers Incorporated"
    },
    {
        value: "REG",
        label: "Regency Centers Corporation"
    },
    {
        value: "REGI",
        label: "Renewable Energy Group Inc."
    },
    {
        value: "REGL",
        label: "ProShares S&P MidCap 400 Dividend Aristocrats"
    },
    {
        value: "REGN",
        label: "Regeneron Pharmaceuticals Inc."
    },
    {
        value: "REI",
        label: "Ring Energy Inc."
    },
    {
        value: "REIS",
        label: "Reis Inc"
    },
    {
        value: "REK",
        label: "ProShares Short Real Estate"
    },
    {
        value: "RELL",
        label: "Richardson Electronics Ltd."
    },
    {
        value: "RELV",
        label: "Reliv' International Inc."
    },
    {
        value: "RELX",
        label: "RELX PLC PLC American Depositary Shares (Each representing One)"
    },
    {
        value: "REM",
        label: "iShares Trust Mortgage Real Estate"
    },
    {
        value: "REML",
        label: "Credit Suisse AG X-Links Monthly Pay 2xLeveraged Mortgage REIT Exchange Traded Notes (ETNs) due July 11 2036"
    },
    {
        value: "REMX",
        label: "VanEck Vectors Rare Earth Strategic Metals"
    },
    {
        value: "REN",
        label: "Resolute Energy Corporation Comon Stock"
    },
    {
        value: "RENN",
        label: "Renren Inc. American Depositary Shares each representing fifteen Class A"
    },
    {
        value: "RENX",
        label: "RELX N.V. American Depositary Shares (Each representing One)"
    },
    {
        value: "REPH",
        label: "Recro Pharma Inc."
    },
    {
        value: "RES",
        label: "RPC Inc."
    },
    {
        value: "RESI",
        label: "Front Yard Residential Corporation"
    },
    {
        value: "RESN",
        label: "Resonant Inc."
    },
    {
        value: "RETA",
        label: "Reata Pharmaceuticals Inc."
    },
    {
        value: "RETL",
        label: "Direxion Daily Retail Bull 3X Shares"
    },
    {
        value: "RETO",
        label: "ReTo Eco-Solutions Inc."
    },
    {
        value: "REV",
        label: "Revlon Inc."
    },
    {
        value: "REVG",
        label: "REV Group Inc."
    },
    {
        value: "REW",
        label: "ProShares UltraShort Technology"
    },
    {
        value: "REX",
        label: "REX American Resources Corporation"
    },
    {
        value: "REXR",
        label: "Rexford Industrial Realty Inc."
    },
    {
        value: "REXR-A",
        label: "Rexford Industrial Realty Inc. 5.875% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "REXR-B",
        label: "Rexford Industrial Realty Inc. 5.875% Series B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "REZ",
        label: "iShares Trust Residential Real Estate"
    },
    {
        value: "RF",
        label: "Regions Financial Corporation"
    },
    {
        value: "RF-A",
        label: "Regions Financial Corporation Depositary Shares Series A"
    },
    {
        value: "RF-B",
        label: "Regions Financial Corporation Depositary Shares Series B"
    },
    {
        value: "RFAP",
        label: "First Trust RiverFront Dynamic Asia Pacific ETF"
    },
    {
        value: "RFCI",
        label: "RiverFront Dynamic Core Income"
    },
    {
        value: "RFDA",
        label: "RiverFront Dynamic US Dividend Advantage"
    },
    {
        value: "RFDI",
        label: "First Trust RiverFront Dynamic Developed International ETF"
    },
    {
        value: "RFEM",
        label: "First Trust RiverFront Dynamic Emerging Markets ETF"
    },
    {
        value: "RFEU",
        label: "First Trust RiverFront Dynamic Europe ETF"
    },
    {
        value: "RFFC",
        label: "RiverFront Dynamic US Flex-Cap"
    },
    {
        value: "RFG",
        label: "Invesco S&P Midcap 400 Pure Growth"
    },
    {
        value: "RFI",
        label: "Cohen & Steers Total Return Realty Fund Inc."
    },
    {
        value: "RFIL",
        label: "RF Industries Ltd."
    },
    {
        value: "RFL",
        label: "Rafael Holdings Inc. Class B"
    },
    {
        value: "RFP",
        label: "Resolute Forest Products Inc."
    },
    {
        value: "RFUN",
        label: "RiverFront Dynamic Unconstrained Income"
    },
    {
        value: "RFV",
        label: "Invesco S&P Midcap 400 Pure Value"
    },
    {
        value: "RGA",
        label: "Reinsurance Group of America Incorporated"
    },
    {
        value: "RGCO",
        label: "RGC Resources Inc."
    },
    {
        value: "RGEN",
        label: "Repligen Corporation"
    },
    {
        value: "RGI",
        label: "Invesco S&P 500 Equal Weight Industrials Portfolio"
    },
    {
        value: "RGLB",
        label: "Oppenheimer Global Revenue"
    },
    {
        value: "RGLD",
        label: "Royal Gold Inc."
    },
    {
        value: "RGLS",
        label: "Regulus Therapeutics Inc."
    },
    {
        value: "RGNX",
        label: "REGENXBIO Inc."
    },
    {
        value: "RGR",
        label: "Sturm Ruger & Company Inc."
    },
    {
        value: "RGS",
        label: "Regis Corporation"
    },
    {
        value: "RGSE",
        label: "Real Goods Solar Inc."
    },
    {
        value: "RGT",
        label: "Royce Global Value Trust Inc."
    },
    {
        value: "RH",
        label: "RH"
    },
    {
        value: "RHE",
        label: "Regional Health Properties Inc."
    },
    {
        value: "RHE-A",
        label: "Regional Health Properties Inc. 10.875% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "RHI",
        label: "Robert Half International Inc."
    },
    {
        value: "RHP",
        label: "Ryman Hospitality Properties Inc. (REIT)"
    },
    {
        value: "RHS",
        label: "Invesco S&P 500 Equal Weight Consumer Staples"
    },
    {
        value: "RHT",
        label: "Red Hat Inc."
    },
    {
        value: "RIBT",
        label: "RiceBran Technologies"
    },
    {
        value: "RIBTW",
        label: "RiceBran Technologies Warrant"
    },
    {
        value: "RICK",
        label: "RCI Hospitality Holdings Inc."
    },
    {
        value: "RIF",
        label: "RMR Real Estate Income Fund (MD)"
    },
    {
        value: "RIG",
        label: "Transocean Ltd (Switzerland)"
    },
    {
        value: "RIGL",
        label: "Rigel Pharmaceuticals Inc."
    },
    {
        value: "RIGS",
        label: "RiverFront Strategic Income Fund"
    },
    {
        value: "RILY",
        label: "B. Riley Financial Inc."
    },
    {
        value: "RILYG",
        label: "B. Riley Financial Inc. 7.25% Senior Notes due 2027"
    },
    {
        value: "RILYH",
        label: ""
    },
    {
        value: "RILYL",
        label: "B. Riley Financial Inc. 7.50% Senior Notes"
    },
    {
        value: "RILYZ",
        label: "B. Riley Financial Inc. 7.50% Senior Notes Due 2027"
    },
    {
        value: "RINF",
        label: "ProShares Inflation Expectations"
    },
    {
        value: "RING",
        label: "iShares MSCI Global Gold Miners ETF"
    },
    {
        value: "RIO",
        label: "Rio Tinto Plc"
    },
    {
        value: "RIOT",
        label: "Riot Blockchain Inc"
    },
    {
        value: "RISE",
        label: "Sit Rising Rate"
    },
    {
        value: "RIV",
        label: "RiverNorth Opportunities Fund Inc."
    },
    {
        value: "RJA",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the Rogers International Commodity Index - Agriculture Total Return Structured Pro"
    },
    {
        value: "RJF",
        label: "Raymond James Financial Inc."
    },
    {
        value: "RJI",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the Rogers International Commodity Index - Total Return Structured Product"
    },
    {
        value: "RJN",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the Rogers International Commodity Index - Energy Total Return Structured Product"
    },
    {
        value: "RJZ",
        label: "AB Svensk Ekportkredit (Swedish Export Credit Corporation) ELEMENTS Linked to the Rogers International Commodity Index - Metals Total Return Structured Product"
    },
    {
        value: "RKDA",
        label: "Arcadia Biosciences Inc."
    },
    {
        value: "RL",
        label: "Ralph Lauren Corporation"
    },
    {
        value: "RLGT",
        label: "Radiant Logistics Inc."
    },
    {
        value: "RLGT-A",
        label: "Radiant Logistics Inc. 9.75% Series A Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "RLGY",
        label: "Realogy Holdings Corp."
    },
    {
        value: "RLH",
        label: "Red Lions Hotels Corporation"
    },
    {
        value: "RLI",
        label: "RLI Corp. (DE)"
    },
    {
        value: "RLJ",
        label: "RLJ Lodging Trust of Beneficial Interest $0.01 par value"
    },
    {
        value: "RLJ-A",
        label: "RLJ Lodging Trust $1.95 Series A Cumulative Convertible Preferred Shares"
    },
    {
        value: "RLJE",
        label: "RLJ Entertainment Inc."
    },
    {
        value: "RLY",
        label: "SPDR SSgA Multi Asset Real Return"
    },
    {
        value: "RM",
        label: "Regional Management Corp."
    },
    {
        value: "RMAX",
        label: "RE/MAX Holdings Inc. Class A"
    },
    {
        value: "RMBL",
        label: "RumbleOn Inc."
    },
    {
        value: "RMBS",
        label: "Rambus Inc."
    },
    {
        value: "RMCF",
        label: "Rocky Mountain Chocolate Factory Inc."
    },
    {
        value: "RMD",
        label: "ResMed Inc."
    },
    {
        value: "RMGN",
        label: "RMG Networks Holding Corporation"
    },
    {
        value: "RMNI",
        label: "Rimini Street Inc."
    },
    {
        value: "RMP",
        label: "Rice Midstream Partners LP representing limited partner interests"
    },
    {
        value: "RMPL-",
        label: ""
    },
    {
        value: "RMR",
        label: "The RMR Group Inc."
    },
    {
        value: "RMT",
        label: "Royce Micro-Cap Trust Inc."
    },
    {
        value: "RMTI",
        label: "Rockwell Medical Inc."
    },
    {
        value: "RNDB",
        label: "Randolph Bancorp Inc."
    },
    {
        value: "RNDM",
        label: "First Trust Developed International Equity Select ETF"
    },
    {
        value: "RNDV",
        label: "First Trust US Equity Dividend Select ETF"
    },
    {
        value: "RNEM",
        label: "First Trust Emerging Markets Equity Select ETF"
    },
    {
        value: "RNET",
        label: "RigNet Inc."
    },
    {
        value: "RNG",
        label: "Ringcentral Inc. Class A"
    },
    {
        value: "RNGR",
        label: "Ranger Energy Services Inc. Class A"
    },
    {
        value: "RNLC",
        label: "First Trust Large Cap US Equity Select ETF"
    },
    {
        value: "RNMC",
        label: "First Trust Mid Cap US Equity Select ETF"
    },
    {
        value: "RNN",
        label: "Rexahn Pharmaceuticals Inc."
    },
    {
        value: "RNP",
        label: "Cohen & Steers Reit and Preferred Income Fund Inc"
    },
    {
        value: "RNR",
        label: "RenaissanceRe Holdings Ltd."
    },
    {
        value: "RNR-C",
        label: "RenaissanceRe Holdings Ltd. 6.08% Series C Preference Shares"
    },
    {
        value: "RNR-E",
        label: "RenaissanceRe Holdings Ltd. 5.375% Series E Preference Shares"
    },
    {
        value: "RNSC",
        label: "First Trust Small Cap US Equity Select ETF"
    },
    {
        value: "RNST",
        label: "Renasant Corporation"
    },
    {
        value: "RNWK",
        label: "RealNetworks Inc."
    },
    {
        value: "ROAD",
        label: "Construction Partners Inc."
    },
    {
        value: "ROAM",
        label: "Hartford Multifactor Emerging Markets"
    },
    {
        value: "ROBO",
        label: "Exchange Traded Concepts Trust ROBO Global Robotics and Automation Index"
    },
    {
        value: "ROBT",
        label: "First Trust Nasdaq Artificial Intelligence and Robotics ETF"
    },
    {
        value: "ROCK",
        label: "Gibraltar Industries Inc."
    },
    {
        value: "RODI",
        label: "Barclays Return on Disability ETN"
    },
    {
        value: "RODM",
        label: "Hartford Multifactor Developed Markets (ex-US)"
    },
    {
        value: "ROG",
        label: "Rogers Corporation"
    },
    {
        value: "ROGS",
        label: "Hartford Multifactor Global Small Cap"
    },
    {
        value: "ROIC",
        label: "Retail Opportunity Investments Corp."
    },
    {
        value: "ROK",
        label: "Rockwell Automation Inc."
    },
    {
        value: "ROKU",
        label: "Roku Inc."
    },
    {
        value: "ROL",
        label: "Rollins Inc."
    },
    {
        value: "ROLL",
        label: "RBC Bearings Incorporated"
    },
    {
        value: "ROM",
        label: "ProShares Ultra Technology"
    },
    {
        value: "ROOF",
        label: "IQ US Real Estate Small Cap"
    },
    {
        value: "ROP",
        label: "Roper Technologies Inc."
    },
    {
        value: "RORE",
        label: "Hartford Multifactor REIT"
    },
    {
        value: "ROSE",
        label: "Rosehill Resources Inc."
    },
    {
        value: "ROSEU",
        label: "Rosehill Resources Inc. Unit"
    },
    {
        value: "ROSEW",
        label: ""
    },
    {
        value: "ROST",
        label: "Ross Stores Inc."
    },
    {
        value: "ROUS",
        label: "Hartford Multifactor U.S. Equity"
    },
    {
        value: "ROX",
        label: "Castle Brands Inc."
    },
    {
        value: "ROYT",
        label: "Pacific Coast Oil Trust Units of Beneficial Interest"
    },
    {
        value: "RP",
        label: "RealPage Inc."
    },
    {
        value: "RPAI",
        label: "Retail Properties of America Inc. Class A"
    },
    {
        value: "RPD",
        label: "Rapid7 Inc."
    },
    {
        value: "RPG",
        label: "Invesco S&P 500 Pure Growth"
    },
    {
        value: "RPIBC",
        label: "Managed Portfolio Series"
    },
    {
        value: "RPM",
        label: "RPM International Inc."
    },
    {
        value: "RPT",
        label: "Ramco-Gershenson Properties Trust"
    },
    {
        value: "RPT-D",
        label: "Ramco-Gershenson Properties Trust 7.25% PERP PFD CONV SHS BEN INT SER D"
    },
    {
        value: "RPUT",
        label: "WisdomTree CBOE Russell 2000 PutWrite Strategy Fund"
    },
    {
        value: "RPV",
        label: "Invesco S&P 500 Pure Value"
    },
    {
        value: "RPXC",
        label: "RPX Corporation"
    },
    {
        value: "RQI",
        label: "Cohen & Steers Quality Income Realty Fund Inc"
    },
    {
        value: "RRC",
        label: "Range Resources Corporation"
    },
    {
        value: "RRD",
        label: "R.R. Donnelley & Sons Company"
    },
    {
        value: "RRGB",
        label: "Red Robin Gourmet Burgers Inc."
    },
    {
        value: "RRR",
        label: "Red Rock Resorts Inc."
    },
    {
        value: "RRTS",
        label: "Roadrunner Transportation Systems Inc"
    },
    {
        value: "RS",
        label: "Reliance Steel & Aluminum Co. (DE)"
    },
    {
        value: "RSG",
        label: "Republic Services Inc."
    },
    {
        value: "RSLS",
        label: "ReShape Lifesciences Inc."
    },
    {
        value: "RSP",
        label: "Invesco S&P 500 Equal Weight"
    },
    {
        value: "RSPP",
        label: "RSP Permian Inc."
    },
    {
        value: "RST",
        label: "Rosetta Stone Inc."
    },
    {
        value: "RSX",
        label: "VanEck Vectors Russia"
    },
    {
        value: "RSXJ",
        label: "VanEck Vectors Russia Small-Cap"
    },
    {
        value: "RSYS",
        label: "RadiSys Corporation"
    },
    {
        value: "RTEC",
        label: "Rudolph Technologies Inc."
    },
    {
        value: "RTH",
        label: "VanEck Vectors Retail"
    },
    {
        value: "RTIX",
        label: "RTI Surgical Inc."
    },
    {
        value: "RTL",
        label: "Pacer Benchmark Retail Real Estate SCTR"
    },
    {
        value: "RTM",
        label: "Invesco S&P 500 Equal Weight Materials"
    },
    {
        value: "RTN",
        label: "Raytheon Company"
    },
    {
        value: "RTRX",
        label: "Retrophin Inc."
    },
    {
        value: "RTTR",
        label: "Ritter Pharmaceuticals Inc."
    },
    {
        value: "RUBI",
        label: "The Rubicon Project Inc."
    },
    {
        value: "RUN",
        label: "Sunrun Inc."
    },
    {
        value: "RUSHA",
        label: "Rush Enterprises Inc. Class A Common Stock"
    },
    {
        value: "RUSHB",
        label: "Rush Enterprises Inc. Class B Common Stock"
    },
    {
        value: "RUSL",
        label: "Direxion Daily Russia Bull 3x Shares"
    },
    {
        value: "RUSS",
        label: "Direxion Daily Russia Bear 3x Shares"
    },
    {
        value: "RUTH",
        label: "Ruth's Hospitality Group Inc."
    },
    {
        value: "RVEN",
        label: "Reven Housing REIT Inc."
    },
    {
        value: "RVLT",
        label: "Revolution Lighting Technologies Inc."
    },
    {
        value: "RVNC",
        label: "Revance Therapeutics Inc."
    },
    {
        value: "RVNU",
        label: "Xtrackers Municipal Infrastructure Revenue Bond"
    },
    {
        value: "RVP",
        label: "Retractable Technologies Inc."
    },
    {
        value: "RVRS",
        label: "Reverse Cap Weighted US Large Cap"
    },
    {
        value: "RVSB",
        label: "Riverview Bancorp Inc"
    },
    {
        value: "RVT",
        label: "Royce Value Trust Inc."
    },
    {
        value: "RWGE",
        label: "Regalwood Global Energy Ltd. Class A"
    },
    {
        value: "RWGE+",
        label: ""
    },
    {
        value: "RWGE=",
        label: "Regalwood Global Energy Ltd. Units"
    },
    {
        value: "RWJ",
        label: "Oppenheimer S&P SmallCap 600 Revenue"
    },
    {
        value: "RWK",
        label: "Oppenheimer S&P MidCap 400 Revenue"
    },
    {
        value: "RWL",
        label: "Oppenheimer S&P 500 Revenue"
    },
    {
        value: "RWLK",
        label: "ReWalk Robotics Ltd"
    },
    {
        value: "RWM",
        label: "ProShares Short Russell2000"
    },
    {
        value: "RWO",
        label: "SPDR DJ Wilshire Global Real Estate"
    },
    {
        value: "RWR",
        label: "SPDR DJ Wilshire REIT"
    },
    {
        value: "RWT",
        label: "Redwood Trust Inc."
    },
    {
        value: "RWW",
        label: "Oppenheimer S&P Financials Revenue"
    },
    {
        value: "RWX",
        label: "SPDR DJ Wilshire Intl Real Estate"
    },
    {
        value: "RXD",
        label: "ProShares UltraShort Health Care"
    },
    {
        value: "RXI",
        label: "iShares Global Consumer Discretionary"
    },
    {
        value: "RXII",
        label: "RXi Pharmaceuticals Corporation"
    },
    {
        value: "RXIIW",
        label: "RXi Pharmaceuticals Corporation Warrants"
    },
    {
        value: "RXL",
        label: "ProShares Ultra Health Care"
    },
    {
        value: "RXN",
        label: "Rexnord Corporation"
    },
    {
        value: "RXN-A",
        label: "Rexnord Corporation Depositary Shares Series A"
    },
    {
        value: "RY",
        label: "Royal Bank Of Canada"
    },
    {
        value: "RY-T",
        label: "Royal Bank Of Canada 6.750% Fixed Rate/Floating Rate Noncumulative First Preferred Shares Series C-2"
    },
    {
        value: "RYAAY",
        label: "Ryanair Holdings plc American Depositary Shares each representing five Ordinary Shares"
    },
    {
        value: "RYAM",
        label: "Rayonier Advanced Materials Inc."
    },
    {
        value: "RYAM-A",
        label: "Rayonier Advanced Materials Inc. 8.00% Series A Mandatory Convertible Preferred Stock"
    },
    {
        value: "RYB",
        label: "RYB Education Inc. American depositary shares each representing one Class A"
    },
    {
        value: "RYE",
        label: "Invesco S&P 500 Equal Weight Energy"
    },
    {
        value: "RYF",
        label: "Invesco S&P 500 Equal Weight Financial"
    },
    {
        value: "RYH",
        label: "Invesco S&P 500 Equal Weight Health Care"
    },
    {
        value: "RYI",
        label: "Ryerson Holding Corporation"
    },
    {
        value: "RYJ",
        label: "Invesco Raymond James SB-1 Equity"
    },
    {
        value: "RYN",
        label: "Rayonier Inc. REIT"
    },
    {
        value: "RYT",
        label: "Invesco S&P 500 Equal Weight Technology"
    },
    {
        value: "RYTM",
        label: "Rhythm Pharmaceuticals Inc."
    },
    {
        value: "RYU",
        label: "Invesco S&P 500 Equal Weight Utilities"
    },
    {
        value: "RZA",
        label: "Reinsurance Group of America Incorporated 6.20% Fixed-to-Floating Rate Subordinated Debentures due 2042"
    },
    {
        value: "RZB",
        label: "Reinsurance Group of America Incorporated 5.75% Fixed-To-Floating Rate Subordinated Debentures due 2056"
    },
    {
        value: "RZG",
        label: "Invesco S&P Smallcap 600 Pure Growth"
    },
    {
        value: "RZV",
        label: "Invesco S&P Smallcap 600 Pure Value"
    },
    {
        value: "S",
        label: "Sprint Corporation"
    },
    {
        value: "SA",
        label: "Seabridge Gold Inc. (Canada)"
    },
    {
        value: "SAA",
        label: "ProShares Ultra SmallCap600"
    },
    {
        value: "SAB",
        label: ""
    },
    {
        value: "SABR",
        label: "Sabre Corporation"
    },
    {
        value: "SACH",
        label: "Sachem Capital Corp."
    },
    {
        value: "SAEX",
        label: "SAExploration Holdings Inc."
    },
    {
        value: "SAFE",
        label: "Safety Income & Growth Inc."
    },
    {
        value: "SAFM",
        label: "Sanderson Farms Inc."
    },
    {
        value: "SAFT",
        label: "Safety Insurance Group Inc."
    },
    {
        value: "SAGE",
        label: "Sage Therapeutics Inc."
    },
    {
        value: "SAGG",
        label: "Direxion Daily Total Bond Market Bear 1X Shares"
    },
    {
        value: "SAH",
        label: "Sonic Automotive Inc."
    },
    {
        value: "SAIA",
        label: "Saia Inc."
    },
    {
        value: "SAIC",
        label: "SCIENCE APPLICATIONS INTERNATIONAL CORPORATION"
    },
    {
        value: "SAIL",
        label: "SailPoint Technologies Holdings Inc."
    },
    {
        value: "SAL",
        label: "Salisbury Bancorp Inc."
    },
    {
        value: "SALM",
        label: "Salem Media Group Inc."
    },
    {
        value: "SALT",
        label: "Scorpio Bulkers Inc."
    },
    {
        value: "SAM",
        label: "Boston Beer Company Inc. (The)"
    },
    {
        value: "SAMG",
        label: "Silvercrest Asset Management Group Inc."
    },
    {
        value: "SAN",
        label: "Banco Santander S.A. Sponsored ADR (Spain)"
    },
    {
        value: "SAN-B",
        label: "Banco Santander S.A. Floating Rate Non-cumulative Series 6 Guaranteed Preferred Securities"
    },
    {
        value: "SAN-I*",
        label: "Banco Santander S.A. 6.41% Non-Cumulative Guaranteed Preferred Securities Series 1"
    },
    {
        value: "SAND",
        label: "Sandstorm Gold Ltd. (Canada)"
    },
    {
        value: "SANM",
        label: "Sanmina Corporation"
    },
    {
        value: "SANW",
        label: "S&W Seed Company"
    },
    {
        value: "SAP",
        label: "SAP SE ADS"
    },
    {
        value: "SAR",
        label: "Saratoga Investment Corp New"
    },
    {
        value: "SASR",
        label: "Sandy Spring Bancorp Inc."
    },
    {
        value: "SATS",
        label: "EchoStar Corporation"
    },
    {
        value: "SAUC",
        label: "Diversified Restaurant Holdings Inc."
    },
    {
        value: "SAVE",
        label: "Spirit Airlines Inc."
    },
    {
        value: "SB",
        label: "Safe Bulkers Inc ($0.001 par value)"
    },
    {
        value: "SB-C",
        label: "Safe Bulkers Inc Cumulative Redeemable Perpetual Preferred Series C (Marshall Islands)"
    },
    {
        value: "SB-D",
        label: "Safe Bulkers Inc Perpetual Preferred Series D (Marshall Islands)"
    },
    {
        value: "SBAC",
        label: "SBA Communications Corporation"
    },
    {
        value: "SBB",
        label: "ProShares Short SmallCap600"
    },
    {
        value: "SBBC",
        label: ""
    },
    {
        value: "SBBP",
        label: "Strongbridge Biopharma plc"
    },
    {
        value: "SBBX",
        label: "SB One Bancorp"
    },
    {
        value: "SBCF",
        label: "Seacoast Banking Corporation of Florida"
    },
    {
        value: "SBFG",
        label: "SB Financial Group Inc."
    },
    {
        value: "SBFGP",
        label: "SB Financial Group Inc. Depositary Shares each representing a 1/100th interest in a 6.50% Noncumulative convertible perpetual preferred share Series A"
    },
    {
        value: "SBGI",
        label: "Sinclair Broadcast Group Inc."
    },
    {
        value: "SBGL",
        label: "D/B/A Sibanye-Stillwater Limited American Depositary Shares (Each representing four)"
    },
    {
        value: "SBH",
        label: "Sally Beauty Holdings Inc. (Name to be changed from Holdings Inc.)"
    },
    {
        value: "SBI",
        label: "Western Asset Intermediate Muni Fund Inc"
    },
    {
        value: "SBIO",
        label: "ALPS Medical Breakthroughs"
    },
    {
        value: "SBLK",
        label: "Star Bulk Carriers Corp."
    },
    {
        value: "SBLKZ",
        label: "Star Bulk Carriers Corp. 8.30% Senior Notes due 2022"
    },
    {
        value: "SBM",
        label: "Short Basic Materials"
    },
    {
        value: "SBNA",
        label: "Scorpio Tankers Inc. 6.75% Senior Notes due 2020"
    },
    {
        value: "SBNY",
        label: "Signature Bank"
    },
    {
        value: "SBNYW",
        label: "Signature Bank Warrants 12/12/2018"
    },
    {
        value: "SBOT",
        label: "Stellar Biotechnologies Inc."
    },
    {
        value: "SBOW",
        label: "SilverBow Resorces Inc."
    },
    {
        value: "SBPH",
        label: "Spring Bank Pharmaceuticals Inc."
    },
    {
        value: "SBR",
        label: "Sabine Royalty Trust"
    },
    {
        value: "SBRA",
        label: "Sabra Health Care REIT Inc."
    },
    {
        value: "SBS",
        label: "Companhia de saneamento Basico Do Estado De Sao Paulo - Sabesp American Depositary Shares (Each repstg 250)"
    },
    {
        value: "SBSI",
        label: "Southside Bancshares Inc."
    },
    {
        value: "SBT",
        label: "Sterling Bancorp Inc."
    },
    {
        value: "SBUX",
        label: "Starbucks Corporation"
    },
    {
        value: "SC",
        label: "Santander Consumer USA Holdings Inc."
    },
    {
        value: "SCA",
        label: "Stellus Capital Investment Corporation 5.75% Notes due 2022"
    },
    {
        value: "SCAC",
        label: "Saban Capital Acquisition Corp."
    },
    {
        value: "SCACU",
        label: "Saban Capital Acquisition Corp. Unit"
    },
    {
        value: "SCACW",
        label: "Saban Capital Acquisition Corp. Warrants"
    },
    {
        value: "SCAP",
        label: "AdvisorShares Cornerstone Small Cap"
    },
    {
        value: "SCC",
        label: "ProShares UltraShort Consumer Services"
    },
    {
        value: "SCCO",
        label: "Southern Copper Corporation"
    },
    {
        value: "SCD",
        label: "LMP Capital and Income Fund Inc."
    },
    {
        value: "SCE-B",
        label: "Southern California Edison Company 4.08% Preferred Stock"
    },
    {
        value: "SCE-C",
        label: "Southern California Edison Company 4.24% Preferred Stock"
    },
    {
        value: "SCE-D",
        label: "Southern California Edison Company 4.32% Preferred Stock"
    },
    {
        value: "SCE-E",
        label: "Southern California Edison Company 4.78% Preferred Stock"
    },
    {
        value: "SCE-G",
        label: "SCE Trust II Trust Preferred Securities"
    },
    {
        value: "SCE-H",
        label: "SCE Trust III Fixed/Floating Rate Trust Preference Securities"
    },
    {
        value: "SCE-J",
        label: "Southern California Edison Company 5.375% Fixed-to-Floating Rate Trust Preference Securities"
    },
    {
        value: "SCE-K",
        label: "Southern California Edison Company 5.45% Fixed-to-Floating Rate Trust Preference Securities"
    },
    {
        value: "SCE-L",
        label: "SCE TRUST VI"
    },
    {
        value: "SCG",
        label: "SCANA Corporation"
    },
    {
        value: "SCHA",
        label: "Schwab U.S. Small-Cap"
    },
    {
        value: "SCHB",
        label: "Schwab U.S. Broad Market"
    },
    {
        value: "SCHC",
        label: "Schwab International Small-Cap Equity"
    },
    {
        value: "SCHD",
        label: "Schwab US Dividend Equity"
    },
    {
        value: "SCHE",
        label: "Schwab Emerging Markets Equity"
    },
    {
        value: "SCHF",
        label: "Schwab International Equity"
    },
    {
        value: "SCHG",
        label: "Schwab U.S. Large-Cap Growth"
    },
    {
        value: "SCHH",
        label: "Schwab U.S. REIT"
    },
    {
        value: "SCHK",
        label: "Schwab 1000 Index"
    },
    {
        value: "SCHL",
        label: "Scholastic Corporation"
    },
    {
        value: "SCHM",
        label: "Schwab U.S. Mid Cap"
    },
    {
        value: "SCHN",
        label: "Schnitzer Steel Industries Inc."
    },
    {
        value: "SCHO",
        label: "Schwab Short-Term U.S. Treasury"
    },
    {
        value: "SCHP",
        label: "Schwab U.S. TIPs"
    },
    {
        value: "SCHR",
        label: "Schwab Intermediate-Term U.S. Treasury"
    },
    {
        value: "SCHV",
        label: "Schwab U.S. Large-Cap Value"
    },
    {
        value: "SCHW",
        label: "Charles Schwab Corporation (The)"
    },
    {
        value: "SCHW-C",
        label: "The Charles Schwab Corporation Depositary Shares Series C"
    },
    {
        value: "SCHW-D",
        label: "The Charles Schwab Corporation Depositary Shares Series D"
    },
    {
        value: "SCHX",
        label: "Schwab U.S. Large-Cap"
    },
    {
        value: "SCHZ",
        label: "Schwab US Aggregate Bond"
    },
    {
        value: "SCI",
        label: "Service Corporation International"
    },
    {
        value: "SCID",
        label: "Global X Scientific Beta Europe"
    },
    {
        value: "SCIF",
        label: "VanEck Vectors India Small-Cap Index"
    },
    {
        value: "SCIJ",
        label: "Global X Scientific Beta Japan"
    },
    {
        value: "SCIN",
        label: "Columbia India Small Cap"
    },
    {
        value: "SCIU",
        label: "Global X Scientific Beta US"
    },
    {
        value: "SCIX",
        label: "Global X Scientific Beta Asia ex-Japan"
    },
    {
        value: "SCJ",
        label: "iShares MSCI Japan Sm Cap"
    },
    {
        value: "SCKT",
        label: "Socket Mobile Inc."
    },
    {
        value: "SCL",
        label: "Stepan Company"
    },
    {
        value: "SCM",
        label: "Stellus Capital Investment Corporation"
    },
    {
        value: "SCO",
        label: "ProShares UltraShort Bloomberg Crude Oil"
    },
    {
        value: "SCON",
        label: "Superconductor Technologies Inc."
    },
    {
        value: "SCOR",
        label: "COMSCORE INC"
    },
    {
        value: "SCPH",
        label: "scPharmaceuticals Inc."
    },
    {
        value: "SCS",
        label: "Steelcase Inc."
    },
    {
        value: "SCSC",
        label: "ScanSource Inc."
    },
    {
        value: "SCTO",
        label: "Global X JPMorgan US Sector Rotator Index"
    },
    {
        value: "SCVL",
        label: "Shoe Carnival Inc."
    },
    {
        value: "SCWX",
        label: "SecureWorks Corp."
    },
    {
        value: "SCX",
        label: "L.S. Starrett Company (The)"
    },
    {
        value: "SCYX",
        label: "SCYNEXIS Inc."
    },
    {
        value: "SCZ",
        label: "iShares MSCI EAFE Small-Cap ETF"
    },
    {
        value: "SD",
        label: "SandRidge Energy Inc."
    },
    {
        value: "SDCI",
        label: "USCF SummerHaven Dynamic Commodity Strategy No K-1 Fund"
    },
    {
        value: "SDD",
        label: "ProShares UltraShort SmallCap600"
    },
    {
        value: "SDEM",
        label: "Global X MSCI SuperDividend Emerging Markets"
    },
    {
        value: "SDI",
        label: "Standard Diversified Inc. Class A"
    },
    {
        value: "SDIV",
        label: "Global X SuperDividend"
    },
    {
        value: "SDLP",
        label: "Seadrill Partners LLC Representing Limited Liability Company Interests"
    },
    {
        value: "SDOG",
        label: "ALPS Sector Dividend Dogs"
    },
    {
        value: "SDOW",
        label: "UltraPro Short Dow30"
    },
    {
        value: "SDP",
        label: "ProShares UltraShort Utilities"
    },
    {
        value: "SDPI",
        label: "Superior Drilling Products Inc."
    },
    {
        value: "SDR",
        label: "SandRidge Mississippian Trust II representing Beneficial Interests"
    },
    {
        value: "SDRL",
        label: "Seadrill Limited (Bermuda)"
    },
    {
        value: "SDS",
        label: "ProShares UltraShort S&P500"
    },
    {
        value: "SDT",
        label: "SandRidge Mississippian Trust I of Beneficial Interest"
    },
    {
        value: "SDVY",
        label: "First Trust SMID Cap Rising Dividend Achievers ETF"
    },
    {
        value: "SDY",
        label: "SPDR S&P Dividend"
    },
    {
        value: "SDYL",
        label: "ETRACS Monthly Pay 2xLeveraged S&P Dividend ETN"
    },
    {
        value: "SE",
        label: "Sea Limited American Depositary Shares each representing one Class A"
    },
    {
        value: "SEA",
        label: "Invesco Shipping"
    },
    {
        value: "SEAC",
        label: "SeaChange International Inc."
    },
    {
        value: "SEAS",
        label: "SeaWorld Entertainment Inc."
    },
    {
        value: "SEB",
        label: "Seaboard Corporation"
    },
    {
        value: "SECO",
        label: "Secoo Holding Limited"
    },
    {
        value: "SECT",
        label: "Northern Lights Fund Trust IV Main Sector Rotation"
    },
    {
        value: "SEDG",
        label: "SolarEdge Technologies Inc."
    },
    {
        value: "SEE",
        label: "Sealed Air Corporation"
    },
    {
        value: "SEED",
        label: "Origin Agritech Limited"
    },
    {
        value: "SEF",
        label: "ProShares Short Financials"
    },
    {
        value: "SEIC",
        label: "SEI Investments Company"
    },
    {
        value: "SEII",
        label: "Sharing Economy International Inc."
    },
    {
        value: "SELB",
        label: "Selecta Biosciences Inc."
    },
    {
        value: "SELF",
        label: "Global Self Storage Inc."
    },
    {
        value: "SEM",
        label: "Select Medical Holdings Corporation"
    },
    {
        value: "SEMG",
        label: "Semgroup Corporation Class A"
    },
    {
        value: "SEND",
        label: "SendGrid Inc."
    },
    {
        value: "SENEA",
        label: "Seneca Foods Corp. Class A Common Stock"
    },
    {
        value: "SENEB",
        label: "Seneca Foods Corp. Class B Common Stock"
    },
    {
        value: "SENS",
        label: "Senseonics Holdings Inc."
    },
    {
        value: "SEP",
        label: "Spectra Energy Partners LP representing Limited Partner Interests"
    },
    {
        value: "SERV",
        label: "ServiceMaster Global Holdings Inc."
    },
    {
        value: "SES",
        label: "Synthesis Energy Systems Inc."
    },
    {
        value: "SESN",
        label: "Sesen Bio Inc."
    },
    {
        value: "SF",
        label: "Stifel Financial Corporation"
    },
    {
        value: "SF-A",
        label: "Stifel Financial Corporation Depositary Shares Series A"
    },
    {
        value: "SFB",
        label: "Stifel Financial Corporation 5.20% Senior Notes due 2047"
    },
    {
        value: "SFBC",
        label: "Sound Financial Bancorp Inc."
    },
    {
        value: "SFBS",
        label: "ServisFirst Bancshares Inc."
    },
    {
        value: "SFE",
        label: "Safeguard Scientifics Inc."
    },
    {
        value: "SFHY",
        label: "WisdomTree Fundamental U.S. Short-Term High Yield Corporate Bond Fund"
    },
    {
        value: "SFIG",
        label: "WisdomTree Fundamental U.S. Short-Term Corporate Bond Fund"
    },
    {
        value: "SFIX",
        label: "Stitch Fix Inc."
    },
    {
        value: "SFL",
        label: "Ship Finance International Limited"
    },
    {
        value: "SFLY",
        label: "Shutterfly Inc."
    },
    {
        value: "SFM",
        label: "Sprouts Farmers Market Inc."
    },
    {
        value: "SFNC",
        label: "Simmons First National Corporation"
    },
    {
        value: "SFS",
        label: "Smart & Final Stores Inc."
    },
    {
        value: "SFST",
        label: "Southern First Bancshares Inc."
    },
    {
        value: "SFUN",
        label: "Fang Holdings Limited American Depositary Shares (Each representing Four Class A HK$1.00 par value)"
    },
    {
        value: "SGA",
        label: "Saga Communications Inc. New Class A"
    },
    {
        value: "SGB",
        label: "Southwest Georgia Financial Corporation"
    },
    {
        value: "SGBX",
        label: "SG Blocks Inc."
    },
    {
        value: "SGC",
        label: "Superior Group of Companies Inc."
    },
    {
        value: "SGDJ",
        label: "ALPS ETF Trust Sprott Junior Gold Miners"
    },
    {
        value: "SGDM",
        label: "Sprott Gold Miners"
    },
    {
        value: "SGEN",
        label: "Seattle Genetics Inc."
    },
    {
        value: "SGGB",
        label: "iPathA Series B Bloomberg Sugar Subindex Total Return ETN"
    },
    {
        value: "SGH",
        label: "SMART Global Holdings Inc."
    },
    {
        value: "SGLB",
        label: "Sigma Labs Inc."
    },
    {
        value: "SGLBW",
        label: "Sigma Labs Inc. Warrant"
    },
    {
        value: "SGMA",
        label: "SigmaTron International Inc."
    },
    {
        value: "SGMO",
        label: "Sangamo Therapeutics Inc."
    },
    {
        value: "SGMS",
        label: "Scientific Games Corp"
    },
    {
        value: "SGOC",
        label: "SGOCO Group Ltd"
    },
    {
        value: "SGOL",
        label: "ETFS Physical Swiss Gold Shares"
    },
    {
        value: "SGRP",
        label: "SPAR Group Inc."
    },
    {
        value: "SGRY",
        label: "Surgery Partners Inc."
    },
    {
        value: "SGU",
        label: "Star Group L.P."
    },
    {
        value: "SGYP",
        label: "Synergy Pharmaceuticals Inc."
    },
    {
        value: "SGZA",
        label: "Selective Insurance Group Inc. 5.875% Senior Notes due 2043"
    },
    {
        value: "SH",
        label: "ProShares Short S&P500"
    },
    {
        value: "SHAG",
        label: "WisdomTree Barclays Yield Enhanced U.S. Short-Term Aggregate Bond Fund"
    },
    {
        value: "SHAK",
        label: "Shake Shack Inc. Class A"
    },
    {
        value: "SHBI",
        label: "Shore Bancshares Inc"
    },
    {
        value: "SHE",
        label: "SPDR Series Trust SSGA Gender Diversity Index"
    },
    {
        value: "SHEN",
        label: "Shenandoah Telecommunications Co"
    },
    {
        value: "SHG",
        label: "Shinhan Financial Group Co Ltd American Depositary Shares"
    },
    {
        value: "SHI",
        label: "SINOPEC Shangai Petrochemical Company Ltd."
    },
    {
        value: "SHIP",
        label: "Seanergy Maritime Holdings Corp"
    },
    {
        value: "SHIPW",
        label: "Seanergy Maritime Holdings Corp Class A Warrants"
    },
    {
        value: "SHLD",
        label: "Sears Holdings Corporation"
    },
    {
        value: "SHLDW",
        label: ""
    },
    {
        value: "SHLM",
        label: "A. Schulman Inc."
    },
    {
        value: "SHLO",
        label: "Shiloh Industries Inc."
    },
    {
        value: "SHLX",
        label: "Shell Midstream Partners L.P. representing Limited Partner Interests"
    },
    {
        value: "SHM",
        label: "SPDR Nuveen Bloomberg Barclays Short Term Municipal Bond"
    },
    {
        value: "SHNY",
        label: "Direxion Funds"
    },
    {
        value: "SHO",
        label: "Sunstone Hotel Investors Inc."
    },
    {
        value: "SHO-E",
        label: "Sunstone Hotel Investors Inc. 6.950% Series E Cumulative Redeemable Preferred Stock"
    },
    {
        value: "SHO-F",
        label: "Sunstone Hotel Investors Inc. 6.450% Series F Cumulative Redeemable Preferred Stock"
    },
    {
        value: "SHOO",
        label: "Steven Madden Ltd."
    },
    {
        value: "SHOP",
        label: "Shopify Inc. Class A Subordinate"
    },
    {
        value: "SHOS",
        label: "Sears Hometown and Outlet Stores Inc."
    },
    {
        value: "SHPG",
        label: "Shire plc"
    },
    {
        value: "SHSP",
        label: "SharpSpring Inc."
    },
    {
        value: "SHV",
        label: "iShares Short Treasury Bond ETF"
    },
    {
        value: "SHW",
        label: "Sherwin-Williams Company (The)"
    },
    {
        value: "SHY",
        label: "iShares 1-3 Year Treasury Bond ETF"
    },
    {
        value: "SHYD",
        label: "VanEck Vectors Short High-Yield Municipal Index"
    },
    {
        value: "SHYG",
        label: "iShares 0-5 Year High Yield Corporate Bond"
    },
    {
        value: "SHYL",
        label: "Xtrackers Short Duration High Yield Bond"
    },
    {
        value: "SID",
        label: "Companhia Siderurgica Nacional S.A."
    },
    {
        value: "SIEB",
        label: "Siebert Financial Corp."
    },
    {
        value: "SIEN",
        label: "Sientra Inc."
    },
    {
        value: "SIF",
        label: "SIFCO Industries Inc."
    },
    {
        value: "SIFI",
        label: "SI Financial Group Inc."
    },
    {
        value: "SIFY",
        label: "Sify Technologies Limited"
    },
    {
        value: "SIG",
        label: "Signet Jewelers Limited"
    },
    {
        value: "SIGA",
        label: "SIGA Technologies Inc."
    },
    {
        value: "SIGI",
        label: "Selective Insurance Group Inc."
    },
    {
        value: "SIGM",
        label: "Sigma Designs Inc."
    },
    {
        value: "SIJ",
        label: "ProShares UltraShort Industrials"
    },
    {
        value: "SIL",
        label: "Global X Silver Miners"
    },
    {
        value: "SILC",
        label: "Silicom Ltd"
    },
    {
        value: "SILJ",
        label: "ETFMG Prime Junior Silver"
    },
    {
        value: "SIM",
        label: "Grupo Simec S.A.B. de C.V. American Depositary Shares"
    },
    {
        value: "SIMO",
        label: "Silicon Motion Technology Corporation"
    },
    {
        value: "SINA",
        label: "Sina Corporation"
    },
    {
        value: "SINO",
        label: "Sino-Global Shipping America Ltd."
    },
    {
        value: "SIR",
        label: "Select Income REIT"
    },
    {
        value: "SIRI",
        label: "Sirius XM Holdings Inc."
    },
    {
        value: "SITE",
        label: "SiteOne Landscape Supply Inc."
    },
    {
        value: "SITO",
        label: "SITO Mobile Ltd."
    },
    {
        value: "SIVB",
        label: "SVB Financial Group"
    },
    {
        value: "SIVR",
        label: "ETFS Physical Silver Shares Trust"
    },
    {
        value: "SIX",
        label: "Six Flags Entertainment Corporation"
    },
    {
        value: "SIZ",
        label: "AGFiQ U.S. Market Neutral Size Fund"
    },
    {
        value: "SIZE",
        label: "iShares Edge MSCI USA Size Factor"
    },
    {
        value: "SJB",
        label: "ProShares Short High Yield"
    },
    {
        value: "SJI",
        label: "South Jersey Industries Inc."
    },
    {
        value: "SJIU",
        label: "South Jersey Industries Inc. Corporate Units"
    },
    {
        value: "SJM",
        label: "J.M. Smucker Company (The)"
    },
    {
        value: "SJNK",
        label: "SPDR Bloomberg Barclays Short Term High Yield Bond"
    },
    {
        value: "SJR",
        label: "Shaw Communications Inc."
    },
    {
        value: "SJT",
        label: "San Juan Basin Royalty Trust"
    },
    {
        value: "SJW",
        label: "SJW Group (DE)"
    },
    {
        value: "SKF",
        label: "ProShares UltraShort Financials"
    },
    {
        value: "SKIS",
        label: "Peak Resorts Inc."
    },
    {
        value: "SKM",
        label: "SK Telecom Co. Ltd."
    },
    {
        value: "SKOR",
        label: "FlexShares Credit-Scored US Corporate Bond Index Fund"
    },
    {
        value: "SKT",
        label: "Tanger Factory Outlet Centers Inc."
    },
    {
        value: "SKX",
        label: "Skechers U.S.A. Inc."
    },
    {
        value: "SKY",
        label: "Skyline Champion Corporation"
    },
    {
        value: "SKYS",
        label: "Sky Solar Holdings Ltd."
    },
    {
        value: "SKYW",
        label: "SkyWest Inc."
    },
    {
        value: "SKYY",
        label: "First Trust Cloud Computing ETF"
    },
    {
        value: "SLAB",
        label: "Silicon Laboratories Inc."
    },
    {
        value: "SLB",
        label: "Schlumberger N.V."
    },
    {
        value: "SLCA",
        label: "U.S. Silica Holdings Inc."
    },
    {
        value: "SLCT",
        label: "Select Bancorp Inc."
    },
    {
        value: "SLD",
        label: "Sutherland Asset Management Corporation"
    },
    {
        value: "SLDA",
        label: "Sutherland Asset Management Corporation 7.00% Convertible Senior Notes due 2023"
    },
    {
        value: "SLDB",
        label: "Solid Biosciences Inc."
    },
    {
        value: "SLDD",
        label: "Sutherland Asset Management Corporation 6.50% Senior Notes due 2021"
    },
    {
        value: "SLF",
        label: "Sun Life Financial Inc."
    },
    {
        value: "SLG",
        label: "SL Green Realty Corporation"
    },
    {
        value: "SLG-I",
        label: "SL Green Realty Corporation Preferred Series I"
    },
    {
        value: "SLGL",
        label: "Sol-Gel Technologies Ltd."
    },
    {
        value: "SLGN",
        label: "Silgan Holdings Inc."
    },
    {
        value: "SLIM",
        label: "The Obesity ETF"
    },
    {
        value: "SLM",
        label: "SLM Corporation"
    },
    {
        value: "SLMBP",
        label: "SLM Corporation Floating Rate Non-Cumulative Preferred Stock Series B"
    },
    {
        value: "SLNO",
        label: "Soleno Therapeutics Inc."
    },
    {
        value: "SLNOW",
        label: ""
    },
    {
        value: "SLP",
        label: "Simulations Plus Inc."
    },
    {
        value: "SLQD",
        label: "iShares 0-5 Year Investment Grade Corporate Bond ETF"
    },
    {
        value: "SLRC",
        label: "Solar Capital Ltd."
    },
    {
        value: "SLS",
        label: "SELLAS Life Sciences Group Inc."
    },
    {
        value: "SLT",
        label: "Salt truBeta High Exposure"
    },
    {
        value: "SLTB",
        label: ""
    },
    {
        value: "SLV",
        label: "iShares Silver Trust"
    },
    {
        value: "SLVO",
        label: "Credit Suisse X-Links Silver Call ETN IOPV"
    },
    {
        value: "SLVP",
        label: "iShares MSCI Global Silver Miners Fund"
    },
    {
        value: "SLX",
        label: "VanEck Vectors Steel"
    },
    {
        value: "SLY",
        label: "SPDR S&P 600 Small Cap ETF (based on S&P SmallCap 600 Index -- symbol SML)"
    },
    {
        value: "SLYG",
        label: "SPDR S&P 600 Small Cap Growth ETF (based on S&P SmallCap 600 Growth Index --symbol CGK)"
    },
    {
        value: "SLYV",
        label: "SPDR S&P 600 Small Cap Value ETF (based on S&P SmallCap Value Index--symbol--CVK"
    },
    {
        value: "SM",
        label: "SM Energy Company"
    },
    {
        value: "SMAR",
        label: "Smartsheet Inc. Class A"
    },
    {
        value: "SMB",
        label: "VanEck Vectors AMT-Free Short Municipal Index"
    },
    {
        value: "SMBC",
        label: "Southern Missouri Bancorp Inc."
    },
    {
        value: "SMBK",
        label: "SmartFinancial Inc."
    },
    {
        value: "SMCI",
        label: "Super Micro Computer Inc."
    },
    {
        value: "SMCP",
        label: "AlphaMark Actively Managed Small Cap ETF"
    },
    {
        value: "SMDD",
        label: "UltraPro Short MidCap400"
    },
    {
        value: "SMDV",
        label: "ProShares Russell 2000 Dividend Growers"
    },
    {
        value: "SMED",
        label: "Sharps Compliance Corp."
    },
    {
        value: "SMEZ",
        label: "SPDR EURO STOXX Small Cap"
    },
    {
        value: "SMFG",
        label: "Sumitomo Mitsui Financial Group Inc Unsponsored American Depositary Shares (Japan)"
    },
    {
        value: "SMG",
        label: "Scotts Miracle-Gro Company (The)"
    },
    {
        value: "SMH",
        label: "VanEck Vectors Semiconductor"
    },
    {
        value: "SMHD",
        label: "ETRACS Monthly Pay 2xLeveraged US Small Cap High Dividend ETN due February 6 2045"
    },
    {
        value: "SMHI",
        label: "SEACOR Marine Holdings Inc."
    },
    {
        value: "SMI",
        label: "Semiconductor Manufacturing International Corporation ADR"
    },
    {
        value: "SMIN",
        label: "Ishares MSCI India Small Cap"
    },
    {
        value: "SMIT",
        label: "Schmitt Industries Inc."
    },
    {
        value: "SMLF",
        label: "iShares Edge MSCI Multifactor USA Small-Cap"
    },
    {
        value: "SMLL",
        label: "Direxion Daily Small Cap Bull 2X Shares"
    },
    {
        value: "SMLP",
        label: "Summit Midstream Partners LP Representing Limited Partner Interests"
    },
    {
        value: "SMLV",
        label: "SPDR SSGA US Small Cap Low Volatility Index"
    },
    {
        value: "SMM",
        label: "Salient Midstream of Beneficial Interest"
    },
    {
        value: "SMMD",
        label: "iShares Trust Russell 2500"
    },
    {
        value: "SMMF",
        label: "Summit Financial Group Inc."
    },
    {
        value: "SMMT",
        label: "Summit Therapeutics plc"
    },
    {
        value: "SMMU",
        label: "Short Term Municipal Bond Active Exchange-Traded Fund"
    },
    {
        value: "SMMV",
        label: "iShares Trust"
    },
    {
        value: "SMN",
        label: "ProShares UltraShort Basic Materials"
    },
    {
        value: "SMP",
        label: "Standard Motor Products Inc."
    },
    {
        value: "SMPL",
        label: "The Simply Good Foods Company"
    },
    {
        value: "SMPLW",
        label: "The Simply Good Foods Company Warrant"
    },
    {
        value: "SMRT",
        label: "Stein Mart Inc."
    },
    {
        value: "SMSI",
        label: "Smith Micro Software Inc."
    },
    {
        value: "SMTA",
        label: "SPIRIT MTA REIT"
    },
    {
        value: "SMTC",
        label: "Semtech Corporation"
    },
    {
        value: "SMTS",
        label: "Sierra Metals Inc."
    },
    {
        value: "SMTX",
        label: "SMTC Corporation"
    },
    {
        value: "SN",
        label: "Sanchez Energy Corporation"
    },
    {
        value: "SNA",
        label: "Snap-On Incorporated"
    },
    {
        value: "SNAP",
        label: "Snap Inc. Class A"
    },
    {
        value: "SNBR",
        label: "Sleep Number Corporation"
    },
    {
        value: "SND",
        label: "Smart Sand Inc."
    },
    {
        value: "SNDE",
        label: "Sundance Energy Australia Limited"
    },
    {
        value: "SNDR",
        label: "Schneider National Inc."
    },
    {
        value: "SNDX",
        label: "Syndax Pharmaceuticals Inc."
    },
    {
        value: "SNE",
        label: "Sony Corporation"
    },
    {
        value: "SNES",
        label: "SenesTech Inc."
    },
    {
        value: "SNFCA",
        label: "Security National Financial Corporation Class A Common Stock"
    },
    {
        value: "SNGX",
        label: "Soligenix Inc."
    },
    {
        value: "SNGXW",
        label: "Soligenix Inc. Warrant"
    },
    {
        value: "SNH",
        label: "Senior Housing Properties Trust"
    },
    {
        value: "SNHNI",
        label: "Senior Housing Properties Trust 5.625% Senior Notes due 2042"
    },
    {
        value: "SNHNL",
        label: "Senior Housing Properties Trust 6.25% Senior Notes Due 2046"
    },
    {
        value: "SNHY",
        label: "Sun Hydraulics Corporation"
    },
    {
        value: "SNLN",
        label: "Highland/iBoxx Senior Loan ETF"
    },
    {
        value: "SNMP",
        label: "Sanchez Midstream Partners LP"
    },
    {
        value: "SNMX",
        label: "Senomyx Inc."
    },
    {
        value: "SNN",
        label: "Smith & Nephew SNATS Inc."
    },
    {
        value: "SNNA",
        label: "Sienna Biopharmaceuticals Inc."
    },
    {
        value: "SNOA",
        label: "Sonoma Pharmaceuticals Inc."
    },
    {
        value: "SNOAW",
        label: ""
    },
    {
        value: "SNP",
        label: "China Petroleum & Chemical Corporation"
    },
    {
        value: "SNPS",
        label: "Synopsys Inc."
    },
    {
        value: "SNR",
        label: "New Senior Investment Group Inc."
    },
    {
        value: "SNSR",
        label: "Global X Internet of Things ETF"
    },
    {
        value: "SNSS",
        label: "Sunesis Pharmaceuticals Inc."
    },
    {
        value: "SNV",
        label: "Synovus Financial Corp."
    },
    {
        value: "SNV-C",
        label: "Synovus Financial Corp. Perp Pfd Ser C Fxd To Fltg"
    },
    {
        value: "SNX",
        label: "Synnex Corporation"
    },
    {
        value: "SNY",
        label: "Sanofi American Depositary Shares (Each repstg one-half of one)"
    },
    {
        value: "SO",
        label: "Southern Company (The)"
    },
    {
        value: "SOCL",
        label: "Global X Social Media ETF"
    },
    {
        value: "SODA",
        label: "SodaStream International Ltd."
    },
    {
        value: "SOFO",
        label: "Sonic Foundry Inc."
    },
    {
        value: "SOGO",
        label: "Sogou Inc. American Depositary Shares each representing one Class A"
    },
    {
        value: "SOHO",
        label: "Sotherly Hotels Inc."
    },
    {
        value: "SOHOB",
        label: "Sotherly Hotels Inc. 8.0% Series B Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "SOHOK",
        label: "Sotherly Hotels LP 7.25% Senior Unsecured Notes Due 2021"
    },
    {
        value: "SOHOO",
        label: "Sotherly Hotels Inc. 7.875% Series C Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "SOHU",
        label: "Sohu.com Limited"
    },
    {
        value: "SOI",
        label: "Solaris Oilfield Infrastructure Inc. Class A"
    },
    {
        value: "SOIL",
        label: "Global X Fertilizers/Potash"
    },
    {
        value: "SOJA",
        label: ""
    },
    {
        value: "SOJB",
        label: "Southern Company (The) Series 2016A 5.25% Junior Subordinated Notes due October 1 2076"
    },
    {
        value: "SOJC",
        label: "Southern Company (The) Series 2017B 5.25% Junior Subordinated Notes due December 1 2077"
    },
    {
        value: "SOL",
        label: "Renesola Ltd. ADR"
    },
    {
        value: "SON",
        label: "Sonoco Products Company"
    },
    {
        value: "SONA",
        label: "Southern National Bancorp of Virginia Inc."
    },
    {
        value: "SONC",
        label: "Sonic Corp."
    },
    {
        value: "SOR",
        label: "Source Capital Inc."
    },
    {
        value: "SORL",
        label: "SORL Auto Parts Inc."
    },
    {
        value: "SOV-C",
        label: "Santander Holdings USA Inc. Dep Shs repstg 1/1000 Perp Pfd Ser C"
    },
    {
        value: "SOVB",
        label: "Cambria Sovereign Bond"
    },
    {
        value: "SOXL",
        label: "Direxion Daily Semiconductor Bull 3x Shares"
    },
    {
        value: "SOXS",
        label: "Direxion Daily Semiconductor Bear 3x Shares"
    },
    {
        value: "SOXX",
        label: "iShares PHLX SOX Semiconductor Sector Index Fund"
    },
    {
        value: "SOYB",
        label: "Teucrium Soybean Fund ETV"
    },
    {
        value: "SP",
        label: "SP Plus Corporation"
    },
    {
        value: "SPA",
        label: "Sparton Corporation"
    },
    {
        value: "SPAB",
        label: "SPDR Portfolio Aggregate Bond"
    },
    {
        value: "SPAR",
        label: "Spartan Motors Inc."
    },
    {
        value: "SPB",
        label: "Spectrum Brands Holdings Inc."
    },
    {
        value: "SPCB",
        label: "SuperCom Ltd."
    },
    {
        value: "SPDN",
        label: "Direxion Daily S&P 500 Bear 1X Shares"
    },
    {
        value: "SPDV",
        label: "AAM S&P 500 High Dividend Value"
    },
    {
        value: "SPDW",
        label: "SPDR Portfolio Developed World ex-US"
    },
    {
        value: "SPE",
        label: "Special Opportunities Fund Inc"
    },
    {
        value: "SPE-B",
        label: "Special Opportunities Fund Inc. 3.50% Convertible Preferred Stock Series B"
    },
    {
        value: "SPEM",
        label: "SPDR Index Shares Fund Portfolio Emerging Markets"
    },
    {
        value: "SPEX",
        label: "Spherix Incorporated"
    },
    {
        value: "SPFF",
        label: "Global X SuperIncome Preferred"
    },
    {
        value: "SPG",
        label: "Simon Property Group Inc."
    },
    {
        value: "SPG-J",
        label: "Simon Property Group Inc. Group 8 3/8% Series J Cumulative Redeemable Preferred Stock"
    },
    {
        value: "SPGI",
        label: "S&P Global Inc."
    },
    {
        value: "SPH",
        label: "Suburban Propane Partners L.P."
    },
    {
        value: "SPHB",
        label: "Invesco S&P 500 High Beta"
    },
    {
        value: "SPHD",
        label: "Invesco S&P 500 High Dividend Low Volatility"
    },
    {
        value: "SPHQ",
        label: "Invesco S&P 500 Quality"
    },
    {
        value: "SPHS",
        label: "Sophiris Bio Inc."
    },
    {
        value: "SPI",
        label: "SPI Energy Co. Ltd."
    },
    {
        value: "SPIB",
        label: "SPDR Portfolio Intermediate Term Corporate Bond"
    },
    {
        value: "SPKE",
        label: "Spark Energy Inc."
    },
    {
        value: "SPKEP",
        label: "Spark Energy Inc. 8.75% Series A Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Stock"
    },
    {
        value: "SPLB",
        label: "SPDR Portfolio Long Term Corporate Bond"
    },
    {
        value: "SPLG",
        label: "SPDR Series Trust Portfolio Large Cap"
    },
    {
        value: "SPLK",
        label: "Splunk Inc."
    },
    {
        value: "SPLP",
        label: "Steel Partners Holdings LP LTD PARTNERSHIP UNIT"
    },
    {
        value: "SPLP-A",
        label: "Steel Partners Holdings LP 6.0% Series A Preferred Units no par value"
    },
    {
        value: "SPLV",
        label: "Invesco S&P 500 Low Volatility"
    },
    {
        value: "SPLX",
        label: "ETRACS Monthly Reset 2xLeveraged S&P 500 Total Return ETN"
    },
    {
        value: "SPMD",
        label: "SPDR Portfolio Mid Cap"
    },
    {
        value: "SPMO",
        label: "Invesco S&P 500 Momentum"
    },
    {
        value: "SPMV",
        label: "Invesco S&P 500 Minimum Variance"
    },
    {
        value: "SPN",
        label: "Superior Energy Services Inc."
    },
    {
        value: "SPNE",
        label: "SeaSpine Holdings Corporation"
    },
    {
        value: "SPNS",
        label: "Sapiens International Corporation N.V."
    },
    {
        value: "SPOK",
        label: "Spok Holdings Inc."
    },
    {
        value: "SPOT",
        label: "Spotify Technology S.A."
    },
    {
        value: "SPPI",
        label: "Spectrum Pharmaceuticals Inc."
    },
    {
        value: "SPPP",
        label: "Sprott Physical Platinum and Palladium Trust"
    },
    {
        value: "SPR",
        label: "Spirit Aerosystems Holdings Inc."
    },
    {
        value: "SPRO",
        label: "Spero Therapeutics Inc."
    },
    {
        value: "SPRT",
        label: "Support.com Inc."
    },
    {
        value: "SPSB",
        label: "SPDR Portfolio Short Term Corporate Bond"
    },
    {
        value: "SPSC",
        label: "SPS Commerce Inc."
    },
    {
        value: "SPSM",
        label: "SPDR Portfolio Small Cap"
    },
    {
        value: "SPTL",
        label: "SPDR Portfolio Long Term Treasury"
    },
    {
        value: "SPTM",
        label: "SPDR Portfolio Total Stock Market"
    },
    {
        value: "SPTN",
        label: "SpartanNash Company"
    },
    {
        value: "SPTS",
        label: "SPDR Portfolio Short Term Treasury"
    },
    {
        value: "SPUN",
        label: "VanEck Vectors Spin-Off"
    },
    {
        value: "SPUU",
        label: "Direxion Daily S&P 500 Bull 2X Shares"
    },
    {
        value: "SPVM",
        label: "Invesco S&P 500 Value With Momentum"
    },
    {
        value: "SPVU",
        label: "Invesco S&P 500 Enhanced Value"
    },
    {
        value: "SPWH",
        label: "Sportsman's Warehouse Holdings Inc."
    },
    {
        value: "SPWR",
        label: "SunPower Corporation"
    },
    {
        value: "SPXB",
        label: "ProShares S&P 500 Bond"
    },
    {
        value: "SPXC",
        label: "SPX Corporation"
    },
    {
        value: "SPXE",
        label: "ProShares S&P 500 Ex-Energy"
    },
    {
        value: "SPXL",
        label: "Direxion Daily S&P 500 Bull 3X Shares"
    },
    {
        value: "SPXN",
        label: "ProShares S&P 500 Ex-Financials"
    },
    {
        value: "SPXS",
        label: "Direxion Daily S&P 500 Bear 3X"
    },
    {
        value: "SPXT",
        label: "ProShares S&P 500 Ex-Technology"
    },
    {
        value: "SPXU",
        label: "ProShares UltraPro Short S&P500"
    },
    {
        value: "SPXV",
        label: "ProShares S&P 500 Ex-Health Care"
    },
    {
        value: "SPXX",
        label: "Nuveen S&P 500 Dynamic Overwrite Fund"
    },
    {
        value: "SPY",
        label: "SPDR S&P 500"
    },
    {
        value: "SPYB",
        label: "SPDR S&P 500 Buyback"
    },
    {
        value: "SPYD",
        label: "SPDR Series Trust Portfolio S&P 500 High Dividend"
    },
    {
        value: "SPYG",
        label: "SPDR Series Trust Portfolio S&P 500 Growth"
    },
    {
        value: "SPYV",
        label: "SPDR Series Trust Portfolio S&P 500 Value"
    },
    {
        value: "SPYX",
        label: "SPDR S&P 500 Fossil Fuel Reserves Free"
    },
    {
        value: "SQ",
        label: "Square Inc. Class A"
    },
    {
        value: "SQBG",
        label: "Sequential Brands Group Inc."
    },
    {
        value: "SQLV",
        label: "Legg Mason Small-Cap Quality Value ETF"
    },
    {
        value: "SQM",
        label: "Sociedad Quimica y Minera S.A."
    },
    {
        value: "SQNS",
        label: "Sequans Communications S.A. American Depositary Shares each representing one"
    },
    {
        value: "SQQQ",
        label: "ProShares UltraPro Short QQQ"
    },
    {
        value: "SR",
        label: "Spire Inc."
    },
    {
        value: "SRAX",
        label: "Social Reality Inc."
    },
    {
        value: "SRC",
        label: "Spirit Realty Capital Inc."
    },
    {
        value: "SRC-A",
        label: "Spirit Realty Capital Inc. 6.000% Series A Cumulative Redeemable Preferred Stock"
    },
    {
        value: "SRCE",
        label: "1st Source Corporation"
    },
    {
        value: "SRCI",
        label: "SRC Energy Inc."
    },
    {
        value: "SRCL",
        label: "Stericycle Inc."
    },
    {
        value: "SRCLP",
        label: "Stericycle Inc. Depository Receipt"
    },
    {
        value: "SRDX",
        label: "Surmodics Inc."
    },
    {
        value: "SRE",
        label: "Sempra Energy"
    },
    {
        value: "SRE-A",
        label: "Sempra Energy 6% Mandatory Convertible Preferred Stock Series A"
    },
    {
        value: "SRET",
        label: "Global X SuperDividend REIT ETF"
    },
    {
        value: "SREV",
        label: "ServiceSource International Inc."
    },
    {
        value: "SRF",
        label: "Cushing Energy Income Fund of Beneficial Interest"
    },
    {
        value: "SRG",
        label: "Seritage Growth Properties Class A"
    },
    {
        value: "SRG-A",
        label: "Seritage Growth Properties 7.00% Series A Cumulative Redeemable Preferred Shares of Beneficial Interest"
    },
    {
        value: "SRI",
        label: "Stoneridge Inc."
    },
    {
        value: "SRLN",
        label: "SPDR Blackstone GSO Senior Loan"
    },
    {
        value: "SRLP",
        label: "Sprague Resources LP representing Limited Partner Interests"
    },
    {
        value: "SRNE",
        label: "Sorrento Therapeutics Inc."
    },
    {
        value: "SRPT",
        label: "Sarepta Therapeutics Inc."
    },
    {
        value: "SRRA",
        label: "Sierra Oncology Inc."
    },
    {
        value: "SRRK",
        label: "Scholar Rock Holding Corporation"
    },
    {
        value: "SRS",
        label: "ProShares UltraShort Real Estate"
    },
    {
        value: "SRT",
        label: "StarTek Inc."
    },
    {
        value: "SRTS",
        label: "Sensus Healthcare Inc."
    },
    {
        value: "SRTSW",
        label: "Sensus Healthcare Inc. Warrant"
    },
    {
        value: "SRTY",
        label: "ProShares UltraPro Short Russell2000"
    },
    {
        value: "SRV",
        label: "Cushing MLP & Infrastructure Total Return Fund"
    },
    {
        value: "SRVR",
        label: "Pacer Benchmark Data & Infrastructure Real Estate SCTR"
    },
    {
        value: "SSB",
        label: "South State Corporation"
    },
    {
        value: "SSBI",
        label: "Summit State Bank"
    },
    {
        value: "SSC",
        label: "Seven Stars Cloud Group Inc."
    },
    {
        value: "SSD",
        label: "Simpson Manufacturing Company Inc."
    },
    {
        value: "SSFN",
        label: "Stewardship Financial Corp"
    },
    {
        value: "SSG",
        label: "ProShares UltraShort Semiconductors"
    },
    {
        value: "SSI",
        label: "Stage Stores Inc."
    },
    {
        value: "SSKN",
        label: "Strata Skin Sciences Inc."
    },
    {
        value: "SSL",
        label: "Sasol Ltd. American Depositary Shares"
    },
    {
        value: "SSLJ",
        label: "SSLJ.com Limited"
    },
    {
        value: "SSNC",
        label: "SS&C Technologies Holdings Inc."
    },
    {
        value: "SSNT",
        label: "SilverSun Technologies Inc."
    },
    {
        value: "SSO",
        label: "ProShares Ultra S&P500"
    },
    {
        value: "SSP",
        label: "E.W. Scripps Company (The)"
    },
    {
        value: "SSRM",
        label: "SSR Mining Inc."
    },
    {
        value: "SSTI",
        label: "ShotSpotter Inc."
    },
    {
        value: "SSTK",
        label: "Shutterstock Inc."
    },
    {
        value: "SSW",
        label: "Seaspan Corporation"
    },
    {
        value: "SSW-D",
        label: "Seaspan Corporation Cumulative Redeemable Perpetual Preferred Series D (Marshall Islands)"
    },
    {
        value: "SSW-E",
        label: "Seaspan Corporation Cumulative Redeemable Perpetual Preferred Series E (Marshall Islands)"
    },
    {
        value: "SSW-G",
        label: "Seaspan Corporation 8.20% Cumulative Redeemable Perpetual Preferred Shares - Series G"
    },
    {
        value: "SSW-H",
        label: "Seaspan Corporation 7.875% Cumulative Redeemable Perpetual Preferred Shares - Series H"
    },
    {
        value: "SSWA",
        label: "Seaspan Corporation 7.125% Notes due 2027"
    },
    {
        value: "SSWN",
        label: "Seaspan Corporation 6.375% Notes due 2019"
    },
    {
        value: "SSY",
        label: "SunLink Health Systems Inc."
    },
    {
        value: "SSYS",
        label: "Stratasys Ltd."
    },
    {
        value: "ST",
        label: "Sensata Technologies Holding plc"
    },
    {
        value: "STAA",
        label: "STAAR Surgical Company"
    },
    {
        value: "STAF",
        label: "Staffing 360 Solutions Inc."
    },
    {
        value: "STAG",
        label: "Stag Industrial Inc."
    },
    {
        value: "STAG-B",
        label: "Stag Industrial Inc. Cum Pfd Ser B"
    },
    {
        value: "STAG-C",
        label: "Stag Industrial Inc. 6.875% Series C Cumulative Redeemable Preferred Stock"
    },
    {
        value: "STAR",
        label: "iStar Inc."
    },
    {
        value: "STAR-D",
        label: "iStar Inc. Series D Cumulative Redeemable Preferred Stock"
    },
    {
        value: "STAR-G",
        label: "iStar Inc. Series G Cumulative Redeemable Preferred Stock"
    },
    {
        value: "STAR-I",
        label: "iStar Inc. Series I Cumulative Redeemable Preferred Stock"
    },
    {
        value: "STAY",
        label: "Extended Stay America Inc. Paired Share Units"
    },
    {
        value: "STBA",
        label: "S&T Bancorp Inc."
    },
    {
        value: "STBZ",
        label: "State Bank Financial Corporation."
    },
    {
        value: "STC",
        label: "Stewart Information Services Corporation"
    },
    {
        value: "STCN",
        label: "Steel Connect Inc."
    },
    {
        value: "STDY",
        label: "SteadyMed Ltd."
    },
    {
        value: "STE",
        label: "STERIS plc"
    },
    {
        value: "STFC",
        label: "State Auto Financial Corporation"
    },
    {
        value: "STG",
        label: "Sunlands Online Education Group American Depositary Shares representing Class A"
    },
    {
        value: "STI",
        label: "SunTrust Banks Inc."
    },
    {
        value: "STI+A",
        label: "SunTrust Banks Inc. Class A Warrant (Expiring December 31 2018)"
    },
    {
        value: "STI+B",
        label: "SunTrust Banks Inc. Class B Warrant (Expiring November 14 2018)"
    },
    {
        value: "STI-A",
        label: "SunTrust Banks Inc. Dep Shs repstg 1/4000 Perpetual Pfd Stk Ser A"
    },
    {
        value: "STIP",
        label: "iShares 0-5 Year TIPS Bond"
    },
    {
        value: "STK",
        label: "Columbia Seligman Premium Technology Growth Fund Inc"
    },
    {
        value: "STKL",
        label: "SunOpta Inc."
    },
    {
        value: "STKS",
        label: "The ONE Group Hospitality Inc."
    },
    {
        value: "STL",
        label: "Sterling Bancorp"
    },
    {
        value: "STL-A",
        label: "Sterling Bancorp Depositary Shares Series A"
    },
    {
        value: "STLD",
        label: "Steel Dynamics Inc."
    },
    {
        value: "STLR",
        label: "Stellar Acquisition III Inc."
    },
    {
        value: "STLRU",
        label: "Stellar Acquisition III Inc. Unit"
    },
    {
        value: "STLRW",
        label: "Stellar Acquisition III Inc. Warrants"
    },
    {
        value: "STM",
        label: "STMicroelectronics N.V."
    },
    {
        value: "STML",
        label: "Stemline Therapeutics Inc."
    },
    {
        value: "STMP",
        label: "Stamps.com Inc."
    },
    {
        value: "STN",
        label: "Stantec Inc"
    },
    {
        value: "STND",
        label: "Standard AVB Financial Corp."
    },
    {
        value: "STNG",
        label: "Scorpio Tankers Inc."
    },
    {
        value: "STNL",
        label: "Sentinel Energy Services Inc."
    },
    {
        value: "STNLU",
        label: "Sentinel Energy Services Inc. Unit"
    },
    {
        value: "STNLW",
        label: "Sentinel Energy Services Inc. Warrant"
    },
    {
        value: "STON",
        label: "StoneMor Partners L.P. Rep Limited Partnership Interests"
    },
    {
        value: "STOR",
        label: "STORE Capital Corporation"
    },
    {
        value: "STOT",
        label: "SPDR DoubleLine Short Duration Total Return Tactical"
    },
    {
        value: "STPP",
        label: "iPath US Treasury Steepener ETN"
    },
    {
        value: "STPZ",
        label: "PIMCO 1-5 Year U.S. TIPS Index Exchange-Traded Fund"
    },
    {
        value: "STRA",
        label: "Strayer Education Inc."
    },
    {
        value: "STRL",
        label: "Sterling Construction Company Inc"
    },
    {
        value: "STRM",
        label: "Streamline Health Solutions Inc."
    },
    {
        value: "STRS",
        label: "Stratus Properties Inc."
    },
    {
        value: "STRT",
        label: "STRATTEC SECURITY CORPORATION"
    },
    {
        value: "STT",
        label: "State Street Corporation"
    },
    {
        value: "STT-C",
        label: "State Street Corporation Dep Shs Representing 1/4000 Ownership Int In Sh Non Cum (Perpertual Pfd Stk Ser C)"
    },
    {
        value: "STT-D",
        label: "State Street Corporation Depositary Shares Series D"
    },
    {
        value: "STT-E",
        label: "State Street Corporation Depository Shares Series E"
    },
    {
        value: "STT-G",
        label: "State Street Corporation Depositary shares each representing a 1/4000th ownership interest in a share of Fixed-to-Floating Rate Non-Cumulative"
    },
    {
        value: "STWD",
        label: "STARWOOD PROPERTY TRUST INC. Starwood Property Trust Inc."
    },
    {
        value: "STX",
        label: "Seagate Technology PLC"
    },
    {
        value: "STXB",
        label: "Spirit of Texas Bancshares Inc."
    },
    {
        value: "STZ",
        label: "Constellation Brands Inc."
    },
    {
        value: "STZ.B",
        label: "Constellation Brands Inc."
    },
    {
        value: "SU",
        label: "Suncor Energy Inc."
    },
    {
        value: "SUB",
        label: "iShares Short-Term National Muni Bond"
    },
    {
        value: "SUI",
        label: "Sun Communities Inc."
    },
    {
        value: "SUM",
        label: "Summit Materials Inc. Class A"
    },
    {
        value: "SUMR",
        label: "Summer Infant Inc."
    },
    {
        value: "SUN",
        label: "Sunoco LP representing limited partner interests"
    },
    {
        value: "SUNS",
        label: "Solar Senior Capital Ltd."
    },
    {
        value: "SUNW",
        label: "Sunworks Inc."
    },
    {
        value: "SUP",
        label: "Superior Industries International Inc. (DE)"
    },
    {
        value: "SUPN",
        label: "Supernus Pharmaceuticals Inc."
    },
    {
        value: "SUPV",
        label: "Grupo Supervielle S.A. American Depositary Shares each Representing five Class B shares"
    },
    {
        value: "SURF",
        label: "Surface Oncology Inc."
    },
    {
        value: "SUSA",
        label: "iShares MSCI USA ESG Select"
    },
    {
        value: "SUSB",
        label: "iShares ESG 1-5 Year USD Corporate Bond ETF"
    },
    {
        value: "SUSC",
        label: "iShares ESG USD Corporate Bond ETF"
    },
    {
        value: "SVA",
        label: "Sinovac Biotech Ltd."
    },
    {
        value: "SVBI",
        label: "Severn Bancorp Inc"
    },
    {
        value: "SVM",
        label: "Silvercorp Metals Inc."
    },
    {
        value: "SVRA",
        label: "Savara Inc."
    },
    {
        value: "SVT",
        label: "Servotronics Inc."
    },
    {
        value: "SVU",
        label: "SuperValu Inc."
    },
    {
        value: "SVVC",
        label: "Firsthand Technology Value Fund Inc."
    },
    {
        value: "SVXY",
        label: "ProShares Short VIX Short Term Futures"
    },
    {
        value: "SWCH",
        label: "Switch Inc. Class A"
    },
    {
        value: "SWIN",
        label: "ALPS/Dorsey Wright Sector Momentum ETF"
    },
    {
        value: "SWIR",
        label: "Sierra Wireless Inc."
    },
    {
        value: "SWJ",
        label: "Stanley Black & Decker Inc. 5.75% Junior Subordinated Debenture due 2052"
    },
    {
        value: "SWK",
        label: "Stanley Black & Decker Inc."
    },
    {
        value: "SWKS",
        label: "Skyworks Solutions Inc."
    },
    {
        value: "SWM",
        label: "Schweitzer-Mauduit International Inc."
    },
    {
        value: "SWN",
        label: "Southwestern Energy Company"
    },
    {
        value: "SWP",
        label: "Stanley Black & Decker Inc. Corporate Units"
    },
    {
        value: "SWX",
        label: "Southwest Gas Holdings Inc."
    },
    {
        value: "SWZ",
        label: "Swiss Helvetia Fund Inc. (The)"
    },
    {
        value: "SXC",
        label: "SunCoke Energy Inc."
    },
    {
        value: "SXCP",
        label: "SunCoke Energy Partners L.P. Representing Limited partner Interests"
    },
    {
        value: "SXE",
        label: "Southcross Energy Partners L.P."
    },
    {
        value: "SXI",
        label: "Standex International Corporation"
    },
    {
        value: "SXT",
        label: "Sensient Technologies Corporation"
    },
    {
        value: "SYBT",
        label: "Stock Yards Bancorp Inc."
    },
    {
        value: "SYBX",
        label: "Synlogic Inc."
    },
    {
        value: "SYE",
        label: "SPDR MFS Systematic Core Equity"
    },
    {
        value: "SYF",
        label: "Synchrony Financial"
    },
    {
        value: "SYG",
        label: "SPDR MFS Systematic Growth Equity"
    },
    {
        value: "SYK",
        label: "Stryker Corporation"
    },
    {
        value: "SYKE",
        label: "Sykes Enterprises Incorporated"
    },
    {
        value: "SYLD",
        label: "Cambria Shareholder Yield"
    },
    {
        value: "SYMC",
        label: "Symantec Corporation"
    },
    {
        value: "SYN",
        label: "Synthetic Biologics Inc."
    },
    {
        value: "SYNA",
        label: "Synaptics Incorporated"
    },
    {
        value: "SYNC",
        label: "Synacor Inc."
    },
    {
        value: "SYNH",
        label: "Syneos Health Inc."
    },
    {
        value: "SYNL",
        label: "Synalloy Corporation"
    },
    {
        value: "SYNT",
        label: "Syntel Inc."
    },
    {
        value: "SYPR",
        label: "Sypris Solutions Inc."
    },
    {
        value: "SYRS",
        label: "Syros Pharmaceuticals Inc."
    },
    {
        value: "SYV",
        label: "SPDR MFS Systematic Value Equity"
    },
    {
        value: "SYX",
        label: "Systemax Inc."
    },
    {
        value: "SYY",
        label: "Sysco Corporation"
    },
    {
        value: "SZC",
        label: "Cushing Renaissance Fund (The) of Beneficial Interest"
    },
    {
        value: "SZK",
        label: "ProShares UltraShort Consumer Goods"
    },
    {
        value: "SZO",
        label: "DB Crude Oil Short ETN due June 1 2038"
    },
    {
        value: "T",
        label: "AT&T Inc."
    },
    {
        value: "TA",
        label: "TravelCenters of America LLC"
    },
    {
        value: "TAC",
        label: "TransAlta Corporation"
    },
    {
        value: "TACO",
        label: "Del Taco Restaurants Inc."
    },
    {
        value: "TACOW",
        label: "Del Taco Restaurants Inc. Warrants"
    },
    {
        value: "TACT",
        label: "TransAct Technologies Incorporated"
    },
    {
        value: "TAGS",
        label: "Teucrium Agricultural Fund ETV"
    },
    {
        value: "TAHO",
        label: "Tahoe Resources Inc. (Canada)"
    },
    {
        value: "TAIL",
        label: "Cambria Tail Risk"
    },
    {
        value: "TAIT",
        label: "Taitron Components Incorporated"
    },
    {
        value: "TAL",
        label: "TAL Education Group American Depositary Shares"
    },
    {
        value: "TALO",
        label: "Talos Energy Inc."
    },
    {
        value: "TALO+",
        label: "Talos Energy Inc. Warrants"
    },
    {
        value: "TAN",
        label: "Invesco Solar"
    },
    {
        value: "TANH",
        label: "Tantech Holdings Ltd."
    },
    {
        value: "TANNI",
        label: "TravelCenters of America LLC 8.25% Senior Notes due 2028"
    },
    {
        value: "TANNL",
        label: ""
    },
    {
        value: "TANNZ",
        label: ""
    },
    {
        value: "TAO",
        label: "Invesco China Real Estate"
    },
    {
        value: "TAOP",
        label: "TAOPING INC"
    },
    {
        value: "TAP",
        label: "Molson Coors Brewing Company Class B"
    },
    {
        value: "TAP.A",
        label: "Molson Coors Brewing Company Class A"
    },
    {
        value: "TAPR",
        label: "Barclays Inverse US Treasury Composite ETN"
    },
    {
        value: "TARO",
        label: "Taro Pharmaceutical Industries Ltd."
    },
    {
        value: "TAST",
        label: "Carrols Restaurant Group Inc."
    },
    {
        value: "TAT",
        label: "TransAtlantic Petroleum Ltd (Bermuda)"
    },
    {
        value: "TATT",
        label: "TAT Technologies Ltd."
    },
    {
        value: "TAX",
        label: "Liberty Tax Inc."
    },
    {
        value: "TAYD",
        label: "Taylor Devices Inc."
    },
    {
        value: "TBB",
        label: "AT&T Inc. 5.350% Global Notes due 2066"
    },
    {
        value: "TBBK",
        label: "The Bancorp Inc."
    },
    {
        value: "TBF",
        label: "ProShares Short 20+ Year Treasury"
    },
    {
        value: "TBI",
        label: "TrueBlue Inc."
    },
    {
        value: "TBK",
        label: "Triumph Bancorp Inc."
    },
    {
        value: "TBLU",
        label: "Managed Portfolio Series Tortoise Water Fund"
    },
    {
        value: "TBNK",
        label: "Territorial Bancorp Inc."
    },
    {
        value: "TBPH",
        label: "Theravance Biopharma Inc."
    },
    {
        value: "TBT",
        label: "ProShares UltraShort Lehman 20 Year Treasury"
    },
    {
        value: "TBX",
        label: "ProShares Short 7 10 Year Treasury"
    },
    {
        value: "TCAP",
        label: "Triangle Capital Corporation"
    },
    {
        value: "TCBI",
        label: "Texas Capital Bancshares Inc."
    },
    {
        value: "TCBIL",
        label: "Texas Capital Bancshares Inc. 6.50% Subordinated Notes due 2042"
    },
    {
        value: "TCBIP",
        label: "Texas Capital Bancshares Inc. Non Cumulative Preferred Perpetual Stock Series A"
    },
    {
        value: "TCBIW",
        label: "Texas Capital Bancshares Inc. Warrants 01/16/2019"
    },
    {
        value: "TCBK",
        label: "TriCo Bancshares"
    },
    {
        value: "TCCA",
        label: "Triangle Capital Corporation 6.375% Senior Notes due 2022"
    },
    {
        value: "TCCB",
        label: ""
    },
    {
        value: "TCCO",
        label: "Technical Communications Corporation"
    },
    {
        value: "TCF",
        label: "TCF Financial Corporation"
    },
    {
        value: "TCF+",
        label: "TCF Financial Corporation Warrants"
    },
    {
        value: "TCF-D",
        label: "TCF Financial Corporation Depositary Shares Series C"
    },
    {
        value: "TCFC",
        label: "The Community Financial Corporation"
    },
    {
        value: "TCGP",
        label: "The Carlyle Group L.P."
    },
    {
        value: "TCHF",
        label: "iShares Edge MSCI Multifactor Technology"
    },
    {
        value: "TCI",
        label: "Transcontinental Realty Investors Inc."
    },
    {
        value: "TCMD",
        label: "Tactile Systems Technology Inc."
    },
    {
        value: "TCO",
        label: "Taubman Centers Inc."
    },
    {
        value: "TCO-J",
        label: "Taubman Centers Inc. Preferred Shares Series J"
    },
    {
        value: "TCO-K",
        label: "Taubman Centers Inc. Preferred Series K"
    },
    {
        value: "TCON",
        label: "TRACON Pharmaceuticals Inc."
    },
    {
        value: "TCP",
        label: "TC PipeLines LP representing Limited Partner Interests"
    },
    {
        value: "TCPC",
        label: "TCP Capital Corp."
    },
    {
        value: "TCRD",
        label: "THL Credit Inc."
    },
    {
        value: "TCRX",
        label: ""
    },
    {
        value: "TCRZ",
        label: "THL Credit Inc. 6.75% Notes due 2022"
    },
    {
        value: "TCS",
        label: "Container Store (The)"
    },
    {
        value: "TCTL",
        label: "Premise Capital Frontier Advantage Diversified Tactical"
    },
    {
        value: "TCX",
        label: "Tucows Inc."
    },
    {
        value: "TD",
        label: "Toronto Dominion Bank (The)"
    },
    {
        value: "TDA",
        label: "Telephone and Data Systems Inc. 5.875% Senior Notes due 2061"
    },
    {
        value: "TDACU",
        label: "Trident Acquisitions Corp. Units"
    },
    {
        value: "TDC",
        label: "Teradata Corporation"
    },
    {
        value: "TDE",
        label: "Telephone and Data Systems Inc. 6.875% Senior Notes due 2059"
    },
    {
        value: "TDF",
        label: "Templeton Dragon Fund Inc."
    },
    {
        value: "TDG",
        label: "Transdigm Group Incorporated Inc."
    },
    {
        value: "TDI",
        label: "Telephone and Data Systems Inc. Sr Nt"
    },
    {
        value: "TDIV",
        label: "First Trust NASDAQ Technology Dividend Index Fund"
    },
    {
        value: "TDJ",
        label: "Telephone and Data Systems Inc. 7% Senior Notes due 2060"
    },
    {
        value: "TDOC",
        label: "Teladoc Inc."
    },
    {
        value: "TDS",
        label: "Telephone and Data Systems Inc."
    },
    {
        value: "TDTF",
        label: "FlexShares iBoxx 5 Year Target Duration TIPS Index Fund"
    },
    {
        value: "TDTT",
        label: "FlexShares iBoxx 3 Year Target Duration TIPS Index Fund"
    },
    {
        value: "TDW",
        label: "Tidewater Inc."
    },
    {
        value: "TDW+A",
        label: ""
    },
    {
        value: "TDW+B",
        label: ""
    },
    {
        value: "TDY",
        label: "Teledyne Technologies Incorporated"
    },
    {
        value: "TEAM",
        label: "Atlassian Corporation Plc"
    },
    {
        value: "TECD",
        label: "Tech Data Corporation"
    },
    {
        value: "TECH",
        label: "Bio-Techne Corp"
    },
    {
        value: "TECK",
        label: "Teck Resources Ltd"
    },
    {
        value: "TECL",
        label: "Direxion Technology Bull 3X Shares"
    },
    {
        value: "TECS",
        label: "Direxion Technology Bear 3X Shares"
    },
    {
        value: "TEDU",
        label: "Tarena International Inc."
    },
    {
        value: "TEF",
        label: "Telefonica SA"
    },
    {
        value: "TEGP",
        label: "Tallgrass Energy GP LP Class A Shares"
    },
    {
        value: "TEI",
        label: "Templeton Emerging Markets Income Fund Inc."
    },
    {
        value: "TEL",
        label: "TE Connectivity Ltd. New Switzerland Registered Shares"
    },
    {
        value: "TELL",
        label: "Tellurian Inc."
    },
    {
        value: "TEN",
        label: "Tenneco Inc."
    },
    {
        value: "TENX",
        label: "Tenax Therapeutics Inc."
    },
    {
        value: "TEO",
        label: "Telecom Argentina SA"
    },
    {
        value: "TEP",
        label: "Tallgrass Energy Partners LP representing limited partner interests"
    },
    {
        value: "TER",
        label: "Teradyne Inc."
    },
    {
        value: "TERM",
        label: "EquityCompass Tactical Risk Manager"
    },
    {
        value: "TERP",
        label: "TerraForm Power Inc."
    },
    {
        value: "TESS",
        label: "TESSCO Technologies Incorporated"
    },
    {
        value: "TETF",
        label: "ETF Industry Exposure & Financial Services"
    },
    {
        value: "TEUM",
        label: "Pareteum Corporation"
    },
    {
        value: "TEVA",
        label: "Teva Pharmaceutical Industries Limited American Depositary Shares"
    },
    {
        value: "TEX",
        label: "Terex Corporation"
    },
    {
        value: "TFI",
        label: "SPDR Nuveen Bloomberg Barclays Municipal Bond"
    },
    {
        value: "TFLO",
        label: "iShares Treasury Floating Rate Bond"
    },
    {
        value: "TFSL",
        label: "TFS Financial Corporation"
    },
    {
        value: "TFX",
        label: "Teleflex Incorporated"
    },
    {
        value: "TG",
        label: "Tredegar Corporation"
    },
    {
        value: "TGA",
        label: "TransGlobe Energy Corporation"
    },
    {
        value: "TGB",
        label: "Taseko Mines Ltd."
    },
    {
        value: "TGC",
        label: "Tengasco Inc."
    },
    {
        value: "TGEN",
        label: "Tecogen Inc."
    },
    {
        value: "TGH",
        label: "Textainer Group Holdings Limited"
    },
    {
        value: "TGI",
        label: "Triumph Group Inc."
    },
    {
        value: "TGLS",
        label: "Tecnoglass Inc."
    },
    {
        value: "TGNA",
        label: "TEGNA Inc"
    },
    {
        value: "TGP",
        label: "Teekay LNG Partners L.P."
    },
    {
        value: "TGP-A",
        label: "Teekay LNG Partners L.P. 9.00% Series A Cumulative Redeemable Perpetual Preferred Units representing limited partner interests"
    },
    {
        value: "TGP-B",
        label: "Teekay LNG Partners L.P. 8.50% Series B Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units representing limited partner interests"
    },
    {
        value: "TGS",
        label: "Transportadora de Gas del Sur SA TGS"
    },
    {
        value: "TGT",
        label: "Target Corporation"
    },
    {
        value: "TGTX",
        label: "TG Therapeutics Inc."
    },
    {
        value: "THC",
        label: "Tenet Healthcare Corporation"
    },
    {
        value: "THD",
        label: "iShares Inc MSCI Thailand"
    },
    {
        value: "THFF",
        label: "First Financial Corporation Indiana"
    },
    {
        value: "THG",
        label: "Hanover Insurance Group Inc"
    },
    {
        value: "THGA",
        label: "The Hanover Insurance Group Inc. 6.35% Subordinated Debentures due 2053"
    },
    {
        value: "THM",
        label: "International Tower Hill Mines Ltd. (Canada)"
    },
    {
        value: "THO",
        label: "Thor Industries Inc."
    },
    {
        value: "THQ",
        label: "Tekla Healthcare Opportunies Fund Shares of Beneficial Interest"
    },
    {
        value: "THR",
        label: "Thermon Group Holdings Inc."
    },
    {
        value: "THRM",
        label: "Gentherm Inc"
    },
    {
        value: "THS",
        label: "Treehouse Foods Inc."
    },
    {
        value: "THST",
        label: "Truett-Hurst Inc."
    },
    {
        value: "THW",
        label: "Tekla World Healthcare Fund Shares of Beneficial Interest"
    },
    {
        value: "TI",
        label: "Telecom Italia S.P.A. New"
    },
    {
        value: "TI.A",
        label: "Telecom Italia S.P.A. New"
    },
    {
        value: "TIBR",
        label: "Tiberius Acquisition Corporation"
    },
    {
        value: "TIBRU",
        label: "Tiberius Acquisition Corporation Units"
    },
    {
        value: "TIBRW",
        label: "Tiberius Acquisition Corporation Warrant"
    },
    {
        value: "TIER",
        label: "TIER REIT Inc."
    },
    {
        value: "TIF",
        label: "Tiffany & Co."
    },
    {
        value: "TIG",
        label: "TiGenix"
    },
    {
        value: "TIK",
        label: "Tel-Instrument Electronics Corp."
    },
    {
        value: "TILE",
        label: "Interface Inc."
    },
    {
        value: "TILT",
        label: "FlexShares Mornigstar US Market Factors Tilt Index Fund"
    },
    {
        value: "TIP",
        label: "iShares TIPS Bond"
    },
    {
        value: "TIPT",
        label: "Tiptree Inc."
    },
    {
        value: "TIPX",
        label: "SPDR Bloomberg Barclays 1-10 Year TIPS"
    },
    {
        value: "TIPZ",
        label: "PIMCO Broad U.S. TIPS Index Exchange-Traded Fund"
    },
    {
        value: "TIS",
        label: "Orchids Paper Products Company"
    },
    {
        value: "TISA",
        label: "Top Image Systems Ltd."
    },
    {
        value: "TISI",
        label: "Team Inc."
    },
    {
        value: "TITN",
        label: "Titan Machinery Inc."
    },
    {
        value: "TIVO",
        label: "TiVo Corporation"
    },
    {
        value: "TJX",
        label: "TJX Companies Inc. (The)"
    },
    {
        value: "TK",
        label: "Teekay Corporation"
    },
    {
        value: "TKAT",
        label: "Takung Art Co. Ltd."
    },
    {
        value: "TKC",
        label: "Turkcell Iletisim Hizmetleri AS"
    },
    {
        value: "TKR",
        label: "Timken Company (The)"
    },
    {
        value: "TLDH",
        label: "FlexShares Currency Hedged Morningstar DM ex-US Factor Tilt Index Fund"
    },
    {
        value: "TLEH",
        label: "FlexShares Currency Hedged Morningstar EM Factor Tilt Index Fund"
    },
    {
        value: "TLF",
        label: "Tandy Leather Factory Inc."
    },
    {
        value: "TLGT",
        label: "Teligent Inc."
    },
    {
        value: "TLH",
        label: "iShares 10-20 Year Treasury Bond"
    },
    {
        value: "TLI",
        label: "Western Asset Corporate Loan Fund Inc"
    },
    {
        value: "TLK",
        label: "PT Telekomunikasi Indonesia Tbk"
    },
    {
        value: "TLND",
        label: "Talend S.A."
    },
    {
        value: "TLP",
        label: "TransMontaigne Partners L.P. Transmontaigne Partners L.P. representing limited partner interests"
    },
    {
        value: "TLRA",
        label: "Telaria Inc."
    },
    {
        value: "TLRD",
        label: "Tailored Brands Inc."
    },
    {
        value: "TLT",
        label: "iShares 20+ Year Treasury Bond ETF"
    },
    {
        value: "TLTD",
        label: "FlexShares Morningstar Developed Markets ex-US Factor Tilt Index Fund"
    },
    {
        value: "TLTE",
        label: "FlexShares Morningstar Emerging Markets Factor Tilt Index Fund"
    },
    {
        value: "TLYS",
        label: "Tilly's Inc."
    },
    {
        value: "TM",
        label: "Toyota Motor Corporation"
    },
    {
        value: "TMCX",
        label: "TRINITY MERGER CORP-CLASS A"
    },
    {
        value: "TMCXU",
        label: "Trinity Merger Corp. Unit"
    },
    {
        value: "TMCXW",
        label: ""
    },
    {
        value: "TMF",
        label: "Direxion Daily 20-Yr Treasury Bull 3x Shrs"
    },
    {
        value: "TMFC",
        label: "Motley Fool 100 Index ETF"
    },
    {
        value: "TMHC",
        label: "Taylor Morrison Home Corporation Class A"
    },
    {
        value: "TMK",
        label: "Torchmark Corporation"
    },
    {
        value: "TMK-C",
        label: ""
    },
    {
        value: "TMO",
        label: "Thermo Fisher Scientific Inc"
    },
    {
        value: "TMP",
        label: "Tompkins Financial Corporation"
    },
    {
        value: "TMQ",
        label: "Trilogy Metals Inc."
    },
    {
        value: "TMSR",
        label: "TMSR Holding Company Limited"
    },
    {
        value: "TMST",
        label: "Timken Steel Corporation"
    },
    {
        value: "TMUS",
        label: "T-Mobile US Inc."
    },
    {
        value: "TMV",
        label: "Direxion Daily 20-Year Treasury Bear 3X"
    },
    {
        value: "TNA",
        label: "Direxion Small Cap Bull 3X Shares"
    },
    {
        value: "TNAV",
        label: "Telenav Inc."
    },
    {
        value: "TNC",
        label: "Tennant Company"
    },
    {
        value: "TNDM",
        label: "Tandem Diabetes Care Inc."
    },
    {
        value: "TNET",
        label: "TriNet Group Inc."
    },
    {
        value: "TNK",
        label: "Teekay Tankers Ltd."
    },
    {
        value: "TNP",
        label: "Tsakos Energy Navigation Ltd"
    },
    {
        value: "TNP-B",
        label: "Tsakos Energy Navigation Ltd Red Perp Pfd Ser B% (Bermuda)"
    },
    {
        value: "TNP-C",
        label: "Tsakos Energy Navigation Ltd 8.875% Series C Preferred Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "TNP-D",
        label: "Tsakos Energy Navigation Ltd 8.75% Series D Cumulative Redeemable Perpetual Preferred Shares"
    },
    {
        value: "TNP-E",
        label: "Tsakos Energy Navigation Ltd Series E Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Shares par value $1.00"
    },
    {
        value: "TNTR",
        label: "Tintri Inc."
    },
    {
        value: "TNXP",
        label: "Tonix Pharmaceuticals Holding Corp."
    },
    {
        value: "TOCA",
        label: "Tocagen Inc."
    },
    {
        value: "TOK",
        label: "iShares MSCI Kokusai"
    },
    {
        value: "TOL",
        label: "Toll Brothers Inc."
    },
    {
        value: "TOLZ",
        label: "ProShares DJ Brookfield Global Infrastructure"
    },
    {
        value: "TOO",
        label: "Teekay Offshore Partners L.P. representing Limited Partner Interests"
    },
    {
        value: "TOO-A",
        label: "Teekay Offshore Partners L.P. 7.25% Series A Redeemable Preferred Units"
    },
    {
        value: "TOO-B",
        label: "Teekay Offshore Partners L.P. 8.50% Series B Cumulative Redeemable Preferred Units representing limited partner interests"
    },
    {
        value: "TOO-E",
        label: "Teekay Offshore Partners L.P. 8.875% Series E Fixed-to-Floating Rate Cumulative Redeemable Perpetual Preferred Units"
    },
    {
        value: "TOPS",
        label: "TOP Ships Inc."
    },
    {
        value: "TORC",
        label: "resTORbio Inc."
    },
    {
        value: "TOT",
        label: "Total S.A."
    },
    {
        value: "TOTL",
        label: "SPDR DoubleLine Total Return Tactical"
    },
    {
        value: "TOUR",
        label: "Tuniu Corporation"
    },
    {
        value: "TOWN",
        label: "Towne Bank"
    },
    {
        value: "TOWR",
        label: "Tower International Inc."
    },
    {
        value: "TPB",
        label: "Turning Point Brands Inc."
    },
    {
        value: "TPC",
        label: "Tutor Perini Corporation"
    },
    {
        value: "TPGE",
        label: "TPG Pace Energy Holdings Corp. Class A"
    },
    {
        value: "TPGE+",
        label: ""
    },
    {
        value: "TPGE=",
        label: "TPG Pace Energy Holdings Corp. Units each consisting of one share of Class A common stock $.0001 par value and one-third of one warrant"
    },
    {
        value: "TPGH",
        label: "TPG Pace Holdings Corp. Class A"
    },
    {
        value: "TPGH+",
        label: ""
    },
    {
        value: "TPGH=",
        label: "TPG Pace Holdings Corp. Units each consisting of one Class A ordinary share $.0001 par value and one-third of one warrant"
    },
    {
        value: "TPH",
        label: "TRI Pointe Group Inc."
    },
    {
        value: "TPHS",
        label: "Trinity Place Holdings Inc."
    },
    {
        value: "TPIC",
        label: "TPI Composites Inc."
    },
    {
        value: "TPIV",
        label: "TapImmune Inc."
    },
    {
        value: "TPL",
        label: "Texas Pacific Land Trust"
    },
    {
        value: "TPOR",
        label: "Direxion Daily Transportation Bull 3X Shares"
    },
    {
        value: "TPR",
        label: "Tapestry Inc."
    },
    {
        value: "TPRE",
        label: "Third Point Reinsurance Ltd."
    },
    {
        value: "TPVG",
        label: "TriplePoint Venture Growth BDC Corp."
    },
    {
        value: "TPVY",
        label: "TriplePoint Venture Growth BDC Corp. 5.75% Notes due 2022"
    },
    {
        value: "TPX",
        label: "Tempur Sealy International Inc."
    },
    {
        value: "TPYP",
        label: "Tortoise North American Pipeline"
    },
    {
        value: "TPZ",
        label: "Tortoise Power and Energy Infrastructure Fund Inc"
    },
    {
        value: "TQQQ",
        label: "ProShares UltraPro QQQ"
    },
    {
        value: "TR",
        label: "Tootsie Roll Industries Inc."
    },
    {
        value: "TRC",
        label: "Tejon Ranch Co"
    },
    {
        value: "TRCB",
        label: "Two River Bancorp"
    },
    {
        value: "TRCH",
        label: "Torchlight Energy Resources Inc."
    },
    {
        value: "TRCO",
        label: "Tribune Media Company Class A"
    },
    {
        value: "TREC",
        label: "Trecora Resources"
    },
    {
        value: "TREE",
        label: "LendingTree Inc."
    },
    {
        value: "TREX",
        label: "Trex Company Inc."
    },
    {
        value: "TRGP",
        label: "Targa Resources Inc."
    },
    {
        value: "TRHC",
        label: "Tabula Rasa HealthCare Inc."
    },
    {
        value: "TRI",
        label: "Thomson Reuters Corp"
    },
    {
        value: "TRIB",
        label: "Trinity Biotech plc"
    },
    {
        value: "TRIL",
        label: "Trillium Therapeutics Inc."
    },
    {
        value: "TRIP",
        label: "TripAdvisor Inc."
    },
    {
        value: "TRK",
        label: "Speedway Motorsports Inc."
    },
    {
        value: "TRMB",
        label: "Trimble Inc."
    },
    {
        value: "TRMD",
        label: "TORM plc"
    },
    {
        value: "TRMK",
        label: "Trustmark Corporation"
    },
    {
        value: "TRMT",
        label: "Tremont Mortgage Trust"
    },
    {
        value: "TRN",
        label: "Trinity Industries Inc."
    },
    {
        value: "TRNC",
        label: "tronc Inc."
    },
    {
        value: "TRNO",
        label: "Terreno Realty Corporation"
    },
    {
        value: "TRNS",
        label: "Transcat Inc."
    },
    {
        value: "TROV",
        label: "TrovaGene Inc."
    },
    {
        value: "TROW",
        label: "T. Rowe Price Group Inc."
    },
    {
        value: "TROX",
        label: "Tronox Limited Class A $0.01 par"
    },
    {
        value: "TRP",
        label: "TransCanada Corporation"
    },
    {
        value: "TRPX",
        label: "Therapix Biosciences Ltd."
    },
    {
        value: "TRQ",
        label: "Turquoise Hill Resources Ltd."
    },
    {
        value: "TRS",
        label: "TriMas Corporation"
    },
    {
        value: "TRST",
        label: "TrustCo Bank Corp NY"
    },
    {
        value: "TRT",
        label: "Trio-Tech International"
    },
    {
        value: "TRTN",
        label: "Triton International Limited"
    },
    {
        value: "TRTX",
        label: "TPG RE Finance Trust Inc."
    },
    {
        value: "TRU",
        label: "TransUnion"
    },
    {
        value: "TRUE",
        label: "TrueCar Inc."
    },
    {
        value: "TRUP",
        label: "Trupanion Inc."
    },
    {
        value: "TRV",
        label: "The Travelers Companies Inc."
    },
    {
        value: "TRVG",
        label: "trivago N.V."
    },
    {
        value: "TRVN",
        label: "Trevena Inc."
    },
    {
        value: "TRX",
        label: "Tanzanian Royalty Exploration Corporation"
    },
    {
        value: "TRXC",
        label: "TransEnterix Inc."
    },
    {
        value: "TS",
        label: "Tenaris S.A. American Depositary Shares"
    },
    {
        value: "TSBK",
        label: "Timberland Bancorp Inc."
    },
    {
        value: "TSC",
        label: "TriState Capital Holdings Inc."
    },
    {
        value: "TSCAP",
        label: "TriState Capital Holdings Inc. Dep Shs Rep 1/40th Int 6.75% Srs A Non-Cum Pfd"
    },
    {
        value: "TSCO",
        label: "Tractor Supply Company"
    },
    {
        value: "TSE",
        label: "Trinseo S.A."
    },
    {
        value: "TSEM",
        label: "Tower Semiconductor Ltd."
    },
    {
        value: "TSG",
        label: "The Stars Group Inc."
    },
    {
        value: "TSI",
        label: "TCW Strategic Income Fund Inc."
    },
    {
        value: "TSLA",
        label: "Tesla Inc."
    },
    {
        value: "TSLF",
        label: "THL Credit Senior Loan Fund of Beneficial Interest"
    },
    {
        value: "TSLX",
        label: "TPG Specialty Lending Inc."
    },
    {
        value: "TSM",
        label: "Taiwan Semiconductor Manufacturing Company Ltd."
    },
    {
        value: "TSN",
        label: "Tyson Foods Inc."
    },
    {
        value: "TSQ",
        label: "Townsquare Media Inc. Class A"
    },
    {
        value: "TSRI",
        label: "TSR Inc."
    },
    {
        value: "TSRO",
        label: "TESARO Inc."
    },
    {
        value: "TSS",
        label: "Total System Services Inc."
    },
    {
        value: "TST",
        label: "TheStreet Inc."
    },
    {
        value: "TSU",
        label: "TIM Participacoes S.A. American Depositary Shares (Each representing 5)"
    },
    {
        value: "TTAC",
        label: "TrimTabs All Cap U.S. Free-Cash-Flow"
    },
    {
        value: "TTAI",
        label: "TRIMTABS ETF TRUST"
    },
    {
        value: "TTC",
        label: "Toro Company (The)"
    },
    {
        value: "TTD",
        label: "The Trade Desk Inc."
    },
    {
        value: "TTEC",
        label: "TTEC Holdings Inc."
    },
    {
        value: "TTEK",
        label: "Tetra Tech Inc."
    },
    {
        value: "TTFS",
        label: "AdvisorShares Wilshire Buyback"
    },
    {
        value: "TTGT",
        label: "TechTarget Inc."
    },
    {
        value: "TTI",
        label: "Tetra Technologies Inc."
    },
    {
        value: "TTM",
        label: "Tata Motors Ltd Limited"
    },
    {
        value: "TTMI",
        label: "TTM Technologies Inc."
    },
    {
        value: "TTNP",
        label: "Titan Pharmaceuticals Inc."
    },
    {
        value: "TTOO",
        label: "T2 Biosystems Inc."
    },
    {
        value: "TTP",
        label: "Tortoise Pipeline & Energy Fund Inc."
    },
    {
        value: "TTPH",
        label: "Tetraphase Pharmaceuticals Inc."
    },
    {
        value: "TTS",
        label: "Tile Shop Hldgs Inc."
    },
    {
        value: "TTT",
        label: "ProShares UltraPro Short 20 Year Treasury"
    },
    {
        value: "TTWO",
        label: "Take-Two Interactive Software Inc."
    },
    {
        value: "TU",
        label: "Telus Corporation"
    },
    {
        value: "TUES",
        label: "Tuesday Morning Corp."
    },
    {
        value: "TUP",
        label: "Tupperware Brands Corporation"
    },
    {
        value: "TUR",
        label: "iShares MSCI Turkey ETF"
    },
    {
        value: "TURN",
        label: "180 Degree Capital Corp."
    },
    {
        value: "TUSA",
        label: "First Trust Total US Market AlphaDEX ETF"
    },
    {
        value: "TUSK",
        label: "Mammoth Energy Services Inc."
    },
    {
        value: "TUZ",
        label: "PIMCO 1-3 Year US Treasury Index Exchage-Traded Fund"
    },
    {
        value: "TV",
        label: "Grupo Televisa S.A."
    },
    {
        value: "TVC",
        label: "Tennessee Valley Authority"
    },
    {
        value: "TVE",
        label: "Tennessee Valley Authority"
    },
    {
        value: "TVIX",
        label: "VelocityShares Daily 2x VIX Short Term ETN"
    },
    {
        value: "TVIZ",
        label: "VelocityShares Daily 2x VIX Medium Term ETN"
    },
    {
        value: "TVPT",
        label: "Travelport Worldwide Limited"
    },
    {
        value: "TVTY",
        label: "Tivity Health Inc."
    },
    {
        value: "TWI",
        label: "Titan International Inc. (DE)"
    },
    {
        value: "TWIN",
        label: "Twin Disc Incorporated"
    },
    {
        value: "TWLO",
        label: "Twilio Inc. Class A"
    },
    {
        value: "TWM",
        label: "ProShares UltraShort Russell2000"
    },
    {
        value: "TWMC",
        label: "Trans World Entertainment Corp."
    },
    {
        value: "TWN",
        label: "Taiwan Fund Inc. (The)"
    },
    {
        value: "TWNK",
        label: "Hostess Brands Inc."
    },
    {
        value: "TWNKW",
        label: ""
    },
    {
        value: "TWO",
        label: "Two Harbors Investment Corp"
    },
    {
        value: "TWO-A",
        label: "Two Harbors Investments Corp 8.125% Series A Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock ($25.00 liquidation preference per share)"
    },
    {
        value: "TWO-B",
        label: "Two Harbors Investments Corp 7.625% Series B Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock"
    },
    {
        value: "TWO-C",
        label: "Two Harbors Investments Corp 7.25% Series C Fixed-to-Floating Rate Cumulative Redeemable Preferred Stock"
    },
    {
        value: "TWOU",
        label: "2U Inc."
    },
    {
        value: "TWTR",
        label: "Twitter Inc."
    },
    {
        value: "TWX",
        label: "Time Warner Inc."
    },
    {
        value: "TX",
        label: "Ternium S.A. American Depositary Shares (each representing ten shares USD1.00 par value)"
    },
    {
        value: "TXMD",
        label: "TherapeuticsMD Inc."
    },
    {
        value: "TXN",
        label: "Texas Instruments Incorporated"
    },
    {
        value: "TXRH",
        label: "Texas Roadhouse Inc."
    },
    {
        value: "TXT",
        label: "Textron Inc."
    },
    {
        value: "TY",
        label: "Tri Continental Corporation"
    },
    {
        value: "TY-",
        label: ""
    },
    {
        value: "TYBS",
        label: "Direxion Daily 20 Year Treasury Bear 1X Shares"
    },
    {
        value: "TYD",
        label: "Direxion Daily 10-Yr Treasury Bull 3x Shrs"
    },
    {
        value: "TYG",
        label: "Tortoise Energy Infrastructure Corporation"
    },
    {
        value: "TYHT",
        label: "Shineco Inc."
    },
    {
        value: "TYL",
        label: "Tyler Technologies Inc."
    },
    {
        value: "TYME",
        label: "Tyme Technologies Inc."
    },
    {
        value: "TYNS",
        label: "Direxion Daily 7 10 Year Treasury Bear 1X Shares"
    },
    {
        value: "TYO",
        label: "Direxion Daily 10-Yr Treasury Bear 3x Shrs"
    },
    {
        value: "TYPE",
        label: "Monotype Imaging Holdings Inc."
    },
    {
        value: "TZA",
        label: "Direxion Small Cap Bear 3X Shares"
    },
    {
        value: "TZOO",
        label: "Travelzoo"
    },
    {
        value: "UA",
        label: "Under Armour Inc. Class C"
    },
    {
        value: "UAA",
        label: "Under Armour Inc. Class A"
    },
    {
        value: "UAE",
        label: "iShares MSCI UAE ETF"
    },
    {
        value: "UAG",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Agriculture ETN"
    },
    {
        value: "UAL",
        label: "United Continental Holdings"
    },
    {
        value: "UAMY",
        label: "United States Antimony Corporation"
    },
    {
        value: "UAN",
        label: "CVR Partners LP representing Limited Partner Interests"
    },
    {
        value: "UAUD",
        label: "ETNs linked to the VelocityShares Daily 4X Long AUD vs. USD Index"
    },
    {
        value: "UAVS",
        label: "AgEagle Aerial Systems Inc."
    },
    {
        value: "UBA",
        label: "Urstadt Biddle Properties Inc."
    },
    {
        value: "UBC",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Livestock ETN"
    },
    {
        value: "UBCP",
        label: "United Bancorp Inc."
    },
    {
        value: "UBFO",
        label: "United Security Bancshares"
    },
    {
        value: "UBG",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Gold ETN"
    },
    {
        value: "UBIO",
        label: "Proshares UltraPro Nasdaq Biotechnology"
    },
    {
        value: "UBM",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Industrial ETN"
    },
    {
        value: "UBN",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Energy ETN"
    },
    {
        value: "UBNK",
        label: "United Financial Bancorp Inc."
    },
    {
        value: "UBNT",
        label: "Ubiquiti Networks Inc."
    },
    {
        value: "UBOH",
        label: "United Bancshares Inc."
    },
    {
        value: "UBOT",
        label: "Direxion Daily Robotics Artificial Intelligence & Automation Index Bull 3X Shares"
    },
    {
        value: "UBP",
        label: "Urstadt Biddle Properties Inc."
    },
    {
        value: "UBP-G",
        label: "Urstadt Biddle Properties Inc. Preferred Stock Series G 6.75%"
    },
    {
        value: "UBP-H",
        label: "Urstadt Biddle Properties Inc. 6.250% Series H Cumulative Redeemable Preferred Stock"
    },
    {
        value: "UBR",
        label: "ProShares Ultra MSCI Brazil Capped"
    },
    {
        value: "UBRT",
        label: "Credit Suisse AxelaTrader 3x Long Brent Crude Oil ETN"
    },
    {
        value: "UBS",
        label: "UBS Group AG Registered"
    },
    {
        value: "UBSH",
        label: "Union Bankshares Corporation"
    },
    {
        value: "UBSI",
        label: "United Bankshares Inc."
    },
    {
        value: "UBT",
        label: "ProShares Ultra 20+ Year Treasury"
    },
    {
        value: "UBX",
        label: "Unity Biotechnology Inc."
    },
    {
        value: "UCBA",
        label: "United Community Bancorp"
    },
    {
        value: "UCBI",
        label: "United Community Banks Inc."
    },
    {
        value: "UCC",
        label: "ProShares Ultra Consumer Services"
    },
    {
        value: "UCFC",
        label: "United Community Financial Corp."
    },
    {
        value: "UCHF",
        label: "ETNs linked to the VelocityShares Daily 4X Long CHF vs. USD Index"
    },
    {
        value: "UCI",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI ETN"
    },
    {
        value: "UCIB",
        label: "ETRACS UBS Bloomberg Constant Maturity Commodity Index (CMCI) Total Return ETN Series B due April 5 2038"
    },
    {
        value: "UCO",
        label: "ProShares Ultra Bloomberg Crude Oil"
    },
    {
        value: "UCON",
        label: "FIRST TRUST TCW UNCONSTRAINE"
    },
    {
        value: "UCTT",
        label: "Ultra Clean Holdings Inc."
    },
    {
        value: "UDBI",
        label: "Legg Mason US Diversified Core ETF"
    },
    {
        value: "UDN",
        label: "Invesco DB USD Index Bearish"
    },
    {
        value: "UDOW",
        label: "ProShares UltraPro Dow30"
    },
    {
        value: "UDR",
        label: "UDR Inc."
    },
    {
        value: "UE",
        label: "Urban Edge Properties of Beneficial Interest"
    },
    {
        value: "UEC",
        label: "Uranium Energy Corp."
    },
    {
        value: "UEIC",
        label: "Universal Electronics Inc."
    },
    {
        value: "UEPS",
        label: "Net 1 UEPS Technologies Inc."
    },
    {
        value: "UEUR",
        label: "ETNs linked to the VelocityShares Daily 4X Long EUR vs. USD Index"
    },
    {
        value: "UEVM",
        label: "USAA MSCI Emerging Markets Value Momentum Blend Index"
    },
    {
        value: "UFAB",
        label: "Unique Fabricating Inc."
    },
    {
        value: "UFCS",
        label: "United Fire Group Inc"
    },
    {
        value: "UFI",
        label: "Unifi Inc."
    },
    {
        value: "UFPI",
        label: "Universal Forest Products Inc."
    },
    {
        value: "UFPT",
        label: "UFP Technologies Inc."
    },
    {
        value: "UFS",
        label: "Domtar Corporation (NEW)"
    },
    {
        value: "UG",
        label: "United-Guardian Inc."
    },
    {
        value: "UGA",
        label: "United States Gasoline Fund LP"
    },
    {
        value: "UGAZ",
        label: "VelocityShares 3X Long Natural Gas ETN linked to the S&P GSCI Natural Gas Index Excess Return"
    },
    {
        value: "UGBP",
        label: "ETNs linked to the VelocityShares Daily 4X Long GBP vs. USD Index"
    },
    {
        value: "UGE",
        label: "ProShares Ultra Consumer Goods"
    },
    {
        value: "UGI",
        label: "UGI Corporation"
    },
    {
        value: "UGL",
        label: "ProShares Ultra Gold"
    },
    {
        value: "UGLD",
        label: "VelocityShares 3x Long Gold ETN"
    },
    {
        value: "UGP",
        label: "Ultrapar Participacoes S.A. (New) American Depositary Shares (Each representing one)"
    },
    {
        value: "UHAL",
        label: "Amerco"
    },
    {
        value: "UHN",
        label: "United States Diesel Heating Oil Fund LP"
    },
    {
        value: "UHS",
        label: "Universal Health Services Inc."
    },
    {
        value: "UHT",
        label: "Universal Health Realty Income Trust"
    },
    {
        value: "UIHC",
        label: "United Insurance Holdings Corp."
    },
    {
        value: "UIS",
        label: "Unisys Corporation"
    },
    {
        value: "UITB",
        label: "USAA Core Intermediate-Term Bond"
    },
    {
        value: "UIVM",
        label: "USAA MSCI International Value Momentum Blend Index"
    },
    {
        value: "UJB",
        label: "ProShares Ultra High Yield"
    },
    {
        value: "UJPY",
        label: "ETNs linked to the VelocityShares Daily 4X Long JPY vs. USD Index"
    },
    {
        value: "UL",
        label: "Unilever PLC"
    },
    {
        value: "ULBI",
        label: "Ultralife Corporation"
    },
    {
        value: "ULBR",
        label: "Citigroup Global Markets Holdings Inc VelocityShares Long LIBOR ETN"
    },
    {
        value: "ULE",
        label: "ProShares Ultra Euro"
    },
    {
        value: "ULH",
        label: "Universal Logistics Holdings Inc."
    },
    {
        value: "ULST",
        label: "SPDR SSgA Ultra Short Term Bond"
    },
    {
        value: "ULTA",
        label: "Ulta Beauty Inc."
    },
    {
        value: "ULTI",
        label: "The Ultimate Software Group Inc."
    },
    {
        value: "ULVM",
        label: "USAA MSCI USA Value Momentum Blend Index"
    },
    {
        value: "UMBF",
        label: "UMB Financial Corporation"
    },
    {
        value: "UMC",
        label: "United Microelectronics Corporation (NEW)"
    },
    {
        value: "UMDD",
        label: "UltraPro MidCap400"
    },
    {
        value: "UMH",
        label: "UMH Properties Inc."
    },
    {
        value: "UMH-B",
        label: "UMH Properties Inc. 8.0% Series B Cumulative Redeemable Preferred Stock"
    },
    {
        value: "UMH-C",
        label: "UMH Properties Inc. 6.75% Series C Cumulative Redeemable Preferred Stock Liquidation Preference $25 per share"
    },
    {
        value: "UMH-D",
        label: "UMH Properties Inc. 6.375% Series D Cumulative Redeemable Preferred Stock Liquidation Preference $25 per share"
    },
    {
        value: "UMPQ",
        label: "Umpqua Holdings Corporation"
    },
    {
        value: "UMRX",
        label: "Unum Therapeutics Inc."
    },
    {
        value: "UN",
        label: "Unilever NV"
    },
    {
        value: "UNAM",
        label: "Unico American Corporation"
    },
    {
        value: "UNB",
        label: "Union Bankshares Inc."
    },
    {
        value: "UNF",
        label: "Unifirst Corporation"
    },
    {
        value: "UNFI",
        label: "United Natural Foods Inc."
    },
    {
        value: "UNG",
        label: "United States Natural Gas Fund LP"
    },
    {
        value: "UNH",
        label: "UnitedHealth Group Incorporated (DE)"
    },
    {
        value: "UNIT",
        label: "Uniti Group Inc."
    },
    {
        value: "UNL",
        label: "United States 12 Month Natural Gas Fund"
    },
    {
        value: "UNM",
        label: "Unum Group"
    },
    {
        value: "UNP",
        label: "Union Pacific Corporation"
    },
    {
        value: "UNT",
        label: "Unit Corporation"
    },
    {
        value: "UNTY",
        label: "Unity Bancorp Inc."
    },
    {
        value: "UNVR",
        label: "Univar Inc."
    },
    {
        value: "UONE",
        label: "Urban One Inc."
    },
    {
        value: "UONEK",
        label: "Urban One Inc."
    },
    {
        value: "UPL",
        label: "Ultra Petroleum Corp."
    },
    {
        value: "UPLD",
        label: "Upland Software Inc."
    },
    {
        value: "UPRO",
        label: "ProShares UltraPro S&P 500"
    },
    {
        value: "UPS",
        label: "United Parcel Service Inc."
    },
    {
        value: "UPV",
        label: "ProShares Ultra FTSE Europe"
    },
    {
        value: "UPW",
        label: "ProShares Ultra Utilities"
    },
    {
        value: "UQM",
        label: "UQM Technologies Inc"
    },
    {
        value: "URA",
        label: "Global X Uranium"
    },
    {
        value: "URBN",
        label: "Urban Outfitters Inc."
    },
    {
        value: "URE",
        label: "ProShares Ultra Real Estate"
    },
    {
        value: "URG",
        label: "Ur-Energy Inc (Canada)"
    },
    {
        value: "URGN",
        label: "UroGen Pharma Ltd."
    },
    {
        value: "URI",
        label: "United Rentals Inc."
    },
    {
        value: "URR",
        label: "Market Vectors Double Long Euro ETN"
    },
    {
        value: "URTH",
        label: "Ishares MSCI World Index Fund"
    },
    {
        value: "URTY",
        label: "ProShares UltraPro Russell2000"
    },
    {
        value: "USA",
        label: "Liberty All-Star Equity Fund"
    },
    {
        value: "USAC",
        label: "USA Compression Partners LP Representing Limited Partner Interests"
    },
    {
        value: "USAG",
        label: "United States Agriculture Index Fund ETV"
    },
    {
        value: "USAI",
        label: "American Energy Independence"
    },
    {
        value: "USAK",
        label: "USA Truck Inc."
    },
    {
        value: "USAP",
        label: "Universal Stainless & Alloy Products Inc."
    },
    {
        value: "USAS",
        label: "Americas Silver Corporation no par value"
    },
    {
        value: "USAT",
        label: "USA Technologies Inc."
    },
    {
        value: "USATP",
        label: "USA Technologies Inc. Preferred Stock"
    },
    {
        value: "USAU",
        label: "U.S. Gold Corp."
    },
    {
        value: "USB",
        label: "U.S. Bancorp"
    },
    {
        value: "USB-A",
        label: "U.S. Bancorp Depositary Shares Series A"
    },
    {
        value: "USB-H",
        label: "U.S. Bancorp Depositary Shares repstg 1/1000th Pfd Ser B"
    },
    {
        value: "USB-M",
        label: "U.S. Bancorp Depositary Shares Series F"
    },
    {
        value: "USB-O",
        label: "US Bancorp Del Dep Shs Repstg 1/1000th Perp Pfd Ser H"
    },
    {
        value: "USCI",
        label: "United States Commodity Index Fund ETV"
    },
    {
        value: "USCR",
        label: "U S Concrete Inc."
    },
    {
        value: "USD",
        label: "ProShares Ultra Semiconductors"
    },
    {
        value: "USDP",
        label: "USD Partners LP representing limited partner interest"
    },
    {
        value: "USDU",
        label: "WisdomTree Bloomberg U.S. Dollar Bullish Fund"
    },
    {
        value: "USDY",
        label: "Horizons Cadence Hedged US Dividend Yield"
    },
    {
        value: "USEG",
        label: "U.S. Energy Corp."
    },
    {
        value: "USEQ",
        label: "Invesco Russell 1000 Enhanced Equal Weight"
    },
    {
        value: "USFD",
        label: "US Foods Holding Corp."
    },
    {
        value: "USFR",
        label: "WisdomTree Bloomberg Floating Rate Treasury Fund"
    },
    {
        value: "USG",
        label: "USG Corporation"
    },
    {
        value: "USHY",
        label: "iShares Broad USD High Yield Corporate Bond"
    },
    {
        value: "USL",
        label: "United States 12 Month Oil"
    },
    {
        value: "USLB",
        label: "Invesco Russell 1000 Low Beta Equal Weight ETF"
    },
    {
        value: "USLM",
        label: "United States Lime & Minerals Inc."
    },
    {
        value: "USLV",
        label: "VelocityShares 3x Long Silver ETN"
    },
    {
        value: "USM",
        label: "United States Cellular Corporation"
    },
    {
        value: "USMC",
        label: "Principal U.S. Mega-Cap Multi-Factor Index ETF"
    },
    {
        value: "USMF",
        label: "WisdomTree U.S. Multifactor Fund"
    },
    {
        value: "USMV",
        label: "iShares Edge MSCI Min Vol USA"
    },
    {
        value: "USNA",
        label: "USANA Health Sciences Inc."
    },
    {
        value: "USO",
        label: "United States Oil Fund"
    },
    {
        value: "USOD",
        label: "United States 3x Short Oil Fund"
    },
    {
        value: "USOI",
        label: "Credit Suisse X-Links Crude Oil Call ETN IOPV"
    },
    {
        value: "USOU",
        label: "United States 3x Oil Fund"
    },
    {
        value: "USPH",
        label: "U.S. Physical Therapy Inc."
    },
    {
        value: "USRT",
        label: "iShares Core U.S. REIT"
    },
    {
        value: "UST",
        label: "ProShares Ultra 7-10 Year Treasury"
    },
    {
        value: "USTB",
        label: "USAA Core Short-Term Bond"
    },
    {
        value: "USV",
        label: "E-TRACS USB Bloomberg Commodity Index Exchange Traded Notes UBS Bloomberg CMCI Silver ETN"
    },
    {
        value: "USVM",
        label: "USAA MSCI USA Small Cap Value Momentum Blend Index"
    },
    {
        value: "UTES",
        label: "ETFIS Series Trust I Reaves Utilities"
    },
    {
        value: "UTF",
        label: "Cohen & Steers Infrastructure Fund Inc"
    },
    {
        value: "UTG",
        label: "Reaves Utility Income Fund of Beneficial Interest"
    },
    {
        value: "UTHR",
        label: "United Therapeutics Corporation"
    },
    {
        value: "UTI",
        label: "Universal Technical Institute Inc"
    },
    {
        value: "UTL",
        label: "UNITIL Corporation"
    },
    {
        value: "UTLF",
        label: "iShares Edge MSCI Multifactor Utilities"
    },
    {
        value: "UTMD",
        label: "Utah Medical Products Inc."
    },
    {
        value: "UTSI",
        label: "UTStarcom Holdings Corp"
    },
    {
        value: "UTSL",
        label: "Direxion Daily Utilities Bull 3X Shares"
    },
    {
        value: "UTX",
        label: "United Technologies Corporation"
    },
    {
        value: "UUP",
        label: "Invesco DB USD Index Bullish Fund"
    },
    {
        value: "UUU",
        label: "Universal Security Instruments Inc."
    },
    {
        value: "UUUU",
        label: "Energy Fuels Inc (Canada)"
    },
    {
        value: "UUUU+",
        label: ""
    },
    {
        value: "UVE",
        label: "UNIVERSAL INSURANCE HOLDINGS INC"
    },
    {
        value: "UVSP",
        label: "Univest Corporation of Pennsylvania"
    },
    {
        value: "UVV",
        label: "Universal Corporation"
    },
    {
        value: "UVXY",
        label: "ProShares Trust Ultra VIX Short Term Futures"
    },
    {
        value: "UWM",
        label: "ProShares Ultra Russell2000"
    },
    {
        value: "UWN",
        label: "Nevada Gold & Casinos Inc."
    },
    {
        value: "UWT",
        label: "VelocityShares 3x Long Crude Oil ETNs linked to the S&P GSCI Crude Oil Index ER"
    },
    {
        value: "UXI",
        label: "ProShares Ultra Industrials"
    },
    {
        value: "UYG",
        label: "ProShares Ultra Financials"
    },
    {
        value: "UYM",
        label: "ProShares Ultra Basic Materials"
    },
    {
        value: "UZA",
        label: "United States Cellular Corporation 6.95% Senior Notes due 2060"
    },
    {
        value: "UZB",
        label: ""
    },
    {
        value: "UZC",
        label: "United States Cellular Corporation 7.25% Senior Notes due 2064"
    },
    {
        value: "V",
        label: "Visa Inc."
    },
    {
        value: "VAC",
        label: "Marriot Vacations Worldwide Corporation"
    },
    {
        value: "VALE",
        label: "VALE S.A. American Depositary Shares Each Representing one"
    },
    {
        value: "VALQ",
        label: "American Century STOXX U.S. Quality Value"
    },
    {
        value: "VALU",
        label: "Value Line Inc."
    },
    {
        value: "VALX",
        label: "Validea Market Legends ETF"
    },
    {
        value: "VAM",
        label: "The Vivaldi Opportunities Fund"
    },
    {
        value: "VAMO",
        label: "Cambria ETF Trust Value and Momentum"
    },
    {
        value: "VAR",
        label: "Varian Medical Systems Inc."
    },
    {
        value: "VAW",
        label: "Vanguard Materials"
    },
    {
        value: "VB",
        label: "Vanguard Small-Cap"
    },
    {
        value: "VBF",
        label: "Invesco Bond Fund"
    },
    {
        value: "VBFC",
        label: "Village Bank and Trust Financial Corp."
    },
    {
        value: "VBIV",
        label: "VBI Vaccines Inc."
    },
    {
        value: "VBK",
        label: "Vanguard Small-Cap Growth"
    },
    {
        value: "VBLT",
        label: "Vascular Biogenics Ltd."
    },
    {
        value: "VBND",
        label: "ETF Series Solutions Trust Vident Core U.S. Bond Strategy Fund"
    },
    {
        value: "VBR",
        label: "Vanguard Small-Cap Value"
    },
    {
        value: "VBTX",
        label: "Veritex Holdings Inc."
    },
    {
        value: "VC",
        label: "Visteon Corporation"
    },
    {
        value: "VCEL",
        label: "Vericel Corporation"
    },
    {
        value: "VCF",
        label: "Delaware Investments Colorado Municipal Income Fund Inc"
    },
    {
        value: "VCIT",
        label: "Vanguard Intermediate-Term Corporate Bond ETF"
    },
    {
        value: "VCLT",
        label: "Vanguard Long-Term Corporate Bond ETF"
    },
    {
        value: "VCO",
        label: "Vina Concha Y Toro"
    },
    {
        value: "VCR",
        label: "Vanguard Consumer Discretion"
    },
    {
        value: "VCRA",
        label: "Vocera Communications Inc."
    },
    {
        value: "VCSH",
        label: "Vanguard Short-Term Corporate Bond ETF"
    },
    {
        value: "VCTR",
        label: "Victory Capital Holdings Inc."
    },
    {
        value: "VCV",
        label: "Invesco California Value Municipal Income Trust"
    },
    {
        value: "VCYT",
        label: "Veracyte Inc."
    },
    {
        value: "VDC",
        label: "Vanguard Consumer Staples"
    },
    {
        value: "VDE",
        label: "Vanguard Energy"
    },
    {
        value: "VEA",
        label: "Vanguard FTSE Developed Markets"
    },
    {
        value: "VEAC",
        label: "Vantage Energy Acquisition Corp."
    },
    {
        value: "VEACU",
        label: "Vantage Energy Acquisition Corp. Unit"
    },
    {
        value: "VEACW",
        label: "Vantage Energy Acquisition Corp. Warrant"
    },
    {
        value: "VEC",
        label: "Vectrus Inc."
    },
    {
        value: "VECO",
        label: "Veeco Instruments Inc."
    },
    {
        value: "VEDL",
        label: "Vedanta Limited American Depositary Shares (Each representing four equity shares)"
    },
    {
        value: "VEEV",
        label: "Veeva Systems Inc. Class A"
    },
    {
        value: "VEGA",
        label: "AdvisorShares STAR Global Buy-Write"
    },
    {
        value: "VEGI",
        label: "iShares MSCI Agriculture Producers Fund"
    },
    {
        value: "VEON",
        label: "VEON Ltd."
    },
    {
        value: "VER",
        label: "VEREIT Inc."
    },
    {
        value: "VER-F",
        label: "VEREIT Inc. 6.70% Series F Cumulative Redeemable Preferred Stock"
    },
    {
        value: "VERI",
        label: "Veritone Inc."
    },
    {
        value: "VERU",
        label: "Veru Inc."
    },
    {
        value: "VESH",
        label: "Virtus Enhanced Short U.S. Equity"
    },
    {
        value: "VET",
        label: "Vermilion Energy Inc. Common (Canada)"
    },
    {
        value: "VETS",
        label: "Pacer Military Times Best Employers ETF"
    },
    {
        value: "VEU",
        label: "Vanguard FTSE All World Ex US"
    },
    {
        value: "VFC",
        label: "V.F. Corporation"
    },
    {
        value: "VFH",
        label: "Vanguard Financials"
    },
    {
        value: "VFL",
        label: "Delaware Investments National Municipal Income Fund"
    },
    {
        value: "VFLQ",
        label: "Vanguard U.S. Liquidity Factor"
    },
    {
        value: "VFMF",
        label: "Vanguard U.S. Multifactor"
    },
    {
        value: "VFMO",
        label: "Vanguard U.S. Momentum Factor"
    },
    {
        value: "VFMV",
        label: "Vanguard U.S. Minimum Volatility"
    },
    {
        value: "VFQY",
        label: "Vanguard U.S. Quality Factor"
    },
    {
        value: "VFVA",
        label: "Vanguard U.S. Value Factor"
    },
    {
        value: "VG",
        label: "Vonage Holdings Corp."
    },
    {
        value: "VGFO",
        label: "Virtus WMC Global Factor Opportunities"
    },
    {
        value: "VGI",
        label: "Virtus Global Multi-Sector Income Fund of Beneficial Interest"
    },
    {
        value: "VGIT",
        label: "Vanguard Intermediate-Term Treasury ETF"
    },
    {
        value: "VGK",
        label: "Vanguard FTSEEuropean"
    },
    {
        value: "VGLT",
        label: "Vanguard Long-Treasury ETF"
    },
    {
        value: "VGM",
        label: "Invesco Trust for Investment Grade Municipals (DE)"
    },
    {
        value: "VGR",
        label: "Vector Group Ltd."
    },
    {
        value: "VGSH",
        label: "Vanguard Short-Term Treasury ETF"
    },
    {
        value: "VGT",
        label: "Vanguard Information Tech"
    },
    {
        value: "VGZ",
        label: "Vista Gold Corp"
    },
    {
        value: "VHC",
        label: "VirnetX Holding Corp"
    },
    {
        value: "VHI",
        label: "Valhi Inc."
    },
    {
        value: "VHT",
        label: "Vanguard Health Care"
    },
    {
        value: "VIA",
        label: "Viacom Inc."
    },
    {
        value: "VIAB",
        label: "Viacom Inc."
    },
    {
        value: "VIAV",
        label: "Viavi Solutions Inc."
    },
    {
        value: "VICI",
        label: "VICI Properties Inc."
    },
    {
        value: "VICL",
        label: "Vical Incorporated"
    },
    {
        value: "VICR",
        label: "Vicor Corporation"
    },
    {
        value: "VIDI",
        label: "ETF Series Solutions Trust Vident International Equity Fund"
    },
    {
        value: "VIG",
        label: "Vanguard Div Appreciation"
    },
    {
        value: "VIGI",
        label: "Vanguard International Dividend Appreciation ETF"
    },
    {
        value: "VII",
        label: "Vicon Industries Inc"
    },
    {
        value: "VIIX",
        label: "VelocityShares VIX Short Term ETN"
    },
    {
        value: "VIIZ",
        label: "VelocityShares VIX Medium Term ETN"
    },
    {
        value: "VIOG",
        label: "Vanguard S&P Small-Cap 600 Growth"
    },
    {
        value: "VIOO",
        label: "Vanguard S&P Small-Cap 600"
    },
    {
        value: "VIOV",
        label: "Vanguard S&P Small-Cap 600 Value"
    },
    {
        value: "VIPS",
        label: "Vipshop Holdings Limited American Depositary Shares each representing two"
    },
    {
        value: "VIRC",
        label: "Virco Manufacturing Corporation"
    },
    {
        value: "VIRT",
        label: "Virtu Financial Inc."
    },
    {
        value: "VIS",
        label: "Vanguard Industrials"
    },
    {
        value: "VISI",
        label: "Volt Information Sciences Inc."
    },
    {
        value: "VIV",
        label: "Telefonica Brasil S.A. ADS"
    },
    {
        value: "VIVE",
        label: "Viveve Medical Inc."
    },
    {
        value: "VIVO",
        label: "Meridian Bioscience Inc."
    },
    {
        value: "VIXM",
        label: "ProShares Trust VIX Mid-Term Futures"
    },
    {
        value: "VIXY",
        label: "ProShares Trust VIX Short-Term Futures"
    },
    {
        value: "VJET",
        label: "voxeljet AG American Depositary Shares each representing one-fifth of an/"
    },
    {
        value: "VKI",
        label: "Invesco Advantage Municipal Income Trust II of Beneficial Interest (DE)"
    },
    {
        value: "VKQ",
        label: "Invesco Municipal Trust"
    },
    {
        value: "VKTX",
        label: "Viking Therapeutics Inc."
    },
    {
        value: "VKTXW",
        label: ""
    },
    {
        value: "VLGEA",
        label: "Village Super Market Inc. Class A Common Stock"
    },
    {
        value: "VLO",
        label: "Valero Energy Corporation"
    },
    {
        value: "VLP",
        label: "Valero Energy Partners LP representing limited partner interests"
    },
    {
        value: "VLRS",
        label: "Controladora Vuela Compania de Aviacion S.A.B. de C.V. American Depositary Shares each representing ten (10) Ordinary Participation Certificates"
    },
    {
        value: "VLRX",
        label: "Valeritas Holdings Inc."
    },
    {
        value: "VLT",
        label: "Invesco High Income Trust II"
    },
    {
        value: "VLU",
        label: "SPDR S&P 1500 Value Tilt"
    },
    {
        value: "VLUE",
        label: "iShares Edge MSCI USA Value Factor"
    },
    {
        value: "VLY",
        label: "Valley National Bancorp"
    },
    {
        value: "VLY+",
        label: "Valley National Bancorp Warrants Expiring 11/14/2018"
    },
    {
        value: "VLY-A",
        label: "Valley National Bancorp 6.25% Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series A no par value per share"
    },
    {
        value: "VLY-B",
        label: "Valley National Bancorp 5.50% Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series B"
    },
    {
        value: "VMAX",
        label: "REX VolMAXX Long VIX Futures Strategy"
    },
    {
        value: "VMBS",
        label: "Vanguard Mortgage-Backed Securities ETF"
    },
    {
        value: "VMC",
        label: "Vulcan Materials Company (Holding Company)"
    },
    {
        value: "VMI",
        label: "Valmont Industries Inc."
    },
    {
        value: "VMIN",
        label: "REX VolMAXX Short VIX Futures Strategy"
    },
    {
        value: "VMM",
        label: "Delaware Investments Minnesota Municipal Income Fund II Inc."
    },
    {
        value: "VMO",
        label: "Invesco Municipal Opportunity Trust"
    },
    {
        value: "VMOT",
        label: "Alpha Architect Value Momentum Trend"
    },
    {
        value: "VMW",
        label: "Vmware Inc. Class A"
    },
    {
        value: "VNCE",
        label: "Vince Holding Corp."
    },
    {
        value: "VNDA",
        label: "Vanda Pharmaceuticals Inc."
    },
    {
        value: "VNET",
        label: "21Vianet Group Inc."
    },
    {
        value: "VNLA",
        label: "Janus Henderson Short Duration Income"
    },
    {
        value: "VNM",
        label: "VanEck Vectors Vietnam"
    },
    {
        value: "VNO",
        label: "Vornado Realty Trust"
    },
    {
        value: "VNO-K",
        label: "Vornado Realty Trust Pfd S K"
    },
    {
        value: "VNO-L",
        label: "Vornado Realty Trust Pfd Ser L %"
    },
    {
        value: "VNO-M",
        label: "Vornado Realty Trust 5.25% Series M Cumulative Redeemable Preferred Shares of Beneficial Interest liquidation preference $25.00 per share no par value per share"
    },
    {
        value: "VNOM",
        label: "Viper Energy Partners LP"
    },
    {
        value: "VNQ",
        label: "Vanguard Real Estate"
    },
    {
        value: "VNQI",
        label: "Vanguard Global ex-U.S. Real Estate ETF"
    },
    {
        value: "VNRX",
        label: "VolitionRX Limited"
    },
    {
        value: "VNTR",
        label: "Venator Materials PLC"
    },
    {
        value: "VO",
        label: "Vanguard Mid-Cap"
    },
    {
        value: "VOC",
        label: "VOC Energy Trust Units of Beneficial Interest"
    },
    {
        value: "VOD",
        label: "Vodafone Group Plc"
    },
    {
        value: "VOE",
        label: "Vanguard Mid-Cap Value"
    },
    {
        value: "VONE",
        label: "Vanguard Russell 1000 ETF"
    },
    {
        value: "VONG",
        label: "Vanguard Russell 1000 Growth ETF"
    },
    {
        value: "VONV",
        label: "Vanguard Russell 1000 Value ETF"
    },
    {
        value: "VOO",
        label: "Vanguard S&P 500"
    },
    {
        value: "VOOG",
        label: "Vanguard S&P 500 Growth"
    },
    {
        value: "VOOV",
        label: "Vanguard S&P 500 Value"
    },
    {
        value: "VOT",
        label: "Vanguard Mid-Cap Growth"
    },
    {
        value: "VOX",
        label: "Vanguard Communication Services"
    },
    {
        value: "VOXX",
        label: "VOXX International Corporation"
    },
    {
        value: "VOYA",
        label: "Voya Financial Inc."
    },
    {
        value: "VPG",
        label: "Vishay Precision Group Inc."
    },
    {
        value: "VPL",
        label: "Vanguard FTSE Pacific"
    },
    {
        value: "VPU",
        label: "Vanguard Utilities"
    },
    {
        value: "VPV",
        label: "Invesco Pennsylvania Value Municipal Income Trust (DE)"
    },
    {
        value: "VQT",
        label: "Barclays ETN S&P VEQTOR ETN"
    },
    {
        value: "VR",
        label: "Validus Holdings Ltd."
    },
    {
        value: "VR-A",
        label: "Validus Holdings Ltd. Depositary Shares Series A"
    },
    {
        value: "VR-B",
        label: "Validus Holdings Ltd. Depositary Shares Series B"
    },
    {
        value: "VRA",
        label: "Vera Bradley Inc."
    },
    {
        value: "VRAY",
        label: "ViewRay Inc."
    },
    {
        value: "VREX",
        label: "Varex Imaging Corporation"
    },
    {
        value: "VRIG",
        label: "Invesco Variable Rate Investment Grade ETF"
    },
    {
        value: "VRML",
        label: "Vermillion Inc."
    },
    {
        value: "VRNA",
        label: "Verona Pharma plc"
    },
    {
        value: "VRNS",
        label: "Varonis Systems Inc."
    },
    {
        value: "VRNT",
        label: "Verint Systems Inc."
    },
    {
        value: "VRP",
        label: "Invesco Variable Rate Preferred"
    },
    {
        value: "VRS",
        label: "Verso Corporation"
    },
    {
        value: "VRSK",
        label: "Verisk Analytics Inc."
    },
    {
        value: "VRSN",
        label: "VeriSign Inc."
    },
    {
        value: "VRTS",
        label: "Virtus Investment Partners Inc."
    },
    {
        value: "VRTSP",
        label: "Virtus Investment Partners Inc. 7.25% Series D Mandatory Convertible Preferred Stock"
    },
    {
        value: "VRTU",
        label: "Virtusa Corporation"
    },
    {
        value: "VRTV",
        label: "Veritiv Corporation"
    },
    {
        value: "VRTX",
        label: "Vertex Pharmaceuticals Incorporated"
    },
    {
        value: "VRX",
        label: "Valeant Pharmaceuticals International Inc."
    },
    {
        value: "VSAR",
        label: "Versartis Inc."
    },
    {
        value: "VSAT",
        label: "ViaSat Inc."
    },
    {
        value: "VSDA",
        label: "VictoryShares Dividend Accelerator ETF"
    },
    {
        value: "VSEC",
        label: "VSE Corporation"
    },
    {
        value: "VSH",
        label: "Vishay Intertechnology Inc."
    },
    {
        value: "VSI",
        label: "Vitamin Shoppe Inc"
    },
    {
        value: "VSL",
        label: "Volshares Large Cap"
    },
    {
        value: "VSLR",
        label: "Vivint Solar Inc."
    },
    {
        value: "VSM",
        label: "Versum Materials Inc."
    },
    {
        value: "VSMV",
        label: "VictoryShares US Multi-Factor Minimum Volatility ETF"
    },
    {
        value: "VSS",
        label: "Vanguard FTSE All-Wld ex-US SmCp Idx"
    },
    {
        value: "VST",
        label: "Vistra Energy Corp."
    },
    {
        value: "VST+A",
        label: ""
    },
    {
        value: "VSTM",
        label: "Verastem Inc."
    },
    {
        value: "VSTO",
        label: "Vista Outdoor Inc."
    },
    {
        value: "VT",
        label: "Vanguard Total World Stock Index"
    },
    {
        value: "VTA",
        label: "Invesco Credit Opportunities Fund of Beneficial Interest"
    },
    {
        value: "VTC",
        label: "Vanguard Total Corporate Bond ETF"
    },
    {
        value: "VTEB",
        label: "Vanguard Tax-Exempt Bond"
    },
    {
        value: "VTGN",
        label: "VistaGen Therapeutics Inc."
    },
    {
        value: "VTHR",
        label: "Vanguard Russell 3000 ETF"
    },
    {
        value: "VTI",
        label: "Vanguard Total Stock Market"
    },
    {
        value: "VTIP",
        label: "Vanguard Short-Term Inflation-Protected Securities Index Fund"
    },
    {
        value: "VTIQU",
        label: "VectoIQ Acquisition Corp. Unit"
    },
    {
        value: "VTL",
        label: "Vital Therapies Inc."
    },
    {
        value: "VTN",
        label: "Invesco Trust for Investment Grade New York Municipals"
    },
    {
        value: "VTNR",
        label: "Vertex Energy Inc"
    },
    {
        value: "VTR",
        label: "Ventas Inc."
    },
    {
        value: "VTRB",
        label: "Ventas Realty Limited Partnership // Capital Corporation 5.45% Senior Notes due 2043"
    },
    {
        value: "VTSI",
        label: "VirTra Inc."
    },
    {
        value: "VTV",
        label: "Vanguard Value"
    },
    {
        value: "VTVT",
        label: "vTv Therapeutics Inc."
    },
    {
        value: "VTWG",
        label: "Vanguard Russell 2000 Growth ETF"
    },
    {
        value: "VTWO",
        label: "Vanguard Russell 2000 ETF"
    },
    {
        value: "VTWV",
        label: "Vanguard Russell 2000 Value ETF"
    },
    {
        value: "VUG",
        label: "Vanguard Growth"
    },
    {
        value: "VUSE",
        label: "ETF Series Solutions Trust Vident Core US Equity"
    },
    {
        value: "VUZI",
        label: "Vuzix Corporation"
    },
    {
        value: "VV",
        label: "Vanguard Large-Cap"
    },
    {
        value: "VVC",
        label: "Vectren Corporation"
    },
    {
        value: "VVI",
        label: "Viad Corp"
    },
    {
        value: "VVPR",
        label: "VivoPower International PLC"
    },
    {
        value: "VVR",
        label: "Invesco Senior Income Trust (DE)"
    },
    {
        value: "VVUS",
        label: "VIVUS Inc."
    },
    {
        value: "VVV",
        label: "Valvoline Inc."
    },
    {
        value: "VWO",
        label: "Vanguard FTSE Emerging Markets"
    },
    {
        value: "VWOB",
        label: "Vanguard Emerging Markets Government Bond ETF"
    },
    {
        value: "VXF",
        label: "Vanguard Extended Market"
    },
    {
        value: "VXRT",
        label: "Vaxart Inc."
    },
    {
        value: "VXUS",
        label: "Vanguard Total International Stock ETF"
    },
    {
        value: "VXX",
        label: "iPath S&P 500 VIX Short Term Futures TM ETN"
    },
    {
        value: "VXXB",
        label: "iPath Series B S&P 500 VIX Short-Term Futures ETN"
    },
    {
        value: "VXZ",
        label: "iPath S&P 500 VIX Mid-Term Futures ETN"
    },
    {
        value: "VXZB",
        label: "iPath Series B S&P 500 VIX Mid-Term Futures ETN"
    },
    {
        value: "VYGR",
        label: "Voyager Therapeutics Inc."
    },
    {
        value: "VYM",
        label: "Vanguard High Dividend Yield"
    },
    {
        value: "VYMI",
        label: "Vanguard International High Dividend Yield ETF"
    },
    {
        value: "VZ",
        label: "Verizon Communications Inc."
    },
    {
        value: "VZA",
        label: "Verizon Communications Inc. 5.90% Notes due 2054"
    },
    {
        value: "W",
        label: "Wayfair Inc. Class A"
    },
    {
        value: "WAAS",
        label: "AquaVenture Holdings Limited"
    },
    {
        value: "WAB",
        label: "Westinghouse Air Brake Technologies Corporation"
    },
    {
        value: "WABC",
        label: "Westamerica Bancorporation"
    },
    {
        value: "WAFD",
        label: "Washington Federal Inc."
    },
    {
        value: "WAFDW",
        label: "Washington Federal Inc. Warrants 11/14/2018"
    },
    {
        value: "WAGE",
        label: "WageWorks Inc."
    },
    {
        value: "WAIR",
        label: "Wesco Aircraft Holdings Inc."
    },
    {
        value: "WAL",
        label: "Western Alliance Bancorporation (DE)"
    },
    {
        value: "WALA",
        label: "Western Alliance Bancorporation 6.25% Subordinated Debentures due 2056"
    },
    {
        value: "WASH",
        label: "Washington Trust Bancorp Inc."
    },
    {
        value: "WAT",
        label: "Waters Corporation"
    },
    {
        value: "WATT",
        label: "Energous Corporation"
    },
    {
        value: "WB",
        label: "Weibo Corporation"
    },
    {
        value: "WBA",
        label: "Walgreens Boots Alliance Inc."
    },
    {
        value: "WBAI",
        label: "500.com Limited American Depositary Shares each representing 10 Class A shares"
    },
    {
        value: "WBAL",
        label: "WisdomTree Balanced Income Fund"
    },
    {
        value: "WBC",
        label: "Wabco Holdings Inc."
    },
    {
        value: "WBIA",
        label: "WBI BullBear Rising Income 2000"
    },
    {
        value: "WBIB",
        label: "WBI BullBear Value 2000"
    },
    {
        value: "WBIC",
        label: "WBI BullBear Yield 2000"
    },
    {
        value: "WBID",
        label: "WBI BullBear Quality 2000"
    },
    {
        value: "WBIE",
        label: "WBI BullBear Rising Income 1000"
    },
    {
        value: "WBIF",
        label: "WBI BullBear Value 1000"
    },
    {
        value: "WBIG",
        label: "WBI BullBear Yield 1000"
    },
    {
        value: "WBIH",
        label: "WBI BullBear Global High Income"
    },
    {
        value: "WBII",
        label: "WBI BullBear Global Income"
    },
    {
        value: "WBIL",
        label: "WBI BullBear Quality 1000"
    },
    {
        value: "WBIR",
        label: "WBI BullBear Global Rotation"
    },
    {
        value: "WBIY",
        label: "WBI Power Factor High Dividend"
    },
    {
        value: "WBK",
        label: "Westpac Banking Corporation"
    },
    {
        value: "WBS",
        label: "Webster Financial Corporation"
    },
    {
        value: "WBS-F",
        label: "Webster Financial Corporation Depositary Shares Series F"
    },
    {
        value: "WBT",
        label: "Welbilt Inc."
    },
    {
        value: "WCC",
        label: "WESCO International Inc."
    },
    {
        value: "WCFB",
        label: "WCF Bancorp Inc."
    },
    {
        value: "WCG",
        label: "Wellcare Health Plans Inc."
    },
    {
        value: "WCHN",
        label: "WisdomTree ICBCCS S&P China 500 Fund"
    },
    {
        value: "WCN",
        label: "Waste Connections Inc."
    },
    {
        value: "WD",
        label: "Walker & Dunlop Inc"
    },
    {
        value: "WDAY",
        label: "Workday Inc."
    },
    {
        value: "WDC",
        label: "Western Digital Corporation"
    },
    {
        value: "WDFC",
        label: "WD-40 Company"
    },
    {
        value: "WDIV",
        label: "SPDR S&P Global Dividend"
    },
    {
        value: "WDR",
        label: "Waddell & Reed Financial Inc."
    },
    {
        value: "WDRW",
        label: "Direxion Daily Regional Banks Bear 3X Shares"
    },
    {
        value: "WEA",
        label: "Western Asset Bond Fund Share of Beneficial Interest"
    },
    {
        value: "WEAR",
        label: "Exchange Listed Funds Trust ETF The WEAR"
    },
    {
        value: "WEAT",
        label: "Teucrium Wheat Fund ETV"
    },
    {
        value: "WEB",
        label: "Web.com Group Inc."
    },
    {
        value: "WEBK",
        label: "Wellesley Bancorp Inc."
    },
    {
        value: "WEC",
        label: "WEC Energy Group Inc."
    },
    {
        value: "WELL",
        label: "Welltower Inc."
    },
    {
        value: "WELL-I",
        label: "Welltower Inc. PFD PERPETUAL CONV SER I"
    },
    {
        value: "WEN",
        label: "Wendy's Company (The)"
    },
    {
        value: "WERN",
        label: "Werner Enterprises Inc."
    },
    {
        value: "WES",
        label: "Western Gas Partners LP Limited Partner Interests"
    },
    {
        value: "WETF",
        label: "WisdomTree Investments Inc."
    },
    {
        value: "WEX",
        label: "WEX Inc."
    },
    {
        value: "WEYS",
        label: "Weyco Group Inc."
    },
    {
        value: "WF",
        label: "Woori Bank American Depositary Shares (Each representing 3 shares of)"
    },
    {
        value: "WFC",
        label: "Wells Fargo & Company"
    },
    {
        value: "WFC+",
        label: "Wells Fargo & Company Warrants expiring October 28 2018"
    },
    {
        value: "WFC-J",
        label: "Wells Fargo & Company 8.00% Non-Cumulative Perpetual Class A Preferred Stock Series J"
    },
    {
        value: "WFC-L",
        label: "Wells Fargo & Company 7.50% Non-Cumulative Perpetual Convertible Class A Preferred Stock Series L"
    },
    {
        value: "WFC-N",
        label: "Wells Fargo & Company Dep Shs Repstg 1/1000th Perp Pfd Cl A Ser N"
    },
    {
        value: "WFC-O",
        label: "Wells Fargo & Company Depositary Shares Series O"
    },
    {
        value: "WFC-P",
        label: "Wells Fargo & Company Dep Shs Repstg 1/1000th Int Non Cum Perp Cl A Pfd (Ser P)"
    },
    {
        value: "WFC-Q",
        label: "Wells Fargo & Company Depositary Shares Series Q"
    },
    {
        value: "WFC-R",
        label: "Wells Fargo & Company Dep Shs Repstg 1/1000th Int Perp Pfd Cl A (Ser R Fixed To Flltg)"
    },
    {
        value: "WFC-T",
        label: "Wells Fargo & Company New Depository Share Representing 1/1000th Perp. Preferred Class A Series T"
    },
    {
        value: "WFC-V",
        label: "Wells Fargo & Company Depositary Shares Series V"
    },
    {
        value: "WFC-W",
        label: "Wells Fargo & Company Depositary Shares Series W"
    },
    {
        value: "WFC-X",
        label: "Wells Fargo & Company Depositary Shares Series X"
    },
    {
        value: "WFC-Y",
        label: "Wells Fargo & Company Depositary Shares Series Y"
    },
    {
        value: "WFE-A",
        label: "Wells Fargo & Company Cumulative Perpetual Preferred Stock Series A Liquidation Preference $25 per share"
    },
    {
        value: "WFHY",
        label: "WisdomTree Fundamental U.S. High Yield Corporate Bond Fund"
    },
    {
        value: "WFIG",
        label: "WisdomTree Fundamental U.S. Corporate Bond Fund"
    },
    {
        value: "WFT",
        label: "Weatherford International plc (Ireland)"
    },
    {
        value: "WGL",
        label: "WGL Holdings IncCommon Stock"
    },
    {
        value: "WGO",
        label: "Winnebago Industries Inc."
    },
    {
        value: "WGP",
        label: "Western Gas Equity Partners LP Representing Limited Partner Interests"
    },
    {
        value: "WH",
        label: "WYNDHAM HOTELS & RESORTS INC"
    },
    {
        value: "WHD",
        label: "Cactus Inc. Class A"
    },
    {
        value: "WHF",
        label: "WhiteHorse Finance Inc."
    },
    {
        value: "WHFBL",
        label: "WhiteHorse Finance Inc. 6.50% Senior Notes due 2020"
    },
    {
        value: "WHG",
        label: "Westwood Holdings Group Inc"
    },
    {
        value: "WHLM",
        label: "Wilhelmina International Inc."
    },
    {
        value: "WHLR",
        label: "Wheeler Real Estate Investment Trust Inc."
    },
    {
        value: "WHLRD",
        label: "Wheeler Real Estate Investment Trust Inc. Series D Cumulative Preferred Stock"
    },
    {
        value: "WHLRP",
        label: "Wheeler Real Estate Investment Trust Inc. Preferred Stock"
    },
    {
        value: "WHLRW",
        label: "Wheeler Real Estate Investment Trust Inc. Warrants"
    },
    {
        value: "WHR",
        label: "Whirlpool Corporation"
    },
    {
        value: "WIA",
        label: "Western Asset Inflation-Linked Income Fund"
    },
    {
        value: "WIFI",
        label: "Boingo Wireless Inc."
    },
    {
        value: "WIL",
        label: "Barclays PLC Women in Leadership ETN"
    },
    {
        value: "WILC",
        label: "G. Willi-Food International  Ltd."
    },
    {
        value: "WIN",
        label: "Windstream Holdings Inc."
    },
    {
        value: "WINA",
        label: "Winmark Corporation"
    },
    {
        value: "WING",
        label: "Wingstop Inc."
    },
    {
        value: "WINS",
        label: "Wins Finance Holdings Inc."
    },
    {
        value: "WIP",
        label: "SPDR FTSE International Government Inflation-Protected Bond"
    },
    {
        value: "WIRE",
        label: "Encore Wire Corporation"
    },
    {
        value: "WIT",
        label: "Wipro Limited"
    },
    {
        value: "WIW",
        label: "Western Asset Inflation-Linked Opportunities & Income Fund"
    },
    {
        value: "WIX",
        label: "Wix.com Ltd."
    },
    {
        value: "WK",
        label: "Workiva Inc. Class A"
    },
    {
        value: "WKHS",
        label: "Workhorse Group Inc."
    },
    {
        value: "WLDN",
        label: "Willdan Group Inc."
    },
    {
        value: "WLDR",
        label: "Affinity World Leaders Equity"
    },
    {
        value: "WLFC",
        label: "Willis Lease Finance Corporation"
    },
    {
        value: "WLH",
        label: "Lyon William Homes (Class A)"
    },
    {
        value: "WLK",
        label: "Westlake Chemical Corporation"
    },
    {
        value: "WLKP",
        label: "Westlake Chemical Partners LP representing limited partner interests"
    },
    {
        value: "WLL",
        label: "Whiting Petroleum Corporation"
    },
    {
        value: "WLTW",
        label: "Willis Towers Watson Public Limited Company"
    },
    {
        value: "WM",
        label: "Waste Management Inc."
    },
    {
        value: "WMB",
        label: "Williams Companies Inc. (The)"
    },
    {
        value: "WMC",
        label: "Western Asset Mortgage Capital Corporation"
    },
    {
        value: "WMCR",
        label: "Invesco Wilshire Micro-Cap"
    },
    {
        value: "WMGI",
        label: "Wright Medical Group N.V."
    },
    {
        value: "WMGIZ",
        label: "Wright Medical Group N.V. Contingent Value Right"
    },
    {
        value: "WMIH",
        label: "WMIH Corp."
    },
    {
        value: "WMK",
        label: "Weis Markets Inc."
    },
    {
        value: "WMLP",
        label: "Westmoreland Resource Partners LP representing Limited Partner Interests"
    },
    {
        value: "WMS",
        label: "Advanced Drainage Systems Inc."
    },
    {
        value: "WMT",
        label: "Walmart Inc."
    },
    {
        value: "WMW",
        label: "DEUTSCHE BANK AKTIENGESELLSCHAFT ELEMENTS Linked to the Morningstar Wide Moat Focus Total Return Index due October 24 2022"
    },
    {
        value: "WNC",
        label: "Wabash National Corporation"
    },
    {
        value: "WNEB",
        label: "Western New England Bancorp Inc."
    },
    {
        value: "WNS",
        label: "WNS (Holdings) Limited Sponsored ADR (Jersey)"
    },
    {
        value: "WOOD",
        label: "iShares S&P Global Timber & Forestry Index Fund"
    },
    {
        value: "WOR",
        label: "Worthington Industries Inc."
    },
    {
        value: "WOW",
        label: "WideOpenWest Inc."
    },
    {
        value: "WP",
        label: "Worldpay Inc. Class A"
    },
    {
        value: "WPC",
        label: "W.P. Carey Inc. REIT"
    },
    {
        value: "WPG",
        label: "Washington Prime Group Inc."
    },
    {
        value: "WPG-H",
        label: "Washington Prime Group Inc. 7.5% Series H Cumulative Redeemable Preferred SBI"
    },
    {
        value: "WPG-I",
        label: "Washington Prime Group Inc. 6.875% Series I Cumulative Redeemable Preferred SBI"
    },
    {
        value: "WPM",
        label: "Wheaton Precious Metals Corp (Canada)"
    },
    {
        value: "WPP",
        label: "WPP plc American Depositary Shares"
    },
    {
        value: "WPRT",
        label: "Westport Fuel Systems Inc"
    },
    {
        value: "WPS",
        label: "iShares International Developed Property"
    },
    {
        value: "WPX",
        label: "WPX Energy Inc."
    },
    {
        value: "WPXP",
        label: "WPX Energy Inc. 6.25% Series A Mandatory Convertible Preferred Stock"
    },
    {
        value: "WPZ",
        label: "Williams Partners L.P. Representing Limited Partner Interests"
    },
    {
        value: "WRB",
        label: "W.R. Berkley Corporation"
    },
    {
        value: "WRB-B",
        label: "W.R. Berkley Corporation 5.625% Subordinated Debentures due 2053"
    },
    {
        value: "WRB-C",
        label: ""
    },
    {
        value: "WRB-D",
        label: "W.R. Berkley Corporation 5.75% Subordinated Debentures due 2056"
    },
    {
        value: "WRB-E",
        label: "W.R. Berkley Corporation 5.70% Subordinated Debentures due 2058"
    },
    {
        value: "WRD",
        label: "WildHorse Resource Development Corporation"
    },
    {
        value: "WRE",
        label: "Washington Real Estate Investment Trust"
    },
    {
        value: "WREI",
        label: "Invesco Wilshire US REIT"
    },
    {
        value: "WRI",
        label: "Weingarten Realty Investors"
    },
    {
        value: "WRK",
        label: "Westrock Company"
    },
    {
        value: "WRLD",
        label: "World Acceptance Corporation"
    },
    {
        value: "WRLS",
        label: "Pensare Acquisition Corp."
    },
    {
        value: "WRLSR",
        label: "Pensare Acquisition Corp. Right"
    },
    {
        value: "WRLSU",
        label: "Pensare Acquisition Corp. Unit"
    },
    {
        value: "WRLSW",
        label: "Pensare Acquisition Corp. Warrant"
    },
    {
        value: "WRN",
        label: "Western Copper and Gold Corporation"
    },
    {
        value: "WSBC",
        label: "WesBanco Inc."
    },
    {
        value: "WSBF",
        label: "Waterstone Financial Inc."
    },
    {
        value: "WSC",
        label: "WillScot Corporation"
    },
    {
        value: "WSCI",
        label: "WSI Industries Inc."
    },
    {
        value: "WSCWW",
        label: "WillScot Corporation Warrant"
    },
    {
        value: "WSFS",
        label: "WSFS Financial Corporation"
    },
    {
        value: "WSKY",
        label: "Spirited Funds/ETFMG Whiskey & Spirits"
    },
    {
        value: "WSM",
        label: "Williams-Sonoma Inc. (DE)"
    },
    {
        value: "WSO",
        label: "Watsco Inc."
    },
    {
        value: "WSO.B",
        label: "Watsco Inc. Class B"
    },
    {
        value: "WSR",
        label: "Whitestone REIT"
    },
    {
        value: "WST",
        label: "West Pharmaceutical Services Inc."
    },
    {
        value: "WSTG",
        label: "Wayside Technology Group Inc."
    },
    {
        value: "WSTL",
        label: "Westell Technologies Inc."
    },
    {
        value: "WTBA",
        label: "West Bancorporation"
    },
    {
        value: "WTFC",
        label: "Wintrust Financial Corporation"
    },
    {
        value: "WTFCM",
        label: "Wintrust Financial Corporation Fixed-to-Floating Rate Non-Cumulative Perpetual Preferred Stock Series D"
    },
    {
        value: "WTFCW",
        label: "Wintrust Financial Corporation Warrants"
    },
    {
        value: "WTI",
        label: "W&T Offshore Inc."
    },
    {
        value: "WTID",
        label: "UBS ETRACS - ProShares Daily 3x Inverse Crude ETN"
    },
    {
        value: "WTIU",
        label: "UBS ETRACS - ProShares Daily 3x Long Crude ETN"
    },
    {
        value: "WTM",
        label: "White Mountains Insurance Group Ltd."
    },
    {
        value: "WTMF",
        label: "WisdomTree Managed Futures Strategy Fund"
    },
    {
        value: "WTR",
        label: "Aqua America Inc."
    },
    {
        value: "WTS",
        label: "Watts Water Technologies Inc. Class A"
    },
    {
        value: "WTT",
        label: "Wireless Telecom Group Inc."
    },
    {
        value: "WTTR",
        label: "Select Energy Services Inc. Class A"
    },
    {
        value: "WTW",
        label: "Weight Watchers International Inc"
    },
    {
        value: "WU",
        label: "Western Union Company (The)"
    },
    {
        value: "WUBA",
        label: "58.com Inc. American Depositary Shares each representing 2 Class A"
    },
    {
        value: "WVE",
        label: "Wave Life Sciences Ltd."
    },
    {
        value: "WVFC",
        label: "WVS Financial Corp."
    },
    {
        value: "WVVI",
        label: "Willamette Valley Vineyards Inc."
    },
    {
        value: "WVVIP",
        label: "Willamette Valley Vineyards Inc. Series A Redeemable Preferred Stock"
    },
    {
        value: "WWD",
        label: "Woodward Inc."
    },
    {
        value: "WWE",
        label: "World Wrestling Entertainment Inc. Class A"
    },
    {
        value: "WWR",
        label: "Westwater Resources Inc."
    },
    {
        value: "WWW",
        label: "Wolverine World Wide Inc."
    },
    {
        value: "WY",
        label: "Weyerhaeuser Company"
    },
    {
        value: "WYDE",
        label: "ProShares CDS Short North American HY Credit"
    },
    {
        value: "WYND",
        label: "WYNDHAM DESTINATIONS INC"
    },
    {
        value: "WYNN",
        label: "Wynn Resorts Limited"
    },
    {
        value: "WYY",
        label: "WidePoint Corporation"
    },
    {
        value: "X",
        label: "United States Steel Corporation"
    },
    {
        value: "XAN",
        label: "EXANTAS CAPITAL CORP"
    },
    {
        value: "XAN-C",
        label: ""
    },
    {
        value: "XAR",
        label: "SPDR S&P Aerospace & Defense"
    },
    {
        value: "XBI",
        label: "SPDR Series Trust S&P Biotech"
    },
    {
        value: "XBIO",
        label: "Xenetic Biosciences Inc."
    },
    {
        value: "XBIT",
        label: "XBiotech Inc."
    },
    {
        value: "XCEM",
        label: "Columbia EM Core ex-China"
    },
    {
        value: "XCRA",
        label: "Xcerra Corporation"
    },
    {
        value: "XDIV",
        label: "U.S. Equity Ex-Dividend Fund Series 2027 Shares"
    },
    {
        value: "XEC",
        label: "Cimarex Energy Co"
    },
    {
        value: "XEL",
        label: "Xcel Energy Inc."
    },
    {
        value: "XELA",
        label: "Exela Technologies Inc."
    },
    {
        value: "XELB",
        label: "Xcel Brands Inc"
    },
    {
        value: "XENE",
        label: "Xenon Pharmaceuticals Inc."
    },
    {
        value: "XENT",
        label: "Intersect ENT Inc."
    },
    {
        value: "XES",
        label: "SPDR Series Trust S&P Oil & Gas Equipment & Services"
    },
    {
        value: "XFLT",
        label: "XAI Octagon Floating Rate & Alternative Income Term Trust of Beneficial Interest"
    },
    {
        value: "XGTI",
        label: "XG Technology Inc"
    },
    {
        value: "XGTIW",
        label: "XG Technology Inc Warrants (1 Wt & 824.40 to purchase 1 shr)."
    },
    {
        value: "XHB",
        label: "SPDR Series Trust Homebuilders"
    },
    {
        value: "XHE",
        label: "SPDR S&P Health Care Equipment"
    },
    {
        value: "XHR",
        label: "Xenia Hotels & Resorts Inc."
    },
    {
        value: "XHS",
        label: "SPDR S&P Health Care Services"
    },
    {
        value: "XIN",
        label: "Xinyuan Real Estate Co Ltd American Depositary Shares"
    },
    {
        value: "XINA",
        label: "SPDR MSCI China A Shares IMI"
    },
    {
        value: "XITK",
        label: "SPDR FactSet Innovative Technology"
    },
    {
        value: "XIVH",
        label: "UBS AG VelocityShares VIX Short Volatility Hedged ETN linked to the S&P 500 VIX Futures Short Volatility Hedged Index a&#128;&#147; Short Term due July 18 2046"
    },
    {
        value: "XKFS",
        label: "SPDR Kensho Future Security"
    },
    {
        value: "XKII",
        label: "SPDR Kensho Intelligent Structures"
    },
    {
        value: "XKST",
        label: "SPDR Kensho Smart Mobility"
    },
    {
        value: "XL",
        label: "XL Group Ltd."
    },
    {
        value: "XLB",
        label: "Materials Select Sector SPDR"
    },
    {
        value: "XLE",
        label: "SPDR Select Sector Fund - Energy Select Sector"
    },
    {
        value: "XLF",
        label: "SPDR Select Sector Fund - Financial"
    },
    {
        value: "XLG",
        label: "Invesco S&P 500 Top 50"
    },
    {
        value: "XLI",
        label: "SPDR Select Sector Fund - Industrial"
    },
    {
        value: "XLK",
        label: "SPDR Select Sector Fund - Technology"
    },
    {
        value: "XLNX",
        label: "Xilinx Inc."
    },
    {
        value: "XLP",
        label: "SPDR Select Sector Fund - Consumer Staples"
    },
    {
        value: "XLRE",
        label: "Real Estate Select Sector SPDR Fund (The)"
    },
    {
        value: "XLRN",
        label: "Acceleron Pharma Inc."
    },
    {
        value: "XLU",
        label: "SPDR Select Sector Fund - Utilities"
    },
    {
        value: "XLV",
        label: "SPDR Select Sector Fund - Health Care"
    },
    {
        value: "XLY",
        label: "SPDR Select Sector Fund - Consumer Discretionary"
    },
    {
        value: "XME",
        label: "SPDR S&P Metals & Mining"
    },
    {
        value: "XMLV",
        label: "Invesco S&P MidCap Low Volatility"
    },
    {
        value: "XMPT",
        label: "VanEck Vectors CEF Municipal Income"
    },
    {
        value: "XMX",
        label: "WisdomTree Global ex-Mexico Equity Fund"
    },
    {
        value: "XNCR",
        label: "Xencor Inc."
    },
    {
        value: "XNET",
        label: "Xunlei Limited"
    },
    {
        value: "XNTK",
        label: "SPDR NYSE Technology"
    },
    {
        value: "XOG",
        label: "Extraction Oil & Gas Inc."
    },
    {
        value: "XOM",
        label: "Exxon Mobil Corporation"
    },
    {
        value: "XOMA",
        label: "XOMA Corporation"
    },
    {
        value: "XON",
        label: "Intrexon Corporation"
    },
    {
        value: "XONE",
        label: "The ExOne Company"
    },
    {
        value: "XOP",
        label: "SPDR S&P Oil & Gas Explor & Product"
    },
    {
        value: "XOXO",
        label: "XO Group Inc."
    },
    {
        value: "XPER",
        label: "Xperi Corporation"
    },
    {
        value: "XPH",
        label: "SPDR S&P Pharmaceuticals"
    },
    {
        value: "XPL",
        label: "Solitario Zinc Corp."
    },
    {
        value: "XPLR",
        label: "Xplore Technologies Corp"
    },
    {
        value: "XPO",
        label: "XPO Logistics Inc."
    },
    {
        value: "XPP",
        label: "ProShares Ultra FTSE China 50"
    },
    {
        value: "XRAY",
        label: "DENTSPLY SIRONA Inc."
    },
    {
        value: "XRF",
        label: "China Rapid Finance Limited American Depositary Shares each representing one Class A"
    },
    {
        value: "XRLV",
        label: "Invesco S&P 500 ex-Rate Sensitive Low Volatility"
    },
    {
        value: "XRM",
        label: "Xerium Technologies Inc."
    },
    {
        value: "XRT",
        label: "SPDR S&P Retail"
    },
    {
        value: "XRX",
        label: "Xerox Corporation"
    },
    {
        value: "XSD",
        label: "SPDR S&P Semiconductor"
    },
    {
        value: "XSHD",
        label: "Invesco S&P SmallCap High Dividend Low Volatility"
    },
    {
        value: "XSHQ",
        label: "Invesco S&P SmallCap Quality"
    },
    {
        value: "XSLV",
        label: "Invesco S&P SmallCap Low Volatility"
    },
    {
        value: "XSOE",
        label: "WisdomTree Emerging Markets Ex-State Owned Enterprises Fund"
    },
    {
        value: "XSPA",
        label: "XpresSpa Group Inc."
    },
    {
        value: "XSPL",
        label: "Xspand Products Lab Inc."
    },
    {
        value: "XSW",
        label: "SPDR S&P Software & Services"
    },
    {
        value: "XT",
        label: "iShares Exponential Technologies ETF"
    },
    {
        value: "XTH",
        label: "SPDR S&P Technology Hardware"
    },
    {
        value: "XTL",
        label: "SPDR S&P Telecom"
    },
    {
        value: "XTLB",
        label: "XTL Biopharmaceuticals Ltd."
    },
    {
        value: "XTN",
        label: "SPDR S&P Transportation"
    },
    {
        value: "XTNT",
        label: "Xtant Medical Holdings Inc."
    },
    {
        value: "XUSA",
        label: "QuantX Dynamic Beta US Equity"
    },
    {
        value: "XVZ",
        label: "iPath S&P 500 Dynamic VIX ETN"
    },
    {
        value: "XWEB",
        label: "SPDR S&P Internet"
    },
    {
        value: "XXII",
        label: "22nd Century Group Inc."
    },
    {
        value: "XYL",
        label: "Xylem Inc. New"
    },
    {
        value: "Y",
        label: "Alleghany Corporation"
    },
    {
        value: "YANG",
        label: "Direxion Daily FTSE China Bear 3x Shares"
    },
    {
        value: "YAO",
        label: "Invesco China All-Cap"
    },
    {
        value: "YCL",
        label: "ProShares Ultra Yen"
    },
    {
        value: "YCS",
        label: "ProShares UltraShort Yen New"
    },
    {
        value: "YDIV",
        label: "First Trust International Multi-Asset Diversified Income Index Fund"
    },
    {
        value: "YECO",
        label: "Yulong Eco-Materials Limited"
    },
    {
        value: "YELP",
        label: "Yelp Inc."
    },
    {
        value: "YESR",
        label: "Amplify YieldShares Senior Loan and Income"
    },
    {
        value: "YEXT",
        label: "Yext Inc."
    },
    {
        value: "YGE",
        label: "Yingli Green Energy Holding Company Limited ADR"
    },
    {
        value: "YGYI",
        label: "Youngevity International Inc."
    },
    {
        value: "YIN",
        label: "Yintech Investment Holdings Limited"
    },
    {
        value: "YINN",
        label: "Direxion Daily FTSE China Bull 3x Shares"
    },
    {
        value: "YLCO",
        label: "Global X Yieldco Index ETF"
    },
    {
        value: "YLD",
        label: "Principal Exchange-Traded Funds EDGE Active Income"
    },
    {
        value: "YLDE",
        label: "ClearBridge Dividend Strategy ESG ETF"
    },
    {
        value: "YMLI",
        label: "VanEck Vectors High Income Infrastructure MLP"
    },
    {
        value: "YMLP",
        label: "VanEck Vectors High Income MLP"
    },
    {
        value: "YNDX",
        label: "Yandex N.V."
    },
    {
        value: "YOGA",
        label: "YogaWorks Inc."
    },
    {
        value: "YORW",
        label: "The York Water Company"
    },
    {
        value: "YPF",
        label: "YPF Sociedad Anonima"
    },
    {
        value: "YRCW",
        label: "YRC Worldwide Inc."
    },
    {
        value: "YRD",
        label: "Yirendai Ltd. American Depositary Shares each representing two"
    },
    {
        value: "YRIV",
        label: "Yangtze River Port and Logistics Limited"
    },
    {
        value: "YTEN",
        label: "Yield10 Bioscience Inc."
    },
    {
        value: "YTRA",
        label: "Yatra Online Inc."
    },
    {
        value: "YUM",
        label: "Yum! Brands Inc."
    },
    {
        value: "YUMA",
        label: "Yuma Energy Inc."
    },
    {
        value: "YUMC",
        label: "Yum China Holdings Inc."
    },
    {
        value: "YXI",
        label: "ProShares Short FTSE China 50"
    },
    {
        value: "YY",
        label: "YY Inc."
    },
    {
        value: "YYY",
        label: "YieldShares High Income"
    },
    {
        value: "Z",
        label: "Zillow Group Inc."
    },
    {
        value: "ZAGG",
        label: "ZAGG Inc"
    },
    {
        value: "ZAYO",
        label: "Zayo Group Holdings Inc."
    },
    {
        value: "ZAZZT",
        label: ""
    },
    {
        value: "ZB-A",
        label: "Zions Bancorporation Depositary Shares Series A"
    },
    {
        value: "ZB-G",
        label: "Zions Bancorporation Dep Shs Repstg 1/40th Perp Pfd Ser G"
    },
    {
        value: "ZB-H",
        label: "Zions Bancorporation Dep Shs Repstg 1/40th Int Sh Ser H Perp Pfd Stk"
    },
    {
        value: "ZBH",
        label: "Zimmer Biomet Holdings Inc."
    },
    {
        value: "ZBIO",
        label: "ProShares UltraPro Short NASDAQ Biotechnology"
    },
    {
        value: "ZBK",
        label: "Zions Bancorporation 6.95% Fixed-to-Floating Rate Subordinated Notes due September 15 2028"
    },
    {
        value: "ZBRA",
        label: "Zebra Technologies Corporation"
    },
    {
        value: "ZBZX",
        label: ""
    },
    {
        value: "ZBZZT",
        label: ""
    },
    {
        value: "ZCZZT",
        label: ""
    },
    {
        value: "ZDGE",
        label: "Zedge Inc. Class B"
    },
    {
        value: "ZEAL",
        label: "Zealand Pharma A/S"
    },
    {
        value: "ZEN",
        label: "Zendesk Inc."
    },
    {
        value: "ZEUS",
        label: "Olympic Steel Inc."
    },
    {
        value: "ZEXIT",
        label: ""
    },
    {
        value: "ZF",
        label: "Virtus Total Return Fund Inc."
    },
    {
        value: "ZFGN",
        label: "Zafgen Inc."
    },
    {
        value: "ZG",
        label: "Zillow Group Inc."
    },
    {
        value: "ZGNX",
        label: "Zogenix Inc."
    },
    {
        value: "ZIEXT",
        label: ""
    },
    {
        value: "ZION",
        label: "Zions Bancorporation"
    },
    {
        value: "ZIONW",
        label: "Zions Bancorporation Warrants 05/21/2020"
    },
    {
        value: "ZIONZ",
        label: "Zions Bancorporation Warrants"
    },
    {
        value: "ZIOP",
        label: "ZIOPHARM Oncology Inc"
    },
    {
        value: "ZIV",
        label: "VelocityShares Daily Inverse VIX Medium Term ETN"
    },
    {
        value: "ZIXI",
        label: "Zix Corporation"
    },
    {
        value: "ZJZZT",
        label: ""
    },
    {
        value: "ZKIN",
        label: "ZK International Group Co. Ltd"
    },
    {
        value: "ZLAB",
        label: "Zai Lab Limited"
    },
    {
        value: "ZMLP",
        label: "Direxion Zacks MLP High Income Index Shares"
    },
    {
        value: "ZN",
        label: "Zion Oil & Gas Inc"
    },
    {
        value: "ZNGA",
        label: "Zynga Inc."
    },
    {
        value: "ZNH",
        label: "China Southern Airlines Company Limited"
    },
    {
        value: "ZNWAA",
        label: ""
    },
    {
        value: "ZOES",
        label: "Zoe's Kitchen Inc."
    },
    {
        value: "ZOM",
        label: "Zomedica Pharmaceuticals Corp."
    },
    {
        value: "ZROZ",
        label: "PIMCO 25 Year Zero Coupon U.S. Treasury Index Exchange-Traded Fund"
    },
    {
        value: "ZS",
        label: "Zscaler Inc."
    },
    {
        value: "ZSAN",
        label: "Zosano Pharma Corporation"
    },
    {
        value: "ZSL",
        label: "ProShares UltraShort Silver"
    },
    {
        value: "ZTEST",
        label: ""
    },
    {
        value: "ZTO",
        label: "ZTO Express (Cayman) Inc. American Depositary Shares each representing one Class A."
    },
    {
        value: "ZTR",
        label: "Virtus Global Dividend & Income Fund Inc."
    },
    {
        value: "ZTS",
        label: "Zoetis Inc. Class A"
    },
    {
        value: "ZUMZ",
        label: "Zumiez Inc."
    },
    {
        value: "ZUO",
        label: "Zuora Inc. Class A"
    },
    {
        value: "ZVV",
        label: ""
    },
    {
        value: "ZVVV",
        label: ""
    },
    {
        value: "ZVZZT",
        label: "NASDAQ TEST STOCK"
    },
    {
        value: "ZWZZT",
        label: "NASDAQ TEST STOCK"
    },
    {
        value: "ZX",
        label: "China Zenix Auto International Limited American Depositary Shares each representing four."
    },
    {
        value: "ZXIET",
        label: ""
    },
    {
        value: "ZXZZT",
        label: "NASDAQ TEST STOCK"
    },
    {
        value: "ZYME",
        label: "Zymeworks Inc."
    },
    {
        value: "ZYNE",
        label: "Zynerba Pharmaceuticals Inc."
    }
]