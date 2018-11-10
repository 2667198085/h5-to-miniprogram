const mock = require('../../mock')
const load = require('../../../src/template/adapter')

const XMLHttpRequest = load('XMLHttpRequest')

test('xml-http-request', async () => {
  global.wx.request = function(options) {
    expect(options.url).toBe('https://a.b.c?a=12#haha')
    expect(options.header).toEqual({
      "Accept": "*/*",
      'Content-type': 'application/x-www-form-urlencoded',
    })
    expect(options.method).toBe('POST')
    expect(options.dataType).toBe('text')
    expect(options.responseType).toBe('text')

    const success = options.success
    const fail = options.fail
    const complete = options.complete

    if (options.data === 'fail') {
      fail({
        errMsg: 'some error',
      })
      complete()
    } else if (options.data === 'timeout') {
      // ignore
    } else {
      success({
        data: options.data,
        statusCode: 200,
        header: {
          'Content-Type': 'application/javascript',
        },
      })
      complete()
    }
  }

  let readyStateChangeCount = 0
  let errorCount = 0
  let loadStartCount = 0
  let loadEndCount = 0
  let loadCount = 0
  let timeoutCount = 0
  const xhr = new XMLHttpRequest()

  xhr.onreadystatechange = function() {
    readyStateChangeCount++
  }

  xhr.onerror = function() {
    errorCount++
  }

  xhr.onloadstart = function() {
    loadStartCount++
  }

  xhr.onloadend = function() {
    expect(loadStartCount).toBe(loadEndCount + 1)
    loadEndCount++
  }

  xhr.onload = function() {
    expect(loadEndCount).toBe(loadCount + 1)
    loadCount++
  }

  xhr.ontimeout = function() {
    timeoutCount++
  }

  expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT)
  expect(readyStateChangeCount).toBe(0)

  xhr.open('POST', 'https://a.b.c?a=12#haha')
  expect(xhr.readyState).toBe(XMLHttpRequest.OPENED)
  expect(readyStateChangeCount).toBe(1)

  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
  xhr.responseType = 'text'
  xhr.timeout = 200

  // fail
  expect(errorCount).toBe(0)
  xhr.send('fail')
  expect(xhr.readyState).toBe(XMLHttpRequest.DONE)
  expect(readyStateChangeCount).toBe(2)
  expect(errorCount).toBe(1)

  // timeout
  expect(timeoutCount).toBe(0)
  xhr._readyState = XMLHttpRequest.OPENED // 利用私有字段调整 readyState，为了再次发送请求
  xhr.send('timeout')
  await new Promise((resolve, reject) => setTimeout(resolve, 300))
  expect(xhr.readyState).toBe(XMLHttpRequest.DONE)
  expect(readyStateChangeCount).toBe(3)
  expect(timeoutCount).toBe(1)

  // success
  expect(loadStartCount).toBe(0)
  expect(loadEndCount).toBe(0)
  expect(loadCount).toBe(0)
  xhr._readyState = XMLHttpRequest.OPENED // 利用私有字段调整 readyState，为了再次发送请求
  xhr.send('success')
  expect(xhr.readyState).toBe(XMLHttpRequest.DONE)
  expect(readyStateChangeCount).toBe(6)
  expect(loadStartCount).toBe(1)
  expect(loadEndCount).toBe(1)
  expect(loadCount).toBe(1)
  expect(xhr.responseText).toBe('success')
  expect(xhr.response).toBe('success')
})
