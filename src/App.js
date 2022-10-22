import logo from './logo.svg';
import './App.css';
import {
  useHistory, useLocation,
} from "react-router-dom";
import { useEffect, useState } from 'react';
import {ethers} from "ethers";

function App() {
  const history = useHistory();
  const [totalTokens, setTokens] = useState(0);
  const [transactions, setTransactions] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const truncate = (input, len) =>
    input.length > len ? `${input.substring(0, len)}...` + `${input.substring(input.length - len, input.length)}` : input;

  // url/TokenAddress
  useEffect(() => {
    const addr = window.location.href;
    var splitList = addr.split("=");
    splitList = splitList.slice(-2);

    var contractAddress = splitList[1];
    setContractAddress(contractAddress);
    var totalTokens = 0;

    fetch("https://volta-explorer.energyweb.org/api?module=account&action=tokentx&address=0x68569F86473D0A686f40E94B79FD9a1e3254b8FE", {
      method: "GET"
    }).then(async(response) => {
      var data = await response.json();
      data = data.result.filter(
        function (item) {
          if (item.contractAddress === contractAddress && item.from !== "0x0000000000000000000000000000000000000000") {
            var date = new Date(parseInt(item.timeStamp) * 1000);
            var blc = ethers.utils.formatUnits(item.value);
            date = date.toUTCString();
            item.value = blc;
            item.timeStamp = date;
            totalTokens += parseFloat(blc);
            return true;
          }
        }
      );

      setTokens(totalTokens);
      setTransactions(data);
      console.log(data);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-xl">
          Total: {totalTokens}
          <br />
          Contract: {contractAddress}
        </h1>

        <br />
        
        { transactions !== null? (
        <div class="overflow-x-auto relative shadow-md sm:rounded-lg">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="py-3 px-6">
                      Date
                    </th>
                    <th scope="col" class="py-3 px-6">
                      Amount
                    </th>
                    <th scope="col" class="py-3 px-6">
                        From
                    </th>
                    <th scope="col" class="py-3 px-6">
                        Treasury Address
                    </th>
                </tr>
            </thead>
            <tbody>
                {transactions && transactions.map((each, index) => {
                  return (
                    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <th scope="row" class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {each.timeStamp}
                      </th>
                      <td class="py-4 px-6">
                          {each.value}
                      </td>
                      <td class="py-4 px-6">
                          {truncate(each.from, 6)}
                      </td>
                      <td class="py-4 px-6">
                          {truncate(each.to, 6)}
                      </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        ) : (
          <h1 className="text-xl font-bold">
            Loading
        </h1>     
        )}
      </header>
    </div>
  );
}

export default App;
