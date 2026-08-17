import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../domain/currency';
import {
  assembleDailyRateQuotes,
  decimalRateString,
  ExchangeApiDailyRateProvider,
  type ExchangeApiDocumentsByBase,
} from './exchange-api-daily-rate-provider';

const DATE = '2026-08-17';

/** A full fawazahmed0-shaped document for `base`, quoting every other Supported Currency. */
function documentFor(
  base: SupportedCurrency,
  rates: Partial<Record<SupportedCurrency, number>>,
): unknown {
  const body: Record<string, number> = {};
  for (const [quote, value] of Object.entries(rates)) {
    body[quote.toLowerCase()] = value;
  }
  return { date: DATE, [base.toLowerCase()]: body };
}

/** Every Supported Currency's document, each quoting every other Supported Currency at `value`. */
function fullMatrix(value: number): ExchangeApiDocumentsByBase {
  const documents: ExchangeApiDocumentsByBase = {};
  for (const base of SUPPORTED_CURRENCIES) {
    const rates: Partial<Record<SupportedCurrency, number>> = {};
    for (const quote of SUPPORTED_CURRENCIES) {
      if (quote === base) continue;
      rates[quote] = value;
    }
    documents[base] = documentFor(base, rates);
  }
  return documents;
}

describe('decimalRateString', () => {
  it('formats an exponential-small input as plain fixed notation', () => {
    expect(decimalRateString(4.4e-7)).toBe('0.0000004400');
  });

  it('formats a large value without mangling it', () => {
    expect(decimalRateString(25400.5)).toBe('25400.5000000000');
  });

  it('keeps ten fractional digits for a value that already has fewer', () => {
    expect(decimalRateString(1.23)).toBe('1.2300000000');
  });
});

describe('assembleDailyRateQuotes', () => {
  it('returns all 90 ordered-pair quotes from a fully populated matrix', () => {
    const documents = fullMatrix(2);
    const quotes = assembleDailyRateQuotes(documents);

    expect(quotes).toHaveLength(90);
    expect(quotes).toContainEqual({
      baseCurrency: 'VND',
      quoteCurrency: 'USD',
      rate: decimalRateString(2),
    });
  });

  it('derives the inverse when only one direction was fetched', () => {
    const documents = fullMatrix(2);
    // Drop VND -> USD but keep USD -> VND (at a distinct, non-reciprocal value).
    const vndDoc = documentFor(
      'VND',
      Object.fromEntries(
        SUPPORTED_CURRENCIES.filter((c) => c !== 'VND' && c !== 'USD').map(
          (c) => [c, 2],
        ),
      ),
    );
    documents.VND = vndDoc;
    documents.USD = documentFor(
      'USD',
      Object.fromEntries(
        SUPPORTED_CURRENCIES.filter((c) => c !== 'USD').map((c) =>
          c === 'VND' ? [c, 25400.5] : [c, 2],
        ),
      ),
    );

    const quotes = assembleDailyRateQuotes(documents);

    expect(quotes).toContainEqual({
      baseCurrency: 'VND',
      quoteCurrency: 'USD',
      rate: decimalRateString(1 / 25400.5),
    });
  });

  it('throws naming a pair missing in both directions', () => {
    const documents = fullMatrix(2);
    const withoutUsd = documentFor(
      'VND',
      Object.fromEntries(
        SUPPORTED_CURRENCIES.filter((c) => c !== 'VND' && c !== 'USD').map(
          (c) => [c, 2],
        ),
      ),
    );
    documents.VND = withoutUsd;
    const withoutVnd = documentFor(
      'USD',
      Object.fromEntries(
        SUPPORTED_CURRENCIES.filter((c) => c !== 'USD' && c !== 'VND').map(
          (c) => [c, 2],
        ),
      ),
    );
    documents.USD = withoutVnd;

    expect(() => assembleDailyRateQuotes(documents)).toThrow(
      /VND.*USD|USD.*VND/,
    );
  });

  it('ignores unsupported currencies present in the payload', () => {
    const documents = fullMatrix(2);
    documents.VND = {
      date: DATE,
      vnd: {
        usd: 2,
        eur: 2,
        gbp: 2,
        jpy: 2,
        sgd: 2,
        aud: 2,
        cad: 2,
        krw: 2,
        thb: 2,
        xyz: 999999, // not a Supported Currency
      },
    };

    const quotes = assembleDailyRateQuotes(documents);
    expect(quotes).toHaveLength(90);
    expect(quotes.some((q) => (q.quoteCurrency as string) === 'XYZ')).toBe(
      false,
    );
  });

  it('rounds a sub-precision value to zero and treats the pair as missing', () => {
    const documents = fullMatrix(2);
    documents.VND = documentFor(
      'VND',
      Object.fromEntries(
        SUPPORTED_CURRENCIES.filter((c) => c !== 'VND').map((c) =>
          c === 'USD' ? [c, 1e-11] : [c, 2],
        ),
      ),
    );

    expect(() => assembleDailyRateQuotes(documents)).toThrow(/VND.*USD/);
  });
});

describe('ExchangeApiDailyRateProvider', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockDocumentResponse(url: string): {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  } {
    const match = /currencies\/([a-z]+)\.min\.json$/.exec(url);
    const base = match![1].toUpperCase() as SupportedCurrency;
    const rates: Partial<Record<SupportedCurrency, number>> = {};
    for (const quote of SUPPORTED_CURRENCIES) {
      if (quote === base) continue;
      rates[quote] = 2;
    }
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(documentFor(base, rates)),
    };
  }

  it('requests the primary host with the documented URL shape', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input) =>
        Promise.resolve(mockDocumentResponse(input as string) as Response),
      );

    const provider = new ExchangeApiDailyRateProvider();
    await provider.fetchRates(DATE);

    expect(fetchSpy.mock.calls[0][0] as string).toBe(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${DATE}/v1/currencies/vnd.min.json`,
    );
  });

  it('falls back to the second host when the primary fails', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = input as string;
      if (url.includes('cdn.jsdelivr.net')) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve(mockDocumentResponse(url) as Response);
    });

    const provider = new ExchangeApiDailyRateProvider();
    const quotes = await provider.fetchRates(DATE);

    expect(quotes).toHaveLength(90);
    const fallbackCalls = fetchSpy.mock.calls
      .map((call) => call[0] as string)
      .filter((url) => url.includes('currency-api.pages.dev'));
    expect(fallbackCalls.length).toBeGreaterThan(0);
    expect(fallbackCalls[0]).toBe(
      `https://${DATE}.currency-api.pages.dev/v1/currencies/vnd.min.json`,
    );
  });

  it('rejects when both hosts fail', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network error'));

    const provider = new ExchangeApiDailyRateProvider();
    await expect(provider.fetchRates(DATE)).rejects.toThrow();
  });

  it('treats a non-OK response as a failure and falls back', async () => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = input as string;
      if (url.includes('cdn.jsdelivr.net')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('should not be called')),
        } as Response);
      }
      return Promise.resolve(mockDocumentResponse(url) as Response);
    });

    const provider = new ExchangeApiDailyRateProvider();
    const quotes = await provider.fetchRates(DATE);
    expect(quotes).toHaveLength(90);
  });
});
