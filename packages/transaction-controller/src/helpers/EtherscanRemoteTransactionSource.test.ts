import { v1 as random } from 'uuid';

import { CHAIN_IDS } from '../constants';
import { TransactionStatus } from '../types';
import type {
  EtherscanTokenTransactionMeta,
  EtherscanTransactionMeta,
  EtherscanTransactionMetaBase,
  EtherscanTransactionResponse,
} from '../utils/etherscan';
import {
  fetchEtherscanTokenTransactions,
  fetchEtherscanTransactions,
} from '../utils/etherscan';
import { EtherscanRemoteTransactionSource } from './EtherscanRemoteTransactionSource';

jest.mock('../utils/etherscan', () => ({
  fetchEtherscanTransactions: jest.fn(),
  fetchEtherscanTokenTransactions: jest.fn(),
}));

jest.mock('uuid');

const ID_MOCK = '6843ba00-f4bf-11e8-a715-5f2fff84549d';

const ETHERSCAN_TRANSACTION_BASE_MOCK: EtherscanTransactionMetaBase = {
  blockNumber: '4535105',
  confirmations: '4',
  contractAddress: '',
  cumulativeGasUsed: '693910',
  from: '0x6bf137f335ea1b8f193b8f6ea92561a60d23a207',
  gas: '335208',
  gasPrice: '20000000000',
  gasUsed: '21000',
  hash: '0x342e9d73e10004af41d04973339fc7219dbadcbb5629730cfe65e9f9cb15ff91',
  nonce: '1',
  timeStamp: '1543596356',
  transactionIndex: '13',
  value: '50000000000000000',
  blockHash: '0x0000000001',
  to: '0x6bf137f335ea1b8f193b8f6ea92561a60d23a207',
};

const ETHERSCAN_TRANSACTION_SUCCESS_MOCK: EtherscanTransactionMeta = {
  ...ETHERSCAN_TRANSACTION_BASE_MOCK,
  functionName: 'testFunction',
  input: '0x',
  isError: '0',
  methodId: 'testId',
  txreceipt_status: '1',
};

const ETHERSCAN_TRANSACTION_ERROR_MOCK: EtherscanTransactionMeta = {
  ...ETHERSCAN_TRANSACTION_SUCCESS_MOCK,
  isError: '1',
};

const ETHERSCAN_TOKEN_TRANSACTION_MOCK: EtherscanTokenTransactionMeta = {
  ...ETHERSCAN_TRANSACTION_BASE_MOCK,
  tokenDecimal: '456',
  tokenName: 'TestToken',
  tokenSymbol: 'ABC',
};

const ETHERSCAN_TRANSACTION_RESPONSE_MOCK: EtherscanTransactionResponse<EtherscanTransactionMeta> =
  {
    status: '1',
    result: [
      ETHERSCAN_TRANSACTION_SUCCESS_MOCK,
      ETHERSCAN_TRANSACTION_ERROR_MOCK,
    ],
  };

const ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_MOCK: EtherscanTransactionResponse<EtherscanTokenTransactionMeta> =
  {
    status: '1',
    result: [
      ETHERSCAN_TOKEN_TRANSACTION_MOCK,
      ETHERSCAN_TOKEN_TRANSACTION_MOCK,
    ],
  };

const ETHERSCAN_TRANSACTION_RESPONSE_EMPTY_MOCK: EtherscanTransactionResponse<EtherscanTransactionMeta> =
  {
    status: '0',
    result: '',
  };

const ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_EMPTY_MOCK: EtherscanTransactionResponse<EtherscanTokenTransactionMeta> =
  ETHERSCAN_TRANSACTION_RESPONSE_EMPTY_MOCK as any;

const ETHERSCAN_TRANSACTION_RESPONSE_ERROR_MOCK: EtherscanTransactionResponse<EtherscanTransactionMeta> =
  {
    status: '0',
    message: 'NOTOK',
    result: 'Test Error',
  };

const ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_ERROR_MOCK: EtherscanTransactionResponse<EtherscanTokenTransactionMeta> =
  ETHERSCAN_TRANSACTION_RESPONSE_ERROR_MOCK as any;

const EXPECTED_NORMALISED_TRANSACTION_BASE = {
  blockNumber: ETHERSCAN_TRANSACTION_SUCCESS_MOCK.blockNumber,
  chainId: undefined,
  hash: ETHERSCAN_TRANSACTION_SUCCESS_MOCK.hash,
  id: ID_MOCK,
  status: TransactionStatus.confirmed,
  time: 1543596356000,
  txParams: {
    chainId: undefined,
    from: ETHERSCAN_TRANSACTION_SUCCESS_MOCK.from,
    gas: '0x51d68',
    gasPrice: '0x4a817c800',
    gasUsed: '0x5208',
    nonce: '0x1',
    to: ETHERSCAN_TRANSACTION_SUCCESS_MOCK.to,
    value: '0xb1a2bc2ec50000',
  },
  verifiedOnBlockchain: false,
};

const EXPECTED_NORMALISED_TRANSACTION_SUCCESS = {
  ...EXPECTED_NORMALISED_TRANSACTION_BASE,
  txParams: {
    ...EXPECTED_NORMALISED_TRANSACTION_BASE.txParams,
    data: ETHERSCAN_TRANSACTION_SUCCESS_MOCK.input,
  },
};

const EXPECTED_NORMALISED_TRANSACTION_ERROR = {
  ...EXPECTED_NORMALISED_TRANSACTION_SUCCESS,
  error: new Error('Transaction failed'),
  status: TransactionStatus.failed,
};

const EXPECTED_NORMALISED_TOKEN_TRANSACTION = {
  ...EXPECTED_NORMALISED_TRANSACTION_BASE,
  isTransfer: true,
  transferInformation: {
    contractAddress: '',
    decimals: Number(ETHERSCAN_TOKEN_TRANSACTION_MOCK.tokenDecimal),
    symbol: ETHERSCAN_TOKEN_TRANSACTION_MOCK.tokenSymbol,
  },
};

describe('EtherscanRemoteTransactionSource', () => {
  const fetchEtherscanTransactionsMock =
    fetchEtherscanTransactions as jest.MockedFn<
      typeof fetchEtherscanTransactions
    >;

  const fetchEtherscanTokenTransactionsMock =
    fetchEtherscanTokenTransactions as jest.MockedFn<
      typeof fetchEtherscanTokenTransactions
    >;

  const randomMock = random as jest.MockedFn<typeof random>;

  beforeEach(() => {
    jest.resetAllMocks();

    fetchEtherscanTransactionsMock.mockResolvedValue(
      ETHERSCAN_TRANSACTION_RESPONSE_EMPTY_MOCK,
    );

    fetchEtherscanTokenTransactionsMock.mockResolvedValue(
      ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_EMPTY_MOCK,
    );

    randomMock.mockReturnValue(ID_MOCK);
  });

  describe('isSupportedNetwork', () => {
    it('returns true if chain ID in constant', () => {
      expect(
        new EtherscanRemoteTransactionSource().isSupportedNetwork(
          CHAIN_IDS.MAINNET,
        ),
      ).toBe(true);
    });

    it('returns false if chain ID not in constant', () => {
      expect(
        new EtherscanRemoteTransactionSource().isSupportedNetwork(
          '0x1324567891234',
        ),
      ).toBe(false);
    });
  });

  describe('getLastBlockVariations', () => {
    it('returns normal if normal request', () => {
      expect(
        new EtherscanRemoteTransactionSource().getLastBlockVariations(),
      ).toStrictEqual(['normal']);
    });

    it('returns token if token request', async () => {
      const remoteSource = new EtherscanRemoteTransactionSource();
      await remoteSource.fetchTransactions({} as any);

      expect(remoteSource.getLastBlockVariations()).toStrictEqual(['token']);
    });

    it('always returns normal if token requests disabled', async () => {
      const remoteSource = new EtherscanRemoteTransactionSource({
        includeTokenTransfers: false,
      });

      await remoteSource.fetchTransactions({} as any);

      expect(remoteSource.getLastBlockVariations()).toStrictEqual(['normal']);
    });
  });

  describe('fetchTransactions', () => {
    it('returns normalized transactions fetched from Etherscan', async () => {
      fetchEtherscanTransactionsMock.mockResolvedValueOnce(
        ETHERSCAN_TRANSACTION_RESPONSE_MOCK,
      );

      const transactions =
        await new EtherscanRemoteTransactionSource().fetchTransactions(
          {} as any,
        );

      expect(transactions).toStrictEqual([
        EXPECTED_NORMALISED_TRANSACTION_SUCCESS,
        EXPECTED_NORMALISED_TRANSACTION_ERROR,
      ]);
    });

    it('returns normalized token transactions fetched from Etherscan', async () => {
      fetchEtherscanTokenTransactionsMock.mockResolvedValueOnce(
        ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_MOCK,
      );

      const remoteSource = new EtherscanRemoteTransactionSource();

      await remoteSource.fetchTransactions({} as any);

      const transactions = await remoteSource.fetchTransactions({} as any);

      expect(transactions).toStrictEqual([
        EXPECTED_NORMALISED_TOKEN_TRANSACTION,
        EXPECTED_NORMALISED_TOKEN_TRANSACTION,
      ]);
    });

    it('alternates between normal and token transactions', async () => {
      fetchEtherscanTransactionsMock.mockResolvedValueOnce(
        ETHERSCAN_TRANSACTION_RESPONSE_MOCK,
      );

      fetchEtherscanTokenTransactionsMock.mockResolvedValueOnce(
        ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_MOCK,
      );

      const remoteSource = new EtherscanRemoteTransactionSource();

      await remoteSource.fetchTransactions({} as any);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(1);
      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(0);

      await remoteSource.fetchTransactions({} as any);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(1);
      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(1);

      await remoteSource.fetchTransactions({} as any);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(2);
      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(1);

      await remoteSource.fetchTransactions({} as any);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(2);
      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(2);

      await remoteSource.fetchTransactions({} as any);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(3);
      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(2);
    });

    it('returns no normalized token transactions if flag disabled', async () => {
      fetchEtherscanTokenTransactionsMock.mockResolvedValueOnce(
        ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_MOCK,
      );

      const remoteSource = new EtherscanRemoteTransactionSource({
        includeTokenTransfers: false,
      });

      await remoteSource.fetchTransactions({} as any);
      await remoteSource.fetchTransactions({} as any);
      await remoteSource.fetchTransactions({} as any);

      expect(fetchEtherscanTokenTransactionsMock).toHaveBeenCalledTimes(0);
      expect(fetchEtherscanTransactionsMock).toHaveBeenCalledTimes(3);
    });

    it.each([
      ['no transactions found', ETHERSCAN_TRANSACTION_RESPONSE_EMPTY_MOCK],
      ['error', ETHERSCAN_TRANSACTION_RESPONSE_ERROR_MOCK],
    ])(
      'returns empty array if %s in normal transaction request',
      async (_, response) => {
        fetchEtherscanTransactionsMock.mockResolvedValueOnce(response);

        const transactions =
          await new EtherscanRemoteTransactionSource().fetchTransactions(
            {} as any,
          );

        expect(transactions).toStrictEqual([]);
      },
    );

    it.each([
      [
        'no transactions found',
        ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_EMPTY_MOCK,
      ],
      ['error', ETHERSCAN_TOKEN_TRANSACTION_RESPONSE_ERROR_MOCK],
    ])(
      'returns empty array if %s in token transaction request',
      async (_, response) => {
        fetchEtherscanTokenTransactionsMock.mockResolvedValueOnce(response);

        const remoteSource = new EtherscanRemoteTransactionSource();
        await remoteSource.fetchTransactions({} as any);

        const transactions = await remoteSource.fetchTransactions({} as any);

        expect(transactions).toStrictEqual([]);
      },
    );
  });
});
