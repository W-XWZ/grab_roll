infoLog('这是content script!');

//正式地址
var url_header = '/ngmss-mem/';

// 注意，必须设置了run_at=document_start 此段代码才会生效
var publicVariety;
const addImg = chrome.extension.getURL('img/add.png');
const delImg = chrome.extension.getURL('img/del.png');
const editImg = chrome.extension.getURL('img/edit.png');
const src = chrome.extension.getURL('js/public-variety.js');
(async () => {
	publicVariety = await import(src);
	setTimeout(function() {
		
		checkAndClearDate();
		initParam();
		initConditionCustomPanel();
		initCirclePanel();
		getSelectedDetails();
		
		var timeid = window.setInterval(detailTimer,30000 + parseInt(Math.random() * 30000));
	}, 3000);
})();



var classList = [];
var settlyDict = {
	"S": "标准仓单",
	"B": "车船板",
	"A": "厂库非标"
};
var totalRow = 0;
var processedRow = 0;
var hederNames = [];
var valueKeys = [];
var detailList = [];
var extraHederNames = [];
var extraValueKeys = [];

function initParam() {
	
	let r = Math.random();
	$.ajax({
		"url": url_header + "dms/settleReq/getClassList?r=" + r + "&value=",
		"type": "GET",
		"async": false,
		"success": function(ret) {
			let classList = ret["result"];

			saveLocalStorage(
				'class_list', classList
			);
		}
	});
}

function getCustNameById(customerId){
	let r1 = Math.random();
	let custName;
	$.ajax({
		"url": url_header + "dms/settleReq/getCustomers?r=" + r1 + "&customerId=" + customerId,
		"type": "POST",
		"async": false,
		"success": function(ret) {
			let custList = ret["result"];
			for(let i = 0; i< custList.length; i++){
				if(custList[i]["customerId"] == customerId){
					custName = custList[i]["fullname"];
					break;
				}
			}
		}
	
	});
	return custName;
}

var hiddenConditionPanelFlag = false;

//隐藏主界面，显示小圆
function initCirclePanel(){
	let smallPanel =$('<div style="display:none;" id = "chrome-plugin-condition-satis"></div>');
	
	let $number = $('<div id = "chrome-plugin-pop-number" style ="height: 50%;text-align: center;font-size: 20px;font-weight: bold;line-height: 60px;"></div>');
	
	let $warehouseNum = $('<div style="text-align: center;height: 50%;">仓单数量</div>');
	smallPanel.append($number);
	smallPanel.append($warehouseNum);
	
	$('body').append(smallPanel);
	
	$("#chrome-plugin-condition-satis").on('click', function() {
		$("#chrome-plugin-condition-list-panel").show();
		$("#chrome-plugin-condition-satis").hide();
	});
}

//初始化前端展示，获取当前CF round_num，触发倒计时,同时初始化Local Storage
function initConditionCustomPanel() {
	let panel = $(`<div style="zIndex:99998;" class="chrome-plugin-condition-list-panel" id="chrome-plugin-condition-list-panel">
						<div class="hidden-btn">
							<div style="text-align: center;">
								<div id="satisfyNumber" style="font-size:52;"></div>
							</div>
						</div>
						<div id="condition-content-panel">
							<div class = "condition-header">
								<div class = "condition-header-variety">品种：<label id="curr_variety"></label></div>
								<input class= "condition-button" id="showAddCondition" type="button" value="新增"/>
								<input class= "condition-button" id="hiddenConditionPanel" type="button" value="缩小"/>
							</div>
							<div class="condition-detail">
								<div id='process'></div>
								<div id='conditions'></div>
							</div>
							<div>
								<div id="grab_progress"></div>
							</div>
							<div class="warehouseBtn">
								<input class= "condition-button" id="getDetails" type="button" value="查看仓单"/>
								<input class= "condition-button" id="closeDetail" type="button" value="关闭仓单"/>
							</div>
						</div>
					</div>`);
	
	$("body").append(panel);
	$("#getDetails").on('click', function() {
		displayPrior();
	});
	
	$("#closeDetail").on('click', function() {
		closeDetail();
	})
	
	$("#showAddCondition").on('click', function() {
		showAddCondition(null, false);
	});
	$("#hiddenConditionPanel").on('click', function() {
		hiddenConditionPanel();
	});

	let r = Math.random();
	let classList = getStroredLocalStorageJson("class_list");
	$.each(classList, function(i, item) {
		if (item['classId'] == publicVariety.g_variety_id) {
			$('#curr_variety').html(item['fullName']);
			$("#condition_settleTypes").empty();
			let settleTypeList = item["settleTypes"];
			let varitety_conditions = getStroredLocalStorageJson(publicVariety.g_variety_id)
			if (!varitety_conditions) {
				varitety_conditions = {
					"custCondition": {}
				};
			}
			varitety_conditions['commodityId'] = item['commodityId'];
			varitety_conditions['settleTypeList'] = settleTypeList;
			saveLocalStorage(publicVariety.g_variety_id, varitety_conditions);
			loadupCondition(publicVariety.g_variety_id);
		}
	});

}

function hiddenConditionPanel() {
	// if (!hiddenConditionPanelFlag) {
	// 	$("#chrome-plugin-condition-list-panel").height(100);
	// 	$("#chrome-plugin-condition-list-panel").width(100);
	// 	$("#condition-content-panel").hide(); //显示div
	// 	// $("#hiddenConditionPanel").get(0).value = "放大"
	// } else {
	// 	$("#chrome-plugin-condition-list-panel").height(300);
	// 	$("#chrome-plugin-condition-list-panel").width(500);
	// 	$("#condition-content-panel").show(); //显示div
		// $("#hiddenConditionPanel").get(0).value = "缩小"
	// }
	// hiddenConditionPanelFlag = !hiddenConditionPanelFlag;
	
	$("#chrome-plugin-condition-list-panel").hide();
	$("#chrome-plugin-condition-satis").show();
}

var editPriorNum = 0;

//确认编辑
function editConditionSubmit() {
	//参数校验
	if (!$('#amount').val()) {

		tip("必须填写仓单数量");
		return;
	}
	if (!$('#custName').val()) {

		tip("客户不存在");
		return;
	}
	let selectedCust = $("#custSelector").val();
	let varietyCondition = getStroredLocalStorageJson(publicVariety.g_variety_id);
	if (!varietyCondition) {
		varietyCondition = {
			'custCondition': {}
		}
	}
	if (!varietyCondition['custCondition']) {
		varietyCondition['custCondition'] = {};
	}
	let currCustCondition = varietyCondition['custCondition'][selectedCust];
	if (!currCustCondition) {
		currCustCondition = {};
	}
	if (!currCustCondition['condition_num']) {
		currCustCondition['condition_num'] = 1;
	} else {
		currCustCondition['condition_num'] = parseInt(currCustCondition['condition_num']) + 1;
	}


	if (!$('#custSelector').val()) {
		tip("必须选择客户");
		return;
	}


	let conditions = [];
	for (let i = 1; i < editPriorNum + 1; i++) {
		publicVariety.makeConditionStore(i, conditions, currCustCondition['condition_num']);
	}


	if (!conditions) {
		conditions = [];
	}

	currCustCondition['conditions'] = conditions;
	currCustCondition['amount'] = $('#amount').val();
	varietyCondition['custCondition'][selectedCust] = currCustCondition;
	saveLocalStorage(publicVariety.g_variety_id, varietyCondition);
	loadupCondition(publicVariety.g_variety_id, selectedCust);
	if (!!$('#condition-panel')) {
		$('#condition-panel').remove();
	}
}

// function getCustNameById(custId){
// 	let custName = ""
// 	let custList = getStroredLocalStorageJson("cust_list");
// 	for(let i = 0; i< custList.length; i++){
// 		if(custList[i]["customerId"] == custId){
// 			custName = custList[i]["fullname"]
// 		}
// 	}
// 	return custName;
// }
function loadupCondition(variety) {
	$('#conditions')[0].innerHTML = '';

	//此处需要将内存中的条件信息重新从Local Storage读取
	let varietyCondition = getStroredLocalStorageJson(publicVariety.g_variety_id);
	if (!varietyCondition) {
		varietyCondition = {
			"custCondition": new Map()
		};
	}
	
	for (let key in varietyCondition['custCondition']) {
		let custConditionList = varietyCondition['custCondition'][key];
		if (!custConditionList) {
			return;
		}
		let condition_panel = $('<div style="margin-bottom:5px;    position: relative;" id="condition' + custConditionList["condition_num"] + '">' + '</div>');
		let amount_div_1 = $('<div class="amount-style">' + '客户：' +getCustNameById(key)  + "("  + key  + ")" + '</div>');
		let amount_div_2 = $('<div class="amount-style">数量：' + custConditionList['amount']  + '</div>');
		condition_panel.append(amount_div_1);
		condition_panel.append(amount_div_2);

		let delPriorityImg = $('<img src=' + delImg +'  style="width: 20px;"></img>');
		
		let delDiv = $('<div class = "del-div delete_icon" value =' + key + '></div>');
		delDiv.append(delPriorityImg)
		delDiv.click(function() {
			if (!confirm('确认删除客户条件？')) {
				return;
			}
			let custId = $(this).attr('value');
		
			let vareityCondition = getStroredLocalStorageJson(publicVariety.g_variety_id);
		
			delete vareityCondition['custCondition'][custId];
			saveLocalStorage(publicVariety.g_variety_id, vareityCondition);
			// $('#condition' + condition_num).remove();
			loadupCondition(publicVariety.g_variety_id)
		});
		condition_panel.append(delDiv);
		
		let editPriorityImg = $('<img src=' + editImg +'  style="width: 20px;"></img>');

		let editDiv =$('<div class = "edit-div edit_condition_btn" value =' + key + '></div>');
		editDiv.click(function() {
			showAddCondition($(this).attr('value'), true);
		});
		editDiv.append(editPriorityImg);
		condition_panel.append(editDiv);
		let condition = $('<table class="condition-table" style="background-color: #f0f0f0;margin: 10px;"  id="condition' + key + '">' +
			'</table>');
		condition_panel.append(condition);

		let conditionsList = custConditionList['conditions'];
		for (let q = 1; q <= 10; q++) {
			if (!conditionsList[q]) {
				break;
			}
			let conditionPriorItem = conditionsList[q];
			let match = publicVariety.loadupDisplayCondition(conditionPriorItem, q);
			condition.append(match);
			//match += "</br>";
			//condition[0].innerHTML += match;
		}

		$('#conditions').append(condition_panel);
	}
	


}


var editFlag = false;

function makeCustSelector(selectCustId, amount){
	
	let select_div = $("<div>客户</div>"); 
	// select_div.style = "float: left;";
	let custId = $('<input class="custSelector" id="custSelector"></input> ');
	
	custId.keyup(function(){
		let custName =  getCustNameById($(this).val());
		$("#custName").val(custName);
	});
	let custNameInput = $('<input class="custSelector"  id="custName" disabled="true"></input>');
	
	if(!!selectCustId){
		custId.val(selectCustId);
		custNameInput.val(getCustNameById(selectCustId));
	}
	let ware_amount = $('<div class = "ware-amount" style = "margin-top: 10px;" id = "ware_amount"></div>');

	
	if(!amount){
		ware_amount.html(`仓单数量: <input id="amount" type="number" style='width:100px'/>`);
	}else{
		ware_amount.html( `仓单数量: <input id="amount" type="number" value="` +amount + `"style='width:100px'/>`);
		
	}
	select_div.append(custId)
	select_div.append(custNameInput)
	select_div.append(ware_amount)
	return select_div;
}



//删除优先级
function delPriorityFun() {
	if (editPriorNum == 1) {
		tip("只剩最后一条了，无法删除");
		return
	}
	$("#div" + editPriorNum).remove();
	editPriorNum--;;
	let delPriorityImg = $('<img src=' + delImg + ' style="width: 20px;"></img>');
	let delDiv = $('<div class="del-div" id="del-div"></div>');
	delDiv.append(delPriorityImg)
	delDiv.click(function() {
		delPriorityFun();
	});
	$("#div" + editPriorNum).append(delDiv);
	return editPriorNum;
}


function showAddCondition(custId, isEdit) {
	if(isEdit){
		let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);
		 custCondition = varietyInfo['custCondition'][custId];
		editPriorNum = custCondition['conditions'].length;
	}else{
		editPriorNum = 0;
	}
	editFlag = isEdit;
	//读取内存条件数据
	//如果存在旧的窗体，remove
	if (!!$('#condition-panel')) {
		$('#condition-panel').remove();
	}

	//关闭查看仓单界面
	detailDisplay = false;
	$("#pop-panel").remove();
	$("#getDetails").val("查看仓单");

	//条件编辑主窗体
	let condition_panel = $('<div style="zIndex:99999;" class="chrome-plugin-condition-panel" id ="condition-panel" </div>');

	let header = $('<div class="amount-style" style="margin-bottom:5px;">编辑条件单</div>');
	
	condition_panel.append(header);
	//读取内存条件数据
	let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);

	
	let select_item;
	
	if(isEdit){
		 custCondition = varietyInfo['custCondition'][custId];
		 select_item = makeCustSelector(custId, custCondition['amount']);
	}else{
	   select_item = makeCustSelector();
	}
	
	condition_panel.append(select_item);
	//仓单需求数量模块
	// let ware_amount = document.createElement("div");
	// ware_amount.className = "ware-amount";
	// ware_amount.style = "margin-top: 10px;";
	// ware_amount.id = "ware_amount";
	// ware_amount.innerHTML = `仓单数量: <input id="amount" type="number" style='width:100px'/><br/><br/>`;
	// condition_panel.appendChild(ware_amount);

	let addPriorityDiv = $('<div class="add-priory-div"></div> ');
	
		let addPriority =$('<button class= "prior-button" id = "addPriority">添加优先度</button>');
		let addPriorityImg = $('<img src="' + addImg +'"  style="width: 20px;"></img>');
		
		addPriorityDiv.append(addPriorityImg)
		addPriorityDiv.append(addPriority);
	
		condition_panel.append(addPriorityDiv);

	let conditionEditListDiv = $('<div id="condition-detail" class="main_condition"></div>');

	addPriorityDiv.click(function() {
		 addPriorityFun(conditionEditListDiv);
	});
	if(isEdit){
		let custConditionList = custCondition['conditions'];
		for (let i = 1;; i++) {
			if (!custConditionList[i]) {
				break;
			}
			let priorInfo = custConditionList[i];
			let panel = $('<div class = "condition-line" id = "div' + i +'"></div>');
	
			publicVariety.conditionPanelInnerHtml(priorInfo, i, conditionEditListDiv, panel);
			editPriorNum = i;
			if(!custConditionList[i+1]){
				let delPriorityImg = $('<img src=' + delImg + ' style="width: 20px;"></img>');
				let delDiv = $('<div class="del-div" id="del-div"></div>');
				delDiv.append(delPriorityImg)
				delDiv.click(function() {
					delPriorityFun();
				});
				panel.append(delDiv);
			}
			conditionEditListDiv.append(panel);
		}
	}else{
		addPriorityFun(conditionEditListDiv);
	}
	condition_panel.append(conditionEditListDiv)
	// let delPriority = document.createElement("button");
	// delPriority.className = "prior-button";
	// delPriority.id = "delPriority";
	// delPriority.innerText = "删除优先度";
	// condition_panel.appendChild(delPriority);
	// delPriority.onclick = function() {
	// 	editPriorNum = delPriorityFun(editPriorNum);
	// };
	
	let btn_div = $('<div style="text-align: center;"></div>');
	let edit_btn = $('<input type = "button" class = "click-button" id = "edit-btn" value="确认编辑"></input>');
	
	btn_div.append(edit_btn);
	edit_btn.click(function() {
		editConditionSubmit();
	});
	let close_btn = $('<input type = "button" class = "click-button" id = "close-btn" value="关闭"></input>');

	close_btn.click(function() {
		editFlag = false;
		$('#condition-panel').remove();
	});
	btn_div.append(close_btn);
	condition_panel.append(btn_div);

	$("body").append(condition_panel);
}




//新增优先级
function addPriorityFun(condition_panel) {
	editPriorNum++;
	if (editPriorNum >= 10) {
		tip("最多10个优先级");
		return
	}
	let div = $("#condition-detail")
	let panel = $('<div id = "div' + editPriorNum + '" class ="condition-line" style="zIndex = 99999;"></div>');

	publicVariety.addConditionPanelHtml(editPriorNum, condition_panel, panel);

	$("#del-div").remove();
	
	let delPriorityImg = $('<img src=' + delImg + ' style="width: 20px;"></img>');
	let delDiv = $('<div class="del-div" id="del-div"></div>');
	delDiv.append(delPriorityImg)
	delDiv.click(function() {
		delPriorityFun();
	});
	panel.append(delDiv);
	return editPriorNum;
}



function getDetails(list) {
	detailList = [];
	hederNames = ["申请编号", "申请日期", "品种", "合约代码", "申请数量", "交割类型", "已响应数量", "未响应数量", "卖方会员", "卖方客户"];
	valueKeys = ["rNo", "rDate", "clsId", "commId", "rQtyHs", "stlNm", "rsQtyHs", "bQtyHs", "firmNm", "cstNm"];
	extraHederNames = [];
	extraValueKeys = [];
	// 从localstore中获取仓单详情
	let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);
	let total_list_map = getStroredLocalStorageJson('total_list_map');
	let newRequestDetail = queueRequestDetailAndDownLoad(list, total_list_map);
	newRequestDetail(list[0]);

}

function queueRequestDetailAndDownLoad(list, storedDetailJson) {
	let reqIndex = 0;

	return function requestDetail(arg) {
		let pro = new Promise((resolve, reject) => {
			let settleReqId = arg["settleReqId"];
			let spcId = arg["spcId"];
			// 根据申请编号查询是否已经存在
			let detailJson = storedDetailJson ? storedDetailJson[settleReqId] : null;
			// 本地存在同时未响应数量与服务器一致时,不请求服务器数据
			if (detailJson && detailJson["bQty"] == arg["balQty"]) {
				handleLocalDetail(reqIndex, detailJson);
				resolve();
			} else {
				let r = Math.random();
				$.ajax({
					"url": url_header + "dms/settleResp/settleReqDetail?r=" + r + "&settleReqId=" + settleReqId,
					"type": "GET",
					"dataType": 'json',
					"contentType": 'application/json',
					"success": function(ret) {
						if (ret["code"] == 200) {
							let jsonStore = {};
							let jsonDetail = {};
							let reqDate = new Date(ret["result"]["settleReq"]["reqDate"]);
							jsonDetail[settleReqId] = handleDetail(reqIndex, ret["result"]);

							saveExtendLocalStorage("total_list_map", jsonDetail)
						} else {
							tip("获取仓单 " + spcId + " 详情失败.");
							infoLog("获取仓单 " + spcId + " 详情失败.");
						}
						resolve();
					}
				});
			}
		}).then(() => {
			reqIndex++;
			if (reqIndex > list.length - 1) {
				//tableToExcel(newHeaderNames,newValueKeys,detailList);
				//展示
				detailTimerExecFlag = false;
				return;
			}
			requestDetail(list[reqIndex]);
		}).catch(err => {
			console.log(err);
			detailTimerExecFlag = false;
			requestDetail(list[reqIndex]);
		});
	}
}

function handleDetail(index, result) {
	let formAttrDefines = result["formDefine"]["formAttrDefines"];
	let item = {};
	// 缩写节省存储空间,LocalStorage每个域限制5M
	item["rNo"] = result['settleReq']['reqNo'];
	item["rDate"] = formatDate(new Date(result['settleReq']["reqDate"]), "yyyy-MM-dd");
	item["clsId"] = result['settleReq']["classId"];

	item["settleReqId"] = result['settleReq']["settleReqId"];
	item["commId"] = result['settleReq']["commodityId"];
	item["rQtyHs"] = result['settleReq']["reqQty"] + "(" + result['settleReq']["reqQty"] * result["sheetSize"] + ")";
	item["stlNm"] = result['settleReq']["settleType"];
	item["rsQtyHs"] = result['settleReq']["rspQty"] + "(" + result['settleReq']["rspQty"] * result["sheetSize"] + ")";
	// 未响应数量通过计算获得,接口返回数据不会变动
	item["bQty"] = result['settleReq']["reqQty"] - result['settleReq']["rspQty"];
	item["bQtyHs"] = item["bQty"] + "(" + item["bQty"] * result["sheetSize"] + ")";
	item["firmNm"] = result['settleReq']["firmId"] + " " + result['settleReq']["firmName"];
	item["cstNm"] = result['settleReq']["customerId"] + " " + result['settleReq']["customerName"];

	for (let formAttrDefine of formAttrDefines) {
		item[formAttrDefine["bizName"]] = formAttrDefine["value"] == null ? "-" : formAttrDefine["value"];
		if (index == 0) {
			extraHederNames.push(formAttrDefine["labelName"]);
			extraValueKeys.push(formAttrDefine["bizName"]);
		}
	}

	detailList.push(item)
	processedRow++;
	
	$("#grab_progress").text(processedRow + "/" + totalRow + "(" + (processedRow / totalRow * 100).toFixed(2) + "%)" + "  初始化进度");
	return item;
}

function handleLocalDetail(index, result) {
	detailList.push(result)
	processedRow++;
	$("#grab_progress").text(processedRow + "/" + totalRow + "(" + (processedRow / totalRow * 100).toFixed(2) + "%)" + "  初始化进度");
	return result;
}


//输出base64编码
function base64(s) {
	return window.btoa(unescape(encodeURIComponent(s)))
}

function getCurrentTime() {
	let now = new Date();
	let time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds() + ";";
	return "当前时间-" + time;
}

function sleep(ms) {
	return new Promise(resolve =>
		setTimeout(resolve, ms)
	)
}

//格式化日期,
function formatDate(date, format) {
	var paddNum = function(num) {
		num += "";
		return num.replace(/^(\d)$/, "0$1");
	}
	//指定格式字符
	var cfg = {
		yyyy: date.getFullYear() //年 : 4位
			,
		yy: date.getFullYear().toString().substring(2) //年 : 2位
			,
		M: date.getMonth() + 1 //月 : 如果1位的时候不补0
			,
		MM: paddNum(date.getMonth() + 1) //月 : 如果1位的时候补0
			,
		d: date.getDate() //日 : 如果1位的时候不补0
			,
		dd: paddNum(date.getDate()) //日 : 如果1位的时候补0
			,
		hh: date.getHours() //时
			,
		mm: date.getMinutes() //分
			,
		ss: date.getSeconds() //秒
	}
	format || (format = "yyyy-MM-dd hh:mm:ss");
	return format.replace(/([a-z])(\1)*/ig, function(m) {
		return cfg[m];
	});
}

function infoLog(msg) {
	console.log(getCurrentTime() + msg);
}

//存本地变量
function saveLocalStorage(key, jsonValue) {
	var stored_string = window.localStorage[key]
	if (!stored_string) {
		stored_string = '{}';
	}
	window.localStorage[key] = JSON.stringify(jsonValue)
}


//存本地变量
function saveExtendLocalStorage(key, jsonValue) {
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
let detailDisplay = false;

function detailTimer(){
	
	var currTime = new Date();
	var hours = currTime.getHours();       //获取当前小时数(0-23)
	
	var minutes = currTime.getMinutes();     //获取当前分钟数(0-59)
	if((hours == 15 && minutes >= 10) || hours > 15){
		return;
	}
	if(hours <= 8){
		return;
	}
	 getSelectedDetails();
}
//获取仓单情况
var detailTimerExecFlag = false;
function getSelectedDetails() {
	
	//如果已经有定时器执行，则return
	if(detailTimerExecFlag){
		console.log("detailTimer已经执行")
		return;
	}
	detailTimerExecFlag = true;

	//如果已经禁止添加，则直接展示，不更新列表

	let varietyCondition = getStroredLocalStorageJson(publicVariety.g_variety_id);

	let commodity_id = varietyCondition['commodityId'];
	//查找该品种所有结算方式的数据
	let classList = getStroredLocalStorageJson("class_list");
	let settleTypeArray = [];
	$.each(classList, function(i, item) {
		if (item["classId"] == publicVariety.g_variety_id) {
			settleTypeArray = item['settleTypes'];
			return;
		}
	});

	for (let i = 0; i < settleTypeArray.length; i++) {
		let param = {
			"pageIndex": 1,
			"pageSize": 2000,
			"commodityId": commodity_id,
			"settleType": settleTypeArray[i]
		};
		let r = Math.random();
		totalRow = 0;
		processedRow = 0;
		$.ajax({
			"url": url_header + "dms/settleResp/queryTodoSettleReqPage?r=" + r,
			"type": "POST",
			"dataType": 'json',
			"contentType": 'application/json',
			"data": JSON.stringify(param),
			"async": false,
			"success": function(ret) {
				if (ret["code"] == 200 && ret["result"]["totalRow"] > 0) {
					
					let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);

					let curDate = formatDate(new Date(), "yyyy-MM-dd");
					//let curDate = formatDate(new Date(),"yyyy-MM-dd");

					totalRow = ret["result"]["totalRow"];
					getDetails(ret["result"]["list"]);
					
					orderWarehouse(ret["result"]["list"]);

				} else if (ret["result"]["totalRow"] == 0) {
					tip("当前无可响应仓单.");
					infoLog("当前无可响应仓单.");
				}
			}
		});
	}
	//displayPrior();
}

function matchMakeDate(current_priority, make_date) {
	if (current_priority['make_date'] != '' && current_priority['make_date']) {
		let make_date_match = false;
		let make_date_array = current_priority['make_date'].split(",");
		for (let make_index = 0; make_index < make_date_array.length; make_index++) {
			let make = make_date_array[make_index].trim();
			if (make == make_date) {
				make_date_match = true;
				break;
			}
		}
		if (!make_date_match) {
			return true;
		}
	}
}

function matchWarehouse(current_priority, w_id) {
	if (current_priority['warehouse'] != '' && current_priority['warehouse']) {
		let warehouse_match = false;
		let warehouse_array = current_priority['warehouse'].split(",");
		for (let ware_index = 0; ware_index < warehouse_array.length; ware_index++) {
			let ware = warehouse_array[ware_index].trim();
			if (ware == w_id) {
				warehouse_match = true;
				break;
			}
		}
		if (!warehouse_match) {
			return true;
		}
	}
}
//根据条件将仓单排好序号
function orderWarehouse(theNewList) {
	let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);
	let totalListMap = getStroredLocalStorageJson('total_list_map');
	let theNewReqList = [];
	$.each(theNewList, function(i, v) {
		theNewReqList.push(v['settleReqId'] + "")
	});
	let totalList = [];
	for (let k in totalListMap) {
		if ($.inArray(k, theNewReqList) >= 0) {
			totalList.push(totalListMap[k]);
		}
	}
	//刷新total_ware_list
	total_ware_list = [];
	let varietyCondition = getStroredLocalStorageJson(publicVariety.g_variety_id);

	//遍历每个客户满足的条件单列表
	let satisfiedList = getStroredLocalStorageJson("satisfiedList");
	if (!satisfiedList) {
		satisfiedList = {};
	}
	
	//满足客户条件数量是否变化
	let satisfyTotalLength =  0;
	
	for (let custId in varietyInfo["custCondition"]) {
		let custInfo = varietyCondition['custCondition'][custId];
		let cust_conditions = custInfo['conditions'];
		//总排序顺序
		let totalIndex = 1;
		//以条件单为维度进行遍历;不进行数量校验，符合条件就排序
		let custLunEff = [];

		//遍历所有优先级
		//去重list
		let spcIdList = [];
		for (let i = 0; i < cust_conditions.length; i++) {
			let thisPriLunEff = [];
			if (!cust_conditions[i]) {
				continue;
			}

			let current_priority = cust_conditions[i];

			$.each(totalList, function(j, v) {
		
				if(spcIdList.indexOf(v["spcId"]) >= 0){
					infoLog("已存在");
					return true;
				}
				spcIdList.push(v["spcId"]);
				//
				if (publicVariety.matchConditionByVariety(current_priority, v)) {
					return true;
				}
				//所有条件均通过则加入排序列表
				//深度复制，js会改变源数据
				let newValue = new Object();
				$.extend(true, newValue, v);
				newValue.priority_num = i; //记录本条目符合的优先级
				custLunEff.push(newValue);
				thisPriLunEff.push(newValue);

				let item = {
					"priority_num": i
				};
			});

			infoLog("本条件单本优先级满足:" + JSON.stringify(thisPriLunEff));
		}
		
		satisfyTotalLength +=custLunEff.length

		satisfiedList[custId] = custLunEff;
	}
	saveLocalStorage("satisfiedList", satisfiedList);
	
	$("#chrome-plugin-pop-number").text(satisfyTotalLength);
	if(satisfyTotalLength > 0){
		$("#satisfyNumber").text(satisfyTotalLength);
		$("#satisfyNumber").css({"color": "red",
			"font-size":"32px"});
	}else{
		$("#satisfyNumber").text(satisfyTotalLength);
		$("#satisfyNumber").css({"color":"black",
			"font-size":"32px"});
	}
}

function closeDetail(){
	detailDisplay = false;
	$("#pop-panel").remove();
	return;
}

//展示满足条件的仓单列表
function displayPrior() {
	getSelectedDetails();
	let totalData  = getStroredLocalStorageJson("satisfiedList");
	if(!!$("#send-pop-panel")){
		$("#send-pop-panel").remove();
	}
	if(!!$("#condition-panel")){
		$("#condition-panel").remove();
	}
	
	if(detailDisplay == true){
		return;
	}
	detailDisplay= true;
	// if (!detailDisplay) {
	// 	detailDisplay = true;
	// 	$("#getDetails").val("关闭");
	// } else {
	// 	detailDisplay = false;
	// 	$("#pop-panel").remove();
	// 	$("#getDetails").val("查看仓单");
	// 	return;
	// }
	
	let windowHeight = window.innerHeight;
	let distinctReq = [];
	let distinctTotalNum = 0;
	let panel = document.createElement('div');
	panel.style.zIndex = 99997;
	panel.className = 'chrome-plugin-pop-panel';
	panel.id = "pop-panel";
	panel.style.height = windowHeight * 0.9 + "px";

	let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);

	//遍历客户
	for (let custId in varietyInfo["custCondition"]) {
		let custDiv = document.createElement('div');
		let custConditions = varietyInfo['custCondition'][custId]['conditions'];

		let custDataList = totalData[custId];
		//进行排序
		
		custDataList.sort(function(a, b) {              //调用Array对象的sort方法进行排序
		               var compA = parseFloat(a['agio']);     //转换字符值为大写
		               var compB = parseFloat(b['agio']);
		      
		               return compA > compB ? 1 : (compA < compB ? -1 : 0) ;
		            });
					
		//分别遍历条件单list
		let displayDiv = document.createElement('table');
		custDiv.appendChild(displayDiv);
		
		//每个仓单不止一笔
		let thisConditionTotalNum = 0;
		for (let j = 0; j < custDataList.length; j++) {
			thisConditionTotalNum += custDataList[j]['bQty'];
		}
		let countDiv = document.createElement('div');
		countDiv.style = "padding: 10px;";
		let countTotal = document.createElement('div');
		countTotal.className = "count-stas-item";
		countTotal.innerHTML += "满足客户" + custId + "筛选条件目前共有：" + thisConditionTotalNum + "个仓单;";
		countDiv.append(countTotal);
		let grabTotal = document.createElement('div');
		grabTotal.className = "count-stas-item";
		if(!varietyInfo["successResult"]){
			varietyInfo["successResult"] = {};
		}
		let successCount = !varietyInfo["successResult"][custId] ? 0 :varietyInfo["successResult"][custId];
		grabTotal.innerHTML += "当前已经成功获得：" + successCount + "个仓单;";
		countDiv.append(grabTotal);

		custDiv.prepend(countDiv);

		let tableDiv = document.createElement('div');
		tableDiv.className = "list-table-div";
		let table = document.createElement('table');
		table.className = "condition-table";
		table.id = "cust-table-" + custId;
		table.innerHTML = publicVariety.displayWarehouseTable(custId);
		tableDiv.append(table);
		let title = document.createElement('caption');
		title.className = "cus-title";
		// title.style = "float: left;";
		title.innerHTML = `
				客户:` + getCustNameById(custId) + '('  + custId +')';

		custDiv.prepend(title);
		let doGrabDiv = document.createElement('div');
		
		doGrabDiv.className = "list-btn-div";
		let headerWord = document.createElement('font')
		headerWord.innerHTML="条件清单列表";
		doGrabDiv.append(headerWord)
		
		let doGrabBtn = document.createElement('input');
		doGrabBtn.type = "button"
		doGrabBtn.className = "send-button"
		doGrabBtn.custId = custId;
		doGrabBtn.value = "发送请求";
		doGrabBtn.onclick = function() { //绑定点击事件
			sendRequestConfirm(custId);
		};
		doGrabDiv.append(doGrabBtn)
		custDiv.append(doGrabDiv)

		$.each(custDataList, function(id, item) {
			if (distinctReq.indexOf(item['settleReqId']) < 0) {
				distinctReq.push(item['settleReqId']);
				distinctTotalNum += item['balQty'];
			}
			let tr = document.createElement('tr');
			let result = '尚未抢单';
			let success_num = 0;

			if (id % 2 == 0) {
				tr.className = "tr-even";
			} else {
				tr.className = "tr-odd";
			}

			tr.innerHTML = publicVariety.displayWareHouseValue(item, id, result)
			table.appendChild(tr)
		});
		custDiv.appendChild(tableDiv);
		let spaceDiv = document.createElement('div');
		spaceDiv.innerHTML = "</br></br>";
		custDiv.append(spaceDiv)
		panel.append(custDiv);
	}

	document.body.appendChild(panel)
}

function checkAndClearDate(){
	let storedDate = getStroredLocalStorageJson("date");
	let currDate = formatDate(new Date(), "yyyy-MM-dd");
	if(!!storedDate && currDate != storedDate){
		//清空所有缓存
		 localStorage.clear();
	}
	saveLocalStorage("date", currDate)
}

function sendRequestConfirm(custId) {
	if (!!$("#send-pop-panel")) {
		$("#send-pop-panel").remove();
	}
	let tableId = "cust-table-" + custId;
	let table = $("#" + tableId);
	var trList = $("#" + tableId + ' td .checkbox');

	let classList = getStroredLocalStorageJson("class_list");

	let requestSettleTypeMap = {};
	let totalReqCount = 0;
	$("#" + tableId + ' tr').each(function(i) { // 遍历 tr、
		if (i == 0) {
			return true;
		}
		let checkbox = $(this).find('.checkbox').get(0);
		if (checkbox.checked) {
			let stlnm = checkbox.getAttribute('stlnm');
			let qty = checkbox.getAttribute('qty');
			let settleTypeList = requestSettleTypeMap[stlnm];
			if (!settleTypeList) {
				settleTypeList = [];
			}
			let reqNumStr = $(this).children('.req-qty-td').get(0).innerText;
			let reqSpcId = $(this).children('.req-spc-td').get(0).innerText;
			let baseQty = $(this).children('.base-qty-td').get(0).innerText;
			let reqNum = parseInt(reqNumStr);
			if (!reqNum) {
				tip("请输入抢单数量")
				return;
			}
			if (reqNum == 0) {
				tip("抢单数量为0")
				return;
			}
			if (!reqNum > qty) {
				tip("抢单数量大于总数")
				return;
			}
			settleTypeList.push({
				"settleReqId": checkbox.value,
				"qty": reqNum,
				"spcId": reqSpcId,
				"baseQty": baseQty

			});
			totalReqCount++;
			requestSettleTypeMap[stlnm] = settleTypeList;
		}
	});

	let windowHeight = window.innerHeight;
	let distinctReq = [];
	let distinctTotalNum = 0;
	let panel = document.createElement('div');
	panel.style.zIndex = 99998;
	panel.className = 'chrome-plugin-send-pop-panel';
	panel.id = "send-pop-panel";

	panel.style.height = windowHeight * 0.5 + "px";

	//分别遍历条件单list
	let displayDiv = document.createElement('table');
	//每个仓单不止一笔
	let countTotal = document.createElement('div');
	countTotal.className = "count-total";
	countTotal.innerHTML += "客户" + getCustNameById(custId)  +"(" +custId + ")" + "本次发送：" + totalReqCount + "个仓单;&nbsp;&nbsp;&nbsp;&nbsp;";

	panel.appendChild(countTotal)
	panel.appendChild(displayDiv)
	//遍历客户
	for (let settleType in requestSettleTypeMap) {
		let settleTypeList = requestSettleTypeMap[settleType];

		if (!settleTypeList || settleTypeList.length == 0) {
			continue;
		}
		//分别遍历条件单list
		let requestTable = document.createElement('table');

		panel.appendChild(displayDiv)
		let table = document.createElement('table');
		table.className = "condition-table";
		table.id = "cust-table-confirm" + custId;
		table.innerHTML = publicVariety.displayConfirmTable();
	
		$.each(settleTypeList, function(id, item) {
			if (distinctReq.indexOf(item['settleReqId']) < 0) {
				distinctReq.push(item['settleReqId']);
				distinctTotalNum += item['balQty'];
			}
			let tr = document.createElement('tr');
			let result = '尚未抢单';
			let success_num = 0;

			if (id % 2 == 0) {
				tr.className = "tr-even";
			} else {
				tr.className = "tr-odd";
			}

			tr.innerHTML = publicVariety.displayConfirmRequest(item, id, result)
			table.appendChild(tr)
		});
		panel.appendChild(table);
		let spaceDiv = document.createElement('div');
		spaceDiv.innerHTML = "</br></br>";
		panel.append(spaceDiv);
	}
	
	let btn_div = document.createElement("div");
	btn_div.style = "margin-left: 30%;";
	let doGrabBtn = document.createElement('input');
	doGrabBtn.type = "button"
	doGrabBtn.className = "click-button"
	doGrabBtn.custId = custId;
	doGrabBtn.value = "确认发送";
	doGrabBtn.onclick = function() { //绑定点击事件
		sendRequest(custId);
	};
	btn_div.appendChild(doGrabBtn);
	
	let close_btn = document.createElement("input");
	close_btn.type = "button";
	close_btn.className = "click-button";
	close_btn.value = "关闭";
	close_btn.onclick = function() {
		$('#send-pop-panel').remove();
	}
	btn_div.appendChild(close_btn);
	panel.appendChild(btn_div);
	document.body.appendChild(panel);
}

function sendRequest(custId) {
	let tableId = "cust-table-" + custId;

	let classList = getStroredLocalStorageJson("class_list");

	let totalReqCount = 0;
	let requestSettleTypeMap = {};
	$("#" + tableId + ' tr').each(function(i) { // 遍历 tr、
		if (i == 0) {
			return true;
		}
		let checkbox = $(this).find('.checkbox').get(0);
		if (checkbox.checked) {
			let stlnm = checkbox.getAttribute('stlnm');
			let qty = checkbox.getAttribute('qty');
			let settleTypeList = requestSettleTypeMap[stlnm];
			if (!settleTypeList) {
				settleTypeList = [];
			}
			let reqNumStr = $(this).children('.req-qty-td').get(0).innerText;
			let reqNum = parseInt(reqNumStr);
			if (!reqNum) {
				tip("请输入抢单数量")
				return;
			}
			if (!reqNum > qty) {
				tip("抢单数量大于总数")
				return;
			}
			totalReqCount += reqNum;
			settleTypeList.push({
				"settleReqId": checkbox.value,
				"qty": reqNum
			});
			requestSettleTypeMap[stlnm] = settleTypeList;
		}
	});


	queryCurrSuccessNum();

	let varitety_conditions = getStroredLocalStorageJson(publicVariety.g_variety_id)
	let successResult = varitety_conditions["successResult"];

	if(!successResult){
		successResult = {};
	}
	if (!successResult[custId]) {
		successResult[custId] = 0;
	}
	if (totalReqCount + successResult[custId] > varitety_conditions["custCondition"][custId]["amount"]) {
		alert("本次请求总量大于剩余需求总量");
		return;
	}

	for (let k in requestSettleTypeMap) {
		let r = Math.random();
		let params = {
			"bCustomerId": custId,
			"list": requestSettleTypeMap[k],
			"commodityId": varitety_conditions['commodityId'],
			"settleType": k
		};
		
		$.ajax({
			"url": url_header + "dms/settleResp/doResponse?r=" + r,
			"type": "POST",
			"dataType": 'json',
			"contentType": 'application/json',
			"data": JSON.stringify(params),
			"async": true,
			"success": function(ret) {
				if (ret["code"] == 200) {
					let sum = ret['result']['sum'];
					let successCount = ret['result']['successCount'];
					let failedCount = ret['result']['failedCount'];
					queryCurrSuccessNum();
					
					if(!!$("#pop-panel")){
						$("#pop-panel").remove();
					}
					if(!!$("#send-pop-panel")){
						$('#send-pop-panel').remove();
					}
					detailDisplay = false;
					getSelectedDetails();
					displayPrior();
					tip("抢单成功.成功数量 " + successCount + ",  失败数量" + failedCount);
				} else {
					tip("抢单失败.code=" + code);
					infoLog("当前无可响应仓单.code=" + code);
				}
			}
		});

	}

}

function queryCurrSuccessNum() {
	// 校验客户需求量与成功量以及本次请求数量校验
	let respBatchParams = {
		"pageIndex": 1,
		"pageSize": 1000
	};
	let currTime = formatDate(new Date(), "yyyy-MM-dd hh:mm:ss");
	respBatchParams.startTime = currTime;
	respBatchParams.endTime = currTime;

	let varietyInfo = getStroredLocalStorageJson(publicVariety.g_variety_id);
	//同步请求进行校验
	$.ajax({
		"url": url_header + "dms/settleResp/getSettleRespBatchQueryPage?r=" + Math.random(),
		"type": "POST",
		"dataType": 'json',
		"contentType": 'application/json',
		"data": JSON.stringify(respBatchParams),
		"async": false,
		"success": function(ret) {
			if (ret["code"] == 200) {
				let list = ret['result']['list'];
				let successResult = {};
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					let customerId = item["bcustomerId"];
					let classId = item["classId"];
					let qty = item["qty"];
					if (publicVariety.g_variety_id == classId) {
						if (!successResult[customerId]) {
							successResult[customerId] = 0;
						}
						successResult[customerId] += qty;
						
					}
				}
				varietyInfo["successResult"] = successResult;
				saveExtendLocalStorage(publicVariety.g_variety_id, varietyInfo);
			} else {
				tip("查询成功仓单失败.code=" + code);
				infoLog("查询成功仓单失败.code=" + code);
				//失败了直接返回
				return;
			}
		}
	});
}
