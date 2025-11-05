let express = require('express');
let router = express.Router();
const axios = require('axios');
const schedule = require('node-schedule');
let xlsx = require('xlsx');
const db = require("../utils/mssqldb");
const path = require('path');
//const jimp= require("jimp");
const { NetworkAuthenticationRequire } = require('http-errors');
const shell = require('shelljs');
var downloadHome = './users/public/';

const ip = 'https://fxpt.fxcw.com:8023';
// const url = ip + '/gatewayapi/fxcw/energyConsumptionData/add1';
const url = 'http://43.242.96.5:8023/gatewayapi/fxcw/fuelRefuel/add';
const url_ship = ip + '/gatewayapi/fxcw/shipmShipinfo/getShipList';
let response, sqlstr, params;


//获取某个时间点之后一星期内的数据
router.get('/getPumpHistoryList', function(req, res) {
  sqlstr = "getPumpHistoryList";
  params = {startDate: req.query.refID, mark: req.query.mark};
  //console.log("params:", params);
  db.excuteProc(sqlstr, params, function(err, data){
    if (err) {
      console.log(err);
      let response = {};
      return res.send(response);
    }
    if(req.query.mark=="data"){
      //return json data
      response = data.recordset || [];  
    }
    if(req.query.mark=="file"){
      //return excel file
      if(data.recordset.length > 0){
        let sheet = xlsx.utils.json_to_sheet(data.recordset);
        let workBook = {
          SheetNames: ['sheet1'],
          Sheets: {
            'sheet1': sheet
          }
        };
        // 将workBook写入文件
        let path = downloadHome + "temp/historyList" + Date.now() + ".xlsx";
        xlsx.writeFile(workBook, path);
        response = [path];
      }else{
        response = [];
      }
    }
    // console.log(response);
    return res.send(response);
  });
});

//获取某个编号的船舶信息
router.get('/getShipInfo', function(req, res) {
  sqlstr = "getShipInfo";
  params = {sno: req.query.shipID};
  console.log("params:", params);
  db.excuteProc(sqlstr, params, function(err, data){
    if (err) {
      console.log(err);
      let response = {};
      return res.send(response);
    }
    response = data?.recordset || [];
    // console.log(response);
    return res.send(response);
  });
});

//获取最新的采集数据
router.get('/getPumpCaptureData', function(req, res) {
  sqlstr = "getPumpCaptureData";
  let param = {lastID: req.query.refID};
  //console.log("params:");
  db.excuteProc(sqlstr, param, function(err, data){
    if (err) {
      console.log(err);
      let response = {};
      return res.send(response);
    }
    response = data.recordset || [];
    // console.log("getCaptureData", param, response);
    return res.send(response);
  });
});

//获取最新的发送记录，大于指定编号的数据
router.get('/getSendData', function(req, res) {
  sqlstr = "getSendData";
  let param = {lastID: req.query.refID};
  //console.log("params:", param);
  db.excuteProc(sqlstr, param, function(err, data){
    if (err) {
      console.log(err);
      let response = {};
      return res.send(response);
    }
    response = data.recordset || [];
    // console.log(response);
    return res.send(response);
  });
});

async function getShipList(){
  console.log("ok")
  let rec = "";
  axios.get(url_ship)
  .then(response => {
    let s = response.data.success;
    // console.log(s, response.data.result);
    if(s){
      rec = "成功";
      let sqlstr1 = "setShipList";
      let re = response.data.result;
      // console.log(re.length, re);
      for (var i in re){
        let params1 = { sno: re[i]["id"], shipName: re[i]["shipName"] };
        console.log(i, params1);
        db.excuteProc(sqlstr1, params1, function (err, data) {
          if (err) {
            console.log(err);
          }
        });
      }
    }else{
      rec = "失败";
    }
  })
  .catch(error => {
    console.error(error);
    rec = "接口错误";
  });
  return rec;
}

async function sendData(){
  let re = 0;
  let qty = 0;
  let sendID = 0;
  let msg = "";
  // 记录发送情况，取得sendID
  sqlstr = "updatePumpSendInfo";
  let param = {ID: 0, qty:0, status:0, msg:msg};
  // console.log("params:", param);
  await db.excuteProc(sqlstr, param, async function(err, data0){
    if (err) {
      console.log(err);
      re = 5;
    }
    sendID = data0.recordset[0]["re"];
    if(sendID > 0){
      // 获取要发送的数据
      sqlstr = "pickPumpSendData";
      param = {sendID: sendID};
      // console.log("params0:", param);
      await db.excuteProc(sqlstr, param, async function(err, data){
        if (err) {
          console.log(err);
          re = 3;
          msg = "获取数据失败";
        }
    
        if(data?.recordset && data.recordset.length>0){
          param = {"data":data.recordset};
          qty = data.recordset.length;
          // 发送数据
          // console.log("params1:", sendID, qty);
          await axios.post(url, param) //test
          .then(response => {
            let s = response.data.success;
            msg = response.data.message;
            // console.log("post result:", s, response.data);
            if(s){
              re = 1;
              msg = "发送成功";
            }else{
              re = 0;
              msg = "发送失败";
            }
          })
          .catch(error => {
            // console.error(error);
            msg = "发送出错";
          });
        }

        // 记录发送情况
        sqlstr = "updatePumpSendInfo";
        let param1 = {ID: sendID, qty:qty, status:re, msg:msg};
        // console.log("updateSendInfo params:", param1);
        db.excuteProc(sqlstr, param1, function(err, data1){
          if (err) {
            console.log(err);
          }
        });
      });
    }
  });
  return 0;
}

// *  *  *  *  *  *
// ┬  ┬  ┬  ┬  ┬  ┬
// │  │  │  │  │  |
// │  │  │  │  │  └ 星期几，取值：0 - 7，其中 0 和 7 都表示是周日
// │  │  │  │  └─── 月份，取值：1 - 12
// │  │  │  └────── 日期，取值：1 - 31
// │  │  └───────── 时，取值：0 - 23
// │  └──────────── 分，取值：0 - 59
// └─────────────── 秒，取值：0 - 59（可选）
// 当前时间的秒值为 10 时执行任务，如：2018-7-8 13:25:10

// const rule = new schedule.RecurrenceRule();
// rule.second = 30; // 每隔30秒执行一次
/*
const job = schedule.scheduleJob({rule: '/30 * * * * *' }, async function(){
  let re = await sendData();
  console.log("scheduleJob log:", re, new Date());
});
*/
setInterval(async function() {
  // 每隔一段时间执行的代码
  let re = await sendData();
  // let re = await getShipList();
  console.log("scheduleJob log:", re, new Date());
}, 1000 * 60);

module.exports = router;
