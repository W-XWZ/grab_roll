infoLog('这是content script!');

//正式地址
var url_header = '/ngmss-mem/';

// 注意，必须设置了run_at=document_start 此段代码才会生效

document.addEventListener('DOMContentLoaded', function() {
	initCustomPanel();
	initLocalStorageData();
});

var classList = [];
var settlyDict = {"S":"标准仓单","B":"车船板","A":"厂库非标"};
var totalRow = 0;
var processedRow = 0;
var hederNames = [];
var valueKeys = [];
var detailList = [];

function initCustomPanel() {
	let r = Math.random();

	let panel = document.createElement('div');
	panel.style.zIndex = 99998;
	panel.className = 'chrome-plugin-demo-panel';
	panel.innerHTML =
		`
		<div style="text-align: center;">
			<select id="varieties" style="color:black"></select>
			<select id="settleTypes" style="color:black"></select>
            <input class= "condition-button" id="exportBtn" type="button" value="导出"/>
            <div id="progress" style="color:black"></div>
		</div>
	`;
	document.body.append(panel);
	
	$.ajax({
		"url": url_header + "dms/settleReq/getClassList?r="+r+"value=",
		"type": "GET",
		"dataType":'json',
		"contentType": 'application/json',
		"async": false,
		"success": function(ret) {
			if(ret["code"] == 200) {
				classList = ret["result"];
				$.each(classList,function(i, item) {
					$("#varieties").append("<option value="+ item["commodityId"]+">" + item["simpleName"] + "</option>");
				});
				$("#settleTypes").empty();
				let settleTypeList = classList[0]["settleTypes"];
				for (let settleType of settleTypeList) {
					$("#settleTypes").append("<option value="+ settleType+">" + settlyDict[settleType] + "</option>");
				}
			}
		}
	});
	
	$("#varieties").change(varietiesChange);

	$('#exportBtn').on('click', function() {
		fnExport();
	});
}

function initLocalStorageData() {
	let curDate = formatDate(new Date(),"yyyy-MM-dd");
	let storedDetailJson = getStroredLocalStorageJson("rolling_data");
	if(storedDetailJson["date"] && curDate != storedDetailJson["date"]) {
		clearLocalStorage("rolling_data");
	}
}

function varietiesChange(event) {
	//获取选中index及value 
	let index = event.target["selectedIndex"];
	let item = event.target[index].value;
	let settleTypeList = classList[index]["settleTypes"];
	$("#settleTypes").empty();
	for (let settleType of settleTypeList) {
		$("#settleTypes").append("<option value="+ settleType+">" + settlyDict[settleType] + "</option>");
	}
}

function fnExport() {
	let commodityId = $('#varieties').val();
	let settleType = $('#settleTypes').val();
	let param = {"pageIndex":1,"pageSize":2000,"commodityId":commodityId,"settleType":settleType};
	let r = Math.random();
	totalRow = 0;
	processedRow = 0;
	$.ajax({
		"url": url_header + "dms/settleResp/queryTodoSettleReqPage?r="+r,
		"type": "POST",
		"dataType":'json',
		"contentType": 'application/json',
		"data": JSON.stringify(param),
		"async": false,
		"success": function(ret) {
			if(ret["code"] == 200 && ret["result"]["totalRow"] > 0) {
				totalRow = ret["result"]["totalRow"];
				getDetails(ret["result"]["list"]);
			} else if(ret["result"]["totalRow"] == 0) {
				tip("当前无可响应仓单.");
				infoLog("当前无可响应仓单.");
			}
		}
	});
}

function getDetails(list) {
	detailList = [];
	hederNames = ["申请编号","申请日期","品种","合约代码","申请数量","交割类型","已响应数量","未响应数量","卖方会员","卖方客户"];
	valueKeys = ["reqNo","reqDate","classId","commodityId","reqQty","settleTypeName","rspQty","balQty","firmName","customerName"];
	
	// 从localstore中获取仓单详情
	let storedDetailJson = getStroredLocalStorageJson("rolling_data");

	$.each(list, function(i, v) {
		let r = Math.random();
		let tmpHederNames = [];
		let tmpValueKeys = [];
		let settleReqId = v["settleReqId"];
		let spcId = v["spcId"];
		
		// 根据申请编号查询是否已经存在
		let detailJson = storedDetailJson["details"]?storedDetailJson["details"][settleReqId]:null;
		// 本地存在同时未响应数量与服务器一致时,不请求服务器数据
		if(detailJson && detailJson["settleReq"]["balQty"] == v["balQty"]) {
			handleDetail(i,detailJson);
		} else {
			$.ajax({
				"url": url_header + "dms/settleResp/settleReqDetail?r="+r+"&settleReqId="+settleReqId,
				"type": "GET",
				"dataType":'json',
				"contentType": 'application/json',
				"async": false,
				"success": function(ret) {
					if(ret["code"] == 200) {
						handleDetail(i,ret["result"]);
						let jsonStore = {};
						let jsonDetail = {};
						let reqDate = new Date(ret["result"]["settleReq"]["reqDate"]);
						jsonDetail[settleReqId] = ret["result"];
						jsonStore["date"] = formatDate(reqDate,"yyyy-MM-dd");
						jsonStore["details"] = jsonDetail
						saveLocalStorage("rolling_data",jsonStore);
					} else {
						tip("获取仓单 "+spcId+" 详情失败.");
						infoLog("获取仓单 "+spcId+" 详情失败.");
					}
				}
			});
		}
		
	});
	tableToExcel(hederNames,valueKeys,detailList);
}

function handleDetail(index,result) {
	let formAttrDefines = result["formDefine"]["formAttrDefines"];
	let item = {};
	
	item["reqNo"] = result["settleReq"]["reqNo"];
	item["reqDate"] = result["settleReq"]["reqDate"];
	item["classId"] = result["settleReq"]["classId"];
	item["commodityId"] = result["settleReq"]["commodityId"];
	item["reqQty"] = result["settleReq"]["reqQty"] + "("+result["settleReq"]["reqQty"]*result["sheetSize"]+")";
	item["settleTypeName"] = settlyDict[result["settleReq"]["settleType"]];
	item["rspQty"] = result["settleReq"]["rspQty"] + "("+result["settleReq"]["rspQty"]*result["sheetSize"]+")";
	item["balQty"] = result["settleReq"]["balQty"] + "("+result["settleReq"]["balQty"]*result["sheetSize"]+")";
	item["firmName"] = result["settleReq"]["firmId"] + " " +result["settleReq"]["firmName"];
	item["customerName"] = result["settleReq"]["customerId"] + " " +result["settleReq"]["customerName"];
	
	for (let formAttrDefine of formAttrDefines) {
		item[formAttrDefine["bizName"]] = formAttrDefine["value"]==null?"--":formAttrDefine["value"];
		if(index == 0) {
			hederNames.push(formAttrDefine["labelName"]);
			valueKeys.push(formAttrDefine["bizName"]);
		}
	}

	detailList.push(item)
	processedRow++;
	$("#progress").text(processedRow + "/" + totalRow + "(" + (processedRow/totalRow*100).toFixed(2) +"%)");
}

function tableToExcel(hederNames,valueKeys,dataList) {
	
  	//列标题
  	var table = '<tr>';
  	for(let name of hederNames) {
  		table += `<td>${name}</td>`
  	}
	table += '</tr>';
  	//循环遍历，每行加入tr标签，每个单元格加td标签
  	dataList.forEach(function(item) {
      	table += '<tr>';
      	for(let valueKey of valueKeys) {
      		//增加\t为了不让表格显示科学计数法或者其他格式
  			table += `<td>${item[valueKey] + '\t'}</td>`
      	}
  		table += '</tr>';
  	});

  	//Worksheet名
  	var worksheet = 'Sheet1'
  	//下载的表格模板数据
  	var template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:x="urn:schemas-microsoft-com:office:excel" 
                xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <!--[if gte mso 9]>
              <xml>
                <x:ExcelWorkbook>
                  <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                      <x:Name>${worksheet}</x:Name>
                      <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                      </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                  </x:ExcelWorksheets>
                </x:ExcelWorkbook>
              </xml>
              <![endif]-->
            </head>
            <body>
              <table>${table}</table>
            </body>
          </html>`
  	// 下载模板
  	window.location.href = 'data:application/vnd.ms-excel;base64,' + base64(template)
}

//输出base64编码
function base64(s) {
	return window.btoa(unescape(encodeURIComponent(s))) 
}

function getCurrentTime(){
	let now = new Date();
	let time = now.getHours() +":"+now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds() +  ";";
	return "当前时间-" + time;
}

function sleep(ms) {
  return new Promise(resolve => 
      setTimeout(resolve, ms)
  )
}

//格式化日期,
function formatDate(date,format){
    var paddNum = function(num){
    	num += "";
  		return num.replace(/^(\d)$/,"0$1");
	}
	//指定格式字符
	var cfg = {
	   yyyy : date.getFullYear() //年 : 4位
	  ,yy : date.getFullYear().toString().substring(2)//年 : 2位
	  ,M  : date.getMonth() + 1  //月 : 如果1位的时候不补0
	  ,MM : paddNum(date.getMonth() + 1) //月 : 如果1位的时候补0
	  ,d  : date.getDate()   //日 : 如果1位的时候不补0
	  ,dd : paddNum(date.getDate())//日 : 如果1位的时候补0
	  ,hh : date.getHours()  //时
	  ,mm : date.getMinutes() //分
	  ,ss : date.getSeconds() //秒
	}
	format || (format = "yyyy-MM-dd hh:mm:ss");
	return format.replace(/([a-z])(\1)*/ig,function(m){return cfg[m];});
}

function infoLog(msg){
	console.log(getCurrentTime() + msg);
}

//存本地变量
function saveLocalStorage(key,jsonValue) {
	var stored_string = window.localStorage[key]
	if (!stored_string) {
		stored_string = '{}';
	}
	var old_json = JSON.parse(stored_string);
	$.extend(true, old_json, jsonValue);
	window.localStorage[key] = JSON.stringify(old_json)
}

function getStroredLocalStorageJson(key) {
	var stored_string = window.localStorage[key];
	if (!stored_string) {
		return {};
	}
	return JSON.parse(stored_string);
}

function clearLocalStorage(key) {
	window.localStorage[key] = JSON.stringify({})
}

// 接收来自后台的消息，用于接受来自popup的条件，放入本地并触发前端刷新
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

});

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground(message) {
	chrome.runtime.sendMessage(message, function(response) {});
}

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
	infoLog(port);
	if (port.name == 'test-connect') {
		port.onMessage.addListener(function(msg) {
			infoLog('收到长连接消息：', msg);
			tip('收到长连接消息：' + JSON.stringify(msg));
			if (msg.question == '你是谁啊？') port.postMessage({
				answer: '我是你爸！'
			});
		});
	}
});

var tipCount = 0;
// 简单的消息通知
function tip(info) {
	info = info || '';
	var ele = document.createElement('div');
	ele.className = 'chrome-plugin-simple-tip slideInLeft';
	ele.style.top = tipCount * 70 + 100 + 'px';
	ele.innerHTML = `<div>${info}</div>`;
	document.body.appendChild(ele);
	ele.classList.add('animated');
	tipCount++;
	setTimeout(() => {
		ele.style.top = '-100px';
		setTimeout(() => {
			ele.remove();
			tipCount--;
		}, 400);
	}, 3000);
}