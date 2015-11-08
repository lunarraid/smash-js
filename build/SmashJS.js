(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"1YiZ5S":4,"base64-js":2,"buffer":1,"ieee754":3}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"1YiZ5S":4,"buffer":1}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"1YiZ5S":4,"buffer":1}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"1YiZ5S":4,"buffer":1}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
* Base class for things that have names, lifecycles, and exist in a GameSet or
* GameGroup.
*
* To use a GameObject:
*
* 1. Instantiate one. (var foo = new GameGroup();)
* 2. Set the owning group. (foo.owningGroup = rootGroup;)
* 3. Call initialize(). (foo.initialize();)
* 4. Use the object!
* 5. When you're done, call destroy(). (foo.destroy();)
*/

var BaseObject = function(name) {
  this._active = false;
  this._owningGroup = null;
  this._sets = [];
  this._name = name || "";
};

BaseObject.prototype.isBaseObject = true;

// Internal
BaseObject.prototype.noteSetAdd = function(set) {
  this._sets.push(set);
};

// Internal
BaseObject.prototype.noteSetRemove = function(set) {
  var idx = this._sets.indexOf(set);
    if(idx == -1) {
      throw new Error("Tried to remove BaseObject from a GameSet it didn't know it was in!");
    }
    this._sets.splice(idx, 1);
};

/**
 * Called to initialize the GameObject. The GameObject must be in a GameGroup
 * before calling this (ie, set owningGroup).
 */

BaseObject.prototype.initialize = function() {
  // Error if not in a group.
  if (this._owningGroup === null) {
    throw new Error("Can't initialize a BaseObject without an owning GameGroup!");
  }
  this._active = true;
};

/**
 * Called to destroy the GameObject: remove it from sets and groups, and do
 * other end of life cleanup.
 */

BaseObject.prototype.destroy = function() {
  // Remove from sets.
  while (this._sets.length > 0) {
    this._sets[this._sets.length-1].remove(this);
  }

  // Remove from owning group.
  if (this._owningGroup) {
    this._owningGroup.noteRemove(this);
    this._owningGroup = null;
  }

  this._active = false;
};

BaseObject.prototype.constructor = BaseObject;

/**
 * Name of the GameObject. Used for dynamic lookups and debugging.
 */

Object.defineProperty(BaseObject.prototype, "name", {

  get: function() {
    return this._name;
  },

  set: function(value) {
    if (this._active && this._owningGroup) {
      throw new Error("Cannot change BaseObject name after initialize() is called and while in a GameGroup.");
    }
    this._name = value;
  }

});

/**
 * What GameSets reference this GameObject?
 */

Object.defineProperty(BaseObject.prototype, "sets", {

  get: function() {
    return this._sets;
  }

});

/**
 * The GameGroup that contains us. All GameObjects must be in a GameGroup,
 * and the owningGroup has to be set before calling initialize().
 */

Object.defineProperty(BaseObject.prototype, "owningGroup", {

  get: function() {
    return this._owningGroup;
  },

  set: function(value) {
    if (!value) {
      throw new Error("A BaseObject must always be in a GameGroup.");
    }

    if (this._owningGroup) {
      this._owningGroup.noteRemove(this);
    }

    this._owningGroup = value;
    this._owningGroup.noteAdd(this);
  }

});

module.exports = BaseObject;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/BaseObject.js","/core")
},{"1YiZ5S":4,"buffer":1}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Base class for most game functionality. Contained in a GameObject.
 *
 * Provides a generic data binding system as well as callbacks when
 * the component is added to or removed from a GameObject.
 */

var GameComponent = function() {
  this.bindings = [];
  this._safetyFlag = false;
  this._name = "";
  this._owner = null;
};

GameComponent.prototype.isGameComponent = true;

/**
 * Components include a powerful data binding system. You can set up
 * rules indicating fields to load from other parts of the game, then
 * apply the data bindings using the applyBindings() method. If you don't
 * use them, bindings have no overhead.
 *
 * @param fieldName Name of a field on this object to copy data to.
 * @param propertyReference A reference to a value on another component,
 *                          GameObject, or other part of the system.
 *                          Usually "@componentName.fieldName".
 */

GameComponent.prototype.addBinding = function(fieldName, propertyReference) {
  this.bindings.push(fieldName + "||" + propertyReference);
};

/**
 * Remove a binding previously added with addBinding. Call with identical
 * parameters.
 */

GameComponent.prototype.removeBinding = function(fieldName, propertyReference) {
  var binding = fieldName + "||" + propertyReference;
  var idx = this.bindings.indexOf(binding);
  if (idx === -1) {
    return;
  }
  this.bindings.splice(idx, 1);
};

/**
 * Loop through bindings added with addBinding and apply them. Typically
 * called at start of onTick or onFrame handler.
 */

GameComponent.prototype.applyBindings = function() {
  if (!this.propertyManager) {
    throw new Error("Couldn't find a PropertyManager instance");
  }

  for (var i = 0; i < this.bindings.length; i++) {
    this.propertyManager.applyBinding(this, this.bindings[i]);
  }
};

GameComponent.prototype.doAdd = function() {
  this.propertyManager = this.owner.getManager(PropertyManager);
  this._safetyFlag = false;
  this.onAdd();
  if (this._safetyFlag === false) {
    throw new Error("You forget to call onAdd() on supr in an onAdd override.");
  }
};

GameComponent.prototype.doRemove = function() {
  this._safetyFlag = false;
  this.onRemove();
  if (this._safetyFlag === false) {
    throw new Error("You forget to call onRemove() on supr in an onRemove handler.");
  }
};

/**
 * Called when component is added to a GameObject. Do component setup
 * logic here.
 */

GameComponent.prototype.onAdd = function() {
  this._safetyFlag = true;
};

/**
 * Called when component is removed frmo a GameObject. Do component
 * teardown logic here.
 */

GameComponent.prototype.onRemove = function() {
  this._safetyFlag = true;
};

GameComponent.prototype.constructor = GameComponent;

Object.defineProperty(GameComponent.prototype, "name", {

  get: function() {
    return this._name;
  },

  set: function(value) {
    if (this._owner) {
      throw new Error("Already added to GameObject, can't change name of GameComponent.");
    }
    this._name = value;
  }

});

/**
 * What GameObject contains us, if any?
 */

Object.defineProperty(GameComponent.prototype, "owner", {

  get: function() {
    return this._owner;
  }

});

module.exports = GameComponent;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/GameComponent.js","/core")
},{"1YiZ5S":4,"buffer":1}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var BaseObject = require("./BaseObject.js");
var SmashMap = require("../util/SmashMap.js");

/**
 * GameGroup provides lifecycle functionality (GameObjects in it are destroy()ed
 * when it is destroy()ed), as well as manager registration (see registerManager).
 *
 * GameGroups are unique because they don't require an owningGroup to
 * be initialize()ed.
 */

var GameGroup = function() {
  BaseObject.call(this);
  this._items = [];
  this._managers = new SmashMap();
};

GameGroup.prototype = Object.create(BaseObject.prototype);

GameGroup.prototype.constructor = GameGroup;

/**
 * Does this GameGroup directly contain the specified object?
 */

GameGroup.prototype.contains = function(object) {
  return (object.owningGroup === this);
};

GameGroup.prototype.getGameObjectAt = function(index) {
  return this._items[index];
};

GameGroup.prototype.initialize = function() {
  // Groups can stand alone so don't do the _owningGroup check in the parent class.
  // If no owning group, add to the global list for debug purposes.
  //if (this.owningGroup === null) {
    // todo add root group error
    // owningGroup = Game._rootGroup;
  //}
};

GameGroup.prototype.destroy = function() {
  BaseObject.prototype.destroy.call(this);

  // Wipe the items.
  while (this.length) {
    this.getGameObjectAt(this.length-1).destroy();
  }

  for (var i = this._managers.length - 1; i >= 0; i--) {
    var key = this._managers.getKeyAt(i);
    var value = this._managers.getValueAt(i);
    if (value && value.destroy) { value.destroy(); }
    this._managers.remove(key);
  }
};

GameGroup.prototype.noteRemove = function(object) {
  // Get it out of the list.
  var idx = this._items.indexOf(object);
  if (idx == -1) {
    throw new Error("Can't find GameObject in GameGroup! Inconsistent group membership!");
  }
  this._items.splice(idx, 1);
};

GameGroup.prototype.noteAdd = function(object) {
  this._items.push(object);
};

/**
 * Add a manager, which is used to fulfill dependencies for the specified
 * name. If the "manager" implements has an initialize() method, then
 * initialize() is called at this time. When the GameGroup's destroy()
 * method is called, then destroy() is called on the manager if it
 * has this method.
 */

GameGroup.prototype.registerManager = function(clazz, instance) {
  this._managers.put(clazz, instance);
  instance.owningGroup = this;
  if (instance.initialize) {
    instance.initialize();
  }
  return instance;
};

/**
 * Get a previously registered manager.
 */

GameGroup.prototype.getManager = function(clazz) {
  var res = this._managers.get(clazz);
  if (!res) {
    if (this.owningGroup) {
      return this.owningGroup.getManager(clazz);
    } else {
      throw new Error("Can't find manager " + clazz + "!");
    }
  }
  return res;
};

/**
 * Return the GameObject at the specified index.
 */

GameGroup.prototype.lookup = function(name) {
  for (var i = 0; i < this._items.length; i++) {
    if (this._items[i].name === name) {
      return this._items[i];
    }
  }

  //Logger.error(GameGroup, "lookup", "lookup failed! GameObject by the name of " + name + " does not exist");

  return null;
};


/**
 * How many GameObjects are in this group?
 */

Object.defineProperty(GameGroup.prototype, "length", {

  get: function() {
    return this._items.length;
  }

});

module.exports = GameGroup;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/GameGroup.js","/core")
},{"../util/SmashMap.js":22,"./BaseObject.js":5,"1YiZ5S":4,"buffer":1}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var BaseObject = require("./BaseObject.js");
var PropertyManager = require("../property/PropertyManager.js");
var Signal = require("./Signal.js");

/**
 * Container class for GameComponent. Most game objects are made by
 * instantiating GameObject and filling it with one or more GameComponent
 * instances.
 */

var GameObject = function(name) {
  BaseObject.call(this, name);

  // By having a broadcast Signal object on each GameObject, components
  // can easily send notifications to others without hard coupling
  this.broadcast = new Signal();

  this._deferring = true;
  this._components = {};
};

GameObject.prototype = Object.create(BaseObject.prototype);

GameObject.prototype.constructor = GameObject;

GameObject.prototype.doInitialize = function(component) {
  component._owner = this;
  component.doAdd();
};

/**
 * Add a component to the GameObject. Subject to the deferring flag,
 * the component will be initialized immediately.
 */

GameObject.prototype.addComponent = function(component, name) {
  if (name) {
    component.name = name;
  }

  if (!component.name) {
    throw "Can't add component with no name.";
  }

  // Stuff in dictionary.
  this._components[component.name] = component;

  // Set component owner.
  component._owner = this;

  // Directly set field
  if (this[component.name] === undefined) {
    this[component.name] = component;
  }

  // Defer or add now.
  if (this._deferring) {
    this._components["!" + component.name] = component;
  } else {
    this.doInitialize(component);
  }

  return component;
};

/**
 * Remove a component from this game object.
 */

GameObject.prototype.removeComponent = function(component) {
  if (component.owner !== this) {
    throw "Tried to remove a component that does not belong to this GameGameObject.";
  }

  if (this[component.name] === component) {
    this[component.name] = null;
  }

  this._components[component.name] = null;
  delete this._components[component.name];
  component.doRemove();
  component._owner = null;
};

/**
 * Look up a component by name.
 */

GameObject.prototype.lookupComponent = function(name) {
  return this._components[name];
};

/**
 * Get a fresh Vector with references to all the components in this
 * game object.
 */

GameObject.prototype.getAllComponents = function() {
  var out = [];
  for (var key in this._components) {
    out.push(this._components[key]);
  }
  return out;
};

/**
 * Initialize the game object! This is done in a couple of stages.
 *
 * First, the BaseObject initialization is performed.
 * Second, we look for any components in public vars on the GameObject.
 * This allows you to get at them directly instead of
 * doing lookups. If we find any, we add them to the game object.
 * Third, we turn off the deferring flag, so any components you've added
 * via addComponent get initialized.
 * Finally, we call applyBindings to make sure we have the latest data
 * for any registered data bindings.
 */

GameObject.prototype.initialize = function() {
  BaseObject.prototype.initialize.call(this);

  // Look for un-added members.
  for (var key in this)
  {
    var nc = this[key];

    // Only consider components.
    if (!nc || !nc.isGameComponent) {
      continue;
    }

    // Don't double initialize.
    if (nc.owner !== null) {
      continue;
    }

    // OK, add the component.

    if (nc.name && nc.name !== key) {
      throw new Error( "GameComponent has name '" + nc.name + "' but is set into field named '" + key + "', these need to match!" );
    }

    nc.name = key;
    this.addComponent(nc);
  }

  // Stop deferring and let init happen.
  this.deferring = false;

  // Propagate bindings on everything.
  for (var key2 in this._components) {
    if (!this._components[key2].propertyManager) {
      throw new Error("Failed to inject component properly.");
    }
    this._components[key2].applyBindings();
  }
};

/**
 * Removes any components on this game object, then does normal GameObject
 * destruction (ie, remove from any groups or sets).
 */

GameObject.prototype.destroy = function() {
  for (var key in this._components) {
    this.removeComponent(this._components[key]);
  }
  this.broadcast.removeAll();
  BaseObject.prototype.destroy.call(this);
};

GameObject.prototype.getManager = function(clazz) {
  return this.owningGroup.getManager(clazz);
};

/**
 * Get a value from this game object in a data driven way.
 * @param property Property string to look up, ie "@componentName.fieldName"
 * @param defaultValue A default value to return if the desired property is absent.
 */

GameObject.prototype.getProperty = function(property, defaultValue) {
  return this.getManager(PropertyManager).getProperty(this, property, defaultValue);
};

/**
 * Set a value on this game object in a data driven way.
 * @param property Property string to look up, ie "@componentName.fieldName"
 * @param value Value to set if the property is found.
 */

GameObject.prototype.setProperty = function(property, value) {
  this.getManager(PropertyManager).setProperty(this, property, value);
};

/**
 * If true, then components that are added aren't registered until
 * deferring is set to false. This is used when you are adding a lot of
 * components, or you are adding components with cyclical dependencies
 * and need them to all be present on the GameObject before their
 * onAdd methods are called.
 */

Object.defineProperty(GameObject.prototype, "deferring", {

  get: function() {
    return this._deferring;
  },

  set: function(value) {
    if (this._deferring && value === false) {
      // Loop as long as we keep finding deferred stuff, the
      // dictionary delete operations can mess up ordering so we have
      // to check to avoid missing stuff. This is a little lame but
      // our previous implementation involved allocating lots of
      // temporary helper objects, which this avoids, so there you go.
      var foundDeferred = true;

      while (foundDeferred) {
        foundDeferred = false;

        // Initialize deferred components.
        for (var key in this._components) {
          // Normal entries just have alphanumeric.
          if (key.charAt(0) !== "!") {
            continue;
          }

          // It's a deferral, so init it...
          this.doInitialize(this._components[key]);

          // ... and nuke the entry.
          this._components[key] = null;
          delete this._components[key];

          // Indicate we found stuff so keep looking. Otherwise
          // we may miss some.
          foundDeferred = true;
        }
      }
    }

    this._deferring = value;
  }

});

module.exports = GameObject;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/GameObject.js","/core")
},{"../property/PropertyManager.js":16,"./BaseObject.js":5,"./Signal.js":10,"1YiZ5S":4,"buffer":1}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var BaseObject = require("./BaseObject.js");

/**
 * GameSet provides safe references to one or more GameObjects. When the
 * referenced GameObjects are destroy()ed, then they are automatically removed
 * from any GameSets.
 */

var GameSet = function() {
  BaseObject.call(this);
  this.items = [];
};

GameSet.prototype = Object.create(BaseObject.prototype);

GameSet.prototype.constructor = GameSet;

/**
 * Add a GameObject to the set.
 */

GameSet.prototype.add = function(object) {
  this.items.push(object);
  object.noteSetAdd(this);
};

/**
 * Remove a GameObject from the set.
 */

GameSet.prototype.remove = function(object) {
  var idx = this.items.indexOf(object);
  if (idx === -1) {
    throw "Requested GameObject is not in this GameSet.";
  }
  this.items.splice(idx, 1);
  object.noteSetRemove(this);
};

/**
 * Does this GameSet contain the specified object?
 */

GameSet.prototype.contains = function(object) {
  return this.items.indexOf(object) !== -1;
};

/**
 * Return the object at the specified index of the set.
 */

GameSet.prototype.getGameObjectAt = function(index) {
  return this.items[index];
};


/**
 * How many objects are in the set?
 */

Object.defineProperty(GameSet.prototype, "length", {

  get: function() {
    return this.items.length;
  }

});

module.exports = GameSet;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/GameSet.js","/core")
},{"./BaseObject.js":5,"1YiZ5S":4,"buffer":1}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Custom event broadcaster
 * <br />- inspired by Robert Penner's AS3 Signals.
 * @name Signal
 * @author Miller Medeiros
 * @constructor
 */

var Signal = function() {

  /**
   * @type Array.<SignalBinding>
   * @private
   */
  this._bindings = [];
  this._prevParams = null;

  // enforce dispatch to aways work on same context (#47)
  var self = this;
  this.dispatch = function() {
    Signal.prototype.dispatch.apply(self, arguments);
  };

};

Signal.prototype = {

  /**
  * Signals Version Number
  * @type String
  * @const
  */
  VERSION : '::VERSION_NUMBER::',

  /**
  * If Signal should keep record of previously dispatched parameters and
  * automatically execute listener during `add()`/`addOnce()` if Signal was
  * already dispatched before.
  * @type boolean
  */
  memorize : false,

  /**
  * @type boolean
  * @private
  */
  _shouldPropagate : true,

  /**
  * If Signal is active and should broadcast events.
  * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
  * @type boolean
  */
  active : true,

  /**`
  * @param {Function} listener
  * @param {boolean} isOnce
  * @param {Object} [listenerContext]
  * @param {Number} [priority]
  * @return {SignalBinding}
  * @private
  */
  _registerListener : function (listener, isOnce, listenerContext, priority) {

    var prevIndex = this._indexOfListener(listener, listenerContext),
        binding;

    if (prevIndex !== -1) {
        binding = this._bindings[prevIndex];
        if (binding.isOnce() !== isOnce) {
            throw new Error('You cannot add'+ (isOnce? '' : 'Once') +'() then add'+ (!isOnce? '' : 'Once') +'() the same listener without removing the relationship first.');
        }
    } else {
        binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
        this._addBinding(binding);
    }

    if(this.memorize && this._prevParams){
        binding.execute(this._prevParams);
    }

    return binding;
  },

  /**
  * @param {SignalBinding} binding
  * @private
  */
  _addBinding : function (binding) {
    //simplified insertion sort
    var n = this._bindings.length;
    do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
    this._bindings.splice(n + 1, 0, binding);
  },

  /**
  * @param {Function} listener
  * @return {number}
  * @private
  */
  _indexOfListener : function (listener, context) {
    var n = this._bindings.length,
        cur;
    while (n--) {
        cur = this._bindings[n];
        if (cur._listener === listener && cur.context === context) {
            return n;
        }
    }
    return -1;
  },

  /**
  * Check if listener was attached to Signal.
  * @param {Function} listener
  * @param {Object} [context]
  * @return {boolean} if Signal has the specified listener.
  */
  has : function (listener, context) {
    return this._indexOfListener(listener, context) !== -1;
  },

  /**
  * Add a listener to the signal.
  * @param {Function} listener Signal handler function.
  * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
  * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
  * @return {SignalBinding} An Object representing the binding between the Signal and listener.
  */
  add : function (listener, listenerContext, priority) {
    this.validateListener(listener, 'add');
    return this._registerListener(listener, false, listenerContext, priority);
  },

  /**
  * Add listener to the signal that should be removed after first execution (will be executed only once).
  * @param {Function} listener Signal handler function.
  * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
  * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
  * @return {SignalBinding} An Object representing the binding between the Signal and listener.
  */
  addOnce : function (listener, listenerContext, priority) {
    this.validateListener(listener, 'addOnce');
    return this._registerListener(listener, true, listenerContext, priority);
  },

  /**
  * Remove a single listener from the dispatch queue.
  * @param {Function} listener Handler function that should be removed.
  * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
  * @return {Function} Listener handler function.
  */
  remove : function (listener, context) {
    this.validateListener(listener, 'remove');

    var i = this._indexOfListener(listener, context);
    if (i !== -1) {
        this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
        this._bindings.splice(i, 1);
    }
    return listener;
  },

  /**
  * Remove all listeners from the Signal.
  */
  removeAll : function () {
    var n = this._bindings.length;
    while (n--) {
        this._bindings[n]._destroy();
    }
    this._bindings.length = 0;
  },

  /**
  * @return {number} Number of listeners attached to the Signal.
  */
  getNumListeners : function () {
    return this._bindings.length;
  },

  /**
  * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
  * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
  * @see Signal.prototype.disable
  */
  halt : function () {
    this._shouldPropagate = false;
  },

  /**
  * Dispatch/Broadcast Signal to all listeners added to the queue.
  * @param {...*} [params] Parameters that should be passed to each handler.
  */
  dispatch : function (params) {
    if (! this.active) {
        return;
    }

    var paramsArr = Array.prototype.slice.call(arguments),
        n = this._bindings.length,
        bindings;

    if (this.memorize) {
        this._prevParams = paramsArr;
    }

    if (! n) {
        //should come after memorize
        return;
    }

    bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
    this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

    //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
    //reverse loop since listeners with higher priority will be added at the end of the list
    do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
  },

  validateListener : function(listener, fnName) {
    if (typeof listener !== 'function') {
        throw new Error( 'listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName) );
    }
  },

  /**
  * Forget memorized arguments.
  * @see Signal.memorize
  */
  forget : function(){
    this._prevParams = null;
  },

  /**
  * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
  * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
  */
  dispose : function () {
    this.removeAll();
    delete this._bindings;
    delete this._prevParams;
  },

  /**
  * @return {string} String representation of the object.
  */
  toString : function () {
    return '[Signal active:'+ this.active +' numListeners:'+ this.getNumListeners() +']';
  }

};

module.exports = Signal;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/Signal.js","/core")
},{"1YiZ5S":4,"buffer":1}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// SignalBinding -------------------------------------------------
//================================================================

/**
* Object that represents a binding between a Signal and a listener function.
* <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
* <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
* @author Miller Medeiros http://millermedeiros.github.com/js-signals/
* @constructor
* @internal
* @name SignalBinding
* @param {Signal} signal Reference to Signal object that listener is currently bound to.
* @param {Function} listener Handler function bound to the signal.
* @param {boolean} isOnce If binding should be executed just once.
* @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
* @param {Number} [priority] The priority level of the event listener. (default = 0).
*/

var SignalBinding = function(signal, listener, isOnce, listenerContext, priority) {

  /**
   * Handler function bound to the signal.
   * @type Function
   * @private
   */
  this._listener = listener;

  /**
   * If binding should be executed just once.
   * @type boolean
   * @private
   */
  this._isOnce = isOnce;

  /**
   * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
   * @memberOf SignalBinding.prototype
   * @name context
   * @type Object|undefined|null
   */
  this.context = listenerContext;

  /**
   * Reference to Signal object that listener is currently bound to.
   * @type Signal
   * @private
   */
  this._signal = signal;

  /**
   * Listener priority
   * @type Number
   * @private
   */
  this._priority = priority || 0;
};

SignalBinding.prototype = {

  /**
   * If binding is active and should be executed.
   * @type boolean
   */
  active : true,

  /**
   * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
   * @type Array|null
   */
  params : null,

  /**
   * Call listener passing arbitrary parameters.
   * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
   * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
   * @return {*} Value returned by the listener.
   */
  execute : function (paramsArr) {
    var handlerReturn, params;
    if (this.active && !!this._listener) {
      params = this.params? this.params.concat(paramsArr) : paramsArr;
      handlerReturn = this._listener.apply(this.context, params);
      if (this._isOnce) {
          this.detach();
      }
    }
    return handlerReturn;
  },

  /**
   * Detach binding from signal.
   * - alias to: mySignal.remove(myBinding.getListener());
   * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
   */
  detach : function () {
    return this.isBound()? this._signal.remove(this._listener, this.context) : null;
  },

  /**
   * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
   */
  isBound : function () {
    return (!!this._signal && !!this._listener);
  },

  /**
   * @return {boolean} If SignalBinding will only be executed once.
   */
  isOnce : function () {
    return this._isOnce;
  },

  /**
   * @return {Function} Handler function bound to the signal.
   */
  getListener : function () {
    return this._listener;
  },

  /**
   * @return {Signal} Signal that listener is currently bound to.
   */
  getSignal : function () {
    return this._signal;
  },

  /**
   * Delete instance properties
   * @private
   */
  _destroy : function () {
    delete this._signal;
    delete this._listener;
    delete this.context;
  },

  /**
   * @return {string} String representation of the object.
   */
  toString : function () {
    return '[SignalBinding isOnce:' + this._isOnce +', isBound:'+ this.isBound() +', active:' + this.active + ']';
  }

};

module.exports = SignalBinding;

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/SignalBinding.js","/core")
},{"1YiZ5S":4,"buffer":1}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
global.SmashJS = module.exports = {
  BaseObject: require("./core/BaseObject.js"),
  GameObject: require("./core/GameObject.js"),
  GameSet: require("./core/GameSet.js"),
  GameGroup: require("./core/GameGroup.js"),
  GameComponent: require("./core/GameComponent.js"),
  Signal: require("./core/Signal.js"),
  SignalBinding: require("./core/SignalBinding.js"),
  ComponentPlugin: require("./property/ComponentPlugin.js"),
  FieldPlugin: require("./property/FieldPlugin.js"),
  PropertyInfo: require("./property/PropertyInfo.js"),
  PropertyManager: require("./property/PropertyManager.js"),
  AnimatedComponent: require("./time/AnimatedComponent.js"),
  QueuedComponent: require("./time/QueuedComponent.js"),
  TickedComponent: require("./time/TickedComponent.js"),
  TimeManager: require("./time/TimeManager.js"),
  SimplePriorityQueue: require("./util/SimplePriorityQueue.js"),
  SmashMap: require("./util/SmashMap.js")
};
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_91aa70af.js","/")
},{"./core/BaseObject.js":5,"./core/GameComponent.js":6,"./core/GameGroup.js":7,"./core/GameObject.js":8,"./core/GameSet.js":9,"./core/Signal.js":10,"./core/SignalBinding.js":11,"./property/ComponentPlugin.js":13,"./property/FieldPlugin.js":14,"./property/PropertyInfo.js":15,"./property/PropertyManager.js":16,"./time/AnimatedComponent.js":17,"./time/QueuedComponent.js":18,"./time/TickedComponent.js":19,"./time/TimeManager.js":20,"./util/SimplePriorityQueue.js":21,"./util/SmashMap.js":22,"1YiZ5S":4,"buffer":1}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var FieldPlugin = require("./FieldPlugin.js");

var ComponentPlugin = function() {
  this.fieldResolver = new FieldPlugin();
};

ComponentPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  // Context had better be an entity.
  var entity;
  if (context.isBaseObject) {
      entity = context;
  } else if (context.isGameComponent) {
      entity = context.owner;
  } else {
      throw "Can't find entity to do lookup!";
  }

  // Look up the component.
  var component = entity.lookupComponent(cached[1]);

  if (cached.length > 2) {
      // Look further into the object.
      this.fieldResolver.resolveFull(component, cached, propertyInfo, 2);
  } else {
    propertyInfo.object = component;
    propertyInfo.field = null;
  }
};

ComponentPlugin.prototype.constructor = ComponentPlugin;

module.exports = ComponentPlugin;

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/property/ComponentPlugin.js","/property")
},{"./FieldPlugin.js":14,"1YiZ5S":4,"buffer":1}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var FieldPlugin = function() {};

FieldPlugin.prototype.resolve = function(context, cached, propertyInfo) {
  var walk = context;
  for (var i = 0; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

FieldPlugin.prototype.resolveFull = function(context, cached, propertyInfo, arrayOffset) {
  if ( arrayOffset === undefined ) {
    arrayOffset = 0;
  }
  var walk = context;
  for (var i = arrayOffset; i < cached.length - 1; i++) {
    walk = walk[cached[i]];
  }

  propertyInfo.object = walk;
  propertyInfo.field = cached[cached.length - 1];
};

FieldPlugin.prototype.constructor = FieldPlugin;

module.exports = FieldPlugin;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/property/FieldPlugin.js","/property")
},{"1YiZ5S":4,"buffer":1}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Internal class used by Entity to service property lookups.
 */

var PropertyInfo = function() {
  this.object = null;
  this.field = null;
};

PropertyInfo.prototype.constructor = PropertyInfo;

PropertyInfo.prototype.getValue = function() {
  if (this.field) {
    return this.object[this.field];
  } else {
    return this.object;
  }
};

PropertyInfo.prototype.setValue = function(value) {
  this.object[this.field] = value;
};

PropertyInfo.prototype.clear = function() {
  this.object = null;
  this.field = null;
};

module.exports = PropertyInfo;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/property/PropertyInfo.js","/property")
},{"1YiZ5S":4,"buffer":1}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var PropertyInfo = require("./PropertyInfo.js");
var ComponentPlugin = require("./ComponentPlugin.js");

var PropertyManager = function() {
  this.propertyPlugins = {};
  this.parseCache = {};
  this.cachedPi = new PropertyInfo();
  this.bindingCache = {};
  // Set up default plugins.
  this.registerPropertyType("@", new ComponentPlugin());
};

PropertyManager.prototype.constructor = PropertyManager;

PropertyManager.prototype.registerPropertyType = function(prefix, plugin) {
  this.propertyPlugins[prefix] = plugin;
};

PropertyManager.prototype.findProperty = function(scope, property, providedInfo) {
  if (property === null || property.length === 0) {
    return null;
  }

  // See if it is cached...
  if (!this.parseCache[property]) {
    // Parse and store it.
    this.parseCache[property] = [property.charAt(0)].concat(property.substr(1).split("."));
  }

  // Either errored or cached at this point.

  // Awesome, switch off the type...
  var cached = this.parseCache[property];
  var plugin = this.propertyPlugins[cached[0]];
  if (!plugin) {
    throw ("Unknown prefix '" + cached[0] + "' in '" + property + "'.");
  }

  // Let the plugin do its thing.
  plugin.resolve(scope, cached, providedInfo);

  return providedInfo;
};

PropertyManager.prototype.applyBinding = function(scope, binding) {
  // Cache parsing if possible.
  if (!this.bindingCache[binding]) {
    this.bindingCache[binding] = binding.split("||");
  }

  // Now do the mapping.
  var bindingCached = this.bindingCache[binding];
  var newValue = this.findProperty(scope, bindingCached[1], this.cachedPi).getValue();
  if (scope[bindingCached[0]] !== newValue) {
    scope[bindingCached[0]] = newValue;
  }};

PropertyManager.prototype.getProperty = function(scope, property, defaultValue) {
  // Look it up.
  var resPi = this.findProperty(scope, property, this.cachedPi);

  // Get value or return default.
  if (resPi) {
    return resPi.getValue();
  } else {
    return defaultValue;
  }
};

PropertyManager.prototype.setProperty = function(scope, property, value) {
  // Look it up.
  var resPi = this.findProperty(scope, property, this.cachedPi);

  // Abort if not found, can't set nothing!
  if (resPi === null) {
    return;
  }
  resPi.setValue(value);
};

module.exports = PropertyManager;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/property/PropertyManager.js","/property")
},{"./ComponentPlugin.js":13,"./PropertyInfo.js":15,"1YiZ5S":4,"buffer":1}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components that need to perform actions every frame. This
 * needs to be subclassed to be useful.
 */

var AnimatedComponent = function() {
  GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // OnFrame called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

AnimatedComponent.prototype = Object.create(GameComponent.prototype);

AnimatedComponent.prototype.constructor = AnimatedComponent;

AnimatedComponent.prototype.onFrame = function() {
  this.applyBindings();
};

AnimatedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  // This causes the component to be registered if it isn't already.
  this.registerForUpdates = this.registerForUpdates;
};

AnimatedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerForUpdates = false;
  GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for frame updates.
 */

Object.defineProperty(AnimatedComponent.prototype, "registerForUpdates", {

  get: function() {
    return this._registerForUpdates;
  },

  set: function(value) {
    this._registerForUpdates = value;

    if (!this.timeManager) {
      return;
    }

    if (this._registerForUpdates && !this._isRegisteredForUpdates)
    {
      // Need to register.
      this._isRegisteredForUpdates = true;
      this.timeManager.addAnimatedObject(this, this.updatePriority);
    }
    else if(!this._registerForUpdates && this._isRegisteredForUpdates)
    {
      // Need to unregister.
      this._isRegisteredForUpdates = false;
      this.timeManager.removeAnimatedObject(this);
    }
  }

});

module.exports = AnimatedComponent;

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/time/AnimatedComponent.js","/time")
},{"../core/GameComponent.js":6,"./TimeManager.js":20,"1YiZ5S":4,"buffer":1}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components which want to use think notifications.
 *
 * <p>"Think notifications" allow a component to specify a time and
 * callback function which should be called back at that time. In this
 * way you can easily build complex behavior (by changing which callback
 * you pass) which is also efficient (because it is only called when
 * needed, not every tick/frame). It is also light on the GC because
 * no allocations are required beyond the initial allocation of the
 * QueuedComponent.</p>
 */

var QueuedComponent = function() {
  GameComponent.call(this);
};

QueuedComponent.prototype = Object.create(GameComponent.prototype);

QueuedComponent.prototype.constructor = QueuedComponent;

/**
 * Schedule the next time this component should think.
 * @param nextCallback Function to be executed.
 * @param timeTillThink Time in ms from now at which to execute the function (approximately).
 */

QueuedComponent.prototype.think = function(nextContext, nextCallback, timeTillThink) {
  this.nextThinkContext = nextContext;
  this.nextThinkTime = this.timeManager.virtualTime + timeTillThink;
  this.nextThinkCallback = nextCallback;
  this.timeManager.queueObject(this);
};

QueuedComponent.prototype.unthink = function() {
  this.timeManager.dequeueObject(this);
};

QueuedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

QueuedComponent.prototype.onRemove = function() {
  GameComponent.prototype.onRemove.call(this);
  // Do not allow us to be called back if we are still in the queue.
  this.nextThinkContext = null;
  this.nextThinkCallback = null;
};

Object.defineProperty(QueuedComponent.prototype, "priority", {

  get: function() {
    return -this.nextThinkTime;
  }

});

module.exports = QueuedComponent;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/time/QueuedComponent.js","/time")
},{"../core/GameComponent.js":6,"./TimeManager.js":20,"1YiZ5S":4,"buffer":1}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var GameComponent = require("../core/GameComponent.js");
var TimeManager = require("./TimeManager.js");

/**
 * Base class for components that need to perform actions every tick. This
 * needs to be subclassed to be useful.
 */

var TickedComponent = function() {
  GameComponent.call(this);

  // The update priority for this component. Higher numbered priorities have
  // onInterpolateTick and onTick called before lower priorities.
  this.updatePriority = 0;

  this._registerForUpdates = true;
  this._isRegisteredForUpdates = false;
};

TickedComponent.prototype = Object.create(GameComponent.prototype);

TickedComponent.prototype.constructor = TickedComponent;

TickedComponent.prototype.onTick = function(tickRate) {
  this.applyBindings();
};

TickedComponent.prototype.onAdd = function() {
  GameComponent.prototype.onAdd.call(this);
  this.timeManager = this.owner.getManager(TimeManager);
  // This causes the component to be registerd if it isn't already.
  this.registerForTicks = this.registerForTicks;
};

TickedComponent.prototype.onRemove = function() {
  // Make sure we are unregistered.
  this.registerTicks = false;
  GameComponent.prototype.onRemove.call(this);
};

/**
 * Set to register/unregister for tick updates.
 */

Object.defineProperty(TickedComponent.prototype, "registerForTicks", {

  get: function() {
    return this._registerForUpdates;
  },

  set: function(value) {
    this._registerForUpdates = value;

    if (!this.timeManager) {
      return;
    }

    if (this._registerForUpdates && !this._isRegisteredForUpdates)
    {
      // Need to register.
      this._isRegisteredForUpdates = true;
      this.timeManager.addTickedObject(this, this.updatePriority);
    }
    else if(!this._registerForUpdates && this._isRegisteredForUpdates)
    {
      // Need to unregister.
      this._isRegisteredForUpdates = false;
      this.timeManager.removeTickedObject(this);
    }
  }

});

module.exports = TickedComponent;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/time/TickedComponent.js","/time")
},{"../core/GameComponent.js":6,"./TimeManager.js":20,"1YiZ5S":4,"buffer":1}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var SimplePriorityQueue = require("../util/SimplePriorityQueue.js");

/**
 * The number of ticks that will happen every second.
 */

var TICKS_PER_SECOND = 60;

/**
 * The rate at which ticks are fired, in seconds.
 */

var TICK_RATE = 1 / TICKS_PER_SECOND;

/**
 * The rate at which ticks are fired, in milliseconds.
 */

var TICK_RATE_MS = TICK_RATE * 1000;

/**
 * The maximum number of ticks that can be processed in a frame.
 *
 * <p>In some cases, a single frame can take an extremely long amount of
 * time. If several ticks then need to be processed, a game can
 * quickly get in a state where it has so many ticks to process
 * it can never catch up. This is known as a death spiral.</p>
 *
 * <p>To prevent this we have a safety limit. Time is dropped so the
 * system can catch up in extraordinary cases. If your game is just
 * slow, then you will see that the ProcessManager can never catch up
 * and you will constantly get the "too many ticks per frame" warning,
 * if you have disableSlowWarning set to true.</p>
 */

var MAX_TICKS_PER_FRAME = 5;

/**
 * Helper class for internal use by ProcessManager. This is used to
 * track scheduled callbacks from schedule().
 */

var ScheduleEntry = function() {

  this.dueTime = 0;
  this.thisObject = null;
  this.callback = null;
  this.arguments = null;

};

Object.defineProperty(ScheduleEntry.prototype, "priority", {

  get: function() {
    return -dueTime;
  },

  set: function(value) {
    throw("Unimplemented");
  }

});

/**
 * The process manager manages all time related functionality in the engine.
 * It provides mechanisms for performing actions every frame, every tick, or
 * at a specific time in the future.
 *
 * <p>A tick happens at a set interval defined by the TICKS_PER_SECOND constant.
 * Using ticks for various tasks that need to happen repeatedly instead of
 * performing those tasks every frame results in much more consistent output.
 * However, for animation related tasks, frame events should be used so the
 * display remains smooth.</p>
 */

var TimeManager = function() {
  this.deferredMethodQueue = [];
  this._virtualTime = 0;
  this._interpolationFactor = 0;
  this.timeScale = 1;
  this.lastTime = -1;
  this.elapsed = 0;
  this.animatedObjects = [];
  this.tickedObjects = [];
  this.needPurgeEmpty = false;
  this._platformTime = 0;
  this._frameCounter = 0;
  this.duringAdvance = false;
  this.thinkHeap = new SimplePriorityQueue(4096);

  /**
   * If true, disables warnings about losing ticks.
   */

  this.disableSlowWarning = true;

  /**
   * The scale at which time advances. If this is set to 2, the game
   * will play twice as fast. A value of 0.5 will run the
   * game at half speed. A value of 1 is normal.
   */

   this.timeScale = 1;
};

TimeManager.prototype.constructor = TimeManager;

TimeManager.prototype.initialize = function() {
  if (!this.started) {
    this.start();
  }
};

TimeManager.prototype.destroy = function() {
  if (this.started) {
    stop();
  }
};

/**
 * Starts the process manager. This is automatically called when the first object
 * is added to the process manager. If the manager is stopped manually, then this
 * will have to be called to restart it.
 */

TimeManager.prototype.start = function() {
  if (this.started) {
      //Logger.warn(this, "start", "The ProcessManager is already started.");
      return;
  }

  this.lastTime = -1.0;
  this.elapsed = 0.0;
  this.started = true;
};

/**
 * Stops the process manager. This is automatically called when the last object
 * is removed from the process manager, but can also be called manually to, for
 * example, pause the game.
 */

TimeManager.prototype.stop = function() {
  if (!this.started) {
    //Logger.warn(this, "stop", "The TimeManager isn't started.");
    return;
  }

  this.started = false;
};


/**
 * Schedules a function to be called at a specified time in the future.
 *
 * @param delay The number of milliseconds in the future to call the function.
 * @param thisObject The object on which the function should be called. This
 * becomes the 'this' variable in the function.
 * @param callback The function to call.
 * @param arguments The arguments to pass to the function when it is called.
 */

TimeManager.prototype.schedule = function(delay, thisObject, callback) {
  var args = Array.prototype.slice.call(arguments, 3);

  if (!this.started) {
    this.start();
  }

  var schedule = new ScheduleEntry();
  schedule.dueTime = this._virtualTime + delay;
  schedule.thisObject = thisObject;
  schedule.callback = callback;
  schedule.arguments = args;

  this.thinkHeap.enqueue(schedule);
};

/**
 * Registers an object to receive frame callbacks.
 *
 * @param object The object to add.
 * @param priority The priority of the object. Objects added with higher priorities
 * will receive their callback before objects with lower priorities. The highest
 * (first-processed) priority is Number.MAX_VALUE. The lowest (last-processed)
 * priority is -Number.MAX_VALUE.
 */

TimeManager.prototype.addAnimatedObject = function(object, priority) {
  if (priority === undefined) {
    priority = 0;
  }
  this.addObject(object, priority, this.animatedObjects);
};

/**
 * Registers an object to receive tick callbacks.
 *
 * @param object The object to add.
 * @param priority The priority of the object. Objects added with higher priorities
 * will receive their callback before objects with lower priorities. The highest
 * (first-processed) priority is Number.MAX_VALUE. The lowest (last-processed)
 * priority is -Number.MAX_VALUE.
 */

TimeManager.prototype.addTickedObject = function(object, priority) {
  if (priority === undefined) {
    priority = 0;
  }
  this.addObject(object, priority, this.tickedObjects);
};

/**
 * Queue an IQueuedObject for callback. This is a very cheap way to have a callback
 * happen on an object. If an object is queued when it is already in the queue, it
 * is removed, then added.
 */

TimeManager.prototype.queueObject = function(object) {
  // Assert if this is in the past.
  if (object.nextThinkTime < this._virtualTime) {
    throw new Error("Tried to queue something into the past, but no flux capacitor is present!");
  }

  if (this.thinkHeap.contains(object)) {
    this.thinkHeap.remove(object);
  }

  if (!this.thinkHeap.enqueue(object)) {
    //Logger.print(this, "Thinking queue length maxed out!");
  }
};

/**
 * Remove an IQueuedObject for consideration for callback. No error results if it
 * was not in the queue.
 */

TimeManager.prototype.dequeueObject = function(object) {
  if(this.thinkHeap.contains(object)) {
    this.thinkHeap.remove(object);
  }
};

/**
 * Unregisters an object from receiving frame callbacks.
 *
 * @param object The object to remove.
 */

TimeManager.prototype.removeAnimatedObject = function(object) {
  this.removeObject(object, this.animatedObjects);
};

/**
 * Unregisters an object from receiving tick callbacks.
 *
 * @param object The object to remove.
 */

TimeManager.prototype.removeTickedObject = function(object) {
  this.removeObject(object, this.tickedObjects);
};

/**
 * Deferred function callback - called back at start of processing for next frame. Useful
 * any time you are going to do setTimeout(someFunc, 1) - it's a lot cheaper to do it
 * this way.
 * @param method Function to call.
 * @param args Any arguments.
 */

TimeManager.prototype.callLater = function(context, method) {
  var args = Array.prototype.slice.call(arguments, 2);
  var dm = {
    context: context,
    method: method,
    args: args
  };
  deferredMethodQueue.push(dm);
};


/**
 * Internal function add an object to a list with a given priority.
 * @param object Object to add.
 * @param priority Priority; this is used to keep the list ordered.
 * @param list List to add to.
 */

TimeManager.prototype.addObject = function(object, priority, list) {
  // If we are in a tick, defer the add.
  if (this.duringAdvance) {
      throw new Error("Unimplemented!");
      //group.callLater(addObject, [ object, priority, list]);
  }

  if (!this.started) {
    this.start();
  }

  var position = -1;
  for (var i = 0; i < list.length; i++) {
    if(!list[i]) {
      continue;
    }

    if (list[i].listener === object) {
        //Logger.warn(object, "AddProcessObject", "This object has already been added to the process manager.");
        return;
    }

    if (list[i].priority < priority) {
        position = i;
        break;
    }
  }

  var processObject = {
    listener: object,
    priority: priority
  };

  if (position < 0 || position >= list.length) {
    list.push(processObject);
  } else {
    list.splice(position, 0, processObject);
  }
};

/**
 * Peer to addObject; removes an object from a list.
 * @param object Object to remove.
 * @param list List from which to remove.
 */

TimeManager.prototype.removeObject = function(object, list) {
  if (this.listenerCount == 1 && this.thinkHeap.size === 0) {
    this.stop();
  }

  for (var i = 0; i < list.length; i++) {
    if(!list[i]) {
      continue;
    }

    if (list[i].listener === object) {
      if (this.duringAdvance) {
          list[i] = null;
          this.needPurgeEmpty = true;
      } else {
          list.splice(i, 1);
      }

      return;
    }
  }

  //Logger.warn(object, "RemoveProcessObject", "This object has not been added to the process manager.");
};

/**
 * Main callback; this is called every frame and allows game logic to run.
 */

TimeManager.prototype.update = function() {

  if (!this.started) {
    return;
  }

  // Track current time.
  var currentTime = Date.now();
  if (this.lastTime < 0) {
    this.lastTime = currentTime;
    return;
  }

  // Bump the frame counter.
  this._frameCounter++;

  // Calculate time since last frame and advance that much.
  var deltaTime = (currentTime - this.lastTime) * this.timeScale;
  this.advance(deltaTime);

  // Note new last time.
  this.lastTime = currentTime;
};

TimeManager.prototype.advance = function(deltaTime, suppressSafety) {
  if (suppressSafety === undefined) {
    suppressSafety = false;
  }

  // Update platform time, to avoid lots of costly calls to Date.now().
  this._platformTime = Date.now();

  // Note virtual time we started advancing from.
  var startTime = this._virtualTime;

  // Add time to the accumulator.
  this.elapsed += deltaTime;

  // Perform ticks, respecting tick caps.
  var tickCount = 0;
  while (this.elapsed >= TICK_RATE_MS && (suppressSafety || tickCount < MAX_TICKS_PER_FRAME)) {
    this.fireTick();
    this.tickCount++;
  }

  // Safety net - don't do more than a few ticks per frame to avoid death spirals.
  if (this.tickCount >= MAX_TICKS_PER_FRAME && !suppressSafety && !disableSlowWarning)
  {
      // By default, only show when profiling.
      //Logger.warn(this, "advance", "Exceeded maximum number of ticks for frame (" + elapsed.toFixed() + "ms dropped) .");
  }

  // Make sure that we don't fall behind too far. This helps correct
  // for short-term drops in framerate as well as the scenario where
  // we are consistently running behind.
  this.elapsed = this.clamp(this.elapsed, 0, 300);

  // Make sure we don't lose time to accumulation error.
  // Not sure this gains us anything, so disabling -- BJG
  //_virtualTime = startTime + deltaTime;

  // We process scheduled items again after tick processing to ensure between-tick schedules are hit
  // Commenting this out because it can cause too-often calling of callLater methods. -- BJG
  // processScheduledObjects();

  // Update objects wanting OnFrame callbacks.
  this.duringAdvance = true;
  this._interpolationFactor = this.elapsed / TICK_RATE_MS;

  var animDT = deltaTime * 0.001;

  for(var i = 0; i < this.animatedObjects.length; i++) {
    var animatedObject = this.animatedObjects[i];
    if (animatedObject) {
      animatedObject.listener.onFrame(animDT);
    }
  }

  this.duringAdvance = false;

  // Purge the lists if needed.
  if (this.needPurgeEmpty) {
    this.needPurgeEmpty = false;

    for (var j = 0; j < this.animatedObjects.length; j++) {
      if (this.animatedObjects[j]) {
        continue;
      }

      this.animatedObjects.splice(j, 1);
      j--;
    }

    for (var k = 0; k < this.tickedObjects.length; k++) {
      if (this.tickedObjects[k]) {
        continue;
      }

      this.tickedObjects.splice(k, 1);
      k--;
    }
  }
};

TimeManager.prototype.fireTick = function() {
  // Ticks always happen on interpolation boundary.
  this._interpolationFactor = 0.0;

  // Process pending events at this tick.
  // This is done in the loop to ensure the correct order of events.
  this.processScheduledObjects();

  // Do the onTick callbacks
  duringAdvance = true;
  for (var j = 0; j < this.tickedObjects.length; j++) {
    var object = this.tickedObjects[j];
    if(!object) {
      continue;
    }
    object.listener.onTick(TICK_RATE);
  }
  this.duringAdvance = false;

  // Update virtual time by subtracting from accumulator.
  this._virtualTime += TICK_RATE_MS;
  this.elapsed -= TICK_RATE_MS;
};

TimeManager.prototype.processScheduledObjects = function() {
  // Do any deferred methods.
  var oldDeferredMethodQueue = this.deferredMethodQueue;
  if (oldDeferredMethodQueue.length > 0)
  {
    // Put a new array in the queue to avoid getting into corrupted
    // state due to more calls being added.
    this.deferredMethodQueue = [];

    for (var j = 0; j < oldDeferredMethodQueue.length; j++) {
      var curDM = oldDeferredMethodQueue[j];
      curDM.method.apply(curDM.context, curDM.args);
    }

    // Wipe the old array now we're done with it.
    oldDeferredMethodQueue.length = 0;
  }

  // Process any queued items.
  if (this.thinkHeap.size > 0) {
    while(this.thinkHeap.size > 0 && this.thinkHeap.front.priority >= -this._virtualTime) {
      var itemRaw = this.thinkHeap.dequeue();

      if (itemRaw.nextThinkTime) {
        // Check here to avoid else block that throws an error - empty callback
        // means it unregistered.
        if (itemRaw.nextThinkCallback) {
          itemRaw.nextThinkCallback.call(itemRaw.nextThinkContext);
        }
      } else if (itemRaw.callback) {
        itemRaw.callback.apply(itemRaw.thisObject, itemRaw.arguments);
      } else {
        throw "Unknown type found in thinkHeap.";
      }
    }
  }
};

TimeManager.prototype.clamp = function(v, min, max) {
  min = min || 0;
  max = max || 0;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

/**
 * Returns true if the process manager is advancing.
 */

Object.defineProperty(TimeManager.prototype, "isTicking", {

  get: function() {
    return this.started;
  }

});

/**
 * Used to determine how far we are between ticks. 0.0 at the start of a tick, and
 * 1.0 at the end. Useful for smoothly interpolating visual elements.
 */

Object.defineProperty(TimeManager.prototype, "interpolationFactor", {

  get: function() {
    return this._interpolationFactor;
  }

});

/**
 * The amount of time that has been processed by the process manager. This does
 * take the time scale into account. Time is in milliseconds.
 */

Object.defineProperty(TimeManager.prototype, "virtualTime", {

  get: function() {
    return this._virtualTime;
  }

});

/**
 * Current time reported by getTimer(), updated every frame. Use this to avoid
 * costly calls to getTimer(), or if you want a unique number representing the
 * current frame.
 */

Object.defineProperty(TimeManager.prototype, "platformTime", {

  get: function() {
    return this._platformTime;
  }

});

/**
 * Integer identifying this frame. Incremented by one for every frame.
 */

Object.defineProperty(TimeManager.prototype, "frameCounter", {

  get: function() {
    return this._frameCounter;
  }

});

Object.defineProperty(TimeManager.prototype, "msPerTick", {

  get: function() {
    return TICK_RATE_MS;
  }

});

/**
 * @return How many objects are depending on the TimeManager right now?
 */

Object.defineProperty(TimeManager.prototype, "listenerCount", {

  get: function() {
    return this.tickedObjects.length + this.animatedObjects.length;
  }

});

module.exports = TimeManager;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/time/TimeManager.js","/time")
},{"../util/SimplePriorityQueue.js":21,"1YiZ5S":4,"buffer":1}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * This class is based on the PriorityQueue class from as3ds, and as such
 * must include this notice:
 *
 * DATA STRUCTURES FOR GAME PROGRAMMERS
 * Copyright (c) 2007 Michael Baczynski, http://www.polygonal.de
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var SmashMap = require("./SmashMap.js");

/**
 * A priority queue to manage prioritized data.
 * The implementation is based on the heap structure.
 *
 * <p>This implementation is based on the as3ds PriorityHeap.</p>
 */

/**
 * Initializes a priority queue with a given size.
 *
 * @param size The size of the priority queue.
 */

var SimplePriorityQueue = function(size) {
  this._size = size + 1;
  this._heap = new Array(this._size);
  this._posLookup = new SmashMap();
  this._count = 0;
};

SimplePriorityQueue.prototype.constructor = SimplePriorityQueue;


/**
 * Enqueues a prioritized item.
 *
 * @param obj The prioritized data.
 * @return False if the queue is full, otherwise true.
 */

SimplePriorityQueue.prototype.enqueue = function(obj) {
  if (this._count + 1 < this._size) {
    this._count++;
    this._heap[this._count] = obj;
    this._posLookup.put(obj, this._count);
    this.walkUp(this._count);
    return true;
  }
  return false;
};

/**
 * Dequeues and returns the front item.
 * This is always the item with the highest priority.
 *
 * @return The queue's front item or null if the heap is empty.
 */

SimplePriorityQueue.prototype.dequeue = function() {
  if (this._count >= 1) {
    var o = this._heap[1];
    this._posLookup.remove(o);

    this._heap[1] = this._heap[this._count];
    this.walkDown(1);

    this._heap[this._count] = null;
    this._count--;
    return o;
  }
  return null;
};

/**
 * Reprioritizes an item.
 *
 * @param obj         The object whose priority is changed.
 * @param newPriority The new priority.
 * @return True if the repriorization succeeded, otherwise false.
 */

SimplePriorityQueue.prototype.reprioritize = function(obj, newPriority) {
  if (!this._posLookup.get(obj)) {
    return false;
  }

  var oldPriority = obj.priority;
  obj.priority = newPriority;
  var pos = this._posLookup.get(obj);

  if (newPriority > oldPriority) {
    this.walkUp(pos);
  } else {
    this.walkDown(pos);
  }

  return true;
};

/**
 * Removes an item.
 *
 * @param obj The item to remove.
 * @return True if removal succeeded, otherwise false.
 */

SimplePriorityQueue.prototype.remove = function(obj) {
  if (this._count >= 1) {
    var pos = this._posLookup.get(obj);

    var o = this._heap[pos];
    this._posLookup.remove(o);

    this._heap[pos] = this._heap[this._count];

    this.walkDown(pos);

    this._heap[this._count] = null;
    this._posLookup.remove(this._count);
    this._count--;
    return true;
  }

  return false;
};

SimplePriorityQueue.prototype.contains = function(obj) {
  return this._posLookup.get(obj) !== null;
};

SimplePriorityQueue.prototype.clear = function() {
  this._heap = new Array(this._size);
  this._posLookup = new Map();
  this._count = 0;
};

SimplePriorityQueue.prototype.isEmpty = function() {
  return this._count === 0;
};

SimplePriorityQueue.prototype.toArray = function() {
  return this._heap.slice(1, this._count + 1);
};

/**
 * Prints out a string representing the current object.
 *
 * @return A string representing the current object.
 */

SimplePriorityQueue.prototype.toString = function() {
  return "[SimplePriorityQueue, size=" + _size +"]";
};

/**
 * Prints all elements (for debug/demo purposes only).
 */

SimplePriorityQueue.prototype.dump = function() {
  if (this._count === 0) {
    return "SimplePriorityQueue (empty)";
  }

  var s = "SimplePriorityQueue\n{\n";
  var k = this._count + 1;
  for (var i = 1; i < k; i++) {
    s += "\t" + this._heap[i] + "\n";
  }
  s += "\n}";
  return s;
};

SimplePriorityQueue.prototype.walkUp = function(index) {
  var parent = index >> 1;
  var parentObj;

  var tmp = this._heap[index];
  var p = tmp.priority;

  while (parent > 0)
  {
      parentObj = this._heap[parent];

      if (p - parentObj.priority > 0) {
          this._heap[index] = parentObj;
          this._posLookup.put(parentObj, index);

          index = parent;
          parent >>= 1;
      }
      else break;
  }

  this._heap[index] = tmp;
  this._posLookup.put(tmp, index);
};

SimplePriorityQueue.prototype.walkDown = function(index) {
  var child = index << 1;
  var childObj;

  var tmp = this._heap[index];
  var p = tmp.priority;

  while (child < this._count) {

    if (child < this._count - 1) {
      if (this._heap[child].priority - this._heap[child + 1].priority < 0) {
        child++;
      }
    }

    childObj = this._heap[child];

    if (p - childObj.priority < 0) {
      this._heap[index] = childObj;
      this._posLookup.put(childObj, index);

      this._posLookup.put(tmp, child);

      index = child;
      child <<= 1;
    }
    else break;
  }
  this._heap[index] = tmp;
  this._posLookup.put(tmp, index);
};

/**
 * The front item or null if the heap is empty.
 */

Object.defineProperty(SimplePriorityQueue.prototype, "front", {

  get: function() {
    return this._heap[1];
  }

});

/**
 * The maximum capacity.
 */

Object.defineProperty(SimplePriorityQueue.prototype, "maxSize", {

  get: function() {
    return this._size;
  }

});


Object.defineProperty(SimplePriorityQueue.prototype, "size", {

  get: function() {
    return this._count;
  }

});

module.exports = SimplePriorityQueue;
}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/util/SimplePriorityQueue.js","/util")
},{"./SmashMap.js":22,"1YiZ5S":4,"buffer":1}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var SmashMap = function() {
  this.keys = [];
  this.values = [];
};

SmashMap.prototype.constructor = SmashMap;

SmashMap.prototype.put = function(key, value) {
  var index = this.keys.indexOf(key);
  if (index === -1) {
    this.keys.push(key);
    this.values.push(value);
  }
  else {
    this.values[index] = value;
  }
};

SmashMap.prototype.get = function(key) {
  var index = this.keys.indexOf(key);
  return index !== -1 ? this.values[index] : null;
};

SmashMap.prototype.remove = function(key) {
  var index = this.keys.indexOf(key);
  if (index !== -1) {
    var lastKey = this.keys.pop();
    var lastValue = this.values.pop();
    if (index !== this.keys.length) {
      this.keys[index] = lastKey;
      this.values[index] = lastValue;
    }
  }
};

SmashMap.prototype.getKeyAt = function(index) {
  return this.keys[index];
};

SmashMap.prototype.getValueAt = function(index) {
  return this.values[index];
};

SmashMap.prototype.removeAll = function() {
  this.keys.length = 0;
  this.values.length = 0;
};


Object.defineProperty(SmashMap.prototype, "length", {
  get: function() { return this.keys.length; }
});

module.exports = SmashMap;

}).call(this,require("1YiZ5S"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/util/SmashMap.js","/util")
},{"1YiZ5S":4,"buffer":1}]},{},[12])