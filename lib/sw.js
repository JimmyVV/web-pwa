let SW = {};

SW.init = function () {
  return new Promise((res, rej) => {
    'serviceWorker' in navigator ? res() : rej('The browser does not support PWA/Service Worker');
  })
}

/**
 * 注册 service worker
 * @param href
 * @returns Promise
 */


SW.register = function (href) {
  return navigator.serviceWorker.register(href).then(reg => {
    return reg;
  }).catch(err => {
    console.error(err);
  })
};

SW.unregister = function () {
  SW.ready.then(reg => {
    reg.unregister();
  })
}

SW.update = function () {
  SW.ready.then(reg => {
    reg.update();
  })
}

SW.ready = navigator.serviceWorker.ready;

/**
 * 可以用来监听是否返回相应的数据
 * @param msg
 * @returns {Promise}
 */
SW.postMessage = function (msg) {
  var sw = navigator.serviceWorker;
  return new Promise((res, rej) => {
    !sw.controller ? rej('Service Worker do not register') : sw.ready.then(reg => {
      var channel = new MessageChannel();
      channel.port1.onmessage = event => {
        !event.data.error ? res(event.data) : rej(event.data.error);
      };
      sw.controller.postMessage(msg, [channel.port2]);
    })
  })

}



/**
 * 接受 Service Woker 通过广播,或者使用 client.postMessage 直接返回的消息
 * @param cb
 */
SW.onmessage = function (cb) {
  navigator.serviceWorker.addEventListener('message', cb);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

SW.subscribe = function (route, key) {
  return navigator.serviceWorker.ready.then(reg => {
    key = urlBase64ToUint8Array(key);
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key
    })
  }).then(result => {
    return fetch(route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    })
  })
}

export default SW;
