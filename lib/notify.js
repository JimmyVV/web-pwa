let Notify = {};
Notify.request = function () {
  if (!('Notification' in window)) {
    return new Promise((res, rej) => {
      rej('The browser do not support Notification');
    })
  }
  return Notification.requestPermission()
    .then(permission => {
      return new Promise((res, rej) => {
        if (permission === "granted") {
          res(permission);
        } else if (permission === "default") {
          rej('User cancel')
        } else {
          rej('User denied')
        }
      })
    })
};

function spawnNotification(title, options) {
  var not = new Notification(title, options);
  Notify.currentNot = not;
}


Notify.show = function (title, body, icon) {
  if (Notification.permission === 'default')
    Notify.request().then(() => {
      spawnNotification(title, {
        body,
        icon
      })
    })
  else if (Notification.permission === 'granted') {
    spawnNotification(title, {
      body,
      icon
    });
  } else {}
  return Notify;
}

// Why error?
// ['onclick','onclose','onshow','onerror'].forEach(val=>{
//   Notify[val] = function(cb){
//     Notify.currentNot[val] = cb;
//     return Notify
//   }
// })

Notify.onclick = function(cb){
  Notify.currentNot.onclick = cb;
  return Notify;
}
Notify.onclose = function(cb){
  Notify.currentNot.onclose = cb;
  return Notify;
}
Notify.onshow = function(cb){
  Notify.currentNot.onshow = cb;
  return Notify;
}
Notify.onerror = function(cb){
  Notify.currentNot.onerror = cb;
  return Notify;
}
Notify.hide = function(time){
 var not = Notify.currentNot;
 setTimeout(not.close.bind(not),time);
 return Notify;
}

Notify.focus = function(){
  window.focus();
  return Notify;
}

Notify.open = function(url){
  window.open(url);
  return Notify;
}




export default Notify;
