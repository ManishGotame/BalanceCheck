import logo from "./logo.svg";
import "./App.css";
import { useHistory, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { parse } from "node-html-parser";
import { Spinner } from "@chakra-ui/react";

import {
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
} from "@chakra-ui/react";

const cheerio = require("cheerio");

function App() {
  const history = useHistory();
  const [liquidityTokens, setliquidityTokens] = useState(0);
  const [onChainTreasury, setOnChainTreasuryTokens] = useState(0);
  const [burnedTokens, setBurnedTokens] = useState(0);
  const truncate = (input, len) =>
    input.length > len
      ? `${input.substring(0, len)}...` +
        `${input.substring(input.length - len, input.length)}`
      : input;

  const [code, setCode] = useState(null);
  // 0 => All Transfers
  // 1 => Contract Transfers
  const [dataMode, setMode] = useState(0);
  const [tokenData, setTokenData] = useState(null);

  const tokenTransfer = (i, each) => {
    if ("data-test" in each.attribs) {
      // Not needed but could prevent any further bugs in the future
      if (dataMode == 0) {
        if (
          [
            "token-transfer",
            // "address_hash_link",
          ].includes(each.attribs["data-test"])
        )
          return true;
      }

      if (dataMode == 1) {
        if (
          [
            "token_transfer",
            // "address_hash_link",
          ].includes(each.attribs["data-test"])
        )
          return true;
      }
    }
    return false;
  };

  const filterAddress = (i, each) => {
    if ("data-test" in each.attribs) {
      if (["token_link"].includes(each.attribs["data-test"])) return true;
    }

    if ("data-address-hash" in each.attribs) return true;
    return false;
  };

  // url/TokenAddress
  useEffect(() => {
    const addr = window.location.href;
    var splitList = addr.split("=");

    var tokenData = {
      totalBurnedTokens: {
        amount: 0,
      },
      onChainTreasury: {
        amount: 0,
        burned: 0,
      },
      liquidityTreasury: {
        amount: 0,
        burned: 0,
      },
    };

    var totalBurnedTokens = 0;
    var onChainTreasury = 0;
    var liquidityTreasury = 0;

    splitList = splitList.slice(-2);
    var addrList = splitList[1].split("/");
    var tokenContractAddress = addrList[0];
    var vestingContractAddress = addrList[1];

    var addressToName = {
      "0x0000000000000000000000000000000000000000": "Burn",
      "0x68569f86473d0a686f40e94b79fd9a1e3254b8fe": "On Chain Treasury",
      "0xf9351cfab08d72e873424708a817a067fa33f45f": "Liquidity Treasury",
    };
    addressToName[tokenContractAddress.toLowerCase()] = "Token";
    addressToName[vestingContractAddress.toLowerCase()] = "Vesting";

    console.log(addressToName);

    var link = null;

    if (dataMode == 0)
      link =
        "https://volta-explorer.energyweb.org/token/" +
        tokenContractAddress +
        "/token-transfers?type=JSON";
    if (dataMode == 1)
      link =
        "https://volta-explorer.energyweb.org/address/" +
        vestingContractAddress +
        "/token-transfers?type=JSON";

    // /token/0x24F2A99c5689501386f3E650C1cB99ec171C1494/token-transfers?block_number=22199494&index=8&items_count=50
    fetch(link, {
      method: "GET",
    }).then(async (response) => {
      var data = await response.json();
      var output = "";

      console.log(data);
      console.log("Size: ", data.length);
      var previousDestination = null; // store i - 1 th destinationa address

      for (var eachItem in data.items) {
        var mainData = data.items[eachItem];

        // Toggle all transfer to display
        var $ = cheerio.load(mainData, null, false);

        var link = $("* a").attr("href");
        link = "https://volta-explorer.energyweb.org" + link;

        $("* a").attr("href", link);

        $("*").find(".token-tile-view-more").remove().html();
        var transferData = $("*").find(".token-transfer-toggle");

        for (var i = 0; i < transferData.length; i++) {
          $("*").find(".token-transfer-toggle")[i]["attribs"]["class"] =
            "token-transfer-toggle show";
        }

        // parsing through token transfer to calculate total amounts for burn and liquidity
        var transferMemory = []; // from, to, Amount

        $("*")
          .filter(filterAddress)
          .each((i, eachOne) => {
            // parse through token amount
            // Token addition calcualtion WON'T be accuracte since javascript can only handle 15 decimal precision
            // Attempting to handle 18 decimal precision causes disassociation from the actual number (18 decimal)

            if (
              "data-test" in eachOne["attribs"] &&
              eachOne["attribs"]["data-test"] == "token_link"
            ) {
              console.log("here");
              // find the token amount transferred ~ previous item in the <span>
              var amountStr = eachOne["prev"]["data"];
              amountStr = amountStr.replace(/,/g, ""); // get rid of ,
              var amount = parseFloat(amountStr);
              transferMemory.push(amount);
              return;
            }

            var mode = null;

            if ("data-address-hash" in eachOne["attribs"]) {
              // retrieve address from the HTML code
              var address =
                eachOne["attribs"]["data-address-hash"].toLocaleLowerCase();

              if (address in addressToName) {
                mode = addressToName[address];
              }
            }

            transferMemory.push(mode);

            // Add the title in the span
            if (
              dataMode == 0 &&
              transferMemory.length >= 2 &&
              transferMemory[transferMemory.length - 1] != null
            ) {
              var to = transferMemory[transferMemory.length - 1];

              if (to == "Burn") {
                $(".tile-transaction-type-block").append(
                  '<br /><h1 className="font-500 text-xl"> To: Burning Address </h1>'
                );
              }

              if (to == "On Chain Treasury") {
                $(".tile-transaction-type-block").append(
                  '<br /><h1 className="font-500 text-xl"> To: On Chain Treasury </h1>'
                );
              }

              if (to == "Liquidity Treasury") {
                $(".tile-transaction-type-block").append(
                  '<br /><h1 className="font-500 text-xl"> To: Liquidity Treasury </h1>'
                );
              }
            }
          });

        console.log(transferMemory);
        // Very janky
        // figure out the burn and treasury amounts
        // [].length >= 3
        // 2nd data => 3rd item amount
        if (transferMemory.length >= 3) {
          console.log(transferMemory);

          for (var i = 1; i < transferMemory.length; i++) {
            if (typeof transferMemory[i] == "number") {
              // This does not work for Vesting Contract Transfers
              // Because the list is too populated with unnecessary data and burn data is at the top.
              if (transferMemory[i - 1] == "Burn") {
                tokenData["totalBurnedTokens"]["amount"] += transferMemory[i];

                // find out whether on Chain or Liquidity Treasury
                // will never log the Burn data before other data
                if (previousDestination == "On Chain Treasury")
                  tokenData["onChainTreasury"]["burned"] += transferMemory[i];
                if (previousDestination == "Liquidity Treasury")
                  tokenData["liquidityTreasury"]["burned"] += transferMemory[i];
              }

              totalBurnedTokens += transferMemory[i];
              if (transferMemory[i - 1] == "On Chain Treasury")
                tokenData["onChainTreasury"]["amount"] += transferMemory[i];
              if (transferMemory[i - 1] == "Liquidity Treasury")
                tokenData["liquidityTreasury"]["amount"] += transferMemory[i];

              if (previousDestination == null) {
                console.log(transferMemory[i - 1]);
                previousDestination = transferMemory[i - 1]
                  ? transferMemory[i - 1]
                  : null;
              }
            }
          }
        }

        // Assign naames to addresses in the transfer list
        $("*")
          .filter(filterAddress)
          .each((i, eachOne) => {
            if ("data-address-hash" in eachOne["attribs"]) {
              // retrieve address from the HTML code
              var address =
                eachOne["attribs"]["data-address-hash"].toLocaleLowerCase();

              // Extract the transaction type
              // Token Transfer / Token Burning / Token Minting
              var transactionTypeElement = $(
                ".tile-transaction-type-block"
              ).find("span");
              console.log(transactionTypeElement);
              var transactionType =
                transactionTypeElement[0]["children"][0]["data"];
              transactionType = transactionType.toString();
              transactionType = transactionType.replace(/\n/g, "");
              transactionType = transactionType.trim();

              console.log("Transaction type:", transactionType);
              if (transactionType === "Token Minting") {
                // 3 parent div -- remove -- not implemented yet

                var parentDiv =
                  transactionTypeElement[0]["parent"]["parent"]["parent"];
                // $(parentDiv).remove();
              }
              if (address in addressToName) {
                var htmlText = eachOne["children"][0]["data"];
                eachOne["children"][0]["data"] =
                  htmlText + " [" + addressToName[address] + "] ";
              }
            }
          });
        mainData = $.html();
        output += mainData;
      }

      setTokenData(tokenData);
      console.log(tokenData);
      setCode(output);
    });
  }, [dataMode]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-xl text-black">
          {dataMode == 0 ? (
            <>
              {tokenData ? (
                <>
                  <StatGroup>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> Liquidity Program / Treasury </b>
                      </a>
                      <StatNumber>
                        {tokenData["liquidityTreasury"]["amount"]} KNGT
                      </StatNumber>
                      <StatHelpText>
                        {tokenData["liquidityTreasury"]["burned"]} KNGT Burned
                      </StatHelpText>
                    </Stat>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> On-chain Treasury </b>
                      </a>
                      <StatNumber>
                        {tokenData["onChainTreasury"]["amount"]} KNGT
                      </StatNumber>
                      <StatHelpText>
                        {tokenData["onChainTreasury"]["burned"]} KNGT burned
                      </StatHelpText>
                    </Stat>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> Overall Burned </b>
                      </a>
                      <StatNumber>
                        {tokenData["totalBurnedTokens"]["amount"]} KNGT
                      </StatNumber>
                      {/* <StatHelpText size="xl">
                        0xEa803653B19Ba15E447e515A1Ec4a19687201427
                      </StatHelpText> */}
                    </Stat>
                  </StatGroup>
                </>
              ) : (
                <Spinner />
              )}
            </>
          ) : null}

          {dataMode == 1 ? (
            <>
              {tokenData ? (
                <>
                  <StatGroup>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> Liquidity Program / Treasury </b>
                      </a>
                      <StatNumber>
                        {tokenData["liquidityTreasury"]["amount"]} KNGT
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> On-chain Treasury </b>
                      </a>
                      <StatNumber>
                        {tokenData["onChainTreasury"]["amount"]} KNGT
                      </StatNumber>
                    </Stat>
                    <Stat>
                      <a href="what" target="_blank">
                        <b> Overall Burned </b>
                      </a>
                      <StatNumber>
                        {tokenData["totalBurnedTokens"]["amount"]} KNGT
                      </StatNumber>
                      {/* <StatHelpText size="xl">
                        0xEa803653B19Ba15E447e515A1Ec4a19687201427
                      </StatHelpText> */}
                    </Stat>
                  </StatGroup>
                </>
              ) : (
                <Spinner />
              )}
            </>
          ) : null}

          <p>
            {" "}
            Values above are not accurate due to lack of 18 decimal precision in
            this Web App. Please use it only as an approximate.{" "}
          </p>
        </h1>

        <br />

        <div class="flex justify-center flex-row">
          <button
            type="button"
            onClick={() => setMode(0)}
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            All Token Payment / Transfers
          </button>
          <button
            type="button"
            onClick={() => setMode(1)}
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          >
            Vesting Contract Transfers
          </button>
        </div>

        <br />

        <div
          className="content text-xl"
          dangerouslySetInnerHTML={{ __html: code }}
        ></div>
      </header>

      {}
    </div>
  );
}

export default App;
