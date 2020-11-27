/**
 * 根据品种匹配条件与仓单的关系
 * @param {Object} current_priority 当前条件
 * @param {Object} sheetItem 当前仓单
 */
function matchConditionByVariety(current_priority, sheetItem){
	
	let balQty = sheetItem['bQty'];
	//防止异常情况
	if(!balQty){
		balQty = 1;
	}

	let placeName = sheetItem['placeName'] == null ? "" : sheetItem['placeName'];
	let w_id = sheetItem['whId'] == null ? "" : sheetItem['whId'] ;
	let cash = sheetItem['agio'];
	let make_date = sheetItem['makeDate'] == null ? "":sheetItem['makeDate'] ;
	let stlNm = sheetItem['stlNm'] == null ? "":sheetItem['stlNm'] ;

	//升贴水有null
	if(!cash){
		cash = 0;
	}
	
	//支持多仓库 多个仓库用逗号进行分割
	if(matchWarehouse(current_priority, w_id)){
		return true;
	}
	if(matchMakeDate(current_priority, make_date)){
		return true;
	}
	//除了新疆以外，就是内地
	
	if (current_priority['district'] != ''){
		if(null == placeName){
			return true;
		} 
		
		if(current_priority['district'] =='新疆' && placeName.indexOf(current_priority['district']) < 0) {
			return true;
		}
		if(current_priority['district'] =='内地' && !(placeName.indexOf('新疆') < 0)){
			return true;
		}
	}
	if (!!current_priority['settleType'] && current_priority['settleType'] != '' && (null == stlNm ||(stlNm !=null && stlNm.indexOf(current_priority['settleType']) < 0))) {
		return true;
	}
	if (current_priority['premium_rise_lower_limit'] != '' && parseInt(current_priority['premium_rise_lower_limit']) >= cash) {
		return true;
	}
	if (current_priority['premium_rise_upper_limit'] != '' && parseInt(current_priority['premium_rise_upper_limit']) <= cash) {
		return true;
	}

}

/**
 * 右下角读取展示条件
 * @param {Object} conditionPriorItem
 * @param {Object} index
 */
function loadupDisplayCondition(conditionPriorItem, index) {
		// let match = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;优先度" + index;
		// let district = conditionPriorItem["district"];
		// let warehouse = conditionPriorItem["warehouse"];
		// let make_date = conditionPriorItem["make_date"];
		let settle_type = conditionPriorItem["settle_type"];
		// let premium_rise_upper_limit = conditionPriorItem["premium_rise_upper_limit"];
		// let premium_rise_lower_limit = conditionPriorItem["premium_rise_lower_limit"];
		// match += "仓库: " + warehouse + "年份: " + make_date+ "产地: " + district + "升贴水下限: " + premium_rise_lower_limit + "升贴水上限: " + premium_rise_upper_limit
		//  + "交割方式=" + settlyDict[settle_type] + "(" + settle_type + ")" ;
		 var conditionTr = $("<tr style='padding:10px;'></tr>");
		 	
		 	conditionTr.append("<td  style = 'width:100px;margin:5px;color: #4B73EB;'>"  + "优先度" + index + "</td>");
		 	// let spcId = conditionPriorItem["spcId"];
		 	// conditionTr.append("<td style = 'width:100px;margin:5px;'>"  +"仓单编号: " + spcId + "</td>");
		 	let district = conditionPriorItem["district"];
		 	let warehouse = conditionPriorItem["warehouse"];
		 	let make_date = conditionPriorItem["make_date"];
		 	let premium_rise_upper_limit = conditionPriorItem["premium_rise_upper_limit"];
		 	let premium_rise_lower_limit = conditionPriorItem["premium_rise_lower_limit"];
		 	conditionTr.append("<td style = 'width:100px;margin:5px;'>"  +"仓库: " + warehouse + "</td>");
		 	conditionTr.append("<td style = 'width:60px;margin:5px;'>"  +"年份: " + make_date + "</td>");
		 	conditionTr.append("<td style = 'width:80px;margin:5px;'>"  +"产地: " + district + "</td>");
		 	conditionTr.append("<td style = 'width:120px;margin:5px;'>"  +"升贴水下限: " + premium_rise_lower_limit + "</td>");
		 	conditionTr.append("<td style = 'width:120px;margin:5px;'>"  +"升贴水上限: " + premium_rise_upper_limit + "</td>");
		 	conditionTr.append("<td style = 'width:120px;margin:5px;'>"  +"交割方式: " + settlyDict[settle_type] + "(" + settle_type + ")" + "</td>");
		 	//match += "仓库: " + warehouse + "年份: " + make_date+ "产地: " + district + "升贴水下限: " + premium_rise_lower_limit + "升贴水上限: " + premium_rise_upper_limit;
		 return conditionTr;
	// return match;
}

function addConditionPanelHtml(editPriorNum,condition_panel,panel){

	let innerHTML = $(`<div>优先度` + editPriorNum + `:</div>`);
	let conditionInfo = $(`<div><input class = "condition-input" id="district_` + editPriorNum +
		`" placeholder="产地(填写新疆或内地)" type="text"/> 
		<input class = "condition-input" id="warehouse_` +
		editPriorNum +
		`" placeholder="仓库" type="text"/> 
		<input class = "condition-input" id="make_date_` +
		editPriorNum +
		`" placeholder="年份" type="text" /> 
		<input class = "condition-input" id="premium_rise_lower_limit_` +
		editPriorNum +
		`" type="number" placeholder="升贴水下限"/>
	<input class = "condition-input" id="premium_rise_upper_limit_` +
		editPriorNum + `" type="number" placeholder="升贴水上限" /></div>
	`);
	panel.append(innerHTML);
	
	//增加选择器
	condition_panel.append(panel);
	conditionInfo.append(getSettleTypeSelector(editPriorNum) )
	panel.append(conditionInfo);
	
}

function getSettleTypeSelector(editPriorNum) {
	//获取选中index及value 
	let classList = getStroredLocalStorageJson("class_list");
	let settleTypeList= [];
	$.each(classList,function(i, item) {
		if (item['classId'] == publicVariety.g_variety_id) {
			 settleTypeList =item["settleTypes"];
		}
	});
	
	let settleTypes =  $('<select style="color:black" id = "settle_type_' + editPriorNum +'"></div>');

	for (let settleType of settleTypeList) {
		// settleTypes.append("<option value="+ settleType+">" + settlyDict[settleType] + "</option>");
		
		let option =  $('<option value = ' + settleType +'>' + (settlyDict[settleType] +"(" + settleType + ")") + '</option>');

		settleTypes.append(option);
	}
	
	return settleTypes;
}
function validateWarehouse(obj){
	let pattern = /^[0-9,]*$/;
	let reg = new RegExp(pattern);
	if("" == obj){
		return true;
	}
	if(!reg.test(obj)){
		return  false;
	}
	return true
}

function conditionPanelInnerHtml(conditionPriorItem, editPriorNum, condition_panel, panel){
	let innerHTML = $(`<div>优先度` + editPriorNum + `:</div>`);
	let conditionInfo = $(`<div>	<input class = "condition-input" id="district_` + editPriorNum +
					`" placeholder="产地(填写新疆或内地)" type="text" style='width:150px' value = "` + conditionPriorItem['district'] +
					`"/> 
		
				<input class = "condition-input" id="warehouse_` +
					editPriorNum + `" placeholder="仓库" type="text"  value = "` + conditionPriorItem['warehouse'] +
					`"/> 
				<input class = "condition-input" id="make_date_` +
					editPriorNum + `" placeholder="年份" type="text"  value = "` + conditionPriorItem['make_date'] +
					`"/> 
				<input class = "condition-input" id="premium_rise_lower_limit_` +
					editPriorNum +
					`" type="number" placeholder="升贴水下限"  value = "` + conditionPriorItem['premium_rise_lower_limit'] +
					`"/> 
			<input class = "condition-input" id="premium_rise_upper_limit_` +
					editPriorNum + `" type="number" placeholder="升贴水上限"  value = "` + conditionPriorItem['premium_rise_upper_limit'] +
					`"/> </div>
	`);
	
	panel.append(innerHTML);
	//增加选择器
	condition_panel.append(panel);
	let settleTypes= getSettleTypeSelector(editPriorNum);
	
	if(!!conditionPriorItem){
		settleTypes.each(function(i, v){
			if(v == conditionPriorItem['settle_type'])
			v.selected=true;
		});
	}
	//增加选择器
	conditionInfo.append(getSettleTypeSelector(editPriorNum) )
	panel.append(conditionInfo);
	return innerHTML;
}
function validateCondition(editPriorNum){
	for (let i = 1; i <= editPriorNum; i++) {
	
	    let warehouse = $('#warehouse_' + i).val();
	    if(validateWarehouse(warehouse) == false){
	        alert("参数错误， warehouse：" + warehouse);
	        return;
	    }
	}
	for (let i = 1; i <= editPriorNum; i++) {
	
	    let make_date = $('#make_date_' + i).val();
	    if(validateWarehouse(make_date) == false){
	        alert("参数错误， make_date：" + make_date);
	        return;
	    }
	}
}

function editConditionByVariety(editPriorNum, condition_num){
	validateCondition(editPriorNum);
	
	let currCondition = {};
	currCondition['amount'] = $('#amount').val()
	currCondition['condition_num'] = condition_num;
	for (let i = 1; i <= editPriorNum; i++) {
		
		let district = $('#district_' + i).val();
		let warehouse = $('#warehouse_' + i).val();
		let make_date = $('#make_date_' + i).val();
		let settle_type = $('#settle_type_' + i).val();
		let premium_rise_upper_limit = $('#premium_rise_upper_limit_' + i).val();
		let premium_rise_lower_limit = $('#premium_rise_lower_limit_' + i).val();
		currCondition[i] = {
			"district": district,
			"warehouse": warehouse,
			"make_date": make_date,
			"settle_type": settle_type,
			"premium_rise_upper_limit": premium_rise_upper_limit,
			"premium_rise_lower_limit": premium_rise_lower_limit,
			"condition_num": condition_num
		}
	}
	return currCondition;
}

//保存输入的条件
function makeConditionStore(i, condition, condition_num){
	let warehouse = $('#warehouse_' + i).val();
	let make_date = $('#make_date_' + i).val();
	
	let district = $('#district_' + i).val();
	let settle_type = $('#settle_type_' + i).val();
	let premium_rise_upper_limit = $('#premium_rise_upper_limit_' + i).val();
	let premium_rise_lower_limit = $('#premium_rise_lower_limit_' + i).val();
	condition[i] = {
		"district": district,
		"warehouse": warehouse,
		"make_date": make_date,
		"settle_type": settle_type,
		"premium_rise_upper_limit": premium_rise_upper_limit,
		"premium_rise_lower_limit": premium_rise_lower_limit,
		"condition_num": condition_num
	}
	
}
	

	function displayWarehouseTable(custId){
		let innerHTML =
				`
			<tr class ="tr-header">
			<td class = "cus-td" >序号</td>
			<td class = "cus-td" style="width: 140px;">仓单编号</td>
			<td class = "cus-td">请求编号</td>
			<td class = "cus-td">交割方式</td>
			<td class = "cus-td" style="width: 150px;">产地</td>
			<td class = "cus-td">仓库</td>
			<td class = "cus-td">年份</td>
			<td class = "cus-td">数量</td>
			<td class = "cus-td">请求数量</td>
			<td class = "cus-td">等级</td>
			<td class = "cus-td">升贴水</td>
			<td class = "cus-td">满足优先级</td>
			<td class = "cus-td" >选择</td>
		</tr>
			`;
			return innerHTML;
	}
	
	function displayWareHouseValue(item, id, result){
		let cash = null == item['agio'] ? '-': item['agio']
		let placeName = null == item['placeName'] ? '-' : item['placeName'];
		let makeDate = null == item['makeDate'] ? '-' : item['makeDate'];
		let levId = null == item['levId'] ? '-' : item['levId'];
		let whId = null == item['whId'] ? '-' : item['whId'];
		let spcId = null == item['spcId'] ? '-' : item['spcId'];
		let stlNm = null == item['stlNm'] ? '-' : item['stlNm'];
		
		
		let innerHTML =  `
				<td class = "cus-td">` + (id + 1 ) + `</td>
				<td class = "cus-td req-spc-td">` + spcId + `</td>
				<td class = "cus-td">` + item['settleReqId'] + `</td>
				<td class = "cus-td">` + settlyDict[stlNm]+ '(' + stlNm + ')' + `</td>
				
				<td class = "cus-td">` + placeName + `</td>
				<td class = "cus-td">` + whId + `</td>
				<td class = "cus-td">` + makeDate + `</td>
				<td class = "cus-td base-qty-td">` + item['bQty'] + `</td>
				<td class = "cus-td req-qty-td" contentEditable="true" >` + item['bQty'] + `</td>
				<td class = "cus-td">` + levId + `</td>
				<td class = "cus-td">` + cash + `</td>
				<td class = "cus-td">` + item['priority_num'] + `</td>
				<td class ="check-box" ><input name="item-checkBox" class ="checkbox" type="checkbox" value="` + item['settleReqId'] +`"` + ` stlNm=` + stlNm + ` qty=` + item['bQty'] + ` /></td>
				`
		return innerHTML;
	}
	
	function displayConfirmRequest(item, id, result){
		let settleReqId = item['settleReqId']
		let qty = item['qty'];
		let spcId = null == item['spcId'] ? '-' : item['spcId'];
		let baseQty = null == item['baseQty'] ? '-' : item['baseQty'];
		
		let innerHTML =  `
				<td class = "cus-td">` + (id + 1 ) + `</td>
				<td class = "cus-td">` + spcId+ `</td>
				<td class = "cus-td">` + settleReqId+ `</td>
				<td class = "cus-td">` + baseQty + `</td>
				<td class = "cus-td">` + qty + `</td>
				`
		return innerHTML;
	}
	function displayConfirmTable(){
		let innerHTML =
				`
			<tr class ="tr-header">
			<td class = "cus-td" >序号</td>
			<td class = "cus-td" style="width: 140px;">仓单编号</td>
			<td class = "cus-td">请求编号</td>
			<td class = "cus-td">数量</td>
			<td class = "cus-td">请求数量</td>
		</tr>
			`;
			return innerHTML;
	}
export  {matchConditionByVariety,displayConfirmTable,displayConfirmRequest,loadupDisplayCondition,conditionPanelInnerHtml, addConditionPanelHtml, makeConditionStore, displayWarehouseTable,displayWareHouseValue,editConditionByVariety,validateCondition}