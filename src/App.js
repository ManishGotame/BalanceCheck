import logo from './logo.svg';
import './App.css';
import {
  useHistory, useLocation,
} from "react-router-dom";
import { useEffect, useState } from 'react';
import {ethers} from "ethers";
import { parse } from 'node-html-parser';

const cheerio = require("cheerio");


function App() {
  const history = useHistory();
  const [liquidityTokens, setliquidityTokens] = useState(0);
  const [burnedTokens, setBurnedTokens] = useState(0);
  const truncate = (input, len) =>
    input.length > len ? `${input.substring(0, len)}...` + `${input.substring(input.length - len, input.length)}` : input;

  const [code, setCode] = useState(null);
  // 0 => All Transfers
  // 1 => Contract Transfers
  const [dataMode, setMode] = useState(0);


  const tokenTransfer = (i, each) => {
    if ("data-test" in each.attribs) {
      // Not needed but could prevent any further bugs in the future
      if (dataMode == 0) {
        if (([
          "token-transfer",
          // "address_hash_link",
        ]).includes(each.attribs["data-test"])) return true;
      }

      if (dataMode == 1) {
        if (([
          "token_transfer"
          // "address_hash_link",
        ]).includes(each.attribs["data-test"])) return true;
      }
     

    }
    return false;
  }
  
  const filterAddress = (i, each) => {
    if ("data-test" in each.attribs) {
      if (["token_link"].includes(each.attribs["data-test"])) return true;
    }

    if ("data-address-hash" in each.attribs) return true;
    return false;
  }

  // url/TokenAddress
  useEffect(() => {
    const addr = window.location.href;
    var splitList = addr.split("=");
    var totalBurnedTokens = 0;
    var totalTreasuryTokens = 0;
    
    splitList = splitList.slice(-2);
    var addrList = splitList[1].split("/");
    var tokenContractAddress = addrList[0];
    var vestingContractAddress = addrList[1];


    var addressToName = {
      '0x0000000000000000000000000000000000000000': 'Burn',
      '0x68569f86473d0a686f40e94b79fd9a1e3254b8fe': 'Treasury',
    }
    addressToName[  tokenContractAddress.toLowerCase()] = 'Token';
    addressToName[vestingContractAddress.toLowerCase()] = "Vesting";
    
    console.log(addressToName);

    var link = null;

    if (dataMode == 0) link = "https://volta-explorer.energyweb.org/token/" + tokenContractAddress + "/token-transfers?type=JSON";
    if (dataMode == 1) link = "https://volta-explorer.energyweb.org/address/" + vestingContractAddress + "/token-transfers?type=JSON"; 

    fetch(link, {
      method: "GET"
    }).then(async(response) => {
      var data = await response.json();
      var output = "";

      console.log(data);
      
      for (var eachItem in data.items) {
        var mainData = data.items[eachItem];

        // Toggle all transfer to display
        var $ = cheerio.load(mainData, null, false);
        $("*").find(".token-tile-view-more").remove().html();
        var transferData = $("*").find(".token-transfer-toggle");

        for(var i=0; i < transferData.length; i++) {
          $("*").find(".token-transfer-toggle")[i]["attribs"]["class"] = "token-transfer-toggle show";
        }

        // parsing through token transfer to calculate total amounts for burn and liquidity
        var transferMemory = []; // from, to, Amount

        $("*").filter(tokenTransfer).each(function() {
          var tokenTransferData = ($(this).html());
          var transfer = cheerio.load(tokenTransferData, null, false);

          $("*").filter(filterAddress).each((i, eachOne) => {
            
            // parse through token amount
            // Token addition calcualtion WON'T be accuracte since javascript can only handle 15 decimal precision
            // Attempting to handle 18 decimal precision causes disassociation from the actual number (18 decimal)
            if ("data-test" in eachOne["attribs"] && eachOne["attribs"]["data-test"] == "token_link") {
              console.log("here");
              // find the token amount transferred ~ previous item in the <span>
              var amountStr = eachOne["prev"]["data"];
              amountStr = amountStr.replace(/,/g, '');
              var amount = parseFloat(amountStr);
              transferMemory.push(amount);
              return;
            }
            
            var mode = null;

            console.log(eachOne);
            if ("data-address-hash" in eachOne["attribs"]) {
              // retrieve address from the HTML code
              var address = eachOne["attribs"]["data-address-hash"].toLocaleLowerCase();
    
              if (address in addressToName) {
                mode = addressToName[address]; 
                             
              }
            }

            transferMemory.push(mode);
            if (dataMode == 0 && transferMemory.length >= 2 && transferMemory[transferMemory.length - 1] != null ) {
              var to = transferMemory[transferMemory.length - 1];

              if (to == "Burn") {
                $(".tile-transaction-type-block").append('<br /><h1 className="font-500 text-xl"> To: Burning Address </h1>');
              }

              if (to == "Treasury") {
                $(".tile-transaction-type-block").append('<br /><h1 className="font-500 text-xl"> To: Liquidity Treasury </h1>');
              }
              console.log(transferMemory);
            }
          });
        });
       
        // Very janky
        // figure out the burn and treasury amounts
        // [].length >= 3
        // 2nd data => 3rd item amount
        if (transferMemory.length >= 3) {
          console.log(transferMemory);
          
          for (var i=1; i < transferMemory.length; i++) {
            if (typeof(transferMemory[i]) == 'number') {
              if (transferMemory[i-1] == "Burn") totalBurnedTokens += transferMemory[i];
              if (transferMemory[i-1] == "Treasury") totalTreasuryTokens += transferMemory[i];  
            }
          }
        }

        // Assign naames to addresses in the transfer list
        $("*").filter(filterAddress).each((i, eachOne) => {      
          if ("data-address-hash" in eachOne["attribs"]) {
            // retrieve address from the HTML code
            var address = eachOne["attribs"]["data-address-hash"].toLocaleLowerCase();

            if (address in addressToName) {          
              var htmlText = eachOne["children"][0]["data"];
              eachOne["children"][0]["data"] = htmlText + " [" + addressToName[address] + "] ";

              // Add a bigger title perhaps
            }
          }
        });
        mainData = $.html();
        output += mainData;
      }

      console.log(totalBurnedTokens, totalTreasuryTokens);
      setBurnedTokens(totalBurnedTokens);
      setliquidityTokens(totalTreasuryTokens);

      setCode(output);
        
    });
  }, [dataMode]);

  return (
    <div className="App">

      <header className="App-header">
        <h1 className="text-xl text-black">
          Liquidity Treasury: {liquidityTokens} KNGT
          <br />
          Actual Burned Amount: {burnedTokens} KNGT
          <p> Values above are not accurate due to lack of 18 decimal precision in this Web App. Please use it only as an approximate. </p>
        </h1>

        <br />

        <div class="flex justify-center flex-row">
          <button type="button" onClick={() => setMode(0)}class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
            All Token Payment / Transfers
          </button>
          <button type="button" onClick={() => setMode(1)} class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
            Vesting Contract Transfers
          </button>
        </div>

        <br />
      

        <div className="content text-xl" dangerouslySetInnerHTML={{__html: code}}></div>
        
      </header>

      {}
    </div>
  );
}

export default App;
