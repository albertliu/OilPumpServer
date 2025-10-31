///引入依赖
const mssql = require('mssql');
const config = {
  user: 'sqlrw',
  password: process.env.NODE_ENV_DB_PASSWD,
  //server: 'DESKTOP-017P07F\\ALBERTSQL2012',
  server: process.env.NODE_ENV_DB,
  //server: 'iZ8ccky8b15s0lZ\\ELEARNINGSQL2012',
  database: 'ship',
  port: 14333,
  options: {
    encrypt: false
  },
  pool: {
    min: 0,
    max: 1000,
    idleTimeoutMillis: 30000
  }
};

const pool2 = new mssql.ConnectionPool(config);
const pool2Connect = pool2.connect();

pool2.on('error', err => {
  // ... error handler
  console.log(err);
});


//方法对象
const units = {
  excuteSQL: function (sql, params, callback) {
    ///连接池
    new mssql.ConnectionPool(config)
      .connect()
      .then(pool => {
        let ps = new mssql.PreparedStatement(pool);
        if (params != "") {
          //console.log("params:", params);
          for (var index in params) {
            if (params[index] === undefined || params[index] === null) {
              params[index] = "";
            }
            if (typeof params[index] == "string") {
              ps.input(index, mssql.NVarChar);
            } else if (typeof params[index] == "number") {
              ps.input(index, mssql.Int);
            }
          }
        }

        ps.prepare(sql, err => {
          if (err) {
            console.log(err);
            return;
          }
          ps.execute(params, (err, result) => {
            if (err) {
              console.log(err);
              //this.excuteSQL("exec writeErrorSQL '" + sql + "','" + params + "','" + err.message + "','" + req.session.user.username + "','" + req.session.user.ip + "','" + req.session.user.host + "'", {}, function(e, re){});
              return;
            }
            ps.unprepare(err => {
              if (err) {
                console.log(err);
                callback(err, null, null);
                return;
              }
              callback(err, result);
            });
          });
        });
      }).catch(err => {
        console.log("excuteSQL: Database Connection Failed! Bad Config:", err);
      });
  },
  excuteProc: function (proc, params, callback) {
    return pool2Connect.then((pool) => {
      var req = pool.request(); // or: new sql.Request(pool2)
      //var req = new mssql.Request(pool2);
      if (params != "") {
        for (var index in params) {
            if (params[index] === undefined || params[index] === null) {
              params[index] = "";
            }
            if (typeof params[index] == "string") {
              req.input(index, mssql.NVarChar, params[index]);
            } else if (typeof params[index] == "number") {
              req.input(index, mssql.Int, params[index]);
            }
        }
        //console.log("params:", params);
      }
      req.execute(proc, (err, result) => {
        if (err) {
          console.log(err);
          //this.excuteSQL("exec writeErrorSQL '" + sql + "','" + params + "','" + err.message + "','" + req.session.user.username + "','" + req.session.user.ip + "','" + req.session.user.host + "'", {}, function(e, re){});
          return;
        }
      // ... error checks
        //console.log("result:", result);
        callback(err, result);
      });
    }).catch(err => {
        // ... error handler
        console.log("executeProc: Database Connection Failed! Bad Config:", err);
    })
  },
  excuteProcAsync: async function (proc, params) {
    try {
      const pool = await pool2Connect;
      var req = pool.request(); // or: new sql.Request(pool2)
      //var req = new mssql.Request(pool2);
      if (params != "") {
        for (var index in params) {
          if (params[index] === undefined || params[index] === null) {
            params[index] = "";
          }
          if (typeof params[index] == "string") {
            req.input(index, mssql.NVarChar, params[index]);
          } else if (typeof params[index] == "number") {
            req.input(index, mssql.Int, params[index]);
          }
        }
        //console.log("params:", params);
      }
      return req.execute(proc);
    } catch (err) {
      console.log("executeProc: Database Connection Failed! Bad Config:", err);
      throw err;
    }

  }
  /*
 * 默认config对象
 * @type {{user: string, password: string, server: string, database: string, pool: {min: number, idleTimeoutMillis: number}}}
 */
}

module.exports = units;