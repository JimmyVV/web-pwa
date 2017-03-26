import pathToRegexp from 'path-to-regexp';
// import clone from './cloneCache';

let Caches = {};
let Utils = {};

/**
 * 获得变量的具体类型/构造函数名 
 * e.g.
 * a{"abc"} => string
 * b{{key:'value'}} => object
 * c{function(){}} => function
 */
Utils.getType = function (obj) {
  return Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
}

/**
 * 原始数据查询字段内容
 * @param table.type[Number]:
 *            0: 完整的 tableName[String] // 目前只支持该种方式
 *            1: 正则 
 * @param row.type[Number]:
 *            0: request[Object]
 *            1: 路径通配符 /path/name 
 *              
 */

let DATA = {
  table: {
    name: '',
    type: 0
  },
  row: {
    name: '',
    type: 0
  }
}

/**
 * @param {string} cacheName  目前只支持完整 string 的形式.
 */
Caches.table = function (cacheName) {
  DATA.table = {};
  if (Utils.getType(cacheName) === "string") {
    DATA.table.type = 0;
  } else {
    DATA.table.type = 1;
  }
  DATA.table.name = cacheName;
  return Caches.table;
}

/**
 * @param {string/request} name 用来接收 rowName
 *            string: 只能为 pathname，不能为绝对路径 e.g. '/app/*.js' 
 *            request: 通过 new request() 得来的。
 */
Caches.row = function (name) {
  DATA.row = {};
  if (Utils.getType(name) === 'request') {
    DATA.row.type = 0;
  } else {
    DATA.row.type = 1;
  }
  DATA.row.name = name;
  return Caches.row;
}


/**
 * 复制指定的 tablename，并且删除原有的 table
 * TODO 测试通过 get
 * @param {String} newName 新的名字
 */
Caches.table.rename = function (newName) {
  return caches.open(DATA.table.name)
    .then(cache => {
      // 获得所有记录
      return cache.keys();
    })
    .then(keys => {
      // 向新的 table 里面添加记录
      return caches.open(newName)
        .then(cache => {
          return cache.addAll(keys);
        })
    })
    .then(() => {
      // 删除原来的 table
      return caches.delete(DATA.table.name)
    })
    .then(res => {
      DATA = {};
      return res;
    })
}

/**
 * @param {string} newName 复制为的 tableName
 */
Caches.table.copyTo = function (newName) {
  return caches.open(DATA.table.name)
    .then(cache => {
      // 获得所有记录
      return cache.keys();
    })
    .then(keys => {
      // 向新的 table 里面添加记录
      return caches.open(newName)
        .then(cache => {
          return cache.addAll(keys);
        })
    })
    .then(res => {
      DATA = {};
      return res;
    })
}


/**
 * 打开指定的 table。如果没有则自动创建
 */
Caches.table.open = function () {
  return caches.open(DATA.table.name)
}

/**
 * 删除指定的 table
 */
Caches.table.delete = function () {
  return caches.delete(DATA.table.name)
    .then(res => {
      DATA = {};
      return res;
    })
}


/**
 * 向 table 里面手动添加 row
 * 参数有三种接受方式
 * 1. @param1 {String||Request} url/request
 * 2. @param1 {url/request} @param2 {Response} response
 * 3. @param1 {Array} [url]/[request]
 * 
 * @return {Promise} then: 成功。 catch: 失败。
 */
Caches.table.addRow = function (param1, param2) {
  return caches.open(DATA.table.name)
    .then(cache => {
      if (Utils.getType(param1) === 'array') {
        return cache.addAll(param1)
      } else {
        return param2 ? cache.put(param1, param2) : cache.add(param1);
      }
    })
    .then(res => {
      DATA = {};
      return res;
    })
}

// 连接 table().row()
// 使其可以进行链式调用
Caches.table.row = Caches.row;

/**
 * 删除指定的 row
 */
Caches.row.delete = function () {
  return caches.open(DATA.table.name)
    .then(cache => {
      return deleteRow(cache, DATA.row);
    })
    .then(res => {
      DATA = {};
      return res;
    })
}

/**
 * 获得指定的所有的匹配到的 response
 */
Caches.row.get = function () {
  return caches.open(DATA.table.name)
    .then(cache => {
      return findRow(cache, DATA.row)
        .then(requests => {
          return Promise.all(requests.map(request => {
            return cache.match(request);
          }))
        })
    })
    .then(res=>{
      DATA = {};
      return res;
    })
}

Caches.row.update = function (response) {
  return caches.open(DATA.table.name)
  .then(cache=>{
    return findRow(cache, DATA.row)
    .then(requests=>{
      return !!requests.length?cache.put(requests[0],response):null;
    })
  })
}


// TODO 待开发，实现查询条件的缓存
// Caches.table.clone = Caches.row.clone = clone.bind(this);

Caches.clone = function(table,row){
  return function(){
    if(table && row) return Caches.table(table).row(row);
    else if(table) return Caches.table(table)
  }
}


/**
 *  解析 url 对象
 * @param {string} href 路由值
 */
function resoveURL(href) {
  return new URL(href);
}

/**
 * 找到指定的 row
 * @param {Object} cache 指定打开的缓存 cache
 * @param {Object} row  row.name && row.type
 * @return {Array} requests 返回找到的 requests Object。
 */
function findRow(cache, row) {
  return new Promise((res, rej) => {
    if (row.type === 0) {
      // request 类型
      res([row.name]);
    } else {
      // string 类型的 pathname。
      cache.keys()
        .then(requests => {
          res(matchRequest(requests, row.name));
        })
        .catch(rej)
    }
  })
}


function deleteRow(cache, row) {
  return findRow(cache, row)
    .then(requests => {
      return Promise.all(requests.map(req => {
          return cache.delete(req);
        }))
        .then(res => {
          return !!res ? true : false;
        })
    })
}

function matchRequest(requests, matchPath) {
  var regPath = pathToRegexp(matchPath);
  return requests = requests.filter(req => {
    return !!regPath.exec(resoveURL(req.url).pathname);
  })
}

export default Caches;
