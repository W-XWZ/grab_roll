
//var url_header = '/ngmss-mem/';

var url_header = '/ngmss-mem/';

$(function() {
	//加载设置
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if (request == "getready") {
			$('#add').attr('disabled', 'true');
		}
		sendResponse('我是popup，我已收到你的消息：' + JSON.stringify(request));
	});

	function getCurrentTabId(callback) {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, function(tabs) {
			if (callback) callback(tabs.length ? tabs[0].id : null);
		});
	}

	function sendMessageToContentScript(message, callback) {
		getCurrentTabId(function(tabId) {
			chrome.tabs.sendMessage(tabId, message, function(response) {
				if (callback) callback(response);
			});
		});
	}
});
