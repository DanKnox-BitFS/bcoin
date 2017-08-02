/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('assert');
const BN = require('../lib/crypto/bn');
const base58 = require('../lib/utils/base58');
const encoding = require('../lib/utils/encoding');
const Amount = require('../lib/btc/amount');
const consensus = require('../lib/protocol/consensus');
const Validator = require('../lib/utils/validator');

const base58Tests = [
  ['', ''],
  ['61', '2g'],
  ['626262', 'a3gV'],
  ['636363', 'aPEr'],
  [
    '73696d706c792061206c6f6e6720737472696e67',
    '2cFupjhnEsSn59qHXstmK2ffpLv2'
  ],
  [
    '00eb15231dfceb60925886b67d065299925915aeb172c06647',
    '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'
  ],
  ['516b6fcd0f', 'ABnLTmg'],
  ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
  ['572e4794', '3EFU7m'],
  ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'],
  ['10c8511e', 'Rt5zm'],
  ['00000000000000000000', '1111111111']
];

describe('Utils', function() {
  it('should encode/decode base58', () => {
    const buf = Buffer.from('000000deadbeef', 'hex');
    const str = base58.encode(buf);

    assert.equal(str, '1116h8cQN');
    assert.deepEqual(base58.decode(str), buf);

    for (const [hex, b58] of base58Tests) {
      const data = Buffer.from(hex, 'hex');
      assert.equal(base58.encode(data), b58);
      assert.deepEqual(base58.decode(b58), data);
    }
  });

  it('should verify proof-of-work', () => {
    const bits = 0x1900896c;

    const hash = Buffer.from(
      '672b3f1bb11a994267ea4171069ba0aa4448a840f38e8f340000000000000000',
      'hex'
    );

    assert(consensus.verifyPOW(hash, bits));
  });

  it('should convert satoshi to btc', () => {
    let btc = Amount.btc(5460);
    assert.equal(btc, '0.0000546');
    btc = Amount.btc(54678 * 1000000);
    assert.equal(btc, '546.78');
    btc = Amount.btc(5460 * 10000000);
    assert.equal(btc, '546.0');
  });

  it('should convert btc to satoshi', () => {
    let btc = Amount.value('0.0000546');
    assert(btc === 5460);
    btc = Amount.value('546.78');
    assert(btc === 54678 * 1000000);
    btc = Amount.value('546');
    assert(btc === 5460 * 10000000);
    btc = Amount.value('546.0');
    assert(btc === 5460 * 10000000);
    btc = Amount.value('546.0000');
    assert(btc === 5460 * 10000000);
    assert.doesNotThrow(() => {
      Amount.value('546.00000000000000000');
    });
    assert.throws(() => {
      Amount.value('546.00000000000000001');
    });
    assert.doesNotThrow(() => {
      Amount.value('90071992.54740991');
    });
    assert.doesNotThrow(() => {
      Amount.value('090071992.547409910');
    });
    assert.throws(() => {
      Amount.value('90071992.54740992');
    });
    assert.throws(() => {
      Amount.value('190071992.54740991');
    });
  });

  it('should write/read new varints', () => {
    /*
     * 0:         [0x00]  256:        [0x81 0x00]
     * 1:         [0x01]  16383:      [0xFE 0x7F]
     * 127:       [0x7F]  16384:      [0xFF 0x00]
     * 128:  [0x80 0x00]  16511: [0x80 0xFF 0x7F]
     * 255:  [0x80 0x7F]  65535: [0x82 0xFD 0x7F]
     * 2^32:           [0x8E 0xFE 0xFE 0xFF 0x00]
     */

    let b = Buffer.allocUnsafe(1);
    b.fill(0x00);
    encoding.writeVarint2(b, 0, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 0);
    assert.deepEqual(b, [0]);

    b = Buffer.allocUnsafe(1);
    b.fill(0x00);
    encoding.writeVarint2(b, 1, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 1);
    assert.deepEqual(b, [1]);

    b = Buffer.allocUnsafe(1);
    b.fill(0x00);
    encoding.writeVarint2(b, 127, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 127);
    assert.deepEqual(b, [0x7f]);

    b = Buffer.allocUnsafe(2);
    b.fill(0x00);
    encoding.writeVarint2(b, 128, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 128);
    assert.deepEqual(b, [0x80, 0x00]);

    b = Buffer.allocUnsafe(2);
    b.fill(0x00);
    encoding.writeVarint2(b, 255, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 255);
    assert.deepEqual(b, [0x80, 0x7f]);

    b = Buffer.allocUnsafe(2);
    b.fill(0x00);
    encoding.writeVarint2(b, 16383, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 16383);
    assert.deepEqual(b, [0xfe, 0x7f]);

    b = Buffer.allocUnsafe(2);
    b.fill(0x00);
    encoding.writeVarint2(b, 16384, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 16384);
    assert.deepEqual(b, [0xff, 0x00]);

    b = Buffer.allocUnsafe(3);
    b.fill(0x00);
    encoding.writeVarint2(b, 16511, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 16511);
    // assert.deepEqual(b, [0x80, 0xff, 0x7f]);
    assert.deepEqual(b, [0xff, 0x7f, 0x00]);

    b = Buffer.allocUnsafe(3);
    b.fill(0x00);
    encoding.writeVarint2(b, 65535, 0);
    assert.equal(encoding.readVarint2(b, 0).value, 65535);
    // assert.deepEqual(b, [0x82, 0xfd, 0x7f]);
    assert.deepEqual(b, [0x82, 0xfe, 0x7f]);

    b = Buffer.allocUnsafe(5);
    b.fill(0x00);
    encoding.writeVarint2(b, Math.pow(2, 32), 0);
    assert.equal(encoding.readVarint2(b, 0).value, Math.pow(2, 32));
    assert.deepEqual(b, [0x8e, 0xfe, 0xfe, 0xff, 0x00]);
  });

  const unsigned = [
    new BN('ffeeffee'),
    new BN('001fffeeffeeffee'),
    new BN('eeffeeff'),
    new BN('001feeffeeffeeff'),
    new BN(0),
    new BN(1)
  ];

  const signed = [
    new BN('ffeeffee'),
    new BN('001fffeeffeeffee'),
    new BN('eeffeeff'),
    new BN('001feeffeeffeeff'),
    new BN(0),
    new BN(1),
    new BN('ffeeffee').ineg(),
    new BN('001fffeeffeeffee').ineg(),
    new BN('eeffeeff').ineg(),
    new BN('001feeffeeffeeff').ineg(),
    new BN(0).ineg(),
    new BN(1).ineg()
  ];

  for (const num of unsigned) {
    const bits = num.bitLength();

    it(`should write+read a ${bits} bit unsigned int`, () => {
      const buf1 = Buffer.allocUnsafe(8);
      const buf2 = Buffer.allocUnsafe(8);
      encoding.writeU64BN(buf1, num, 0);
      encoding.writeU64(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);

      const n1 = encoding.readU64BN(buf1, 0);
      const n2 = encoding.readU64(buf2, 0);
      assert.equal(n1.toNumber(), n2);
    });
  }

  for (const num of signed) {
    const bits = num.bitLength();
    const sign = num.isNeg() ? 'negative' : 'positive';

    it(`should write+read a ${bits} bit ${sign} int`, () => {
      const buf1 = Buffer.allocUnsafe(8);
      const buf2 = Buffer.allocUnsafe(8);
      encoding.write64BN(buf1, num, 0);
      encoding.write64(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);

      const n1 = encoding.read64BN(buf1, 0);
      const n2 = encoding.read64(buf2, 0);
      assert.equal(n1.toNumber(), n2);
    });

    it(`should write+read a ${bits} bit ${sign} int as unsigned`, () => {
      const buf1 = Buffer.allocUnsafe(8);
      const buf2 = Buffer.allocUnsafe(8);
      encoding.writeU64BN(buf1, num, 0);
      encoding.writeU64(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);

      const n1 = encoding.readU64BN(buf1, 0);
      if (num.isNeg()) {
        assert.throws(() => encoding.readU64(buf2, 0));
      } else {
        const n2 = encoding.readU64(buf2, 0);
        assert.equal(n1.toNumber(), n2);
      }
    });
  }

  it('should validate integers 0 and 1 as booleans', () => {
    const validator = new Validator({shouldBeTrue: 1, shouldBeFalse: 0});
    assert(validator.bool('shouldBeTrue') === true);
    assert(validator.bool('shouldBeFalse') === false);
  });
});
