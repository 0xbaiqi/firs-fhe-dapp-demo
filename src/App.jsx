import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { initSDK, createInstance } from "@zama-fhe/relayer-sdk/bundle";

import FHECounterABI from '../abi/FHECounter.json';
import { useI18n } from './hooks/useI18n';

const CONTRACT_ADDRESS = "0xA5e526b0e1259A5CD0E816B1dB06251B5D6a0EA0";
const SEPOLIA_CHAIN_ID = 11155111;

function App() {
  const { t, locale, toggleLocale } = useI18n();
  const [instance, setInstance] = useState(null);
  const [contract, setContract] = useState(null);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);

  const checkNetwork = async (provider) => {
    try {
      const network = await provider.getNetwork();
      setCurrentNetwork(network.chainId);
      return network.chainId === BigInt(SEPOLIA_CHAIN_ID);
    } catch (err) {
      console.error(t('common.networkError'), err);
      return false;
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16) }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SepoliaETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }]
          });
          return true;
        } catch (addError) {
          console.error(t('common.networkError'), addError);
          return false;
        }
      }
      console.error(t('common.networkError'), switchError);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error(t('wallet.install'));
      }

      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);

      const isCorrectNetwork = await checkNetwork(ethProvider);
      if (!isCorrectNetwork) {
        const switched = await switchNetwork();
        if (!switched) {
          throw new Error(t('wallet.switchNetwork'));
        }
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const ethSigner = await ethProvider.getSigner();
      setSigner(ethSigner);
      setIsWalletConnected(true);

      await initSDK();
      
      const config = {
        chainId: SEPOLIA_CHAIN_ID,
        gatewayChainId: 55815,
        aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
        kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
        inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
        verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
        verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
        relayerUrl: "https://relayer.testnet.zama.cloud",
        network: window.ethereum
      };

      const fheInstance = await createInstance(config);
      setInstance(fheInstance);

      const counterContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        FHECounterABI.abi,
        ethSigner
      );
      setContract(counterContract);
      
    } catch (err) {
      console.error(t('common.unknownError'), err);
      setError(err.message);
      setIsWalletConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (chainId) => {
        setCurrentNetwork(parseInt(chainId));
        if (parseInt(chainId) !== SEPOLIA_CHAIN_ID) {
          setError(t('wallet.switchNetwork'));
          setIsWalletConnected(false);
          setInstance(null);
          setContract(null);
          setSigner(null);
        }
      });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setIsWalletConnected(false);
          setInstance(null);
          setContract(null);
          setSigner(null);
          setError(t('wallet.disconnected'));
        }
      });
    }
  }, [t]);

  const getCount = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const encryptedCount = await contract.getCount();
      console.log(t('merit.current'), encryptedCount);
      
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedCount,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        await signer.getAddress(),
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[encryptedCount];
      setCount(decryptedValue);
      
    } catch (err) {
      console.error(t('merit.viewFailed'), err);
      setError(t('merit.viewFailed'));
    } finally {
      setLoading(false);
    }
  };

  const increment = async () => {
    if (!instance || !contract || !signer) {
      setError(t('common.initFailed'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasInteracted(true);

      const userAddress = await signer.getAddress();
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      buffer.add32(BigInt(1));

      const ciphertexts = await buffer.encrypt();

      if (!ciphertexts || !ciphertexts.handles || !ciphertexts.inputProof) {
        throw new Error(t('common.unknownError'));
      }

      const handle = ciphertexts.handles[0];
      const proof = ciphertexts.inputProof;

      if (!handle || !proof) {
        throw new Error(t('common.unknownError'));
      }

      const tx = await contract.increment(handle, proof);
      await tx.wait();
      await getCount();
    } catch (err) {
      console.error(t('merit.accumulateFailed'), err);
      setError(t('merit.accumulateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const decrement = async () => {
    if (!instance || !contract || !signer) {
      setError(t('common.initFailed'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasInteracted(true);

      const userAddress = await signer.getAddress();
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      buffer.add32(BigInt(-1));

      const ciphertexts = await buffer.encrypt();

      if (!ciphertexts || !ciphertexts.handles || !ciphertexts.inputProof) {
        throw new Error(t('common.unknownError'));
      }

      const handle = ciphertexts.handles[0];
      const proof = ciphertexts.inputProof;

      if (!handle || !proof) {
        throw new Error(t('common.unknownError'));
      }

      const tx = await contract.increment(handle, proof);
      await tx.wait();
      await getCount();
    } catch (err) {
      console.error(t('merit.reduceFailed'), err);
      setError(t('merit.reduceFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto w-full px-4 sm:px-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative bg-white shadow-lg sm:rounded-3xl px-4 py-8 sm:p-16 w-full sm:min-w-[28rem]">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="space-y-6 text-base leading-6 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                  <button
                    onClick={toggleLocale}
                    className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200 ease-in-out text-gray-700"
                  >
                    {locale === 'zh' ? 'EN' : '中文'}
                  </button>
                </div>

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('instructions.title')}</h2>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600">
                    {t('instructions.steps').map((step, index) => (
                      <li key={index} className="pl-2">{step}</li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md" role="alert">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <div className="mt-8">
                  {!isWalletConnected ? (
                    <button
                      onClick={connectWallet}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 ease-in-out font-medium"
                    >
                      {loading ? t('common.processing') : t('wallet.connect')}
                    </button>
                  ) : (
                    <>
                      <div className="text-green-600 mb-6 font-medium flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {t('wallet.connected')}
                      </div>
                      <div className="space-y-6">
                        <button
                          onClick={getCount}
                          disabled={loading}
                          className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 ease-in-out font-medium"
                        >
                          {t('merit.view')}
                        </button>

                        <div className="text-center text-2xl font-bold my-6 text-gray-800">
                          {t('merit.current')}: <span className="text-blue-600">{count === null ? t('merit.unknown') : count.toString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={increment}
                            disabled={loading}
                            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 ease-in-out font-medium"
                          >
                            {loading ? t('common.processing') : t('merit.accumulate')}
                          </button>

                          <button
                            onClick={decrement}
                            disabled={loading}
                            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 ease-in-out font-medium"
                          >
                            {loading ? t('common.processing') : t('merit.reduce')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 